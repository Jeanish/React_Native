/**
 * TrimCity — Input Sanitizer
 * Strips dangerous characters before data reaches Firebase.
 * Prevents XSS, injection, and malformed data.
 */

/**
 * Strip all non-numeric characters from phone input.
 * "98765 43210" → "9876543210"
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').trim();
}

/**
 * Remove HTML tags and script injection patterns from any string.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '') // strip JS protocol
    .replace(/on\w+\s*=/gi, '') // strip event handlers
    .trim();
}

/**
 * Sanitize a name field: only letters, spaces, dots, hyphens.
 * Max length enforced.
 */
export function sanitizeName(name: string, maxLength = 80): string {
  return sanitizeText(name)
    .replace(/[^a-zA-Z\u0900-\u097F\s.\-']/g, '') // allow Hindi Unicode
    .substring(0, maxLength)
    .trim();
}

/**
 * Sanitize a price value — must be a non-negative number.
 */
export function sanitizePrice(price: unknown): number {
  const n = Number(price);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100; // 2 decimal places
}

/**
 * Sanitize duration in minutes — positive integer only.
 */
export function sanitizeDuration(minutes: unknown): number {
  const n = Math.floor(Number(minutes));
  if (isNaN(n) || n <= 0) return 30;
  if (n > 480) return 480; // max 8 hours
  return n;
}

/**
 * Sanitize a seats count — positive integer, reasonable max.
 */
export function sanitizeSeats(seats: unknown): number {
  const n = Math.floor(Number(seats));
  if (isNaN(n) || n <= 0) return 1;
  if (n > 200) return 200;
  return n;
}

/**
 * Sanitize latitude — must be in [-90, 90].
 */
export function sanitizeLatitude(lat: unknown): number | null {
  const n = Number(lat);
  if (isNaN(n) || n < -90 || n > 90) return null;
  return n;
}

/**
 * Sanitize longitude — must be in [-180, 180].
 */
export function sanitizeLongitude(lng: unknown): number | null {
  const n = Number(lng);
  if (isNaN(n) || n < -180 || n > 180) return null;
  return n;
}

/**
 * Sanitize an OTP string — digits only, exactly 6 chars.
 */
export function sanitizeOTP(otp: string): string {
  return otp.replace(/\D/g, '').substring(0, 6);
}

/**
 * Sanitize a URL — only allow http/https, no JS.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed;
}
