/**
 * Parse duration strings like "30d", "1h", "15m" into a future Date.
 */
export const parseDurationToDate = (duration: string, from: Date = new Date()): Date => {
  const match = duration.match(/^(\d+)([dhms])$/i);
  const result = new Date(from);

  if (!match) {
    const days = parseInt(duration, 10);
    result.setDate(result.getDate() + (Number.isNaN(days) ? 30 : days));
    return result;
  }

  const value = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 'd':
      result.setDate(result.getDate() + value);
      break;
    case 'h':
      result.setHours(result.getHours() + value);
      break;
    case 'm':
      result.setMinutes(result.getMinutes() + value);
      break;
    case 's':
      result.setSeconds(result.getSeconds() + value);
      break;
  }

  return result;
};
