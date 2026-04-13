/**
 * TrimCity — Booking Store (Zustand)
 */
import { create } from 'zustand';
import type { Appointment } from '../types';

interface BookingState {
  appointments: Appointment[];
  lastConfirmed: Appointment | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAppointments: (appointments: Appointment[]) => void;
  setLastConfirmed: (appointment: Appointment | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Derived
  upcomingAppointments: () => Appointment[];
  pastAppointments: () => Appointment[];
}

export const useBookingStore = create<BookingState>()((set, get) => ({
  appointments: [],
  lastConfirmed: null,
  isLoading: false,
  error: null,

  setAppointments: (appointments) => set({ appointments, isLoading: false }),
  setLastConfirmed: (lastConfirmed) => set({ lastConfirmed }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearError: () => set({ error: null }),

  upcomingAppointments: () =>
    get().appointments.filter(
      a => a.status === 'confirmed' || a.status === 'waiting',
    ),

  pastAppointments: () =>
    get().appointments.filter(
      a => a.status === 'completed' || a.status === 'cancelled',
    ),
}));
