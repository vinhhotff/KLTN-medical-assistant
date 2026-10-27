import React from 'react';
import { cn } from './cn';

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + inline error/hint. Pass the same id to the control via htmlFor. */
export const Field: React.FC<FieldProps> = ({ label, htmlFor, error, hint, required, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-700">
      {label}
      {required && <span className="text-rose-600 ml-1" aria-hidden>*</span>}
    </label>
    {children}
    {error ? (
      <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[11px] font-semibold text-rose-600">
        {error}
      </p>
    ) : hint ? (
      <p className="text-[11px] text-slate-500">{hint}</p>
    ) : null}
  </div>
);

export const inputClass = (hasError?: boolean) =>
  cn(
    'w-full px-3.5 py-2.5 text-sm bg-[#FCFBF8] border rounded-xl focus:outline-none focus:ring-2 transition shadow-[inset_0_1px_2px_rgba(18,16,14,0.04)]',
    'disabled:bg-slate-100 disabled:text-slate-500 placeholder:text-slate-400',
    hasError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:border-teal-600 focus:ring-teal-500/25',
  );

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ invalid, className, id, ...rest }, ref) => (
  <input
    ref={ref}
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid && id ? `${id}-error` : undefined}
    className={cn(inputClass(invalid), className)}
    {...rest}
  />
));
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ invalid, className, id, ...rest }, ref) => (
  <textarea
    ref={ref}
    id={id}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid && id ? `${id}-error` : undefined}
    className={cn(inputClass(invalid), className)}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';
