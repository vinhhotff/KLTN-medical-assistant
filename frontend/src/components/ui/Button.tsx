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
    'bg-slate-900 text-[#F6F3EC] border border-slate-900 hover:bg-teal-600 hover:border-teal-700 shadow-[0_2px_0_0_rgba(18,16,14,0.28)] active:translate-y-[1px] focus-visible:ring-teal-500',
  secondary:
    'bg-[#FCFBF8] text-slate-900 border border-slate-300 hover:border-slate-900 hover:bg-slate-100/80 shadow-[0_2px_0_0_rgba(18,16,14,0.08)] active:translate-y-[1px] focus-visible:ring-teal-500',
  danger:
    'bg-rose-600 text-white border border-rose-700 hover:bg-rose-700 shadow-[0_2px_0_0_rgba(136,19,55,0.3)] active:translate-y-[1px] focus-visible:ring-rose-500',
  warning:
    'bg-amber-600 text-white border border-amber-700 hover:bg-amber-700 shadow-[0_2px_0_0_rgba(120,53,15,0.3)] active:translate-y-[1px] focus-visible:ring-amber-500',
  ghost:
    'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-teal-500',
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
            'inline-flex items-center justify-center font-display font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
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
