import { useState, useEffect } from 'react';

/**
 * Custom React hook that debounces a fast-changing value.
 * Commonly used for real-time search inputs to prevent aggressive filtering and UI stutter.
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default 250ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
