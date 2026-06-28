import Salon from '../models/Salon';
import Service from '../models/Service';
import Appointment, { AppointmentStatus } from '../models/Appointment';
import { getISTDateString, getISTSlotDateTime } from '../utils/timezone';
export { getISTSlotDateTime } from '../utils/timezone';

/**
 * Time slot interface
 */
export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Check if two time ranges overlap
 */
const timesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  return start1Min < end2Min && end1Min > start2Min;
};

/**
 * Get salon working hours for a specific date
 */
export const getSalonWorkingHours = async (
  salonId: string,
  date: Date
): Promise<{ openTime: string; closeTime: string } | null> => {
  const salon = await Salon.findById(salonId).select('isActive status manualClosed workingHours');

  if (!salon || !salon.isActive || salon.status !== 'approved' || salon.manualClosed) {
    return null;
  }

  const dayOfWeek = date.getDay();
  const workingHour = salon.workingHours.find((wh) => wh.day === dayOfWeek);

  if (!workingHour || workingHour.isClosed) {
    return null;
  }

  return {
    openTime: workingHour.openTime,
    closeTime: workingHour.closeTime,
  };
};

/**
 * Get existing appointments for a salon on a specific date
 */
const getExistingAppointments = async (
  salonId: string,
  date: Date
): Promise<Array<{ startTime: string; endTime: string }>> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    salonId,
    appointmentDate: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    status: {
      $in: [
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
      ],
    },
  }).select('startTime endTime');

  return appointments.map((apt) => ({
    startTime: apt.startTime,
    endTime: apt.endTime,
  }));
};

/**
 * Generate all possible time slots for a given time range and duration
 */
const generateTimeSlots = (
  openTime: string,
  closeTime: string,
  duration: number,
  bufferTime: number = 0
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  const slotDuration = duration + bufferTime;

  let currentTime = openMinutes;

  while (currentTime + duration <= closeMinutes) {
    const startTime = minutesToTime(currentTime);
    const endTime = minutesToTime(currentTime + duration);

    slots.push({
      startTime,
      endTime,
      available: true,
    });

    currentTime += slotDuration;
  }

  return slots;
};

/**
 * A slot is unavailable when overlapping bookings reach salon seat capacity.
 */
const markUnavailableSlots = (
  slots: TimeSlot[],
  existingAppointments: Array<{ startTime: string; endTime: string }>,
  totalSeats: number,
): TimeSlot[] => {
  const capacity = Math.max(1, totalSeats);
  return slots.map((slot) => {
    const overlapping = existingAppointments.filter((apt) =>
      timesOverlap(slot.startTime, slot.endTime, apt.startTime, apt.endTime),
    ).length;
    return { ...slot, available: overlapping < capacity };
  });
};

/**
 * Get available time slots for a service on a specific date
 */
