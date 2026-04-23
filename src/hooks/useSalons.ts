/**
 * TrimCity — useSalons Hook
 * Subscribes to real-time salon data and city stats from Firestore.
 */
import { useEffect } from 'react';
import { subscribeToSalons, subscribeToCityStats } from '../services/firebase/salon.service';
import { useSalonStore } from '../store/salonStore';

export function useSalons() {
  const {
    setSalons,
    setCityStats,
    setLoading,
    setError,
    filteredSalons,
    setSearch,
    setFilter,
    filters,
    isLoading,
    error,
    cityStats,
  } = useSalonStore();

  useEffect(() => {
    setLoading(true);

    // Subscribe to real-time salon updates
    const unsubSalons = subscribeToSalons(
      salons => setSalons(salons),
      err => setError(err.message),
    );

    // Subscribe to city stats
    const unsubStats = subscribeToCityStats(
      stats => setCityStats(stats),
      err => console.warn('[useSalons] stats error:', err.message),
    );

    return () => {
      unsubSalons();
      unsubStats();
    };
  }, []);

  return {
    salons: filteredSalons(),
    cityStats,
    isLoading,
    error,
    filters,
    setSearch,
    setFilter,
  };
}
