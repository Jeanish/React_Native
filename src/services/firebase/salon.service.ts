/**
 * TrimCity — Salon Service
 * All Firestore operations for salons with real-time listeners.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
  Unsubscribe,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, Collections, DocIds } from './config';
import type { Salon, SalonWithMeta, CityStats, ServiceResult, SalonCategory } from '../../types';
import { sanitizeText } from '../security/sanitizer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSalonMeta(salon: Salon): SalonWithMeta {
  const occupancyPercent =
    salon.totalSeats > 0
      ? Math.min(100, Math.round((salon.seatedNow / salon.totalSeats) * 100))
      : 0;

  let availabilityStatus: SalonWithMeta['availabilityStatus'];
  if (!salon.isOpen) {
    availabilityStatus = 'closed';
  } else if (salon.seatedNow >= salon.totalSeats) {
    availabilityStatus = 'full';
  } else if (occupancyPercent >= 70) {
    availabilityStatus = 'busy';
  } else {
    availabilityStatus = 'available';
  }

  return { ...salon, availabilityStatus, occupancyPercent };
}

// ─── Real-time Listener — All Salons ─────────────────────────────────────────

export function subscribeToSalons(
  onData: (salons: SalonWithMeta[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, Collections.SALONS),
    where('isVerified', '==', true),
    orderBy('rating', 'desc'),
    limit(100),
  );

  return onSnapshot(
    q,
    snapshot => {
      const salons = snapshot.docs.map(d => {
        const data = d.data() as Salon;
        return computeSalonMeta({ ...data, salonId: d.id });
      });
      onData(salons);
    },
    err => {
      console.error('[SalonService] subscribeToSalons error:', err);
      onError?.(err);
    },
  );
}

// ─── Real-time Listener — Single Salon ───────────────────────────────────────

export function subscribeToSalon(
  salonId: string,
  onData: (salon: SalonWithMeta | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, Collections.SALONS, salonId),
    snap => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data() as Salon;
      onData(computeSalonMeta({ ...data, salonId: snap.id }));
    },
    err => {
      console.error('[SalonService] subscribeToSalon error:', err);
      onError?.(err);
    },
  );
}

// ─── Real-time Listener — City Stats ─────────────────────────────────────────

export function subscribeToCityStats(
  onData: (stats: CityStats) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, Collections.CITY_STATS, DocIds.CITY_STATS),
    snap => {
      if (snap.exists()) {
        onData(snap.data() as CityStats);
      }
    },
    err => {
      console.error('[SalonService] subscribeToCityStats error:', err);
      onError?.(err);
    },
  );
}

// ─── Fetch Salon by Owner ─────────────────────────────────────────────────────

export async function fetchSalonByOwner(
  ownerId: string,
): Promise<Salon | null> {
  try {
    const q = query(
      collection(db, Collections.SALONS),
      where('ownerId', '==', ownerId),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...d.data(), salonId: d.id } as Salon;
  } catch (err) {
    console.error('[SalonService] fetchSalonByOwner error:', err);
    return null;
  }
}

// ─── Create / Update Salon ────────────────────────────────────────────────────

export async function upsertSalon(
  salonData: Partial<Salon> & { ownerId: string },
): Promise<ServiceResult<string>> {
  try {
    // Sanitize free-text fields
    const sanitized = {
      ...salonData,
      name: sanitizeText(salonData.name ?? ''),
      address: sanitizeText(salonData.address ?? ''),
    };

    const now = Date.now();

    if (salonData.salonId) {
      // Update existing
      await updateDoc(doc(db, Collections.SALONS, salonData.salonId), {
        ...sanitized,
        updatedAt: now,
      });
      return { data: salonData.salonId };
    }

    // Create new
    const newRef = doc(collection(db, Collections.SALONS));
    const newSalon: Salon = {
      salonId: newRef.id,
      name: sanitized.name ?? '',
      address: sanitized.address ?? '',
      latitude: sanitized.latitude ?? 0,
      longitude: sanitized.longitude ?? 0,
      category: sanitized.category ?? 'unisex',
      totalSeats: sanitized.totalSeats ?? 4,
      seatedNow: 0,
      waitingNow: 0,
      rating: 0,
      ratingCount: 0,
      isOpen: false,
      ownerId: sanitized.ownerId,
      services: sanitized.services ?? [],
      photos: sanitized.photos ?? [],
      workingHours: sanitized.workingHours ?? defaultWorkingHours(),
      phone: sanitized.phone ?? '',
      createdAt: now,
      updatedAt: now,
      isVerified: false, // Admin must verify
    };
    await setDoc(newRef, newSalon);
    return { data: newRef.id };
  } catch (err) {
    console.error('[SalonService] upsertSalon error:', err);
    return { error: 'Failed to save salon profile.' };
  }
}

// ─── Owner: Update Live Counts ────────────────────────────────────────────────

export async function updateSalonCounts(
  salonId: string,
  updates: { seatedNow?: number; waitingNow?: number },
): Promise<ServiceResult<void>> {
  try {
    await updateDoc(doc(db, Collections.SALONS, salonId), {
      ...updates,
      updatedAt: Date.now(),
    });
    return {};
  } catch (err) {
    console.error('[SalonService] updateSalonCounts error:', err);
    return { error: 'Failed to update counts.' };
  }
}

// ─── Toggle Salon Open/Closed ─────────────────────────────────────────────────

export async function toggleSalonOpen(
  salonId: string,
  isOpen: boolean,
): Promise<ServiceResult<void>> {
  try {
    await updateDoc(doc(db, Collections.SALONS, salonId), {
      isOpen,
      updatedAt: Date.now(),
    });
    return {};
  } catch (err) {
    console.error('[SalonService] toggleSalonOpen error:', err);
    return { error: 'Failed to update salon status.' };
  }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function defaultWorkingHours() {
  const day = { isOpen: true, openTime: '09:00', closeTime: '21:00' };
  const sunday = { isOpen: false, openTime: '09:00', closeTime: '18:00' };
  return {
    mon: day,
    tue: day,
    wed: day,
    thu: day,
    fri: day,
    sat: day,
    sun: sunday,
  };
}
