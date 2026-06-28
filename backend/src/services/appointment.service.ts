import mongoose from 'mongoose';
import Appointment, { AppointmentStatus, IAppointment } from '../models/Appointment';
import Service from '../models/Service';
import Salon from '../models/Salon';
import { User } from '../models/User';
import { validateAppointmentTime, timeToMinutes, minutesToTime } from './availability.service';
import { sendToUser } from './notification.service';
import { logger } from '../utils/logger';
import { getISTSlotDateTime } from '../utils/timezone';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  buildTimeOverlapFilter,
  getDayBounds,
} from '../utils/appointmentQuery';

/** Notify both owner and customer that a new booking exists. */
async function notifyNewAppointment(appt: IAppointment): Promise<void> {
  const salon = await Salon.findById(appt.salonId).select('ownerId name').lean();
  if (!salon) return;
  const customerId = (appt.customerId as any)?._id ?? appt.customerId;
  const dateStr = new Date(appt.appointmentDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  await Promise.all([
    sendToUser((salon as any).ownerId, {
      title: 'New booking',
      body: `${dateStr} · ${appt.startTime} at ${(salon as any).name}`,
      data: { appointmentId: String(appt._id), type: 'new_booking' },
    }),
    sendToUser(customerId, {
      title: 'Booking received',
      body: `Your booking at ${(salon as any).name} for ${dateStr} at ${appt.startTime} is pending.`,
      data: { appointmentId: String(appt._id), type: 'booking_pending' },
    }),
  ]);
}

/** Notify the customer when the salon updates their booking status. */
async function notifyStatusChange(appt: IAppointment, status: AppointmentStatus): Promise<void> {
  const customerId = (appt.customerId as any)?._id ?? appt.customerId;
  const messages: Record<string, { title: string; body: string }> = {
    [AppointmentStatus.CONFIRMED]: { title: 'Booking confirmed', body: `Your booking at ${appt.startTime} is confirmed.` },
    [AppointmentStatus.IN_PROGRESS]: { title: 'Your service has started', body: 'Enjoy your service!' },
    [AppointmentStatus.COMPLETED]: { title: 'All done — thank you!', body: 'Rate your experience in the app.' },
    [AppointmentStatus.CANCELLED]: { title: 'Booking cancelled', body: 'Your booking was cancelled.' },
    [AppointmentStatus.NO_SHOW]: { title: 'Marked as no-show', body: 'You missed your booking.' },
  };
  const m = messages[status];
  if (!m) return;
  await sendToUser(customerId, { ...m, data: { appointmentId: String(appt._id), type: `status_${status}` } });
}

/**
 * Create appointment data interface
 */
export interface CreateAppointmentData {
  salonId: string;
  customerId: string;
  serviceIds: string[];
  appointmentDate: Date;
  startTime: string;
  notes?: string;
}

/**
 * Reschedule appointment data interface
 */
export interface RescheduleAppointmentData {
  appointmentDate: Date;
  startTime: string;
}

/**
 * Create a new appointment
 */
export const createAppointment = async (
  data: CreateAppointmentData
): Promise<IAppointment> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { salonId, customerId, serviceIds, appointmentDate, startTime, notes } = data;

    // Validate salon
    const salon = await Salon.findById(salonId).session(session);

    if (!salon || !salon.isActive || salon.status !== 'approved') {
      throw new Error('Salon is not available for bookings');
    }

    // Validate customer
    const customer = await User.findById(customerId).session(session);

    if (!customer || !customer.isActive) {
      throw new Error('Customer account is not active');
    }

    // Validate and get services
    if (!serviceIds || serviceIds.length === 0) {
      throw new Error('At least one service must be selected');
    }

    const services = await Service.find({
      _id: { $in: serviceIds },
      salonId,
      isActive: true,
      isAvailable: true,
    }).session(session);

    if (services.length !== serviceIds.length) {
      throw new Error('One or more services are not available');
    }

    // Calculate total duration and price
    let totalDuration = 0;
    let totalPrice = 0;
    const appointmentServices = services.map((service) => {
      totalDuration += service.duration;
      const price = service.discountedPrice || service.price;
      totalPrice += price;

      return {
        serviceId: service._id,
        serviceName: service.name,
        price,
        duration: service.duration,
      };
    });

    // Calculate end time
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totalDuration;
    const endTime = minutesToTime(endMinutes);

    // Validate appointment time for the first service
    const validation = await validateAppointmentTime(
      salonId,
      serviceIds[0],
      appointmentDate,
      startTime
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const overlapFilter = buildTimeOverlapFilter(startTime, endTime);

    // Check for customer conflicts (customer can't have overlapping appointments)
    const customerConflicts = await Appointment.find({
      customerId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      ...overlapFilter,
    }).session(session);

    if (customerConflicts.length > 0) {
      throw new Error('You already have an appointment at this time');
    }

    // Check salon capacity for the selected slot
    const salonCapacity = Math.max(1, salon.totalSeats ?? 1);
    const salonConflicts = await Appointment.find({
      salonId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      ...overlapFilter,
    }).session(session);

    if (salonConflicts.length >= salonCapacity) {
      throw new Error('Selected time slot is no longer available');
    }

    // Create appointment
    const appointment = new Appointment({
      salonId,
      customerId,
      services: appointmentServices,
      appointmentDate,
      startTime,
      endTime,
      totalDuration,
      totalPrice,
      status: AppointmentStatus.PENDING,
      notes,
      reminderSent: false,
    });

    await appointment.save({ session });

    await session.commitTransaction();

    // Populate references
    await appointment.populate('salonId', 'name phone address');
    await appointment.populate('customerId', 'firstName lastName phone email');

    // Fire-and-forget push to owner about the new booking, and confirmation to customer.
    notifyNewAppointment(appointment).catch(err =>
      logger.warn('notifyNewAppointment failed:', err?.message ?? err),
    );

    return appointment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (
  appointmentId: string,
  userId: string,
  userRole: string
): Promise<IAppointment | null> => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('salonId', 'name phone address email')
    .populate('customerId', 'firstName lastName phone email')
    .populate('services.serviceId', 'name description');

  if (!appointment) {
    return null;
  }

  // Check authorization
  const isCustomer = appointment.customerId._id.toString() === userId;
  const isSalonOwner = userRole === 'salon_admin' && (appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() === userId;
  const isAdmin = userRole === 'super_admin';

  if (!isCustomer && !isSalonOwner && !isAdmin) {
    throw new Error('You are not authorized to view this appointment');
  }

  return appointment;
};

/**
 * Get customer appointments
 */
export const getCustomerAppointments = async (
  customerId: string,
  status?: AppointmentStatus,
  page: number = 1,
  limit: number = 20
): Promise<{ appointments: IAppointment[]; total: number; pages: number }> => {
  const query: any = { customerId };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('salonId', 'name phone address')
      .sort({ appointmentDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    total,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get salon appointments
 */
export const getSalonAppointments = async (
  salonId: string,
  status?: AppointmentStatus,
  startDate?: Date,
  endDate?: Date,
  page: number = 1,
  limit: number = 50
): Promise<{ appointments: IAppointment[]; total: number; pages: number }> => {
  const query: any = { salonId };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.appointmentDate = {};
    if (startDate) {
      query.appointmentDate.$gte = startDate;
    }
    if (endDate) {
      query.appointmentDate.$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('customerId', 'firstName lastName phone email')
      .sort({ appointmentDate: 1, startTime: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    total,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Confirm appointment (salon admin)
 */
export const confirmAppointment = async (
  appointmentId: string,
  salonOwnerId: string
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId).populate('salonId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if ((appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() !== salonOwnerId) {
    throw new Error('You are not authorized to confirm this appointment');
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new Error(`Cannot confirm appointment with status: ${appointment.status}`);
  }

  appointment.status = AppointmentStatus.CONFIRMED;
  await appointment.save();
  notifyStatusChange(appointment, AppointmentStatus.CONFIRMED).catch(err =>
    logger.warn('notifyStatusChange failed:', err?.message ?? err),
  );

  return appointment;
};

/**
 * Start appointment (salon admin)
 */
export const startAppointment = async (
  appointmentId: string,
  salonOwnerId: string
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId).populate('salonId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if ((appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() !== salonOwnerId) {
    throw new Error('You are not authorized to start this appointment');
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error(`Cannot start appointment with status: ${appointment.status}`);
  }

  appointment.status = AppointmentStatus.IN_PROGRESS;
  await appointment.save();
  notifyStatusChange(appointment, AppointmentStatus.IN_PROGRESS).catch(err =>
    logger.warn('notifyStatusChange failed:', err?.message ?? err),
  );

  return appointment;
};

/**
 * Complete appointment (salon admin)
 */
export const completeAppointment = async (
  appointmentId: string,
  salonOwnerId: string,
  salonNotes?: string
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId).populate('salonId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if ((appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() !== salonOwnerId) {
    throw new Error('You are not authorized to complete this appointment');
  }

  if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
    throw new Error(`Cannot complete appointment with status: ${appointment.status}`);
  }

  appointment.status = AppointmentStatus.COMPLETED;
  notifyStatusChange(appointment, AppointmentStatus.COMPLETED).catch(err =>
    logger.warn('notifyStatusChange failed:', err?.message ?? err),
  );
  if (salonNotes) {
    appointment.salonNotes = salonNotes;
  }
  await appointment.save();

  // TODO: Send completion notification to customer
  // TODO: Request review from customer

  return appointment;
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (
  appointmentId: string,
  userId: string,
  userRole: string,
  reason: string
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId).populate('salonId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Check authorization
  const isCustomer = appointment.customerId.toString() === userId;
  const isSalonOwner = userRole === 'salon_admin' && (appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() === userId;

  if (!isCustomer && !isSalonOwner) {
    throw new Error('You are not authorized to cancel this appointment');
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw new Error('Cannot cancel completed appointment');
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new Error('Appointment is already cancelled');
  }

  // Check cancellation policy (24 hours before appointment)
  if (isCustomer) {
    const appointmentDateTime = getISTSlotDateTime(appointment.appointmentDate, appointment.startTime);
    const hoursDifference = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      throw new Error('Cannot cancel appointment less than 24 hours before scheduled time');
    }
  }

  appointment.status = AppointmentStatus.CANCELLED;
  notifyStatusChange(appointment, AppointmentStatus.CANCELLED).catch(err =>
    logger.warn('notifyStatusChange failed:', err?.message ?? err),
  );
  appointment.cancellationReason = reason;
  appointment.cancelledBy = new mongoose.Types.ObjectId(userId);
  appointment.cancelledAt = new Date();
  await appointment.save();

  // TODO: Send cancellation notification

  return appointment;
};

/**
 * Reschedule appointment
 */
export const rescheduleAppointment = async (
  appointmentId: string,
  customerId: string,
  data: RescheduleAppointmentData
): Promise<IAppointment> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const appointment = await Appointment.findById(appointmentId).session(session);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.customerId.toString() !== customerId) {
      throw new Error('You are not authorized to reschedule this appointment');
    }

    if (appointment.status !== AppointmentStatus.PENDING && appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new Error(`Cannot reschedule appointment with status: ${appointment.status}`);
    }

    // Check if can reschedule (at least 24 hours before current appointment)
    const currentAppointmentDateTime = getISTSlotDateTime(
      appointment.appointmentDate,
      appointment.startTime
    );
    const hoursDifference = (currentAppointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      throw new Error('Cannot reschedule appointment less than 24 hours before scheduled time');
    }

    const { appointmentDate, startTime } = data;

    // Validate new time slot
    const serviceId = appointment.services[0].serviceId.toString();
    const validation = await validateAppointmentTime(
      appointment.salonId.toString(),
      serviceId,
      appointmentDate,
      startTime
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate new end time
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + appointment.totalDuration;
    const endTime = minutesToTime(endMinutes);

    const { startOfDay, endOfDay } = getDayBounds(appointmentDate);
    const overlapFilter = buildTimeOverlapFilter(startTime, endTime);

    const conflicts = await Appointment.find({
      _id: { $ne: appointmentId },
      salonId: appointment.salonId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      ...overlapFilter,
    }).session(session);

    if (conflicts.length > 0) {
      throw new Error('Selected time slot is no longer available');
    }

    // Update appointment
    appointment.appointmentDate = appointmentDate;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = AppointmentStatus.PENDING; // Reset to pending after reschedule

    await appointment.save({ session });

    await session.commitTransaction();

    // TODO: Send reschedule notification

    return appointment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Mark appointment as no-show (salon admin)
 */
export const markAsNoShow = async (
  appointmentId: string,
  salonOwnerId: string
): Promise<IAppointment> => {
  const appointment = await Appointment.findById(appointmentId).populate('salonId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if ((appointment.salonId as unknown as import('../models/Salon').ISalon).ownerId?.toString() !== salonOwnerId) {
    throw new Error('You are not authorized to update this appointment');
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error(`Cannot mark appointment as no-show with status: ${appointment.status}`);
  }

  // Check if appointment time has passed
  const appointmentDateTime = getISTSlotDateTime(appointment.appointmentDate, appointment.startTime);

  if (appointmentDateTime > new Date()) {
    throw new Error('Cannot mark future appointment as no-show');
  }

  appointment.status = AppointmentStatus.NO_SHOW;
  await appointment.save();
  notifyStatusChange(appointment, AppointmentStatus.NO_SHOW).catch(err =>
    logger.warn('notifyStatusChange failed:', err?.message ?? err),
  );

  return appointment;
};

/**
 * Get upcoming appointments for customer
 */
export const getUpcomingAppointments = async (
  customerId: string,
  limit: number = 5
): Promise<IAppointment[]> => {
  const now = new Date();

  const appointments = await Appointment.find({
    customerId,
    status: {
      $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
    },
    appointmentDate: { $gte: now },
  })
    .populate('salonId', 'name phone address')
    .sort({ appointmentDate: 1, startTime: 1 })
    .limit(limit);

  return appointments;
};

export default {
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
};
