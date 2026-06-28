import { Request, Response, NextFunction } from 'express';
import Service from '../models/Service';
import Salon, { ISalon } from '../models/Salon';
import Appointment, { AppointmentStatus } from '../models/Appointment';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.service';
import { logger } from '../utils/logger';

export const createService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { salonId } = req.params;
    const userId = req.userId;

    const salon = await Salon.findById(salonId);
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }
    if (salon.ownerId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to add services to this salon' });
      return;
    }
    if (salon.status !== 'approved') {
      res.status(400).json({ success: false, message: 'Cannot add services to unapproved salon' });
      return;
    }

    const existingService = await Service.findOne({ salonId, name: req.body.name });
    if (existingService) {
      res.status(400).json({ success: false, message: 'A service with this name already exists in your salon' });
      return;
    }

    const service = await Service.create({ ...req.body, salonId });
    await service.populate('categoryId', 'name slug icon');

    logger.info(`createService: service ${service._id} created for salon ${salonId}`);
    res.status(201).json({ success: true, message: 'Service created successfully', data: service });
  } catch (error) {
    logger.error('createService error:', error);
    next(error);
  }
};

export const getSalonServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { salonId } = req.params;
    const { categoryId, isActive, isAvailable } = req.query;

    const query: Record<string, unknown> = { salonId };
    if (categoryId) query.categoryId = categoryId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const services = await Service.find(query).populate('categoryId', 'name slug icon').sort({ name: 1 });

    res.status(200).json({ success: true, message: 'Services retrieved successfully', data: services });
  } catch (error) {
    logger.error('getSalonServices error:', error);
    next(error);
  }
};

export const getServiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id)
      .populate('salonId', 'name phone address')
      .populate('categoryId', 'name slug icon description');

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Service retrieved successfully', data: service });
  } catch (error) {
    logger.error(`getServiceById error for ${req.params.id}:`, error);
    next(error);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const service = await Service.findById(id).populate<{ salonId: ISalon }>('salonId');
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.salonId.ownerId?.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to update this service' });
      return;
    }

    if (req.body.name && req.body.name !== service.name) {
      const duplicate = await Service.findOne({ salonId: service.salonId._id, name: req.body.name, _id: { $ne: id } });
      if (duplicate) {
        res.status(400).json({ success: false, message: 'A service with this name already exists in your salon' });
        return;
      }
    }

    const updatedService = await Service.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
      .populate('salonId', 'name phone address')
      .populate('categoryId', 'name slug icon');

    res.status(200).json({ success: true, message: 'Service updated successfully', data: updatedService });
  } catch (error) {
    logger.error(`updateService error for ${req.params.id}:`, error);
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const service = await Service.findById(id).populate<{ salonId: ISalon }>('salonId');
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.salonId.ownerId?.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to delete this service' });
      return;
    }

    const futureAppointments = await Appointment.countDocuments({
      'services.serviceId': id,
      appointmentDate: { $gte: new Date() },
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    });

    if (futureAppointments > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete service. ${futureAppointments} future appointment(s) are using this service.`,
      });
      return;
    }

    if (service.images && service.images.length > 0) {
      await Promise.all(service.images.map((img) => deleteFromCloudinary(img.publicId)));
    }

    await Service.findByIdAndDelete(id);
    logger.info(`deleteService: service ${id} deleted`);
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    logger.error(`deleteService error for ${req.params.id}:`, error);
    next(error);
  }
};

export const toggleServiceAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({ success: false, message: 'isAvailable must be a boolean value' });
      return;
    }

    const service = await Service.findById(id).populate<{ salonId: ISalon }>('salonId');
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.salonId.ownerId?.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to update this service' });
      return;
    }

    service.isAvailable = isAvailable;
    await service.save();

    res.status(200).json({ success: true, message: `Service ${isAvailable ? 'enabled' : 'disabled'} successfully`, data: service });
  } catch (error) {
    logger.error(`toggleServiceAvailability error for ${req.params.id}:`, error);
    next(error);
  }
};

export const uploadServiceImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const service = await Service.findById(id).populate<{ salonId: ISalon }>('salonId');
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.salonId.ownerId?.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to upload images for this service' });
      return;
    }

    if (service.images.length + files.length > 5) {
      res.status(400).json({ success: false, message: 'Maximum 5 images allowed per service' });
      return;
    }

    const uploadedImages = await Promise.all(files.map((file) => uploadToCloudinary(file, 'services')));
    const newImages = uploadedImages.map((img) => ({ url: img.url, publicId: img.publicId }));

    service.images.push(...newImages);
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: newImages, totalImages: service.images.length },
    });
  } catch (error) {
    logger.error(`uploadServiceImages error for ${req.params.id}:`, error);
    next(error);
  }
};

export const deleteServiceImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, imageId } = req.params;
    const userId = req.userId;

    const service = await Service.findById(id).populate<{ salonId: ISalon }>('salonId');
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.salonId.ownerId?.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to delete images from this service' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageIndex = service.images.findIndex((img: any) => img._id?.toString() === imageId);
    if (imageIndex === -1) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    const image = service.images[imageIndex];
    await deleteFromCloudinary(image.publicId);
    service.images.splice(imageIndex, 1);
    await service.save();

    res.status(200).json({ success: true, message: 'Image deleted successfully', data: { remainingImages: service.images.length } });
  } catch (error) {
    logger.error(`deleteServiceImage error for ${req.params.id}:`, error);
    next(error);
  }
};

export default {
  createService,
  getSalonServices,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceAvailability,
  uploadServiceImages,
  deleteServiceImage,
};
