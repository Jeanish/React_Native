import { Request, Response, NextFunction } from 'express';
import Salon from '../models/Salon';
import User from '../models/User';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.service';
import { searchSalons, getNearbySalons, getPopularSalons } from '../services/search.service';

/**
 * Create a new salon
 * @route POST /api/v1/salons
 * @access Private (Salon Admin)
 */
export const createSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    // Check if user already has a salon
    const existingSalon = await Salon.findOne({ ownerId: userId });
    if (existingSalon) {
      return res.status(400).json({
        success: false,
        message: 'You already have a salon registered',
      });
    }

    // Create salon
    const salon = await Salon.create({
      ...req.body,
      ownerId: userId,
      status: 'pending',
    });

    // Update user's salonId
    await User.findByIdAndUpdate(userId, { salonId: salon._id });

    // Populate owner and category
    await salon.populate('ownerId', 'firstName lastName email phone');
    await salon.populate('categoryId', 'name slug icon');

    res.status(201).json({
      success: true,
      message: 'Salon created successfully. Awaiting admin approval.',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all salons with filters
 * @route GET /api/v1/salons
 * @access Public
 */
export const getAllSalons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      city,
      categoryId,
      status,
      minRating,
      latitude,
      longitude,
      maxDistance,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await searchSalons({
      search: search as string,
      city: city as string,
      categoryId: categoryId as string,
      status: status as string || 'approved',
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
    next(error);
  }
};

/**
 * Get salon by ID
 * @route GET /api/v1/salons/:id
 * @access Public
 */
export const getSalonById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const salon = await Salon.findById(id)
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon description');

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salon retrieved successfully',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my salon (for salon admin)
 * @route GET /api/v1/salons/my-salon
 * @access Private (Salon Admin)
 */
export const getMySalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const salon = await Salon.findOne({ ownerId: userId })
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon description');

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'You do not have a salon registered',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salon retrieved successfully',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update salon
 * @route PUT /api/v1/salons/:id
 * @access Private (Salon Admin - own salon only)
 */
export const updateSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find salon
    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this salon',
      });
    }

    // Don't allow updating certain fields
    const { status, rating, approvedBy, approvedAt, ownerId, ...updateData } = req.body;

    // Update salon
    const updatedSalon = await Salon.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon');

    res.status(200).json({
      success: true,
      message: 'Salon updated successfully',
      data: updatedSalon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload salon images
 * @route POST /api/v1/salons/:id/images
 * @access Private (Salon Admin - own salon only)
 */
export const uploadSalonImages = async (req: Request, res: Response, next: NextFunction) => {
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

    // Find salon
    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload images for this salon',
      });
    }

    // Upload images to Cloudinary
    const uploadPromises = files.map((file) => uploadToCloudinary(file, 'salons'));
    const uploadedImages = await Promise.all(uploadPromises);

    // Add images to salon
    const newImages = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      isPrimary: salon.images.length === 0 && index === 0, // First image is primary if no images exist
    }));

    salon.images.push(...newImages);
    await salon.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: newImages,
        totalImages: salon.images.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete salon image
 * @route DELETE /api/v1/salons/:id/images/:imageId
 * @access Private (Salon Admin - own salon only)
 */
export const deleteSalonImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, imageId } = req.params;
    const userId = req.user?.id;

    // Find salon
    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete images from this salon',
      });
    }

    // Find image
    const imageIndex = salon.images.findIndex((img) => img._id?.toString() === imageId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    const image = salon.images[imageIndex];

    // Delete from Cloudinary
    await deleteFromCloudinary(image.publicId);

    // Remove from salon
    salon.images.splice(imageIndex, 1);

    // If deleted image was primary, make first image primary
    if (image.isPrimary && salon.images.length > 0) {
      salon.images[0].isPrimary = true;
    }

    await salon.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remainingImages: salon.images.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby salons
 * @route GET /api/v1/salons/nearby
 * @access Public
 */
export const getNearbySalonsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, maxDistance, limit } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const salons = await getNearbySalons(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      maxDistance ? parseInt(maxDistance as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Nearby salons retrieved successfully',
      data: salons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get popular salons
 * @route GET /api/v1/salons/popular
 * @access Public
 */
export const getPopularSalonsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query;

    const salons = await getPopularSalons(limit ? parseInt(limit as string) : undefined);

    res.status(200).json({
      success: true,
      message: 'Popular salons retrieved successfully',
      data: salons,
    });
  } catch (error) {
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
