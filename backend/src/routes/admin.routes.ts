import { Router } from 'express';
import {
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
} from '../controllers/admin.controller';
import {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
  createBrandPartner,
  getAllBrandPartners,
  getBrandPartnerById,
  updateBrandPartner,
  deleteBrandPartner,
  addProductToBrand,
  removeProductFromBrand,
} from '../controllers/banner.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/roleCheck.middleware';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

// ─── Validation schemas ───────────────────────────────────────────────────────

const rejectSalonSchema = Joi.object({ reason: Joi.string().required().min(10).max(500).trim() });
const suspendSalonSchema = Joi.object({ reason: Joi.string().min(10).max(500).trim() });

const categorySchema = Joi.object({
  name: Joi.string().required().max(50).trim(),
  description: Joi.string().max(200).trim(),
  icon: Joi.string().trim(),
  isActive: Joi.boolean(),
});

const citySchema = Joi.object({
  name: Joi.string().required().max(100).trim(),
  state: Joi.string().required().max(100).trim(),
  country: Joi.string().max(100).trim().default('India'),
  // location: Joi.object({
  //   type: Joi.string().valid('Point').default('Point'),
  //   coordinates: Joi.array().items(Joi.number()).length(2).required(),
  // }).required(),
  isActive: Joi.boolean(),
});

const bannerSchema = Joi.object({
  title: Joi.string().required().max(100).trim(),
  subtitle: Joi.string().max(200).trim(),
  imageUrl: Joi.string().required().uri(),
  ctaText: Joi.string().max(50).trim(),
  ctaLink: Joi.string().trim(),
  targetType: Joi.string().valid('all', 'category', 'city', 'salon').default('all'),
  targetId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  discountPercent: Joi.number().min(0).max(100),
  discountCode: Joi.string().trim().uppercase(),
  brandId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  priority: Joi.number().min(0).default(0),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  isActive: Joi.boolean().default(true),
});

const brandSchema = Joi.object({
  name: Joi.string().required().max(100).trim(),
  logo: Joi.string().uri(),
  description: Joi.string().max(500).trim(),
  website: Joi.string().uri(),
  contactEmail: Joi.string().email(),
  eligibleCategories: Joi.array().items(Joi.string().valid('men', 'women', 'unisex')),
  isAllSalonsEligible: Joi.boolean().default(true),
  commissionPercent: Joi.number().min(0).max(100).default(10),
  isActive: Joi.boolean().default(true),
});

const brandProductSchema = Joi.object({
  name: Joi.string().required().trim(),
  description: Joi.string().trim(),
  imageUrl: Joi.string().uri(),
  mrp: Joi.number().required().min(0),
  partnerPrice: Joi.number().required().min(0),
  customerDiscountPercent: Joi.number().required().min(0).max(100),
  isActive: Joi.boolean().default(true),
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ─── Salon management ─────────────────────────────────────────────────────────
router.get('/salons/pending', getPendingSalons);
router.patch('/salons/:id/approve', approveSalon);
router.patch('/salons/:id/reject', validate({ body: rejectSalonSchema }), rejectSalon);
router.patch('/salons/:id/suspend', validate({ body: suspendSalonSchema }), suspendSalon);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', getAllCategories);
router.post('/categories', validate({ body: categorySchema }), createCategory);
router.put('/categories/:id', validate({ body: categorySchema }), updateCategory);
router.delete('/categories/:id', deleteCategory);

// ─── Cities ───────────────────────────────────────────────────────────────────
router.get('/cities', getAllCities);
router.post('/cities', validate({ body: citySchema }), createCity);
router.put('/cities/:id', validate({ body: citySchema }), updateCity);
router.delete('/cities/:id', deleteCity);

// ─── Banners / Promotions ─────────────────────────────────────────────────────
router.get('/banners', getAllBanners);
router.post('/banners', validate({ body: bannerSchema }), createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// ─── Brand Partners ───────────────────────────────────────────────────────────
router.get('/brands', getAllBrandPartners);
router.get('/brands/:id', getBrandPartnerById);
router.post('/brands', validate({ body: brandSchema }), createBrandPartner);
router.put('/brands/:id', updateBrandPartner);
router.delete('/brands/:id', deleteBrandPartner);
router.post('/brands/:id/products', validate({ body: brandProductSchema }), addProductToBrand);
router.delete('/brands/:id/products/:productId', removeProductFromBrand);

export default router;
