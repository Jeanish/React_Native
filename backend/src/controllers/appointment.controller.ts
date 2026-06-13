import { Request, Response, NextFunction } from 'express';
import { getAvailableTimeSlots } from '../services/availability.service';
import {
  createAppointment,
  getAppointmentById,
  getCustomerAppointments,
  getSalonAppointments,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  rescheduleAppointment,
  markAsNoShow,
  getUpcomingAppointments,
} from '../services/appointment.service';
import { AppointmentStatus } from '../models/Appointment';
import Salon from '../models/Salon';
import { logger } from '../utils/logger';

export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { salonId } = req.params;
    const { serviceId, date } = req.query;

    if (!serviceId) {
      res.status(400).json({ success: false, message: 'Service ID is required' });
      return;
    }
    if (!date) {
      res.status(400).json({ success: false, message: 'Date is required' });
      return;
    }

    const appointmentDate = new Date(date as string);
    if (isNaN(appointmentDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid date format' });
      return;
    }

    const slots = await getAvailableTimeSlots(salonId, serviceId as string, appointmentDate);

    res.status(200).json({
      success: true,
      message: 'Available slots retrieved successfully',
      data: { date: appointmentDate, slots, availableCount: slots.filter((s) => s.available).length, totalSlots: slots.length },
    });
  } catch (error) {
    logger.error('getAvailableSlots error:', error);
    next(error);
  }
};

export const createAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = req.user?.id;
    const { salonId, serviceIds, appointmentDate, startTime, notes } = req.body;

    if (!salonId || !serviceIds || !appointmentDate || !startTime) {
      res.status(400).json({ success: false, message: 'Salon ID, service IDs, appointment date, and start time are required' });
      return;
    }
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      res.status(400).json({ success: false, message: 'At least one service must be selected' });
      return;
    }

    const appointment = await createAppointment({
      salonId,
      customerId: customerId!,
      serviceIds,
      appointmentDate: new Date(appointmentDate),
      startTime,
      notes,
    });

    logger.info(`createAppointment: appointment ${appointment._id} created by customer ${customerId}`);
    res.status(201).json({ success: true, message: 'Appointment created successfully', data: appointment });
  } catch (error) {
    logger.error('createAppointment error:', error);
    next(error);
  }
};

