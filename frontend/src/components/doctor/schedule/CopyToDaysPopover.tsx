import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { DAYS, DayKey } from '../../../types/schedule';
import { cn } from '../../ui';

interface CopyToDaysPopoverProps {
  sourceDay: DayKey;
  sourceLabel: string;
  disabled?: boolean;
  onApply: (targetDays: DayKey[]) => void;
}

export const CopyToDaysPopover: React.FC<CopyToDaysPopoverProps> = ({
  sourceDay,
  sourceLabel,
  disabled,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DayKey[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      setSelected([]);
    }
    setOpen((v) => !v);
  };

  const toggleDay = (key: DayKey) => {
    if (key === sourceDay) return;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const applyPreset = (keys: DayKey[]) => {
    setSelected(keys.filter((k) => k !== sourceDay));
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onApply(selected);
    setOpen(false);
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={`Áp dụng lịch ${sourceLabel} cho nhiều ngày`}
        title="Áp dụng khung giờ này cho các ngày khác"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white',
          'text-xs font-medium text-slate-600 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50/50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 transition-colors cursor-pointer',
          'disabled:opacity-45 disabled:cursor-not-allowed',
        )}
      >
        <Copy className="w-3.5 h-3.5" aria-hidden />
        <span>Áp dụng nhiều ngày</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Sao chép lịch từ ${sourceLabel}`}
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-clinical-lg p-4 z-40 animate-scaleUp"
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900">Áp dụng lịch {sourceLabel} cho:</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-[11px] font-medium text-slate-600 cursor-pointer transition-colors"
              >
                T2–T6
              </button>
              <button
                type="button"
                onClick={() => applyPreset(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-[11px] font-medium text-slate-600 cursor-pointer transition-colors"
              >
                T2–T7
              </button>
              <button
                type="button"
                onClick={() => applyPreset(DAYS.map((d) => d.key))}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-[11px] font-medium text-slate-600 cursor-pointer transition-colors"
              >
                Tất cả
              </button>
            </div>
          </div>

          <ul className="py-2 space-y-1">
            {DAYS.map(({ key, label }) => {
              const isSource = key === sourceDay;
              const checked = isSource || selected.includes(key);
              return (
                <li key={key}>
                  <label
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                      isSource ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-800 cursor-pointer',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSource}
                        onChange={() => toggleDay(key)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="font-medium">{label}</span>
                    </span>
                    {isSource && (
                      <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        Ngày gốc
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3.5 h-3.5" aria-hidden />
              Áp dụng ({selected.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
