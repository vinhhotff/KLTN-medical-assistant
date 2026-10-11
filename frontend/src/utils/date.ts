/**
 * Local-time date helpers.
 * `new Date().toISOString()` is UTC, so between 00:00 and 07:00 in Vietnam (UTC+7)
 * it returns yesterday's date. Always use these helpers for <input type="date"> min/max.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in the browser's local timezone. */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as YYYY-MM-DD (local time). */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/** Local date shifted by N days, as YYYY-MM-DD. */
export function localDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** Date part (YYYY-MM-DD) of a backend LocalDateTime string, without timezone conversion. */
export function datePart(isoLocalDateTime?: string | null): string {
  return isoLocalDateTime ? isoLocalDateTime.slice(0, 10) : '';
}

/** Whole years between a YYYY-MM-DD birth date and today, or null when unknown. */
export function ageFromBirthDate(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(`${dob.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
