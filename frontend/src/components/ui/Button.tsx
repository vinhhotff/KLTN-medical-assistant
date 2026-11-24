import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  /** Why the button is disabled — shown as tooltip and announced to screen readers. */
  disabledReason?: string | null;
  icon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-teal-600 text-white border border-teal-600 hover:bg-teal-700 hover:border-teal-700 hover:-translate-y-[1px] shadow-clinical-sm hover:shadow-clinical-md active:scale-[0.98] active:translate-y-0 focus-visible:ring-teal-500/40',
  secondary:
    'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-clinical-sm active:scale-[0.98] focus-visible:ring-teal-500/40',
  danger:
    'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700 hover:-translate-y-[1px] shadow-clinical-sm hover:shadow-clinical-md active:scale-[0.98] active:translate-y-0 focus-visible:ring-rose-500/40',
  warning:
    'bg-amber-600 text-white border border-amber-600 hover:bg-amber-700 hover:border-amber-700 hover:-translate-y-[1px] shadow-clinical-sm hover:shadow-clinical-md active:scale-[0.98] active:translate-y-0 focus-visible:ring-amber-500/40',
  ghost:
    'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] focus-visible:ring-teal-500/40',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg min-h-[32px] tracking-tight',
  md: 'px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl min-h-[40px] tracking-tight',
  lg: 'px-5 py-3 text-sm gap-2.5 rounded-xl min-h-[48px] tracking-tight',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, loadingText, disabledReason, icon, disabled, className, children, title, type = 'button', ...rest },
    ref,
  ) => {
    const isDisabled = disabled || loading || Boolean(disabledReason);
    const reasonId = React.useId();
    return (
      <>
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          aria-describedby={disabledReason ? reasonId : undefined}
          title={disabledReason || title}
          className={cn(
            'inline-flex items-center justify-center font-display font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            'disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer',
            VARIANTS[variant],
            SIZES[size],
            className,
          )}
          {...rest}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : icon}
          {loading && loadingText ? loadingText : children}
        </button>
        {disabledReason && (
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        )}
      </>
    );
  },
);
Button.displayName = 'Button';
