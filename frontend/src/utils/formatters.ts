export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '₹0';
  const num = parseFloat(String(value));
  if (num >= 10000000) return `₹${Math.round(num / 10000000 * 10) / 10}Cr`;
  if (num >= 100000) return `₹${Math.round(num / 100000 * 10) / 10}L`;
  if (num >= 1000) return `₹${Math.round(num / 1000)}K`;
  return `₹${Math.round(num)}`;
}

export function formatNum(value: number | string | null | undefined): string {
  if (!value) return '0';
  return parseInt(String(value), 10).toLocaleString('en-IN');
}

export function formatPct(value: number | string | null | undefined, decimals = 1): string {
  return `${parseFloat(String(value || 0)).toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
