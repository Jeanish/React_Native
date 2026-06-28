const IST_OFFSET_MS = 330 * 60 * 1000; // 5.5 hours

/**
 * Convert an IST calendar date + HH:MM time to an absolute UTC Date.
 */
export const getISTSlotDateTime = (date: Date | string, timeStr: string): Date => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const dateVal = d.getUTCDate();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcMillis = Date.UTC(year, month, dateVal, hours, minutes, 0, 0);
  return new Date(utcMillis - IST_OFFSET_MS);
};

/**
 * Format a date as YYYY-MM-DD in IST.
 */
export const getISTDateString = (d: Date): string => {
  const dateIST = new Date(d.getTime() + IST_OFFSET_MS);
  return dateIST.toISOString().split('T')[0];
};
