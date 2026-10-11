import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-slate-200/80', className)} aria-hidden />
);

/** Stacked skeleton rows for list loading states. */
export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <div className={cn('space-y-3', className)} role="status" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
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
  <div className={cn('py-10 px-4 text-center border border-dashed border-slate-300 rounded-2xl bg-white', className)}>
    <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
      {icon ?? <Inbox className="w-6 h-6" aria-hidden />}
    </div>
    <p className="font-semibold text-slate-700 text-sm">{title}</p>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
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
    className={cn('p-4 rounded-2xl border border-rose-200 bg-rose-50 flex flex-col sm:flex-row sm:items-center gap-3', className)}
  >
    <div className="flex items-start gap-2 flex-1 text-sm text-rose-800">
      <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
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
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  teal: 'bg-teal-50 text-teal-800 border-teal-200',
};

export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className,
  children,
}) => (
  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border', BADGE[tone], className)}>
    {children}
  </span>
);

/** Inline "missing data" marker: "—" plus a muted label (e.g. "Chưa đo", "Chưa cập nhật"). */
export const Missing: React.FC<{ label?: string; className?: string }> = ({ label = 'Chưa cập nhật', className }) => (
  <span className={cn('text-slate-400 font-normal', className)} data-missing>
    — <span className="text-[11px] italic">{label}</span>
  </span>
);
