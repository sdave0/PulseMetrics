export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--';
  const val = Math.max(0, seconds);
  return `${val}s`;
};

export const formatCost = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '--';
  const val = Math.max(0, amount);
  return `$${val.toFixed(2)}`;
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  const val = Math.max(0, value);
  return `${val.toFixed(1)}%`;
};

export const formatCount = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  const val = Math.max(0, value);
  return val.toString();
};

export const formatTrigger = (trigger: string | null | undefined): string => {
  return trigger || '--';
};

export const formatCommit = (hash: string | null | undefined): string => {
    if (!hash) return '--';
    return hash.substring(0, 7);
};
