/**
 * Single source of truth for phone formatting across the app.
 * Storage format: 10-digit Indian number without country code ("9876543210").
 * Display format: "+91 98765 43210".
 */

export function normalizePhone(input: string): string {
  // Strip everything except digits, then take the last 10 for Indian numbers.
  const digits = (input ?? '').replace(/\D/g, '');
  return digits.slice(-10);
}

export function isValidIndianPhone(input: string): boolean {
  const n = normalizePhone(input);
  return /^[6-9]\d{9}$/.test(n) || /^0{9}[1-9]$/.test(n); // allow dev seeds like 0000000001
}

export function formatPhoneDisplay(input: string): string {
  const n = normalizePhone(input);
  if (n.length !== 10) return input;
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}
