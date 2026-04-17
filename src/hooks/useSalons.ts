/**
 * TrimCity — useSalons Hook
 * Subscribes to real-time salon data, city stats, and user geolocation.
 */
import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { subscribeToSalons, subscribeToCityStats } from '../services/firebase/salon.service';
import { useSalonStore } from '../store/salonStore';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TrimCity needs your location to show nearby salons.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true; // iOS handled by Info.plist
}

export function useSalons() {
  const {
    setSalons,
    setCityStats,
    setLoading,
    setError,
    setUserLocation,
    filteredSalons,
    setSearch,
    setFilter,
    filters,
    isLoading,
    error,
    cityStats,
    userLocation,
  } = useSalonStore();

  const locationFetched = useRef(false);

  useEffect(() => {
    setLoading(true);

    const unsubSalons = subscribeToSalons(
      salons => setSalons(salons),
      err => setError(err.message),
    );

    const unsubStats = subscribeToCityStats(
      stats => setCityStats(stats),
      err => console.warn('[useSalons] stats error:', err.message),
    );

    // Fetch location once (silent — don't block the UI)
    if (!locationFetched.current) {
      locationFetched.current = true;
      requestLocationPermission().then(granted => {
        if (!granted) return;
        Geolocation.getCurrentPosition(
          pos => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            console.log('[useSalons] Location acquired:', pos.coords.latitude, pos.coords.longitude);
          },
          err => console.warn('[useSalons] Location error:', err.message),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      });
    }

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
    hasLocation: !!userLocation,
  };
}
