export const safeDuration = (d: unknown): number => {
  if (typeof d === 'number' && !isNaN(d)) return d;
  return -1;
};

export const safeString = (s: unknown, defaultVal = 'unknown'): string => {
  return (s !== null && s !== undefined) ? String(s) : defaultVal;
};

export const safeDate = (d: unknown, fallback: unknown): string => {
  return (typeof d === 'string' && d) ? d : (typeof fallback === 'string' && fallback ? fallback : new Date().toISOString());
};
