import { Request, Response, NextFunction } from 'express';
import Service from '../models/Service';
import Salon from '../models/Salon';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.service';

/**
 * Create service
 * @route POST /api/v1/salons/:salonId/services
 * @access Private (Salon Admin - own salon only)
 */
export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salonId } = req.params;
    const userId = req.user?.id;

    // Verify salon ownership
    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to add services to this salon',
      });
    }

    if (salon.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add services to unapproved salon',
      });
    }

    // Check for duplicate service name
    const existingService = await Service.findOne({
      salonId,
      name: req.body.name,
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists in your salon',
      });
    }

    // Create service
    const service = await Service.create({
      ...req.body,
      salonId,
    });

    await service.populate('categoryId', 'name slug icon');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get salon services
 * @route GET /api/v1/salons/:salonId/services
 * @access Public
 */
export const getSalonServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salonId } = req.params;
    const { categoryId, isActive, isAvailable } = req.query;

    // Build query
    const query: any = { salonId };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === 'true';
    }

    const services = await Service.find(query)
      .populate('categoryId', 'name slug icon')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get service by ID
 * @route GET /api/v1/services/:id
 * @access Public
 */
export const getServiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id)
      .populate('salonId', 'name phone address')
      .populate('categoryId', 'name slug icon description');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service retrieved successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update service
 * @route PUT /api/v1/services/:id
 * @access Private (Salon Admin - own salon only)
 */
export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find service and populate salon
    const service = await Service.findById(id).populate('salonId');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.salonId.ownerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this service',
      });
    }

    // Check for duplicate name if name is being changed
    if (req.body.name && req.body.name !== service.name) {
      const existingService = await Service.findOne({
        salonId: service.salonId._id,
        name: req.body.name,
        _id: { $ne: id },
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'A service with this name already exists in your salon',
        });
      }
    }

    // Update service
    const updatedService = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('salonId', 'name phone address')
      .populate('categoryId', 'name slug icon');

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete service
 * @route DELETE /api/v1/services/:id
 * @access Private (Salon Admin - own salon only)
 */
export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find service and populate salon
    const service = await Service.findById(id).populate('salonId');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.salonId.ownerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this service',
      });
    }

    // Check if service has future appointments
    const Appointment = require('../models/Appointment').default;
    const futureAppointments = await Appointment.countDocuments({
      'services.serviceId': id,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    });

    if (futureAppointments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service. ${futureAppointments} future appointment(s) are using this service.`,
      });
    }

    // Delete service images from Cloudinary
    if (service.images && service.images.length > 0) {
      const deletePromises = service.images.map((img) => deleteFromCloudinary(img.publicId));
      await Promise.all(deletePromises);
    }

    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle service availability
 * @route PATCH /api/v1/services/:id/availability
 * @access Private (Salon Admin - own salon only)
 */
export const toggleServiceAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean value',
      });
    }

    // Find service and populate salon
    const service = await Service.findById(id).populate('salonId');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.salonId.ownerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this service',
      });
    }

    service.isAvailable = isAvailable;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload service images
 * @route POST /api/v1/services/:id/images
 * @access Private (Salon Admin - own salon only)
 */
export const uploadServiceImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    // Find service and populate salon
    const service = await Service.findById(id).populate('salonId');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.salonId.ownerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload images for this service',
      });
    }

    // Check image limit (max 5 images per service)
    if (service.images.length + files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per service',
      });
    }

    // Upload images to Cloudinary
    const uploadPromises = files.map((file) => uploadToCloudinary(file, 'services'));
    const uploadedImages = await Promise.all(uploadPromises);

    // Add images to service
    const newImages = uploadedImages.map((img) => ({
      url: img.url,
      publicId: img.publicId,
    }));

    service.images.push(...newImages);
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: newImages,
        totalImages: service.images.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete service image
 * @route DELETE /api/v1/services/:id/images/:imageId
 * @access Private (Salon Admin - own salon only)
 */
export const deleteServiceImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, imageId } = req.params;
    const userId = req.user?.id;

    // Find service and populate salon
    const service = await Service.findById(id).populate('salonId');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.salonId.ownerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete images from this service',
      });
    }

    // Find image
    const imageIndex = service.images.findIndex((img) => img._id?.toString() === imageId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    const image = service.images[imageIndex];

    // Delete from Cloudinary
    await deleteFromCloudinary(image.publicId);

    // Remove from service
    service.images.splice(imageIndex, 1);
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remainingImages: service.images.length,
      },
    });
  } catch (error) {
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
