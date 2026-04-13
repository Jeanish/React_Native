import { Router } from 'express';
import {
  createService,
  getSalonServices,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceAvailability,
  uploadServiceImages,
  deleteServiceImage,
} from '../controllers/service.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/roleCheck.middleware';
import { validate } from '../middleware/validation.middleware';
import { multerUpload } from '../services/upload.service';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas
 */
const createServiceSchema = Joi.object({
  name: Joi.string().required().min(3).max(100).trim(),
  description: Joi.string().max(1000).trim(),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  price: Joi.number().required().min(0),
  discountedPrice: Joi.number().min(0),
  duration: Joi.number().required().min(15).max(480),
  requirements: Joi.string().max(500).trim(),
  maxAdvanceBookingDays: Joi.number().min(1).max(90),
  minAdvanceBookingHours: Joi.number().min(0).max(72),
  bufferTime: Joi.number().min(0).max(60),
  isActive: Joi.boolean(),
  isAvailable: Joi.boolean(),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().min(3).max(100).trim(),
  description: Joi.string().max(1000).trim(),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  price: Joi.number().min(0),
  discountedPrice: Joi.number().min(0),
  duration: Joi.number().min(15).max(480),
  requirements: Joi.string().max(500).trim(),
  maxAdvanceBookingDays: Joi.number().min(1).max(90),
  minAdvanceBookingHours: Joi.number().min(0).max(72),
  bufferTime: Joi.number().min(0).max(60),
  isActive: Joi.boolean(),
  isAvailable: Joi.boolean(),
});

const toggleAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required(),
});

/**
 * Public routes
 */
router.get('/salons/:salonId/services', getSalonServices);
router.get('/:id', getServiceById);

/**
 * Protected routes (Salon Admin)
 */
router.post(
  '/salons/:salonId/services',
  authenticate,
  checkRole(['salon_admin']),
  validate(createServiceSchema),
  createService
);

router.put(
  '/:id',
  authenticate,
  checkRole(['salon_admin']),
  validate(updateServiceSchema),
  updateService
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['salon_admin']),
  deleteService
);

router.patch(
  '/:id/availability',
  authenticate,
  checkRole(['salon_admin']),
  validate(toggleAvailabilitySchema),
  toggleServiceAvailability
);

router.post(
  '/:id/images',
  authenticate,
  checkRole(['salon_admin']),
  multerUpload.array('images', 5), // Max 5 images
  uploadServiceImages
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  checkRole(['salon_admin']),
  deleteServiceImage
);

export default router;
