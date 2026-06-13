import { Request, Response, NextFunction } from 'express';
import Salon from '../models/Salon';
import { User } from '../models/User';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.service';
import { searchSalons, getNearbySalons, getPopularSalons } from '../services/search.service';
import { logger } from '../utils/logger';
import { emitSalonRegistered } from '../socket';

export const createSalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    logger.info(`createSalon: user ${userId} attempting to create salon`);

    const existingSalon = await Salon.findOne({ ownerId: userId });
    if (existingSalon) {
      res.status(400).json({ success: false, message: 'You already have a salon registered' });
      return;
    }

    const salon = await Salon.create({ ...req.body, ownerId: userId, status: 'pending' });
    await User.findByIdAndUpdate(userId, { salonId: salon._id });
    await salon.populate('ownerId', 'firstName lastName email phone');

    logger.info(`createSalon: salon ${salon._id} created, pending approval`);
    emitSalonRegistered({
      _id: String(salon._id),
      name: salon.name,
      phone: salon.phone,
      address: salon.address,
      createdAt: salon.createdAt,
    });
    res.status(201).json({
      success: true,
      message: 'Salon created successfully. Awaiting admin approval.',
      data: salon,
    });
  } catch (error) {
    logger.error('createSalon error:', error);
    next(error);
  }
};

export const getAllSalons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, city, categoryId, status, minRating, latitude, longitude, maxDistance, page, limit, sortBy, sortOrder } = req.query;

    const result = await searchSalons({
      search: search as string,
      city: city as string,
      categoryId: categoryId as string,
      status: (status as string) || 'approved',
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.status(200).json({
      success: true,
      message: 'Salons retrieved successfully',
      data: result.salons,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('getAllSalons error:', error);
    next(error);
  }
};

export const getSalonById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const salon = await Salon.findById(id)
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon description');

    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Salon retrieved successfully', data: salon });
  } catch (error) {
    logger.error(`getSalonById error for id ${req.params.id}:`, error);
    next(error);
  }
};

export const getMySalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const salon = await Salon.findOne({ ownerId: userId })
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon description');

    if (!salon) {
      res.status(404).json({ success: false, message: 'You do not have a salon registered' });
      return;
    }

    res.status(200).json({ success: true, message: 'Salon retrieved successfully', data: salon });
  } catch (error) {
    logger.error('getMySalon error:', error);
    next(error);
  }
};

export const updateSalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const salon = await Salon.findById(id);
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    const isAdmin = req.user?.role === 'super_admin';
    const isOwner = salon.ownerId.toString() === userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, message: 'You are not authorized to update this salon' });
      return;
    }

    // Strip fields that are always admin-controlled.
    const { status: _s, rating: _r, approvedBy: _a, approvedAt: _at, ownerId: _o, ...updateData } = req.body;
    // Owners cannot change working hours — only admin can.
    if (!isAdmin && 'workingHours' in updateData) {
      delete (updateData as any).workingHours;
    }
    // Track pending changes for admin review (except the quick-toggle fields).
    const ownerChangedCoreInfo =
      !isAdmin &&
      Object.keys(updateData).some(k => !['manualClosed'].includes(k));
    if (ownerChangedCoreInfo) {
      (updateData as any).hasPendingChanges = true;
    }

    const updatedSalon = await Salon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon');

    logger.info(`updateSalon: salon ${id} updated by user ${userId}`);
    res.status(200).json({ success: true, message: 'Salon updated successfully', data: updatedSalon });
  } catch (error) {
    logger.error(`updateSalon error for salon ${req.params.id}:`, error);
    next(error);
  }
};

export const uploadSalonImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const salon = await Salon.findById(id);
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    if (salon.ownerId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to upload images for this salon' });
      return;
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file, 'salons'));
    const uploadedImages = await Promise.all(uploadPromises);

    const newImages = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      isPrimary: salon.images.length === 0 && index === 0,
    }));

    salon.images.push(...newImages);
    await salon.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: newImages, totalImages: salon.images.length },
    });
  } catch (error) {
    logger.error(`uploadSalonImages error for salon ${req.params.id}:`, error);
    next(error);
  }
};

export const deleteSalonImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, imageId } = req.params;
    const userId = req.user?.id;

    const salon = await Salon.findById(id);
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    if (salon.ownerId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to delete images from this salon' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageIndex = salon.images.findIndex((img: any) => img._id?.toString() === imageId);
    if (imageIndex === -1) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = salon.images[imageIndex] as any;
    await deleteFromCloudinary(image.publicId);
    salon.images.splice(imageIndex, 1);
    if (image.isPrimary && salon.images.length > 0) {
      (salon.images[0] as any).isPrimary = true;
    }
    await salon.save();

    res.status(200).json({ success: true, message: 'Image deleted successfully', data: { remainingImages: salon.images.length } });
  } catch (error) {
    logger.error(`deleteSalonImage error for salon ${req.params.id}:`, error);
    next(error);
  }
};

export const getNearbySalonsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { latitude, longitude, maxDistance, limit } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      return;
    }

    const salons = await getNearbySalons(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      maxDistance ? parseInt(maxDistance as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({ success: true, message: 'Nearby salons retrieved successfully', data: salons });
  } catch (error) {
    logger.error('getNearbySalons error:', error);
    next(error);
  }
};

export const getPopularSalonsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit } = req.query;
    const salons = await getPopularSalons(limit ? parseInt(limit as string) : undefined);
    res.status(200).json({ success: true, message: 'Popular salons retrieved successfully', data: salons });
  } catch (error) {
    logger.error('getPopularSalons error:', error);
    next(error);
  }
};

export default {
  createSalon,
  getAllSalons,
  getSalonById,
  getMySalon,
  updateSalon,
  uploadSalonImages,
  deleteSalonImage,
  getNearbySalonsController,
  getPopularSalonsController,
};
