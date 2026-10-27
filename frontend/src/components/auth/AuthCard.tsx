import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface AuthCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Aether Bio-Atelier Identity Card for public auth flows
 * (forgot password, reset password, verify email).
 */
export const AuthCard: React.FC<AuthCardProps> = ({ icon, title, subtitle, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
      gsap.from('.auth-atelier-anim', {
        y: 20,
        autoAlpha: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power3.out',
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[#F6F3EC] bg-atelier-dots flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
    >
      <div className="auth-atelier-anim flex items-center gap-3 mb-7">
        <Link to="/" className="flex items-center gap-3 text-slate-900 group">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-[#F6F3EC] border-2 border-slate-900 flex items-center justify-center shadow-[0_3px_0_0_#4338CA] group-hover:-translate-y-0.5 transition-transform">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <span className="text-lg font-display font-bold tracking-tight block leading-none">
              MEDIASSIST <span className="font-serif italic font-normal text-teal-600">Atelier</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              BIO-SECURITY VAULT // V4.8
            </span>
          </div>
        </Link>
      </div>

      <div className="auth-atelier-anim w-full max-w-md bg-[#FCFBF8] rounded-3xl shadow-[0_6px_0_0_#12100E,0_20px_40px_rgba(18,16,14,0.1)] border-2 border-slate-900 p-6 sm:p-8 space-y-5 relative">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-teal-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> IDENTITY PROTOCOL
              </span>
              <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
        {children}
      </div>

      <p className="auth-atelier-anim mt-7 font-mono text-[11px] text-slate-500 text-center max-w-md">
        MediAssist AI không thay thế chẩn đoán của bác sĩ. Trường hợp cấp cứu, hãy gọi 115.
      </p>
    </div>
  );
};
