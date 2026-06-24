/**
 * TrimCity — Core TypeScript Types
 * Single source of truth for all data models.
 */

// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'owner' | 'admin';

export interface AppUser {
  uid: string;
  phone: string;
  email?: string;
  name: string;
  photoURL?: string;
  role: UserRole;
  fcmToken?: string;
  createdAt: number; // Unix ms
  updatedAt: number;
}

// ─── Salon ──────────────────────────────────────────────────────────────────

export type SalonCategory = 'men' | 'women' | 'unisex';

export interface SalonService {
  id: string;
  name: string;
  durationMinutes: number;
  priceInr: number;
}

export interface WorkingDay {
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "20:00"
}

export type WorkingHours = {
  mon: WorkingDay;
  tue: WorkingDay;
  wed: WorkingDay;
  thu: WorkingDay;
  fri: WorkingDay;
  sat: WorkingDay;
  sun: WorkingDay;
};

export interface Salon {
  salonId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: SalonCategory;
  totalSeats: number;
  seatedNow: number;
  waitingNow: number;
  rating: number;
  ratingCount: number;
  isOpen: boolean;
  ownerId: string;
  services: SalonService[];
  photos: string[];
  workingHours: WorkingHours;
  phone: string;
  createdAt: number;
  updatedAt: number;
  isVerified: boolean;
}

/** Derived from Salon for UI display */
export interface SalonWithMeta extends Salon {
  availabilityStatus: 'available' | 'busy' | 'full' | 'closed';
  occupancyPercent: number; // 0–100
  distanceKm?: number;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'confirmed'
  | 'waiting'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  appointmentId: string;
  salonId: string;
  salonName: string;
  salonAddress: string;
  salonLatitude: number;
  salonLongitude: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  service: string;
  servicePriceInr: number;
  serviceDurationMinutes: number;
  timeSlot: string; // "10:00 AM"
  date: string; // "YYYY-MM-DD"
  status: AppointmentStatus;
  createdAt: number;
  updatedAt: number;
  ownerNotes?: string;
  queuePosition?: number; // for waiting status
}

// ─── Booking Form ────────────────────────────────────────────────────────────

export interface BookingFormData {
  customerName: string;
  customerPhone: string;
  serviceId: string;
  timeSlot: string;
  date: string;
}

// ─── City Stats ───────────────────────────────────────────────────────────────

export interface CityStats {
  totalSalons: number;
  openNow: number;
  totalSeated: number;
  totalWaiting: number;
  updatedAt: number;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export type FilterChip =
  | 'all'
  | 'available_now'
  | 'low_wait'
  | 'top_rated'
  | 'men'
  | 'women'
  | 'unisex'
  | 'near_me';

export interface SalonFilters {
  search: string;
  activeFilter: FilterChip;
}

// ─── Navigation Params ───────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Customer: undefined;
  Owner: undefined;
  Admin: undefined;
};

export type AuthStackParamList = {
  Email: { role?: UserRole };
  OTP: { email: string; verificationId: string; role: UserRole };
};

export type CustomerTabParamList = {
  Home: undefined;
  Appointments: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  HomeTab: undefined;
  SalonDetail: { salonId: string; salonName: string };
  BookingConfirm: { appointment: Appointment };
  AppointmentsTab: undefined;
  ProfileTab: undefined;
};

export type OwnerTabParamList = {
  Dashboard: undefined;
  SalonSetup: undefined;
  BookingMgmt: undefined;
};

export type AdminTabParamList = {
  AdminSalons: undefined;
  AdminAdd: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminEditSalon: { salonId: string };
};

// ─── API / Service ────────────────────────────────────────────────────────────

export interface ServiceResult<T> {
  data?: T;
  error?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  recipientFcmToken: string;
}

// ─── Owner Walk-In ────────────────────────────────────────────────────────────

export interface WalkInFormData {
  customerName: string;
  customerPhone: string;
  service: string;
}
