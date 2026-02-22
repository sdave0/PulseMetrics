export const safeDuration = (d: unknown): number | null => {
  if (typeof d === 'number' && !isNaN(d)) return Math.max(0, d);
  return null;
};

export const safeString = (s: unknown, defaultVal = 'unknown'): string => {
  return (s !== null && s !== undefined) ? String(s) : defaultVal;
};

export const safeDate = (d: unknown, fallback: unknown): string => {
  return (typeof d === 'string' && d) ? d : (typeof fallback === 'string' && fallback ? fallback : new Date().toISOString());
};
