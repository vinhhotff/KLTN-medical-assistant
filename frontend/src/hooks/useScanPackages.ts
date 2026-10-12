import { useEffect, useState } from 'react';
import { fetchScanPackages, type PackageSource } from '../services/pricingService';
import type { ScanPackage } from '../config/pricing';

/** Package catalogue from the backend, or the fallback table (`source: 'fallback'`) when the API is unavailable. */
export function useScanPackages(enabled = true) {
  const [state, setState] = useState<{ packages: ScanPackage[]; source: PackageSource | null; loading: boolean }>({
    packages: [],
    source: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetchScanPackages().then((res) => {
      if (alive) setState({ packages: res.packages, source: res.source, loading: false });
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}
