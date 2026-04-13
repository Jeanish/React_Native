/**
 * TrimCity — Salon Store (Zustand)
 * Real-time salon data with filter/search state.
 */
import { create } from 'zustand';
import type { SalonWithMeta, CityStats, FilterChip, SalonFilters } from '../types';

interface SalonState {
  salons: SalonWithMeta[];
  cityStats: CityStats | null;
  selectedSalon: SalonWithMeta | null;
  filters: SalonFilters;
  isLoading: boolean;
  error: string | null;

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
}

export const useSalonStore = create<SalonState>()((set, get) => ({
  salons: [],
  cityStats: null,
  selectedSalon: null,
  filters: { search: '', activeFilter: 'all' },
  isLoading: true,
  error: null,

  filteredSalons: () => {
    const { salons, filters } = get();
    let result = [...salons];

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
}));