export const getAvailableTimeSlots = async (
  salonId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> => {
  const todayStr = getISTDateString(new Date());
  const requestedStr = getISTDateString(new Date(date));

  if (requestedStr < todayStr) {
    throw new Error('Cannot get slots for past dates');
  }

  const salonDoc = await Salon.findById(salonId)
    .select('totalSeats manualClosed isActive status')
    .lean();

  if (
    !salonDoc ||
    !salonDoc.isActive ||
    salonDoc.status !== 'approved' ||
    salonDoc.manualClosed
  ) {
    return [];
  }

  const service = await Service.findById(serviceId);

  if (!service || !service.isActive || !service.isAvailable) {
    throw new Error('Service not found or not available');
  }

  if (service.salonId.toString() !== salonId) {
    throw new Error('Service does not belong to this salon');
  }

  const maxDate = new Date();
  const maxDateIST = new Date(maxDate.getTime() + 330 * 60 * 1000);
  maxDateIST.setDate(maxDateIST.getDate() + service.maxAdvanceBookingDays);
  const maxDateStr = getISTDateString(maxDateIST);

  if (requestedStr > maxDateStr) {
    throw new Error(
      `Cannot book more than ${service.maxAdvanceBookingDays} days in advance`
    );
  }

  const workingHours = await getSalonWorkingHours(salonId, date);

  if (!workingHours) {
    return [];
  }

  const existingAppointments = await getExistingAppointments(salonId, date);
  const totalSeats = salonDoc.totalSeats ?? 1;

  let slots = generateTimeSlots(
    workingHours.openTime,
    workingHours.closeTime,
    service.duration,
    service.bufferTime
  );

  slots = markUnavailableSlots(slots, existingAppointments, totalSeats);

  if (requestedStr === todayStr) {
    const now = new Date();
    const nowIST = new Date(now.getTime() + 330 * 60 * 1000);
    const minTime = new Date(nowIST.getTime() + service.minAdvanceBookingHours * 60 * 60 * 1000);
    const minTimeDateStr = minTime.toISOString().split('T')[0];

    if (minTimeDateStr > requestedStr) {
      slots = [];
    } else {
      const minTimeStr = `${minTime.getUTCHours().toString().padStart(2, '0')}:${minTime.getUTCMinutes().toString().padStart(2, '0')}`;
      const minTimeMinutes = timeToMinutes(minTimeStr);

      slots = slots.filter((slot) => timeToMinutes(slot.startTime) >= minTimeMinutes);
    }
  }

  return slots;
};

/**
 * Check if a specific time slot is available
 */
export const isTimeSlotAvailable = async (
  salonId: string,
  serviceId: string,
  date: Date,
  startTime: string
): Promise<boolean> => {
  const service = await Service.findById(serviceId);

  if (!service) {
    return false;
  }

  const slots = await getAvailableTimeSlots(salonId, serviceId, date);
  const slot = slots.find((s) => s.startTime === startTime);

  return slot ? slot.available : false;
};

/**
 * Validate appointment time constraints
 */
export const validateAppointmentTime = async (
  salonId: string,
  serviceId: string,
  date: Date,
  startTime: string
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const service = await Service.findById(serviceId);

    if (!service || !service.isActive || !service.isAvailable) {
      return { valid: false, error: 'Service is not available' };
    }

    if (service.salonId.toString() !== salonId) {
      return { valid: false, error: 'Service does not belong to this salon' };
    }

    const now = new Date();
    const appointmentDateTime = getISTSlotDateTime(date, startTime);

    if (appointmentDateTime < now) {
      return { valid: false, error: 'Cannot book appointments in the past' };
    }

    const minBookingTime = new Date(now.getTime() + service.minAdvanceBookingHours * 60 * 60 * 1000);

    if (appointmentDateTime < minBookingTime) {
      return {
        valid: false,
        error: `Appointments must be booked at least ${service.minAdvanceBookingHours} hours in advance`,
      };
    }

    const maxBookingTime = new Date(now.getTime() + service.maxAdvanceBookingDays * 24 * 60 * 60 * 1000);

    if (appointmentDateTime > maxBookingTime) {
      return {
        valid: false,
        error: `Cannot book more than ${service.maxAdvanceBookingDays} days in advance`,
      };
    }

    const workingHours = await getSalonWorkingHours(salonId, date);

    if (!workingHours) {
      return { valid: false, error: 'Salon is closed on this day' };
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + service.duration;
    const openMinutes = timeToMinutes(workingHours.openTime);
    const closeMinutes = timeToMinutes(workingHours.closeTime);

    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return {
        valid: false,
        error: `Appointment time must be within salon working hours (${workingHours.openTime} - ${workingHours.closeTime})`,
      };
    }

    const isAvailable = await isTimeSlotAvailable(salonId, serviceId, date, startTime);

    if (!isAvailable) {
      return { valid: false, error: 'Selected time slot is no longer available' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Validation failed' };
  }
};

export default {
  getAvailableTimeSlots,
  isTimeSlotAvailable,
  validateAppointmentTime,
  getSalonWorkingHours,
  timeToMinutes,
  minutesToTime,
};
