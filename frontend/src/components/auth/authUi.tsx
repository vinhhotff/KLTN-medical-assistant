import React from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

/** Shared look for the login + register forms (white inputs, text-sm, sentence-case labels). */
export const authInput =
  'w-full py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition';

export const AuthLabel: React.FC<{ htmlFor?: string; required?: boolean; children: React.ReactNode }> = ({ htmlFor, required, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-800 mb-1.5">
    {children}
    {required && <span className="text-rose-500"> *</span>}
  </label>
);

export const AuthHint: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="mt-1 block text-xs text-slate-500">{children}</span>;

/** Input with a leading icon and an optional show/hide toggle for passwords. */
export const IconInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ComponentType<{ className?: string }>;
    reveal?: { shown: boolean; onToggle: () => void; label: string };
  }
> = ({ icon: Icon, reveal, className, ...rest }) => (
  <div className="relative">
    <Icon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input {...rest} className={`${authInput} pl-10 ${reveal ? 'pr-10' : 'pr-3.5'} ${className ?? ''}`} />
    {reveal && (
      <button
        type="button"
        onClick={reveal.onToggle}
        aria-label={reveal.label}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        {reveal.shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    )}
  </div>
);

export const AuthAlert: React.FC<{ tone: 'error' | 'success'; title?: string; children: React.ReactNode }> = ({ tone, title, children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-sm ${
      tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
    }`}
  >
    {tone === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
    <div className="flex-1 min-w-0 break-words leading-snug">
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  </div>
);

export interface StrengthView {
  label: string;
  level: number;
  color: string;
  textColor: string;
}

export const PasswordStrengthMeter: React.FC<{ strength: StrengthView; criteria: { length: boolean; uppercase: boolean; special: boolean } }> = ({
  strength,
  criteria,
}) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs mb-2">
      <span className="font-semibold text-slate-800">Độ mạnh mật khẩu:</span>
      <span className={`font-medium ${strength.textColor}`}>{strength.label}</span>
    </div>
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3">
      <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.level}%` }} />
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {(
        [
          ['length', '8+ ký tự'],
          ['uppercase', 'Chữ hoa (A-Z)'],
          ['special', 'Ký tự đặc biệt (!@#)'],
        ] as const
      ).map(([k, text]) => (
        <span
          key={k}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
            criteria[k] ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium' : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          <span aria-hidden>{criteria[k] ? '✓' : '○'}</span>
          {text}
        </span>
      ))}
    </div>
  </div>
);

export const SubmitButton: React.FC<{ disabled: boolean; loading: boolean; loadingText: string; title?: string; children: React.ReactNode }> = ({
  disabled,
  loading,
  loadingText,
  title,
  children,
}) => (
  <button
    type="submit"
    disabled={disabled}
    title={title}
    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-display text-sm font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {loading ? (
      <>
        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden />
        <span>{loadingText}</span>
      </>
    ) : (
      children
    )}
  </button>
);
