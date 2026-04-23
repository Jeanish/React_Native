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

/**
 * Get available time slots
 * @route GET /api/v1/salons/:salonId/available-slots
 * @access Public
 */
export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salonId } = req.params;
    const { serviceId, date } = req.query;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const appointmentDate = new Date(date as string);

    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const slots = await getAvailableTimeSlots(salonId, serviceId as string, appointmentDate);

    res.status(200).json({
      success: true,
      message: 'Available slots retrieved successfully',
      data: {
        date: appointmentDate,
        slots,
        availableCount: slots.filter((s) => s.available).length,
        totalSlots: slots.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Create appointment
 * @route POST /api/v1/appointments
 * @access Private (Customer)
 */
export const createAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.user?.id;
    const { salonId, serviceIds, appointmentDate, startTime, notes } = req.body;

    if (!salonId || !serviceIds || !appointmentDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID, service IDs, appointment date, and start time are required',
      });
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one service must be selected',
      });
    }

    const appointment = await createAppointment({
      salonId,
      customerId: customerId!,
      serviceIds,
      appointmentDate: new Date(appointmentDate),
      startTime,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get appointment by ID
 * @route GET /api/v1/appointments/:id
 * @access Private (Customer/Salon Admin)
 */
export const getAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const appointment = await getAppointmentById(id, userId!, userRole!);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get user appointments
 * @route GET /api/v1/appointments
 * @access Private (Customer)
 */
export const getUserAppointments = async (req: Request, res: Response, next: NextFunction) => {
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
      pagination: {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get salon appointments
 * @route GET /api/v1/salons/:salonId/appointments
 * @access Private (Salon Admin)
 */
export const getSalonAppointmentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salonId } = req.params;
    const userId = req.user?.id;
    const { status, startDate, endDate, page, limit } = req.query;

    // Verify salon ownership
    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view appointments for this salon',
      });
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
      pagination: {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Confirm appointment
 * @route PATCH /api/v1/appointments/:id/confirm
 * @access Private (Salon Admin)
 */
export const confirmAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const appointment = await confirmAppointment(id, userId!);

    res.status(200).json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Start appointment
 * @route PATCH /api/v1/appointments/:id/start
 * @access Private (Salon Admin)
 */
export const startAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const appointment = await startAppointment(id, userId!);

    res.status(200).json({
      success: true,
      message: 'Appointment started successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Complete appointment
 * @route PATCH /api/v1/appointments/:id/complete
 * @access Private (Salon Admin)
 */
export const completeAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { salonNotes } = req.body;

    const appointment = await completeAppointment(id, userId!, salonNotes);

    res.status(200).json({
      success: true,
      message: 'Appointment completed successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Cancel appointment
 * @route PATCH /api/v1/appointments/:id/cancel
 * @access Private (Customer/Salon Admin)
 */
export const cancelAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const appointment = await cancelAppointment(id, userId!, userRole!, reason);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Reschedule appointment
 * @route PATCH /api/v1/appointments/:id/reschedule
 * @access Private (Customer)
 */
export const rescheduleAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;
    const { appointmentDate, startTime } = req.body;

    if (!appointmentDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date and start time are required',
      });
    }

    const appointment = await rescheduleAppointment(id, customerId!, {
      appointmentDate: new Date(appointmentDate),
      startTime,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Mark appointment as no-show
 * @route PATCH /api/v1/appointments/:id/no-show
 * @access Private (Salon Admin)
 */
export const markAsNoShowController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const appointment = await markAsNoShow(id, userId!);

    res.status(200).json({
      success: true,
      message: 'Appointment marked as no-show',
      data: appointment,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get upcoming appointments
 * @route GET /api/v1/appointments/upcoming
 * @access Private (Customer)
 */
export const getUpcomingAppointmentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.user?.id;
    const { limit } = req.query;

    const appointments = await getUpcomingAppointments(
      customerId!,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Upcoming appointments retrieved successfully',
      data: appointments,
    });
  } catch (error: any) {
    next(error);
  }
};

export default {
  getAvailableSlots,
  createAppointmentController,
  getAppointment,
  getUserAppointments,
  getSalonAppointmentsController,
  confirmAppointmentController,
  startAppointmentController,
  completeAppointmentController,
  cancelAppointmentController,
  rescheduleAppointmentController,
  markAsNoShowController,
  getUpcomingAppointmentsController,
};
