import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-slate-200/90', className)} aria-hidden />
);

/** Stacked skeleton rows for list loading states. */
export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <div className={cn('space-y-3', className)} role="status" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="p-5 rounded-2xl border border-slate-300 bg-[#FCFBF8] shadow-xs space-y-2.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

/** Table-shaped skeleton (header + rows × cols) for admin tables. */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ rows = 5, cols = 4, className }) => (
  <div className={cn('p-5 space-y-3', className)} role="status" aria-label="Đang tải" data-testid="skeleton-table">
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols }, (_, c) => (
        <Skeleton key={c} className="h-3 w-2/3 bg-slate-300/80" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="grid gap-4 py-2.5 border-t border-slate-200" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-4/5' : 'w-1/2')} />
        ))}
      </div>
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action, className }) => (
  <div className={cn('py-12 px-6 text-center border-2 border-dashed border-slate-300 rounded-3xl bg-[#FCFBF8]/90 bg-atelier-dots', className)}>
    <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 text-[#F6F3EC] flex items-center justify-center mb-3.5 shadow-sm">
      {icon ?? <Inbox className="w-6 h-6" aria-hidden />}
    </div>
    <p className="font-display font-bold text-slate-900 text-base tracking-tight">{title}</p>
    {description && <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, retrying, className }) => (
  <div
    role="alert"
    className={cn('p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/90 flex flex-col sm:flex-row sm:items-center gap-3 shadow-xs', className)}
  >
    <div className="flex items-start gap-2.5 flex-1 text-sm font-medium text-rose-900">
      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" aria-hidden />
      <span>{message}</span>
    </div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying} icon={<RefreshCw className="w-3.5 h-3.5" />}>
        Thử lại
      </Button>
    )}
  </div>
);

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'teal';
const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-slate-200/80 text-slate-800 border-slate-300',
  success: 'bg-emerald-100/80 text-emerald-900 border-emerald-300',
  warning: 'bg-amber-100/80 text-amber-900 border-amber-300',
  danger: 'bg-rose-100/80 text-rose-900 border-rose-300',
  info: 'bg-violet-100/80 text-violet-900 border-violet-300',
  teal: 'bg-teal-100/80 text-teal-900 border-teal-300',
};

export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className,
  children,
}) => (
  <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-tight rounded-md border', BADGE[tone], className)}>
    {children}
  </span>
);

/** Inline "missing data" marker: "—" plus a muted label (e.g. "Chưa đo", "Chưa cập nhật"). */
export const Missing: React.FC<{ label?: string; className?: string }> = ({ label = 'Chưa cập nhật', className }) => (
  <span className={cn('text-slate-400 font-normal font-mono', className)} data-missing>
    — <span className="text-[11px] italic font-sans">{label}</span>
  </span>
);
