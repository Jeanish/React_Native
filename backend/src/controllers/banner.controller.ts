import { Request, Response, NextFunction } from 'express';
import Banner from '../models/Banner';
import BrandPartner from '../models/BrandPartner';
import { logger } from '../utils/logger';

// ─── Banners ──────────────────────────────────────────────────────────────────

export const createBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.userId;
    const banner = await Banner.create({ ...req.body, createdBy: adminId });
    logger.info(`Banner created: ${banner._id} by admin ${adminId}`);
    res.status(201).json({ success: true, message: 'Banner created successfully', data: banner });
  } catch (error) {
    logger.error('createBanner error:', error);
    next(error);
  }
};

export const getAllBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive, targetType, page = 1, limit = 20 } = req.query;
    const query: Record<string, unknown> = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (targetType) query.targetType = targetType;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [banners, total] = await Promise.all([
      Banner.find(query)
        .populate('brandId', 'name logo')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Banner.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: banners,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (error) {
    logger.error('getAllBanners error:', error);
    next(error);
  }
};

export const getLiveBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { targetType, targetId } = req.query;
    const now = new Date();

    const query: Record<string, unknown> = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (targetType && targetId) {
      query.$or = [{ targetType: 'all' }, { targetType, targetId }];
    }

    const banners = await Banner.find(query)
      .populate('brandId', 'name logo')
      .sort({ priority: -1 })
      .limit(10);

    // Track impressions
    await Banner.updateMany({ _id: { $in: banners.map((b) => b._id) } }, { $inc: { impressions: 1 } });

    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    logger.error('getLiveBanners error:', error);
    next(error);
  }
};

export const updateBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Banner updated', data: banner });
  } catch (error) {
    logger.error(`updateBanner error for ${req.params.id}:`, error);
    next(error);
  }
};

export const deleteBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    logger.error(`deleteBanner error for ${req.params.id}:`, error);
    next(error);
  }
};

export const trackBannerClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await Banner.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Brand Partners ───────────────────────────────────────────────────────────

export const createBrandPartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.userId;
    const brand = await BrandPartner.create({ ...req.body, createdBy: adminId });
    logger.info(`BrandPartner created: ${brand._id} (${brand.name})`);
    res.status(201).json({ success: true, message: 'Brand partner created', data: brand });
  } catch (error) {
    logger.error('createBrandPartner error:', error);
    next(error);
  }
};

export const getAllBrandPartners = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await BrandPartner.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    logger.error('getAllBrandPartners error:', error);
    next(error);
  }
};

export const getBrandPartnerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await BrandPartner.findById(req.params.id);
    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand partner not found' });
      return;
    }
    res.status(200).json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};

export const updateBrandPartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await BrandPartner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand partner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Brand partner updated', data: brand });
  } catch (error) {
    logger.error(`updateBrandPartner error for ${req.params.id}:`, error);
    next(error);
  }
};

export const deleteBrandPartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await BrandPartner.findByIdAndDelete(req.params.id);
    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand partner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Brand partner deleted' });
  } catch (error) {
    next(error);
  }
};

export const addProductToBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await BrandPartner.findByIdAndUpdate(
      req.params.id,
      { $push: { products: req.body } },
      { new: true, runValidators: true }
    );
    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand partner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Product added', data: brand });
  } catch (error) {
    next(error);
  }
};

export const removeProductFromBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await BrandPartner.findByIdAndUpdate(
      req.params.id,
      { $pull: { products: { _id: req.params.productId } } },
      { new: true }
    );
    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand partner not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Product removed', data: brand });
  } catch (error) {
    next(error);
  }
};
