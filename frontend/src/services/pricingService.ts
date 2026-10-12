import { api } from './api';
import { FALLBACK_SCAN_PACKAGES, PACKAGE_CODES, type PackageCode, type ScanPackage } from '../config/pricing';
import { devLog } from '../utils/logger';

export type PackageSource = 'api' | 'fallback';

export interface ScanPackageList {
  packages: ScanPackage[];
  source: PackageSource;
}

const FALLBACK: ScanPackageList = { packages: PACKAGE_CODES.map((c) => FALLBACK_SCAN_PACKAGES[c]), source: 'fallback' };

const isPackageCode = (v: unknown): v is PackageCode => typeof v === 'string' && (PACKAGE_CODES as readonly string[]).includes(v);
const positiveIntOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/** Validate one PaymentPackageDto; returns null when the shape is not usable. */
function parsePackage(raw: unknown): ScanPackage | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isPackageCode(r.code)) return null;
  if (typeof r.priceVnd !== 'number' || !Number.isFinite(r.priceVnd) || r.priceVnd <= 0) return null;
  const fallback = FALLBACK_SCAN_PACKAGES[r.code];
  return {
    code: r.code,
    priceVnd: r.priceVnd,
    name: typeof r.name === 'string' && r.name.trim() ? r.name : fallback.name,
    description: typeof r.description === 'string' && r.description.trim() ? r.description : fallback.description,
    scans: positiveIntOrNull(r.scans),
    durationDays: positiveIntOrNull(r.durationDays),
    unlimitedScans: r.unlimitedScans === true,
  };
}

let cached: ScanPackageList | null = null;
let inflight: Promise<ScanPackageList> | null = null;

/**
 * GET /payments/packages (BE-6). Only a successful, valid response is cached;
 * network errors, 404, an empty list or a wrong shape fall back to FALLBACK_SCAN_PACKAGES.
 */
export function fetchScanPackages(): Promise<ScanPackageList> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = api
    .get('/payments/packages')
    .then((res) => {
      const list = res.data?.data;
      const packages = Array.isArray(list) ? list.map(parsePackage).filter((p): p is ScanPackage => p !== null) : [];
      if (packages.length === 0) {
        devLog.warn('GET /payments/packages returned no usable package, using fallback prices', list);
        return FALLBACK;
      }
      if (Array.isArray(list) && packages.length !== list.length) {
        devLog.warn('GET /payments/packages: dropped invalid entries', list);
      }
      cached = { packages, source: 'api' };
      return cached;
    })
    .catch((err) => {
      devLog.warn('GET /payments/packages failed, using fallback prices', err);
      return FALLBACK;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
