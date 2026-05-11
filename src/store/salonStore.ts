/**
 * TrimCity — Salon Store (Zustand)
 * Real-time salon data with filter/search state.
 */
import { create } from 'zustand';
import type { SalonWithMeta, CityStats, FilterChip, SalonFilters } from '../types';

interface UserLocation {
  lat: number;
  lng: number;
}

interface SalonState {
  salons: SalonWithMeta[];
  cityStats: CityStats | null;
  selectedSalon: SalonWithMeta | null;
  filters: SalonFilters;
  isLoading: boolean;
  error: string | null;
  userLocation: UserLocation | null;

  // Computed
  filteredSalons: () => SalonWithMeta[];

  // Actions
  setSalons: (salons: SalonWithMeta[]) => void;
  setCityStats: (stats: CityStats) => void;
  setSelectedSalon: (salon: SalonWithMeta | null) => void;
  setSearch: (search: string) => void;
  setFilter: (filter: FilterChip) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUserLocation: (loc: UserLocation | null) => void;
}

// Haversine formula — returns distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useSalonStore = create<SalonState>()((set, get) => ({
  salons: [],
  cityStats: null,
  selectedSalon: null,
  filters: { search: '', activeFilter: 'all' },
  isLoading: true,
  error: null,
  userLocation: null,

  filteredSalons: () => {
    const { salons, filters, userLocation } = get();

    // Attach distance to every salon if location is known
    let result: SalonWithMeta[] = salons.map(s => {
      if (userLocation && s.latitude && s.longitude) {
        return {
          ...s,
          distanceKm: haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude),
        };
      }
      return s;
    });

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q),
      );
    }

    // Chip filter
    switch (filters.activeFilter) {
      case 'available_now':
        result = result.filter(s => s.availabilityStatus === 'available');
        break;
      case 'low_wait':
        result = result.filter(s => s.waitingNow <= 2 && s.isOpen);
        break;
      case 'top_rated':
        result = result.filter(s => s.rating >= 4.0).sort((a, b) => b.rating - a.rating);
        break;
      case 'men':
        result = result.filter(s => s.category === 'men' || s.category === 'unisex');
        break;
      case 'women':
        result = result.filter(s => s.category === 'women' || s.category === 'unisex');
        break;
      case 'unisex':
        result = result.filter(s => s.category === 'unisex');
        break;
      case 'near_me':
        // If we have user location, sort by distance.
        // If not (permission denied / not fetched), fall back to showing all salons
        // instead of an empty list so the UI doesn't appear broken.
        if (userLocation) {
          result = result
            .map(s => ({ ...s, distanceKm: s.distanceKm ?? haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude) }))
            .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        }
        break;
      default:
        break;
    }

    return result;
  },

  setSalons: (salons) => set({ salons, isLoading: false, error: null }),
  setCityStats: (cityStats) => set({ cityStats }),
  setSelectedSalon: (selectedSalon) => set({ selectedSalon }),
  setSearch: (search) =>
    set(state => ({ filters: { ...state.filters, search } })),
  setFilter: (activeFilter) =>
    set(state => ({ filters: { ...state.filters, activeFilter } })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setUserLocation: (userLocation) => set({ userLocation }),
}));
