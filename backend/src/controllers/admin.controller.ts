import { Request, Response, NextFunction } from 'express';
import Salon from '../models/Salon';
import Category from '../models/Category';
import City from '../models/City';
import { emitSalonApproved, emitSalonRejected } from '../socket';

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalSalons, pendingSalons, approvedSalons, rejectedSalons, totalCategories, totalCities] =
      await Promise.all([
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
        salons: { total: totalSalons, pending: pendingSalons, approved: approvedSalons, rejected: rejectedSalons },
        categories: totalCategories,
        cities: totalCities,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingSalons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export const markSalonReviewed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const salon = await Salon.findByIdAndUpdate(id, { hasPendingChanges: false }, { new: true });
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Marked as reviewed', data: salon });
  } catch (error) {
    next(error);
  }
};

export const approveSalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const salon = await Salon.findById(id);

    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    if (salon.status !== 'pending') {
      res.status(400).json({ success: false, message: `Salon is already ${salon.status}` });
      return;
    }

    salon.status = 'approved';
    salon.approvedBy = adminId as unknown as import('mongoose').Types.ObjectId;
    salon.approvedAt = new Date();
    salon.rejectionReason = undefined;
    await salon.save();

    emitSalonApproved(String(salon._id), salon.name);
    res.status(200).json({ success: true, message: 'Salon approved successfully', data: salon });
  } catch (error) {
    next(error);
  }
};

export const rejectSalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, message: 'Rejection reason is required' });
      return;
    }

    const salon = await Salon.findById(id);

    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    if (salon.status !== 'pending') {
      res.status(400).json({ success: false, message: `Salon is already ${salon.status}` });
      return;
    }

    salon.status = 'rejected';
    salon.rejectionReason = reason;
    await salon.save();

    emitSalonRejected(String(salon._id), salon.name, reason);
    res.status(200).json({ success: true, message: 'Salon rejected successfully', data: salon });
  } catch (error) {
    next(error);
  }
};

export const suspendSalon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const salon = await Salon.findById(id);

    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }

    salon.status = 'suspended';
    salon.rejectionReason = reason;
    await salon.save();

    res.status(200).json({ success: true, message: 'Salon suspended successfully', data: salon });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, message: 'Categories retrieved successfully', data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const salonsUsingCategory = await Salon.countDocuments({ categoryId: id });
    if (salonsUsingCategory > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category. ${salonsUsingCategory} salon(s) are using this category.`,
      });
      return;
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAllCities = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.status(200).json({ success: true, message: 'Cities retrieved successfully', data: cities });
  } catch (error) {
    next(error);
  }
};

export const createCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const city = await City.create(req.body);
    res.status(201).json({ success: true, message: 'City created successfully', data: city });
  } catch (error) {
    next(error);
  }
};

export const updateCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const city = await City.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'City updated successfully', data: city });
  } catch (error) {
    next(error);
  }
};

export const deleteCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const city = await City.findByIdAndDelete(id);

    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'City deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardStats,
  getPendingSalons,
  approveSalon,
  markSalonReviewed,
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
