import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Shield, Users, Activity, LogOut, Database, Stethoscope, CalendarCheck, HeartPulse, FileSpreadsheet, Menu, X } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

gsap.registerPlugin(useGSAP);

const NAV_ITEMS = [
  { to: '/admin', code: 'AD-01', label: 'Tổng quan', icon: Activity, end: true },
  { to: '/admin/appointments', code: 'AD-02', label: 'Giám sát lịch khám', icon: CalendarCheck },
  { to: '/admin/triage', code: 'AD-03', label: 'Giám sát phân luồng AI', icon: HeartPulse },
  { to: '/admin/doctors', code: 'AD-04', label: 'Quản lý bác sĩ', icon: Stethoscope },
  { to: '/admin/users', code: 'AD-05', label: 'Quản lý người dùng', icon: Users },
  { to: '/admin/specialties', code: 'AD-06', label: 'Danh mục chuyên khoa', icon: Database },
  { to: '/admin/audit-logs', code: 'AD-07', label: 'Nhật ký kiểm toán', icon: FileSpreadsheet },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useGSAP(
    () => {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || !contentRef.current) return;
      gsap.fromTo(
        contentRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [location.pathname] }
  );

  const sidebar = (
    <div className="h-full bg-slate-950 text-[#F6F3EC] flex flex-col justify-between border-r-2 border-slate-900 bg-obsidian-dots">
      <div className="overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 rounded-2xl text-white shadow-[0_3px_0_0_#F6F3EC]">
            <Shield className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-white font-display font-bold text-base leading-none">
              MediAssist <span className="font-serif italic font-normal text-teal-300">Ops</span>
            </p>
            <span className="font-mono text-[10px] uppercase tracking-widest text-teal-400 font-bold mt-1 block">
              QUẢN TRỊ HỆ THỐNG
            </span>
          </div>
        </div>

        <div className="px-5 pt-4 pb-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            OBSERVATORY MODULES (07)
          </span>
        </div>

        <nav className="p-4 space-y-1.5" aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map(({ to, code, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-display font-bold transition-all border',
                  isActive
                    ? 'text-slate-900 bg-[#FCFBF8] border-[#FCFBF8] shadow-[0_3px_0_0_#4338CA]'
                    : 'text-slate-300 border-transparent hover:bg-slate-900 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-teal-600' : 'text-slate-400')} aria-hidden />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className={cn('font-mono text-[9px] font-bold shrink-0', isActive ? 'text-slate-500' : 'text-slate-600')}>
                    {code}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-5 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Đang đăng nhập:</p>
            <p className="text-sm font-display font-bold text-white truncate">{user?.fullName || user?.email}</p>
            <span className="inline-block px-2 py-0.5 mt-1 font-mono text-[10px] font-bold uppercase rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Quản trị viên
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="p-2.5 text-slate-300 hover:text-rose-300 hover:bg-slate-800 rounded-xl transition cursor-pointer border border-slate-800"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F3EC] text-slate-900 font-sans">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <div className="w-72 max-w-[85vw] h-full shadow-2xl">{sidebar}</div>
          <button type="button" className="flex-1 bg-slate-950/70 backdrop-blur-xs" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-atelier-dots">
        <header className="h-16 bg-[#FCFBF8]/95 backdrop-blur-md border-b-2 border-slate-200 flex items-center justify-between gap-3 px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer"
              aria-label="Mở menu quản trị"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg font-mono text-[11px] font-bold bg-slate-900 text-[#F6F3EC] shadow-[0_2px_0_0_#4338CA] truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden></span>
              Đang giám sát trực tiếp
            </span>
            <span className="hidden sm:inline-block font-mono text-[11px] text-slate-500">
              CLUSTER // PGVECTOR + REDIS L2 + CAFFEINE L1
            </span>
          </div>
          {drawerOpen && (
            <button type="button" className="lg:hidden p-2 rounded-xl" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        <div ref={contentRef} className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-[1520px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
