import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, CalendarCheck, UserCog, Users, Menu, X, Activity } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

gsap.registerPlugin(useGSAP);

const NAV_ITEMS = [
  { to: '/doctor', code: 'DR-01', label: 'Bàn khám & hàng đợi', subtitle: 'SOAP EMR & Kê đơn điện tử', icon: CalendarCheck, end: true },
  { to: '/doctor/patients', code: 'DR-02', label: 'Danh bạ bệnh nhân', subtitle: 'Lịch sử điều trị & Sinh hiệu', icon: Users },
  { to: '/doctor/profile', code: 'DR-03', label: 'Hồ sơ bác sĩ', subtitle: 'Chứng chỉ CCHN & Lịch trực', icon: UserCog },
];

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useGSAP(
    () => {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || !mainRef.current) return;
      gsap.fromTo(
        mainRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [location.pathname] }
  );

  return (
    <div className="min-h-screen flex bg-[#F6F3EC] text-slate-900 font-sans">
      {/* DESKTOP TACTICAL PHYSICIAN RAIL — Clean Warm Clinical Atelier Palette */}
      <aside
        className="hidden md:flex md:w-72 flex-col justify-between bg-[#FCFBF8] text-slate-800 border-r border-slate-200/90 sticky top-0 h-screen shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]"
        aria-label="Điều hướng bác sĩ"
      >
        <div className="p-6 space-y-6 overflow-y-auto">
          <Link to="/doctor" className="flex items-center gap-3 min-w-0 group">
            <div className="w-11 h-11 bg-teal-600 rounded-2xl text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Stethoscope className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-slate-900 text-base tracking-tight block truncate">
                MediAssist <span className="font-serif italic font-normal text-teal-600">Doctor</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-teal-700 font-bold block mt-0.5">
                CLINICAL WORKSTATION
              </span>
            </div>
          </Link>

          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-teal-900 font-bold">
                CA TRỰC LÂM SÀNG • LIVE
              </span>
            </div>
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          </div>

          <div className="space-y-2">
            <div className="px-1 font-mono text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              BÀN KHÁM ĐIỆN TỬ EMR (03)
            </div>
            <nav className="space-y-1.5" aria-label="Điều hướng phân khu bác sĩ">
              {NAV_ITEMS.map(({ to, code, label, subtitle, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-200 border',
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                        : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100/80 hover:text-slate-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-all duration-200',
                          isActive ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700'
                        )}
                      >
                        <Icon className="w-4 h-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('font-display font-bold text-sm truncate', isActive ? 'text-white' : 'text-slate-800')}>
                            {label}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                              isActive ? 'bg-teal-700/80 text-teal-100' : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {code}
                          </span>
                        </div>
                        <p className={cn('text-[11px] truncate mt-0.5', isActive ? 'text-teal-100 font-medium' : 'text-slate-400')}>
                          {subtitle}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/80 bg-white/70">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-slate-900 truncate">{user?.fullName}</p>
              <span className="font-mono text-[10px] text-emerald-700 font-bold">✓ CCHN ĐÃ XÁC THỰC</span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-slate-200/70"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 bg-atelier-dots">
        <header className="bg-[#FCFBF8]/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="md:hidden p-2 -ml-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer shadow-xs"
                aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={menuOpen}
                aria-controls="doctor-mobile-menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/doctor" className="md:hidden flex items-center gap-2 min-w-0">
                <div className="p-2 bg-teal-600 rounded-xl text-white shrink-0 shadow-xs">
                  <Stethoscope className="w-4 h-4" aria-hidden />
                </div>
                <span className="font-display font-bold text-slate-900 text-base truncate">MediAssist Doctor</span>
              </Link>

              <div className="hidden md:flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                  CLINICAL COCKPIT
                </span>
                <span className="font-mono text-xs text-slate-500 font-medium">
                  Khu vực chuyên môn · Chuẩn hóa SOAP &amp; ICD-10
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-4">
              <NotificationBell />
              <div className="text-right hidden lg:block pl-3 border-l border-slate-200">
                <p className="text-sm font-display font-bold text-slate-900 leading-none">{user?.fullName}</p>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">✓ Đã xác thực</span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                aria-label="Đăng xuất"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {menuOpen && (
            <nav
              id="doctor-mobile-menu"
              className="md:hidden border-t border-slate-200 bg-[#FCFBF8] text-slate-800 px-4 py-3 space-y-1.5 text-sm font-semibold shadow-lg"
              aria-label="Điều hướng bác sĩ (di động)"
            >
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition font-display text-xs font-bold border',
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                    )
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        <main ref={mainRef} className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
