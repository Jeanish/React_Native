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
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/roleCheck.middleware';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

/**
 * All admin routes require authentication and super_admin role
 */
router.use(authenticate);
router.use(checkRole(['super_admin']));

/**
 * Validation schemas
 */
const rejectSalonSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500).trim(),
});

const suspendSalonSchema = Joi.object({
  reason: Joi.string().min(10).max(500).trim(),
});

const categorySchema = Joi.object({
  name: Joi.string().required().max(50).trim(),
  description: Joi.string().max(200).trim(),
  icon: Joi.string().trim(),
  isActive: Joi.boolean(),
});

const citySchema = Joi.object({
  name: Joi.string().required().max(100).trim(),
  state: Joi.string().required().max(100).trim(),
  country: Joi.string().max(100).trim().default('USA'),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }).required(),
  isActive: Joi.boolean(),
});

/**
 * Dashboard routes
 */
router.get('/dashboard', getDashboardStats);

/**
 * Salon management routes
 */
router.get('/salons/pending', getPendingSalons);
router.patch('/salons/:id/approve', approveSalon);
router.patch('/salons/:id/reject', validate(rejectSalonSchema), rejectSalon);
router.patch('/salons/:id/suspend', validate(suspendSalonSchema), suspendSalon);

/**
 * Category management routes
 */
router.get('/categories', getAllCategories);
router.post('/categories', validate(categorySchema), createCategory);
router.put('/categories/:id', validate(categorySchema), updateCategory);
router.delete('/categories/:id', deleteCategory);

/**
 * City management routes
 */
router.get('/cities', getAllCities);
router.post('/cities', validate(citySchema), createCity);
router.put('/cities/:id', validate(citySchema), updateCity);
router.delete('/cities/:id', deleteCity);

export default router;
