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

export function inferJobCategory(name: string): 'test' | 'build' | 'lint' | 'deploy' | 'dependency' | 'unknown' {
  const n = name.toLowerCase();
  if (n.includes('test') || n.includes('spec') || n.includes('e2e')) return 'test';
  if (n.includes('build') || n.includes('compile') || n.includes('pack')) return 'build';
  if (n.includes('lint') || n.includes('format') || n.includes('check')) return 'lint';
  if (n.includes('deploy') || n.includes('publish') || n.includes('release')) return 'deploy';
  if (n.includes('install') || n.includes('setup') || n.includes('dep')) return 'dependency';
  return 'unknown';
}
