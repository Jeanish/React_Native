import { Router } from 'express';
import {
  getAvailableSlots,
  createAppointmentController,
  getAppointment,
  getUserAppointments,
  getSalonAppointmentsController,
  getMySalonAppointmentsController,
  createWalkInAppointmentController,
  confirmAppointmentController,
  startAppointmentController,
  completeAppointmentController,
  cancelAppointmentController,
  rescheduleAppointmentController,
  markAsNoShowController,
  getUpcomingAppointmentsController,
} from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCustomer, requireSalonAdmin } from '../middleware/roleCheck.middleware';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

const createAppointmentSchema = Joi.object({
  salonId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
  serviceIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required(),
  appointmentDate: Joi.date().required(),
  startTime: Joi.string().required().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  notes: Joi.string().max(1000).trim(),
});

const cancelAppointmentSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500).trim(),
});

const rescheduleAppointmentSchema = Joi.object({
  appointmentDate: Joi.date().required(),
  startTime: Joi.string().required().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

const completeAppointmentSchema = Joi.object({
  salonNotes: Joi.string().max(1000).trim(),
});

// Public
router.get('/salons/:salonId/available-slots', getAvailableSlots);

// Specific routes must come before /:id so Express doesn't treat them as ids.
router.get('/upcoming', authenticate, requireCustomer, getUpcomingAppointmentsController);
router.get('/my-salon', authenticate, requireSalonAdmin, getMySalonAppointmentsController);
router.get('/', authenticate, requireCustomer, getUserAppointments);
router.get('/:id', authenticate, getAppointment);

router.post('/', authenticate, requireCustomer, validate({ body: createAppointmentSchema }), createAppointmentController);
router.patch('/:id/cancel', authenticate, validate({ body: cancelAppointmentSchema }), cancelAppointmentController);
router.patch('/:id/reschedule', authenticate, requireCustomer, validate({ body: rescheduleAppointmentSchema }), rescheduleAppointmentController);

// Salon admin routes
router.get('/salons/:salonId/appointments', authenticate, requireSalonAdmin, getSalonAppointmentsController);
router.post('/walk-in', authenticate, requireSalonAdmin, createWalkInAppointmentController);
router.patch('/:id/confirm', authenticate, requireSalonAdmin, confirmAppointmentController);
router.patch('/:id/start', authenticate, requireSalonAdmin, startAppointmentController);
router.patch('/:id/complete', authenticate, requireSalonAdmin, validate({ body: completeAppointmentSchema }), completeAppointmentController);
router.patch('/:id/no-show', authenticate, requireSalonAdmin, markAsNoShowController);

export default router;
