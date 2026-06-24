import Salon from '../models/Salon';
import Service from '../models/Service';
import Appointment, { AppointmentStatus } from '../models/Appointment';

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
  const salon = await Salon.findById(salonId);

  if (!salon || !salon.isActive || salon.status !== 'approved') {
    throw new Error('Salon not found or not available');
  }

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getDay();

  // Find working hours for this day
  const workingHour = salon.workingHours.find((wh) => wh.day === dayOfWeek);

  if (!workingHour || workingHour.isClosed) {
    return null; // Salon is closed on this day
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
 * A slot is unavailable when the number of overlapping bookings reaches the
 * salon's chair/seat capacity. With totalSeats=1 this is the original strict mode;
 * with totalSeats=4 up to 4 concurrent customers can book the same slot.
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
  // Helper to format date in IST YYYY-MM-DD
  const getISTDateString = (d: Date): string => {
    const dateIST = new Date(d.getTime() + 330 * 60 * 1000); // 330 mins = 5.5 hours
    return dateIST.toISOString().split('T')[0];
  };

  const todayStr = getISTDateString(new Date());
  const requestedStr = getISTDateString(new Date(date));

  if (requestedStr < todayStr) {
    throw new Error('Cannot get slots for past dates');
  }

  // Get service details
  const service = await Service.findById(serviceId);

  if (!service || !service.isActive || !service.isAvailable) {
    throw new Error('Service not found or not available');
  }

  if (service.salonId.toString() !== salonId) {
    throw new Error('Service does not belong to this salon');
  }

  // Check if date is within advance booking limit in IST
  const maxDate = new Date();
  const maxDateIST = new Date(maxDate.getTime() + 330 * 60 * 1000);
  maxDateIST.setDate(maxDateIST.getDate() + service.maxAdvanceBookingDays);
  const maxDateStr = getISTDateString(maxDateIST);

  if (requestedStr > maxDateStr) {
    throw new Error(
      `Cannot book more than ${service.maxAdvanceBookingDays} days in advance`
    );
  }

  // Get salon working hours for this date
  const workingHours = await getSalonWorkingHours(salonId, date);

  if (!workingHours) {
    return []; // Salon is closed on this day
  }

  // Get existing appointments + salon capacity
  const existingAppointments = await getExistingAppointments(salonId, date);
  const salonDoc = await Salon.findById(salonId).select('totalSeats').lean();
  const totalSeats = (salonDoc as any)?.totalSeats ?? 1;

  // Generate all possible time slots
  let slots = generateTimeSlots(
    workingHours.openTime,
    workingHours.closeTime,
    service.duration,
    service.bufferTime
  );

  // Mark unavailable slots based on capacity
  slots = markUnavailableSlots(slots, existingAppointments, totalSeats);

  // Filter out past slots for today
  if (requestedStr === todayStr) {
    const now = new Date();
    // Shift current time to IST
    const nowIST = new Date(now.getTime() + 330 * 60 * 1000);
    const minTime = new Date(nowIST.getTime() + service.minAdvanceBookingHours * 60 * 60 * 1000);
    const minTimeDateStr = minTime.toISOString().split('T')[0];

    if (minTimeDateStr > requestedStr) {
      slots = [];
    } else {
      const minTimeStr = `${minTime.getUTCHours().toString().padStart(2, '0')}:${minTime.getUTCMinutes().toString().padStart(2, '0')}`;
      const minTimeMinutes = timeToMinutes(minTimeStr);

      slots = slots.filter((slot) => {
        const slotStartMinutes = timeToMinutes(slot.startTime);
        return slotStartMinutes >= minTimeMinutes;
      });
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
 * Convert an IST date and time string (HH:MM) to a UTC Date object representing that absolute slot time
 */
export const getISTSlotDateTime = (date: Date | string, timeStr: string): Date => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const dateVal = d.getUTCDate();
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Construct UTC time for the IST hour/min, then subtract 5.5 hours to get the absolute UTC time
  const utcMillis = Date.UTC(year, month, dateVal, hours, minutes, 0, 0);
  return new Date(utcMillis - 330 * 60 * 1000); // 330 mins = 5.5 hours
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
    // Get service
    const service = await Service.findById(serviceId);

    if (!service || !service.isActive || !service.isAvailable) {
      return { valid: false, error: 'Service is not available' };
    }

    if (service.salonId.toString() !== salonId) {
      return { valid: false, error: 'Service does not belong to this salon' };
    }

    // Check if date is in the past
    const now = new Date();
    const appointmentDateTime = getISTSlotDateTime(date, startTime);

    if (appointmentDateTime < now) {
      return { valid: false, error: 'Cannot book appointments in the past' };
    }

    // Check minimum advance booking time
    const minBookingTime = new Date(now.getTime() + service.minAdvanceBookingHours * 60 * 60 * 1000);

    if (appointmentDateTime < minBookingTime) {
      return {
        valid: false,
        error: `Appointments must be booked at least ${service.minAdvanceBookingHours} hours in advance`,
      };
    }

    // Check maximum advance booking time
    const maxBookingTime = new Date(now.getTime() + service.maxAdvanceBookingDays * 24 * 60 * 60 * 1000);

    if (appointmentDateTime > maxBookingTime) {
      return {
        valid: false,
        error: `Cannot book more than ${service.maxAdvanceBookingDays} days in advance`,
      };
    }

    // Check if salon is open
    const workingHours = await getSalonWorkingHours(salonId, date);

    if (!workingHours) {
      return { valid: false, error: 'Salon is closed on this day' };
    }

    // Check if time is within working hours
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

    // Check for conflicts
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
