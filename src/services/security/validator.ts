/**
 * TrimCity — Input Validator (using Zod schemas)
 * All user-supplied data is validated before touching Firebase.
 */
import { z } from 'zod';

// ─── Primitives ───────────────────────────────────────────────────────────────

export function validateIndianPhone(phone: string): boolean {
  // 10-digit Indian mobile number (starts with 6-9)
  return /^[6-9]\d{9}$/.test(phone);
}

export function validateOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const BookingFormSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name too long')
    .regex(/^[a-zA-Z\u0900-\u097F\s.\-']+$/, 'Name contains invalid characters'),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  serviceId: z.string().min(1, 'Please select a service'),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export const SalonServiceSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(2, 'Service name too short')
    .max(60, 'Service name too long'),
  durationMinutes: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 8 hours'),
  priceInr: z.number().min(0, 'Price cannot be negative').max(100000),
});

export const SalonProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Salon name too short')
    .max(100, 'Salon name too long'),
  address: z.string().min(5, 'Please enter a full address').max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.enum(['men', 'women', 'unisex']),
  totalSeats: z.number().int().min(1).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  services: z.array(SalonServiceSchema).min(1, 'Add at least one service'),
});

export const WalkInSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Name too short')
    .max(80),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit number'),
  service: z.string().min(1, 'Select a service'),
});

export const UserProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80),
});

// ─── Type exports ─────────────────────────────────────────────────────────────
export type BookingFormInput = z.infer<typeof BookingFormSchema>;
export type SalonProfileInput = z.infer<typeof SalonProfileSchema>;
export type WalkInInput = z.infer<typeof WalkInSchema>;
export type UserProfileInput = z.infer<typeof UserProfileSchema>;
