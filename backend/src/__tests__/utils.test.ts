import { timeToMinutes, minutesToTime } from '../services/availability.service';
import { buildTimeOverlapFilter, getDayBounds } from '../utils/appointmentQuery';
import { getISTSlotDateTime, getISTDateString } from '../utils/timezone';
import { parseDurationToDate } from '../utils/duration';

describe('time utilities', () => {
  it('converts time strings to minutes and back', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
  });

  it('builds day bounds for appointment queries', () => {
    const date = new Date('2026-06-15T12:00:00.000Z');
    const { startOfDay, endOfDay } = getDayBounds(date);
    expect(startOfDay.getHours()).toBe(0);
    expect(endOfDay.getHours()).toBe(23);
  });

  it('builds overlap filters for booking windows', () => {
    const filter = buildTimeOverlapFilter('10:00', '11:00');
    expect(filter.$or).toHaveLength(3);
  });
});

describe('timezone helpers', () => {
  it('formats IST date strings', () => {
    const str = getISTDateString(new Date('2026-01-01T00:00:00.000Z'));
    expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('converts IST slot times to UTC dates', () => {
    const slot = getISTSlotDateTime(new Date('2026-06-15T00:00:00.000Z'), '10:00');
    expect(slot).toBeInstanceOf(Date);
    expect(slot.getTime()).toBeLessThan(Date.now() + 365 * 24 * 60 * 60 * 1000);
  });
});

describe('duration parsing', () => {
  it('parses day-based refresh token expiry', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const result = parseDurationToDate('30d', from);
    expect(result.getUTCDate()).toBe(31);
  });
});
