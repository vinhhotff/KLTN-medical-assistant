import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { cn } from './cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Prevent closing (Esc / backdrop / X) while an action is running. */
  busy?: boolean;
  className?: string;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Accessible dialog: Esc to close, focus trap, focus restore, body scroll lock, GSAP entrance. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, children, footer, size = 'md', busy, className }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') || panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel)?.focus();

    // GSAP entrance animation respecting prefers-reduced-motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (!prefersReduced && panelRef.current) {
        gsap.fromTo(
          panelRef.current,
          { y: 18, scale: 0.97, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' }
        );
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      ctx.revert();
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'bg-[#FCFBF8] w-full rounded-t-3xl sm:rounded-3xl shadow-[0_8px_0_0_rgba(18,16,14,0.35),0_24px_48px_rgba(0,0,0,0.35)] border-2 border-slate-900 max-h-[92vh] flex flex-col focus:outline-none overflow-hidden',
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 bg-slate-100/80 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-teal-600 font-bold mb-0.5">
              AETHER // DIALOG TERMINAL
            </span>
            <h2 id={titleId} className="text-base sm:text-lg font-display font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
            {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="p-1.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-900 disabled:opacity-40 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-100/70 flex flex-wrap justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
