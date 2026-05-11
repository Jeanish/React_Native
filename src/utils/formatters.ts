/**
 * TrimCity — Formatters
 */
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatOccupancy(seated: number, total: number): string {
  return `${seated}/${total}`;
}

/**
 * Generate bookable time slots between openTime and closeTime.
 * - `intervalMinutes`: spacing between slot starts (default 30).
 * - `minTime24h`: hide slots before this wall-clock time (used for "today" filtering).
 * - `serviceDurationMinutes`: ensures the slot finishes before closeTime.
 *   When provided, the last slot offered is `closeTime - duration`, so a 60-min
 *   service in a 10:00-18:00 salon stops offering slots after 17:00.
 */
export function getTimeSlots(
  openTime: string,
  closeTime: string,
  intervalMinutes = 30,
  minTime24h?: string,
  serviceDurationMinutes?: number,
): string[] {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const start = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  const slotSpan = serviceDurationMinutes ?? intervalMinutes;

  let cursor = start;
  if (minTime24h) {
    const [mh, mm] = minTime24h.split(':').map(Number);
    const minMinutes = mh * 60 + mm;
    if (minMinutes > cursor) {
      const offset = (minMinutes - start) % intervalMinutes;
      cursor = offset === 0 ? minMinutes : minMinutes + (intervalMinutes - offset);
    }
  }

  while (cursor + slotSpan <= end) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`);
    cursor += intervalMinutes;
  }

  return slots;
}

export function todayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function dayKeyFromDate(date: Date): string {
  return format(date, 'EEE').toLowerCase(); // 'mon', 'tue', etc.
}
