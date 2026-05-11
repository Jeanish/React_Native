/**
 * TrimCity — Booking API Service (MongoDB backend)
 * Replaces firebase/booking.service.ts for all appointment operations.
 */
import apiClient from './client';
import type { ServiceResult } from '../../types';

// ─── Types matching backend Appointment schema ────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface ApiAppointment {
  _id: string;
  customerId: string | { _id: string; firstName: string; lastName: string; phone: string };
  salonId: string | {
    _id: string;
    name: string;
    address: { street: string; city: string; state: string };
    phone: string;
    location: { coordinates: [number, number] };
  };
  serviceId: string | { _id: string; name: string; price: number; duration: number };
  appointmentDate: string; // ISO date
  startTime: string; // "HH:mm"
  endTime: string;
  status: BookingStatus;
  totalAmount: number;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
}

// ─── Create booking ───────────────────────────────────────────────────────────

/** Convert "11:00 PM" / "09:30 AM" to "23:00" / "09:30". Pass-through if already 24h. */
function to24h(time: string): string {
  const trimmed = time.trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return trimmed; // already 24h
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const isPm = m[3].toUpperCase() === 'PM';
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mm}`;
}

export async function createAppointment(data: {
  salonId: string;
  serviceId: string;
  appointmentDate: string; // "YYYY-MM-DD"
  startTime: string;       // "11:00 PM" or "23:00"
  notes?: string;
}): Promise<ServiceResult<ApiAppointment>> {
  try {
    const payload = {
      salonId: data.salonId,
      serviceIds: [data.serviceId],     // backend expects array
      appointmentDate: data.appointmentDate,
      startTime: to24h(data.startTime), // backend expects 24h HH:mm
      ...(data.notes ? { notes: data.notes } : {}),
    };
    const res = await apiClient.post('/appointments', payload);
    return { data: res.data.data };
  } catch (err: any) {
    console.error('[BookingAPI] createAppointment error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Failed to book appointment.' };
  }
}

// ─── Get customer's own appointments ─────────────────────────────────────────

export async function fetchMyAppointments(): Promise<ServiceResult<ApiAppointment[]>> {
  try {
    const res = await apiClient.get('/appointments/my');
    return { data: res.data.data ?? [] };
  } catch (err: any) {
    console.error('[BookingAPI] fetchMyAppointments error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load appointments.' };
  }
}

// ─── Get upcoming appointments ────────────────────────────────────────────────

export async function fetchUpcomingAppointments(): Promise<ServiceResult<ApiAppointment[]>> {
  try {
    const res = await apiClient.get('/appointments/upcoming');
    return { data: res.data.data ?? [] };
  } catch (err: any) {
    console.error('[BookingAPI] fetchUpcoming error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load upcoming appointments.' };
  }
}

// ─── Walk-in booking (owner) ──────────────────────────────────────────────────

export async function createWalkInAppointment(data: {
  customerPhone: string;
  customerName: string;
  serviceId: string;
  appointmentDate: string; // "YYYY-MM-DD"
  startTime: string;       // "11:00 PM" or "23:00"
  notes?: string;
}): Promise<ServiceResult<ApiAppointment>> {
  try {
    const payload = {
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      serviceId: data.serviceId,
      appointmentDate: data.appointmentDate,
      startTime: to24h(data.startTime),
      ...(data.notes ? { notes: data.notes } : {}),
    };
    const res = await apiClient.post('/appointments/walk-in', payload);
    return { data: res.data.data };
  } catch (err: any) {
    console.error('[BookingAPI] createWalkInAppointment error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Walk-in booking failed.' };
  }
}

// ─── Cancel appointment ───────────────────────────────────────────────────────

export async function cancelAppointment(
  id: string,
  reason?: string,
): Promise<ServiceResult<void>> {
  try {
    await apiClient.patch(`/appointments/${id}/cancel`, { reason });
    return {};
  } catch (err: any) {
    console.error('[BookingAPI] cancelAppointment error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to cancel appointment.' };
  }
}

// ─── Get salon's appointments (owner) ────────────────────────────────────────

export async function fetchSalonAppointments(params?: {
  date?: string;
  status?: string;
}): Promise<ServiceResult<ApiAppointment[]>> {
  try {
    const res = await apiClient.get('/appointments/my-salon', { params });
    return { data: res.data.data ?? [] };
  } catch (err: any) {
    console.error('[BookingAPI] fetchSalonAppointments error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load salon appointments.' };
  }
}

// ─── Owner updates appointment status ────────────────────────────────────────

export async function updateAppointmentStatus(
  id: string,
  status: BookingStatus,
): Promise<ServiceResult<ApiAppointment>> {
  try {
    const res = await apiClient.patch(`/appointments/${id}/status`, { status });
    return { data: res.data.data };
  } catch (err: any) {
    console.error('[BookingAPI] updateAppointmentStatus error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to update status.' };
  }
}

// ─── Get available time slots for a salon+service on a date ──────────────────

export async function fetchAvailableSlots(
  salonId: string,
  serviceId: string,
  date: string,
): Promise<ServiceResult<string[]>> {
  try {
    const res = await apiClient.get(`/appointments/availability/${salonId}`, {
      params: { serviceId, date },
    });
    return { data: res.data.data?.availableSlots ?? [] };
  } catch (err: any) {
    console.error('[BookingAPI] fetchAvailableSlots error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load slots.' };
  }
}
