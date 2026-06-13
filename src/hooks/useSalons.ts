/**
 * TrimCity — useSalons Hook
 * Fetches salon data from REST API and user geolocation.
 */
import { useEffect, useRef } from 'react';
import { fetchSalons, type ApiSalon, salonRating, salonCoords } from '../services/api/salon.service';
import { ensureCoords } from '../services/location/location.service';
import type { SalonWithMeta } from '../types';
import { useSalonStore } from '../store/salonStore';

function toSalonWithMeta(salon: ApiSalon): SalonWithMeta {
  const coords = salonCoords(salon);
  const rating = salonRating(salon);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayHours = salon.workingHours?.find(wh => wh.day === dayOfWeek);
  const isOpenNow = !!(
    todayHours &&
    !todayHours.isClosed &&
    todayHours.openTime <= currentTime &&
    currentTime <= todayHours.closeTime
  );

  return {
    salonId: salon._id,
    name: salon.name,
    address: [salon.address?.street, salon.address?.city, salon.address?.state]
      .filter(Boolean).join(', '),
    latitude: coords.lat,
    longitude: coords.lng,
    category: (salon.category as any) ?? 'unisex',
    totalSeats: 10,
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
    photos: (salon.images ?? []).map((i: any) => (typeof i === 'string' ? i : i.url)),
    workingHours: {} as any,
    phone: salon.phone,
    createdAt: new Date(salon.createdAt).getTime(),
    updatedAt: new Date(salon.updatedAt).getTime(),
    isVerified: salon.status === 'approved',
    availabilityStatus: isOpenNow ? 'available' : 'closed',
    occupancyPercent: 0,
  };
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
    let cancelled = false;
    setLoading(true);

    fetchSalons().then(result => {
      if (cancelled) return;
      if (result.data) {
        setSalons(result.data.map(toSalonWithMeta));
      } else if (result.error) {
        setError(result.error);
      }
      setLoading(false);
    });

    if (!locationFetched.current) {
      locationFetched.current = true;
      ensureCoords().then(coords => {
        if (coords) setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      });
    }

    return () => {
      cancelled = true;
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
