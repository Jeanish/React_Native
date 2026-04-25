import { Router } from 'express';
import {
  createSalon,
  getAllSalons,
  getSalonById,
  getMySalon,
  updateSalon,
  uploadSalonImages,
  deleteSalonImage,
  getNearbySalonsController,
  getPopularSalonsController,
} from '../controllers/salon.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requireSalonAdmin } from '../middleware/roleCheck.middleware';
import { validate } from '../middleware/validation.middleware';
import { multerUpload } from '../services/upload.service';
import Joi from 'joi';

const router = Router();

const createSalonSchema = Joi.object({
  name: Joi.string().required().max(100).trim(),
  description: Joi.string().max(1000).trim(),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  phone: Joi.string().required().trim(),
  email: Joi.string().email().trim(),
  address: Joi.object({
    street: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    state: Joi.string().required().trim(),
    zipCode: Joi.string().required().trim(),
    country: Joi.string().trim().default('India'),
  }).required(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }).required(),
  workingHours: Joi.array().items(
    Joi.object({
      day: Joi.number().min(0).max(6).required(),
      openTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      closeTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      isClosed: Joi.boolean().default(false),
    })
  ),
});

const updateSalonSchema = Joi.object({
  name: Joi.string().max(100).trim(),
  description: Joi.string().max(1000).trim(),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  phone: Joi.string().trim(),
  email: Joi.string().email().trim(),
  address: Joi.object({
    street: Joi.string().trim(),
    city: Joi.string().trim(),
    state: Joi.string().trim(),
    zipCode: Joi.string().trim(),
    country: Joi.string().trim(),
  }),
  location: Joi.object({
    type: Joi.string().valid('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2),
  }),
  workingHours: Joi.array().items(
    Joi.object({
      day: Joi.number().min(0).max(6).required(),
      openTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      closeTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      isClosed: Joi.boolean(),
    })
  ),
  isActive: Joi.boolean(),
  manualClosed: Joi.boolean(),
});

// Public routes
router.get('/', getAllSalons);
router.get('/nearby', getNearbySalonsController);
router.get('/popular', getPopularSalonsController);

// /my-salon must be before /:id so Express doesn't treat "my-salon" as an id
router.get('/my-salon', authenticate, requireRole('salon_admin', 'super_admin'), getMySalon);

router.get('/:id', getSalonById);

router.post('/', authenticate, requireRole('salon_admin', 'super_admin'), validate({ body: createSalonSchema }), createSalon);
router.put('/:id', authenticate, requireRole('salon_admin', 'super_admin'), validate({ body: updateSalonSchema }), updateSalon);

router.post('/:id/images', authenticate, requireSalonAdmin, multerUpload.array('images', 10), uploadSalonImages);
router.delete('/:id/images/:imageId', authenticate, requireSalonAdmin, deleteSalonImage);

export default router;
