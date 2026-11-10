/**
 * FreshNest Poultry Farm - Formatting Utilities
 */

/**
 * Format date in clean agricultural format (e.g. 01 Nov 2026)
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format numbers with comma separation
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format currency in Nigerian Naira (NGN, ₦)
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return '₦0.00';
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absNum);

  return isNegative ? `-₦${formattedNumber}` : `₦${formattedNumber}`;
}

/**
 * Format storage bytes into human readable string
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
