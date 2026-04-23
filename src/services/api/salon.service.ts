/**
 * TrimCity — Salon API Service (MongoDB backend)
 * Replaces firebase/salon.service.ts for all data operations.
 * Firebase is only used for phone OTP auth — not here.
 */
import apiClient from './client';
import type { ServiceResult } from '../../types';

// ─── Types matching MongoDB backend schema ────────────────────────────────────

export interface ApiService {
  _id: string;
  name: string;
  price: number;
  duration: number; // minutes
  description?: string;
  category?: string;
}

export interface ApiWorkingHour {
  day: number; // 0=Sun, 1=Mon, … 6=Sat
  openTime: string; // "09:00"
  closeTime: string;
  isClosed: boolean;
}

export interface ApiSalon {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  description?: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  address: {
    street: string;
    city: string;
    state: string;
    pincode?: string;
    country?: string;
  };
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  ownerId: string | { _id: string; firstName: string; lastName: string; email: string; phone: string };
  services?: ApiService[];
  workingHours?: ApiWorkingHour[];
  images?: string[];
  rating?: { average: number; count: number } | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toSalonWithMetaFromApi(salon: ApiSalon): import('../../types').SalonWithMeta {
  const coords = salonCoords(salon);
  const rating = salonRating(salon);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayHours = salon.workingHours?.find(wh => wh.day === dayOfWeek);
  const isOpenNow = !!(todayHours && !todayHours.isClosed && todayHours.openTime <= currentTime && currentTime <= todayHours.closeTime);
  return {
    salonId: salon._id,
    name: salon.name,
    address: [salon.address?.street, salon.address?.city, salon.address?.state].filter(Boolean).join(', '),
    latitude: coords.lat,
    longitude: coords.lng,
    category: (salon.category as any) ?? 'unisex',
    totalSeats: 10,
    seatedNow: 0,
    waitingNow: 0,
    rating,
    ratingCount: typeof salon.rating === 'object' ? (salon.rating?.count ?? 0) : 0,
    isOpen: isOpenNow,
    ownerId: typeof salon.ownerId === 'string' ? salon.ownerId : (salon.ownerId as any)?._id ?? '',
    services: (salon.services ?? []).map(s => ({ id: s._id, name: s.name, durationMinutes: s.duration, priceInr: s.price })),
    photos: salon.images ?? [],
    workingHours: {} as any,
    phone: salon.phone,
    createdAt: new Date(salon.createdAt).getTime(),
    updatedAt: new Date(salon.updatedAt).getTime(),
    isVerified: salon.status === 'approved',
    availabilityStatus: isOpenNow ? 'available' : 'closed',
    occupancyPercent: 0,
  };
}

export function salonRating(salon: ApiSalon): number {
  if (!salon.rating) return 0;
  if (typeof salon.rating === 'number') return salon.rating;
  return salon.rating.average ?? 0;
}

export function salonRatingCount(salon: ApiSalon): number {
  if (!salon.rating || typeof salon.rating === 'number') return 0;
  return salon.rating.count ?? 0;
}

export function salonCoords(salon: ApiSalon): { lat: number; lng: number } {
  const [lng, lat] = salon.location?.coordinates ?? [0, 0];
  return { lat, lng };
}

// ─── Fetch all approved salons ────────────────────────────────────────────────

export async function fetchSalons(params?: {
  search?: string;
  city?: string;
  categoryId?: string;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
}): Promise<ServiceResult<ApiSalon[]>> {
  try {
    const res = await apiClient.get('/salons', { params });
    return { data: res.data.data ?? [] };
  } catch (err: any) {
    console.error('[SalonAPI] fetchSalons error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load salons.' };
  }
}

// ─── Fetch single salon by ID ─────────────────────────────────────────────────

export async function fetchSalonById(id: string): Promise<ServiceResult<ApiSalon>> {
  try {
    const res = await apiClient.get(`/salons/${id}`);
    return { data: res.data.data };
  } catch (err: any) {
    console.error('[SalonAPI] fetchSalonById error:', err.message);
    return { error: err.response?.data?.message ?? 'Salon not found.' };
  }
}

// ─── Fetch owner's own salon ──────────────────────────────────────────────────

export async function fetchMySalon(): Promise<ServiceResult<ApiSalon>> {
  try {
    const res = await apiClient.get('/salons/my-salon');
    return { data: res.data.data };
  } catch (err: any) {
    if (err.response?.status === 404) return { data: undefined as any };
    console.error('[SalonAPI] fetchMySalon error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to load salon.' };
  }
}

// ─── Create or update salon ───────────────────────────────────────────────────

export async function upsertMySalon(data: Partial<ApiSalon>): Promise<ServiceResult<ApiSalon>> {
  try {
    // Check if salon exists first
    const existing = await fetchMySalon();
    let res;
    if (existing.data?._id) {
      res = await apiClient.put(`/salons/${existing.data._id}`, data);
    } else {
      res = await apiClient.post('/salons', data);
    }
    return { data: res.data.data };
  } catch (err: any) {
    console.error('[SalonAPI] upsertMySalon error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Failed to save salon.' };
  }
}

// ─── Upload salon images ──────────────────────────────────────────────────────

export async function uploadSalonImage(
  salonId: string,
  uri: string,
  mimeType = 'image/jpeg',
): Promise<ServiceResult<string>> {
  try {
    const form = new FormData();
    form.append('image', { uri, type: mimeType, name: 'photo.jpg' } as any);
    const res = await apiClient.post(`/salons/${salonId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data.data?.imageUrl };
  } catch (err: any) {
    console.error('[SalonAPI] uploadSalonImage error:', err.message);
    return { error: 'Failed to upload image.' };
  }
}
