import { Request, Response, NextFunction } from 'express';
import Salon from '../models/Salon';
import Category from '../models/Category';
import City from '../models/City';

/**
 * Get dashboard statistics
 * @route GET /api/v1/admin/dashboard
 * @access Private (Super Admin)
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalSalons,
      pendingSalons,
      approvedSalons,
      rejectedSalons,
      totalCategories,
      totalCities,
    ] = await Promise.all([
      Salon.countDocuments(),
      Salon.countDocuments({ status: 'pending' }),
      Salon.countDocuments({ status: 'approved' }),
      Salon.countDocuments({ status: 'rejected' }),
      Category.countDocuments({ isActive: true }),
      City.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        salons: {
          total: totalSalons,
          pending: pendingSalons,
          approved: approvedSalons,
          rejected: rejectedSalons,
        },
        categories: totalCategories,
        cities: totalCities,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending salons
 * @route GET /api/v1/admin/salons/pending
 * @access Private (Super Admin)
 */
export const getPendingSalons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const salons = await Salon.find({ status: 'pending' })
      .populate('ownerId', 'firstName lastName email phone')
      .populate('categoryId', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Salon.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      message: 'Pending salons retrieved successfully',
      data: salons,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve salon
 * @route PATCH /api/v1/admin/salons/:id/approve
 * @access Private (Super Admin)
 */
export const approveSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Salon is already ${salon.status}`,
      });
    }

    salon.status = 'approved';
    salon.approvedBy = adminId;
    salon.approvedAt = new Date();
    salon.rejectionReason = undefined;

    await salon.save();

    // TODO: Send notification to salon owner

    res.status(200).json({
      success: true,
      message: 'Salon approved successfully',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject salon
 * @route PATCH /api/v1/admin/salons/:id/reject
 * @access Private (Super Admin)
 */
export const rejectSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Salon is already ${salon.status}`,
      });
    }

    salon.status = 'rejected';
    salon.rejectionReason = reason;

    await salon.save();

    // TODO: Send notification to salon owner

    res.status(200).json({
      success: true,
      message: 'Salon rejected successfully',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend salon
 * @route PATCH /api/v1/admin/salons/:id/suspend
 * @access Private (Super Admin)
 */
export const suspendSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const salon = await Salon.findById(id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    salon.status = 'suspended';
    salon.rejectionReason = reason;

    await salon.save();

    // TODO: Send notification to salon owner

    res.status(200).json({
      success: true,
      message: 'Salon suspended successfully',
      data: salon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories
 * @route GET /api/v1/admin/categories
 * @access Private (Super Admin)
 */
export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create category
 * @route POST /api/v1/admin/categories
 * @access Private (Super Admin)
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * @route PUT /api/v1/admin/categories/:id
 * @access Private (Super Admin)
 */
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * @route DELETE /api/v1/admin/categories/:id
 * @access Private (Super Admin)
 */
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if category is used by any salon
    const salonsUsingCategory = await Salon.countDocuments({ categoryId: id });

    if (salonsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${salonsUsingCategory} salon(s) are using this category.`,
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all cities
 * @route GET /api/v1/admin/cities
 * @access Private (Super Admin)
 */
export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cities = await City.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Cities retrieved successfully',
      data: cities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create city
 * @route POST /api/v1/admin/cities
 * @access Private (Super Admin)
 */
export const createCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = await City.create(req.body);

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: city,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update city
 * @route PUT /api/v1/admin/cities/:id
 * @access Private (Super Admin)
 */
export const updateCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const city = await City.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'City updated successfully',
      data: city,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete city
 * @route DELETE /api/v1/admin/cities/:id
 * @access Private (Super Admin)
 */
export const deleteCity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const city = await City.findByIdAndDelete(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'City deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardStats,
  getPendingSalons,
  approveSalon,
  rejectSalon,
  suspendSalon,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCities,
  createCity,
  updateCity,
  deleteCity,
};
