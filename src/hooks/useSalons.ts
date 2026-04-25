/**
 * TrimCity — useSalons Hook
 * Fetches salons from the MongoDB backend REST API.
 * Polls every 30s to keep data reasonably fresh.
 */
import { useEffect, useRef, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { fetchSalons, type ApiSalon, salonRating, salonCoords } from '../services/api/salon.service';
import { useSalonStore } from '../store/salonStore';
import type { SalonWithMeta } from '../types';

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
  return true;
}

function toSalonWithMeta(salon: ApiSalon): SalonWithMeta {
  const coords = salonCoords(salon);
  const rating = salonRating(salon);
  // Derive availability from working hours + time of day
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayHours = salon.workingHours?.find(wh => wh.day === dayOfWeek);
  const isOpenNow = !!(
    todayHours &&
    !todayHours.isClosed &&
    todayHours.openTime <= currentTime &&
    currentTime <= todayHours.closeTime
  );

  return {
    // Legacy fields for UI compatibility
    salonId: salon._id,
    name: salon.name,
    address: [salon.address?.street, salon.address?.city, salon.address?.state]
      .filter(Boolean).join(', '),
    latitude: coords.lat,
    longitude: coords.lng,
    category: (salon.category as any) ?? 'unisex',
    totalSeats: 10, // not stored in MongoDB model yet
    seatedNow: 0,
    waitingNow: 0,
    rating,
    ratingCount: typeof salon.rating === 'object' ? (salon.rating?.count ?? 0) : 0,
    isOpen: isOpenNow,
    ownerId: typeof salon.ownerId === 'string' ? salon.ownerId : salon.ownerId?._id ?? '',
    services: (salon.services ?? []).map(s => ({
      id: s._id,
      name: s.name,
      durationMinutes: s.duration,
      priceInr: s.price,
    })),
    photos: salon.images ?? [],
    workingHours: {} as any, // legacy shape not needed
    phone: salon.phone,
    createdAt: new Date(salon.createdAt).getTime(),
    updatedAt: new Date(salon.updatedAt).getTime(),
    isVerified: salon.status === 'approved',
    // Meta
    availabilityStatus: isOpenNow ? 'available' : 'closed',
    occupancyPercent: 0,
  };
}

export function useSalons() {
  const {
    setSalons,
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, any> = { limit: 50 };
      if (userLocation) {
        params.latitude = userLocation.lat;
        params.longitude = userLocation.lng;
        params.maxDistance = 20000; // 20km
      }
      const result = await fetchSalons(params);
      if (result.error) {
        setError(result.error);
        return;
      }
      const withMeta = (result.data ?? []).map(toSalonWithMeta);
      setSalons(withMeta);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load salons');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    setLoading(true);
    load();

    // Poll every 30s
    intervalRef.current = setInterval(load, 30000);

    // Request location once
    if (!locationFetched.current) {
      locationFetched.current = true;
      requestLocationPermission().then(granted => {
        if (!granted) return;
        Geolocation.getCurrentPosition(
          pos => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          err => console.warn('[useSalons] Location error:', err.message),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return {
    salons: filteredSalons(),
    cityStats,
    isLoading,
    error,
    filters,
    setSearch,
    setFilter,
    hasLocation: !!userLocation,
    refresh: load,
  };
}
