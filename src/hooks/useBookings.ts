/**
 * TrimCity — useBookings Hook
 * Real-time subscription to the current customer's appointments.
 */
import { useEffect } from 'react';
import { subscribeToCustomerAppointments } from '../services/firebase/booking.service';
import { useBookingStore } from '../store/bookingStore';
import { useAuthStore } from '../store/authStore';

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

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsub = subscribeToCustomerAppointments(
      user.uid,
      appts => setAppointments(appts),
      err => setError(err.message),
    );

    return () => unsub();
  }, [user?.uid]);

  return {
    appointments,
    upcoming: upcomingAppointments(),
    past: pastAppointments(),
    isLoading,
    error,
  };
}
