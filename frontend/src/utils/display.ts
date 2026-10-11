/** Placeholder rendered when a value is missing. Never substitute fabricated data. */
export const MISSING = '—';

/** Format a VND amount, or return null when the amount is unknown / not positive. */
export function formatVnd(amount?: number | string | null): string | null {
  const n = Number(amount);
  if (amount === null || amount === undefined || amount === '' || !Number.isFinite(n) || n <= 0) return null;
  return `${n.toLocaleString('vi-VN')} ₫`;
}

/** Rating text, or null when the doctor has no reviews yet. */
export function formatRating(rating?: number | null, reviewCount?: number | null): string | null {
  if (!rating || rating <= 0) return null;
  if (reviewCount !== undefined && reviewCount !== null && reviewCount <= 0) return null;
  return rating.toFixed(1);
}
