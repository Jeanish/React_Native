/**
 * TrimCity — Booking Service
 * Appointment CRUD with Firestore transactions for data consistency.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db, Collections } from './config';
import type {
  Appointment,
  AppointmentStatus,
  BookingFormData,
  SalonWithMeta,
  ServiceResult,
  WalkInFormData,
} from '../../types';
import { sanitizeName, sanitizePhoneNumber, sanitizeText } from '../security/sanitizer';
import { format } from 'date-fns';

// ─── Create Booking (with transaction for count consistency) ──────────────────

export async function createBooking(
  customerId: string,
  salon: SalonWithMeta,
  formData: BookingFormData,
): Promise<ServiceResult<Appointment>> {
  try {
    const salonRef = doc(db, Collections.SALONS, salon.salonId);
    const appointmentRef = doc(collection(db, Collections.APPOINTMENTS));

    const now = Date.now();
    const isSeating = salon.seatedNow < salon.totalSeats;

    // Determine status — if seats available, confirm; else waiting
    const status: AppointmentStatus = isSeating ? 'confirmed' : 'waiting';

    const selectedService = salon.services.find(s => s.id === formData.serviceId);
    if (!selectedService) {
      return { error: 'Selected service not found.' };
    }

    const appointment: Appointment = {
      appointmentId: appointmentRef.id,
      salonId: salon.salonId,
      salonName: salon.name,
      salonAddress: salon.address,
      salonLatitude: salon.latitude,
      salonLongitude: salon.longitude,
      customerId,
      customerName: sanitizeName(formData.customerName),
      customerPhone: sanitizePhoneNumber(formData.customerPhone),
      service: selectedService.name,
      servicePriceInr: selectedService.priceInr,
      serviceDurationMinutes: selectedService.durationMinutes,
      timeSlot: formData.timeSlot,
      date: formData.date,
      status,
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async transaction => {
      const salonSnap = await transaction.get(salonRef);
      if (!salonSnap.exists()) throw new Error('Salon not found');

      const salonData = salonSnap.data();
      const currentSeated = salonData.seatedNow ?? 0;
      const currentWaiting = salonData.waitingNow ?? 0;

      transaction.set(appointmentRef, appointment);

      if (status === 'confirmed') {
        transaction.update(salonRef, {
          seatedNow: currentSeated + 1,
          updatedAt: now,
        });
      } else {
        transaction.update(salonRef, {
          waitingNow: currentWaiting + 1,
          updatedAt: now,
        });
      }
    });

    return { data: appointment };
  } catch (err) {
    console.error('[BookingService] createBooking error:', err);
    return { error: 'Booking failed. Please try again.' };
  }
}

// ─── Get Booked Time Slots for a Salon on a Date ─────────────────────────────

export async function getBookedSlots(
  salonId: string,
  date: string,
): Promise<string[]> {
  try {
    const q = query(
      collection(db, Collections.APPOINTMENTS),
      where('salonId', '==', salonId),
      where('date', '==', date),
      where('status', 'in', ['confirmed', 'waiting']),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => (d.data() as Appointment).timeSlot);
  } catch (err) {
    console.error('[BookingService] getBookedSlots error:', err);
    return [];
  }
}

// ─── Customer: Subscribe to Own Appointments ──────────────────────────────────

export function subscribeToCustomerAppointments(
  customerId: string,
  onData: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, Collections.APPOINTMENTS),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    snap => {
      const list = snap.docs.map(d => d.data() as Appointment);
      onData(list);
    },
    err => {
      console.error('[BookingService] subscribeToCustomerAppointments error:', err);
      onError?.(err);
    },
  );
}

// ─── Owner: Subscribe to Salon Appointments ───────────────────────────────────

export function subscribeToOwnerAppointments(
  salonId: string,
  date: string,
  onData: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, Collections.APPOINTMENTS),
    where('salonId', '==', salonId),
    where('date', '==', date),
    where('status', 'in', ['confirmed', 'waiting']),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(
    q,
    snap => {
      const list = snap.docs.map(d => d.data() as Appointment);
      onData(list);
    },
    err => {
      console.error('[BookingService] subscribeToOwnerAppointments error:', err);
      onError?.(err);
    },
  );
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export async function cancelAppointment(
  appointmentId: string,
  customerId: string,
): Promise<ServiceResult<void>> {
  try {
    const apptRef = doc(db, Collections.APPOINTMENTS, appointmentId);
    const apptSnap = await getDoc(apptRef);

    if (!apptSnap.exists()) return { error: 'Appointment not found.' };

    const appt = apptSnap.data() as Appointment;

    // Security: only the customer who made the booking can cancel
    if (appt.customerId !== customerId) {
      return { error: 'Unauthorized.' };
    }

    if (appt.status === 'completed' || appt.status === 'cancelled') {
      return { error: 'Cannot cancel a completed or already-cancelled appointment.' };
    }

    const salonRef = doc(db, Collections.SALONS, appt.salonId);
    const now = Date.now();

    await runTransaction(db, async transaction => {
      transaction.update(apptRef, { status: 'cancelled', updatedAt: now });

      if (appt.status === 'confirmed') {
        transaction.update(salonRef, {
          seatedNow: increment(-1),
          updatedAt: now,
        });
      } else if (appt.status === 'waiting') {
        transaction.update(salonRef, {
          waitingNow: increment(-1),
          updatedAt: now,
        });
      }
    });

    return {};
  } catch (err) {
    console.error('[BookingService] cancelAppointment error:', err);
    return { error: 'Failed to cancel appointment.' };
  }
}

// ─── Owner: Update Appointment Status ────────────────────────────────────────

export async function ownerUpdateAppointmentStatus(
  appointmentId: string,
  ownerId: string,
  salonId: string,
  newStatus: AppointmentStatus,
): Promise<ServiceResult<void>> {
  try {
    const apptRef = doc(db, Collections.APPOINTMENTS, appointmentId);
    const salonRef = doc(db, Collections.SALONS, salonId);
    const now = Date.now();

    await runTransaction(db, async transaction => {
      const apptSnap = await transaction.get(apptRef);
      if (!apptSnap.exists()) throw new Error('Appointment not found');

      const appt = apptSnap.data() as Appointment;

      // Verify salon ownership (server-side rule also enforces this)
      const salonSnap = await transaction.get(salonRef);
      if (!salonSnap.exists()) throw new Error('Salon not found');
      if (salonSnap.data().ownerId !== ownerId) throw new Error('Unauthorized');

      const prevStatus = appt.status;
      transaction.update(apptRef, { status: newStatus, updatedAt: now });

      // Update salon counts based on status transition
      if (prevStatus === 'confirmed' && newStatus === 'completed') {
        transaction.update(salonRef, { seatedNow: increment(-1), updatedAt: now });
      } else if (prevStatus === 'waiting' && newStatus === 'confirmed') {
        transaction.update(salonRef, {
          waitingNow: increment(-1),
          seatedNow: increment(1),
          updatedAt: now,
        });
      } else if (newStatus === 'cancelled') {
        if (prevStatus === 'confirmed') {
          transaction.update(salonRef, { seatedNow: increment(-1), updatedAt: now });
        } else if (prevStatus === 'waiting') {
          transaction.update(salonRef, { waitingNow: increment(-1), updatedAt: now });
        }
      }
    });

    return {};
  } catch (err: any) {
    console.error('[BookingService] ownerUpdateAppointmentStatus error:', err);
    if (err.message === 'Unauthorized') return { error: 'Unauthorized.' };
    return { error: 'Failed to update appointment.' };
  }
}

// ─── Owner: Add Walk-in ────────────────────────────────────────────────────────

export async function addWalkIn(
  salonId: string,
  ownerId: string,
  walkIn: WalkInFormData,
): Promise<ServiceResult<Appointment>> {
  try {
    const salonRef = doc(db, Collections.SALONS, salonId);
    const salonSnap = await getDoc(salonRef);
    if (!salonSnap.exists()) return { error: 'Salon not found.' };

    const salon = salonSnap.data() as any;
    if (salon.ownerId !== ownerId) return { error: 'Unauthorized.' };

    const now = Date.now();
    const today = format(new Date(), 'yyyy-MM-dd');
    const timeNow = format(new Date(), 'hh:mm aa');

    const appointmentRef = doc(collection(db, Collections.APPOINTMENTS));
    const isSeating = salon.seatedNow < salon.totalSeats;

    const appointment: Appointment = {
      appointmentId: appointmentRef.id,
      salonId,
      salonName: salon.name,
      salonAddress: salon.address,
      salonLatitude: salon.latitude,
      salonLongitude: salon.longitude,
      customerId: `walkin_${appointmentRef.id}`,
      customerName: sanitizeName(walkIn.customerName),
      customerPhone: sanitizePhoneNumber(walkIn.customerPhone),
      service: sanitizeText(walkIn.service),
      servicePriceInr: 0,
      serviceDurationMinutes: 30,
      timeSlot: timeNow,
      date: today,
      status: isSeating ? 'confirmed' : 'waiting',
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async transaction => {
      transaction.set(appointmentRef, appointment);
      if (isSeating) {
        transaction.update(salonRef, { seatedNow: increment(1), updatedAt: now });
      } else {
        transaction.update(salonRef, { waitingNow: increment(1), updatedAt: now });
      }
    });

    return { data: appointment };
  } catch (err) {
    console.error('[BookingService] addWalkIn error:', err);
    return { error: 'Failed to add walk-in customer.' };
  }
}
