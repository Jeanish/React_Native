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

export function getTimeSlots(
  openTime: string,
  closeTime: string,
  intervalMinutes = 30,
): string[] {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (current + intervalMinutes <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`);
    current += intervalMinutes;
  }

  return slots;
}

export function todayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function dayKeyFromDate(date: Date): string {
  return format(date, 'EEE').toLowerCase(); // 'mon', 'tue', etc.
}