export const getAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const appointment = await getAppointmentById(id, userId!, userRole!);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Appointment retrieved successfully', data: appointment });
  } catch (error) {
    logger.error(`getAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const getUserAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = req.user?.id;
    const { status, page, limit } = req.query;

    const result = await getCustomerAppointments(
      customerId!,
      status as AppointmentStatus,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: result.appointments,
      pagination: { page: page ? parseInt(page as string) : 1, limit: limit ? parseInt(limit as string) : 20, total: result.total, pages: result.pages },
    });
  } catch (error) {
    logger.error('getUserAppointments error:', error);
    next(error);
  }
};

/**
 * Walk-in booking by owner: phone + name come from owner input, not the JWT.
 * If a user with that phone exists, reuse them; otherwise create a lightweight customer.
 */
export const createWalkInAppointmentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { customerPhone, customerName, serviceId, appointmentDate, startTime, notes } = req.body;

    if (!customerPhone || !/^[6-9]\d{9}$|^0\d{9}$/.test(String(customerPhone).replace(/\D/g, '').slice(-10))) {
      res.status(400).json({ success: false, message: 'Valid 10-digit customer phone is required' });
      return;
    }
    const phone = String(customerPhone).replace(/\D/g, '').slice(-10);

    const salon = await Salon.findOne({ ownerId });
    if (!salon) {
      res.status(404).json({ success: false, message: 'You do not have a salon' });
      return;
    }

    const { User } = await import('../models/User');
    let customer = await User.findOne({ phone });
    if (!customer) {
      const [firstName, ...rest] = (customerName ?? 'Walk-in').trim().split(' ');
      customer = await User.create({
        phone,
        firstName: firstName || 'Walk-in',
        lastName: rest.join(' ') || 'Customer',
        role: 'customer',
        isPhoneVerified: false,
        isActive: true,
      });
    }

    const appt = await createAppointment({
      salonId: (salon._id as any).toString(),
      customerId: (customer._id as any).toString(),
      serviceIds: [serviceId],
      appointmentDate: new Date(appointmentDate),
      startTime,
      notes,
    } as any);

    res.status(201).json({ success: true, message: 'Walk-in booked', data: appt });
  } catch (error: any) {
    logger.error('createWalkIn error:', error);
    res.status(400).json({ success: false, message: error?.message ?? 'Walk-in failed' });
  }
};

export const getMySalonAppointmentsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const salon = await Salon.findOne({ ownerId: userId });
    if (!salon) {
      res.status(404).json({ success: false, message: 'You do not have a salon registered' });
      return;
    }
    const { status, date, startDate, endDate, page, limit } = req.query;
    // If a single `date` was provided, treat it as a one-day window.
    const sd = date ? new Date(date as string) : startDate ? new Date(startDate as string) : undefined;
    const ed = date
      ? new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000 - 1)
      : endDate ? new Date(endDate as string) : undefined;
    const result = await getSalonAppointments(
      (salon._id as any).toString(),
      status as AppointmentStatus,
      sd,
      ed,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined,
    );
    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: result.appointments,
      pagination: {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    logger.error('getMySalonAppointments error:', error);
    next(error);
  }
};

export const getSalonAppointmentsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { salonId } = req.params;
    const userId = req.user?.id;
    const { status, startDate, endDate, page, limit } = req.query;

    const salon = await Salon.findById(salonId);
    if (!salon) {
      res.status(404).json({ success: false, message: 'Salon not found' });
      return;
    }
    if (salon.ownerId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to view appointments for this salon' });
      return;
    }

    const result = await getSalonAppointments(
      salonId,
      status as AppointmentStatus,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: result.appointments,
      pagination: { page: page ? parseInt(page as string) : 1, limit: limit ? parseInt(limit as string) : 50, total: result.total, pages: result.pages },
    });
  } catch (error) {
    logger.error(`getSalonAppointments error for salon ${req.params.salonId}:`, error);
    next(error);
  }
};

export const confirmAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const appointment = await confirmAppointment(id, userId!);
    res.status(200).json({ success: true, message: 'Appointment confirmed successfully', data: appointment });
  } catch (error) {
    logger.error(`confirmAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const startAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const appointment = await startAppointment(id, userId!);
    res.status(200).json({ success: true, message: 'Appointment started successfully', data: appointment });
  } catch (error) {
    logger.error(`startAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const completeAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { salonNotes } = req.body;
    const appointment = await completeAppointment(id, userId!, salonNotes);
    res.status(200).json({ success: true, message: 'Appointment completed successfully', data: appointment });
  } catch (error) {
    logger.error(`completeAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const cancelAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, message: 'Cancellation reason is required' });
      return;
    }

    const appointment = await cancelAppointment(id, userId!, userRole!, reason);
    res.status(200).json({ success: true, message: 'Appointment cancelled successfully', data: appointment });
  } catch (error) {
    logger.error(`cancelAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const rescheduleAppointmentController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;
    const { appointmentDate, startTime } = req.body;

    if (!appointmentDate || !startTime) {
      res.status(400).json({ success: false, message: 'Appointment date and start time are required' });
      return;
    }

    const appointment = await rescheduleAppointment(id, customerId!, { appointmentDate: new Date(appointmentDate), startTime });
    res.status(200).json({ success: true, message: 'Appointment rescheduled successfully', data: appointment });
  } catch (error) {
    logger.error(`rescheduleAppointment error for ${req.params.id}:`, error);
    next(error);
  }
};

export const markAsNoShowController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const appointment = await markAsNoShow(id, userId!);
    res.status(200).json({ success: true, message: 'Appointment marked as no-show', data: appointment });
  } catch (error) {
    logger.error(`markAsNoShow error for ${req.params.id}:`, error);
    next(error);
  }
};

export const getUpcomingAppointmentsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = req.user?.id;
    const { limit } = req.query;
    const appointments = await getUpcomingAppointments(customerId!, limit ? parseInt(limit as string) : undefined);
    res.status(200).json({ success: true, message: 'Upcoming appointments retrieved successfully', data: appointments });
  } catch (error) {
    logger.error('getUpcomingAppointments error:', error);
    next(error);
  }
};

export default {
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
};
