import { AppointmentStatus } from '../models/Appointment';

export const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];

export const getDayBounds = (date: Date): { startOfDay: Date; endOfDay: Date } => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
};

export const buildTimeOverlapFilter = (startTime: string, endTime: string) => ({
  $or: [
    { $and: [{ startTime: { $lte: startTime } }, { endTime: { $gt: startTime } }] },
    { $and: [{ startTime: { $lt: endTime } }, { endTime: { $gte: endTime } }] },
    { $and: [{ startTime: { $gte: startTime } }, { endTime: { $lte: endTime } }] },
  ],
});
