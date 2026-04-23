/**
 * TrimCity — useBookings Hook
 * Fetches the current customer's appointments from the MongoDB backend.
 */
import { useEffect, useCallback } from 'react';
import { fetchMyAppointments, type ApiAppointment } from '../services/api/booking.service';
import { useBookingStore } from '../store/bookingStore';
import { useAuthStore } from '../store/authStore';
import type { Appointment } from '../types';

function toAppointment(a: ApiAppointment): Appointment {
  const salon = typeof a.salonId === 'object' ? a.salonId : null;
  const service = typeof a.serviceId === 'object' ? a.serviceId : null;

  const statusMap: Record<string, Appointment['status']> = {
    pending: 'waiting',
    confirmed: 'confirmed',
    'in-progress': 'confirmed',
    completed: 'completed',
    cancelled: 'cancelled',
    'no-show': 'completed',
  };

  return {
    appointmentId: a._id,
    salonId: typeof a.salonId === 'string' ? a.salonId : salon?._id ?? '',
    salonName: salon?.name ?? 'Salon',
    salonAddress: salon
      ? [salon.address?.street, salon.address?.city].filter(Boolean).join(', ')
      : '',
    salonLatitude: salon?.location?.coordinates?.[1] ?? 0,
    salonLongitude: salon?.location?.coordinates?.[0] ?? 0,
    customerId: typeof a.customerId === 'string' ? a.customerId : (a.customerId as any)?._id ?? '',
    customerName: '',
    customerPhone: '',
    service: service?.name ?? 'Service',
    servicePriceInr: service?.price ?? a.totalAmount ?? 0,
    serviceDurationMinutes: service?.duration ?? 0,
    timeSlot: a.startTime,
    date: a.appointmentDate?.slice(0, 10) ?? '',
    status: statusMap[a.status] ?? 'confirmed',
    createdAt: new Date(a.createdAt).getTime(),
  };
}

export function useBookings() {
  const { user } = useAuthStore();
  const {
    appointments,
    setAppointments,
    setLoading,
    setError,
    isLoading,
    error,
    upcomingAppointments,
    pastAppointments,
  } = useBookingStore();

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const result = await fetchMyAppointments();
      if (result.error) {
        setError(result.error);
        return;
      }
      setAppointments((result.data ?? []).map(toAppointment));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load appointments');
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    appointments,
    upcoming: upcomingAppointments(),
    past: pastAppointments(),
    isLoading,
    error,
    refresh: load,
  };
}
