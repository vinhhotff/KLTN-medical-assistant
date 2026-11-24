import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../ui';

const BASE_TIMES: string[] = [];
for (let mins = 6 * 60; mins <= 22 * 60; mins += 15) {
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  BASE_TIMES.push(`${hh}:${mm}`);
}

interface TimeSelectProps {
  value: string;
  onChange: (nextValue: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/**
 * Clean 24-hour Clinical time dropdown replacing browser AM/PM <input type="time"> controls.
 */
export const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  ariaLabel,
  disabled,
  invalid,
  className,
}) => {
  const options = useMemo(() => {
    const normalized = value?.slice(0, 5);
    if (normalized && !BASE_TIMES.includes(normalized)) {
      return [...BASE_TIMES, normalized].sort();
    }
    return BASE_TIMES;
  }, [value]);

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value?.slice(0, 5) || '08:00'}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          'appearance-none bg-transparent pl-1.5 pr-5 py-1 text-sm font-semibold tabular-nums rounded-md',
          'text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35',
          'disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed',
          invalid && 'text-rose-700',
          className,
        )}
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-1" aria-hidden />
    </div>
  );
};
