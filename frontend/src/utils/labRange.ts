/**
 * Parses a lab reference range ("3,9 - 5,2", "< 3.4", "≥ 1.2", "0 – 41") and places a value on a 0–100% track.
 * Returns null when the range or value cannot be read — callers then hide the visual bar instead of guessing.
 */
export interface RangePlacement {
  /** Normal band on the track, in percent. */
  bandStart: number;
  bandEnd: number;
  /** Value marker position, in percent (clamped to 2–98 so it stays visible). */
  marker: number;
}

const toNumber = (s: string): number | null => {
  const m = s.replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const parseLabNumber = (value: string | number | null | undefined): number | null =>
  value === null || value === undefined ? null : toNumber(String(value));

export function placeOnRange(value: string | number | null | undefined, range: string | null | undefined): RangePlacement | null {
  const v = parseLabNumber(value);
  if (v === null || !range) return null;
  const r = range.trim();

  let low: number | null = null;
  let high: number | null = null;

  const between = r.match(/(-?\d+(?:[.,]\d+)?)\s*[-–—~]\s*(-?\d+(?:[.,]\d+)?)/);
  if (between) {
    low = toNumber(between[1]);
    high = toNumber(between[2]);
  } else if (/^(<|≤|<=)/.test(r)) {
    low = 0;
    high = toNumber(r);
  } else if (/^(>|≥|>=)/.test(r)) {
    low = toNumber(r);
  } else {
    return null;
  }
  if (low === null) return null;

  // Track spans the normal band with margin on both sides (one-sided ranges get a synthetic upper bound).
  const upper = high ?? (low * 2 || 1);
  const span = Math.max(upper - low, Math.abs(upper) * 0.1, 1e-6);
  const min = Math.max(0, low - span * 0.6);
  const max = upper + span * 0.6;
  const pct = (x: number) => ((x - min) / (max - min)) * 100;
  const clamp = (x: number) => Math.min(98, Math.max(2, x));

  return {
    bandStart: clamp(pct(low)),
    bandEnd: high === null ? 98 : clamp(pct(high)),
    marker: clamp(pct(v)),
  };
}
