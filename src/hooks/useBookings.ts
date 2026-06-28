/**
 * TrimCity — useBookings Hook
 * Real-time subscription to the current customer's appointments.
 */
import { useEffect } from 'react';
import { fetchMyAppointments, toAppointmentFromApi } from '../services/api/booking.service';
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

    let active = true;
    setLoading(true);
    fetchMyAppointments()
      .then(res => {
        if (!active) return;
        if (res.data) {
          setAppointments(res.data.map(toAppointmentFromApi));
        } else if (res.error) {
          setError(res.error);
        }
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  return {
    appointments,
    upcoming: upcomingAppointments(),
    past: pastAppointments(),
    isLoading,
    error,
  };
}
