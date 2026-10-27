import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from './cn';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const STYLES: Record<ToastTone, string> = {
  success: 'bg-white border-emerald-200/90 text-emerald-950',
  error: 'bg-white border-rose-200/90 text-rose-950',
  info: 'bg-white border-teal-200/90 text-teal-950',
};
const ICON_COLORS: Record<ToastTone, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-teal-600',
};

/** App-wide toast stack. Replaces alert() for success/failure feedback. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[90] bottom-5 inset-x-4 sm:inset-x-auto sm:right-5 sm:w-96 flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              data-testid={`toast-${t.tone}`}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-[0_10px_25px_rgba(0,0,0,0.08)] text-sm animate-scaleUp',
                STYLES[t.tone]
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', ICON_COLORS[t.tone])} aria-hidden />
              <p className="flex-1 leading-snug font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
