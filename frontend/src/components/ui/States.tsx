import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('skeleton-shimmer rounded-lg', className)} aria-hidden />
);

/** Skeleton card matching standard clinical surface cards. */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white rounded-2xl p-6 border border-slate-200/80 shadow-clinical-sm space-y-4', className)} aria-hidden>
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
);

const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Responsive grid of SkeletonCards for directory and listing loaders. */
export const SkeletonCardGrid: React.FC<{ count?: number; columns?: 2 | 3 | 4; className?: string }> = ({
  count = 6,
  columns = 3,
  className,
}) => (
  <div className={cn('grid gap-6', GRID_COLS[columns], className)} role="status" aria-label="Đang tải">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** Stacked skeleton rows for list loading states. */
export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <div className={cn('space-y-3', className)} role="status" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-clinical-sm space-y-2.5">
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
        <Skeleton key={c} className="h-3 w-2/3" />
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
  <div className={cn('py-12 px-6 text-center border border-dashed border-slate-300 rounded-2xl bg-white', className)}>
    <div className="mx-auto w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mb-3.5">
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
    className={cn('p-4 rounded-2xl border border-rose-200 bg-rose-50/90 flex flex-col sm:flex-row sm:items-center gap-3 shadow-clinical-sm', className)}
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
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  teal: 'bg-teal-50 text-teal-800 border-teal-200',
};

export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className,
  children,
}) => (
  <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold tracking-tight rounded-lg border', BADGE[tone], className)}>
    {children}
  </span>
);

/** Inline "missing data" marker: "—" plus a muted label (e.g. "Chưa đo", "Chưa cập nhật"). */
export const Missing: React.FC<{ label?: string; className?: string }> = ({ label = 'Chưa cập nhật', className }) => (
  <span className={cn('text-slate-500 font-normal font-mono', className)} data-missing>
    — <span className="text-[11px] italic font-sans">{label}</span>
  </span>
);
