import React, { useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { HeartPulse, MessageSquare, UploadCloud, LogOut, Search, CalendarDays, PhoneCall, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

gsap.registerPlugin(useGSAP);

const NAV_ITEMS = [
  { to: '/patient', code: '01', label: 'Lịch hẹn của tôi', short: 'Lịch hẹn', subtitle: 'Hồ sơ EMR & Phiếu khám', icon: CalendarDays, end: true },
  { to: '/patient/triage', code: '02', label: 'Trợ lý triệu chứng', short: 'Triệu chứng', subtitle: 'Phân luồng AI & Cờ đỏ', icon: MessageSquare },
  { to: '/patient/doctors', code: '03', label: 'Tìm & đặt bác sĩ', short: 'Bác sĩ', subtitle: 'Mạng lưới chuyên gia', icon: Search },
  { to: '/patient/documents', code: '04', label: 'Đọc kết quả xét nghiệm', short: 'Xét nghiệm', subtitle: 'Vision OCR & Sinh hóa', icon: UploadCloud },
];

export const PatientLayout: React.FC = () => {
  const { user, logout, isAuthenticated, refreshCurrentUser } = useAuthStore();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCurrentUser();
    }
  }, [isAuthenticated, refreshCurrentUser]);

  useGSAP(
    () => {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || !mainRef.current) return;
      gsap.fromTo(
        mainRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [location.pathname] }
  );

  const activeNav = NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EC] text-slate-900 font-sans">
      {/* Permanent Medical Disclaimer Banner — required on every patient page */}
      <MedicalDisclaimerBanner dismissible={false} />
      <EmailVerificationBanner />

      <div className="flex-1 flex min-h-0">
        {/* DESKTOP LEFT ARCHITECTURAL COMMAND RAIL — completely replaces the old top navbar */}
        <aside
          className="hidden md:flex md:w-72 lg:w-80 flex-col justify-between bg-slate-900 text-[#F6F3EC] border-r-2 border-slate-900 sticky top-0 h-screen shrink-0 bg-obsidian-dots select-none"
          aria-label="Điều hướng chính"
        >
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Brand Atelier Identity */}
            <Link to="/patient" className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-[0_3px_0_0_#F6F3EC] group-hover:scale-105 transition-transform">
                  <HeartPulse className="w-5 h-5" aria-hidden />
                </div>
                <div>
                  <span className="font-display font-bold text-lg tracking-tight text-white block leading-none">
                    MediAssist <span className="font-serif italic font-normal text-teal-300">Atelier</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mt-1 block">
                    BIO-CARE PORTAL // V4.8
                  </span>
                </div>
              </div>
            </Link>

            {/* Telemetry Status Strip */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                  AI CDSS ENGINE • ONLINE
                </span>
              </div>
              <span className="font-mono text-[10px] text-teal-300 font-bold">e-PHI</span>
            </div>

            {/* Numbered Vertical Architectural Modules */}
            <div className="space-y-2">
              <div className="px-1 font-mono text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                PHÂN KHU BỆNH NHÂN (04)
              </div>
              <nav className="space-y-2" aria-label="Điều hướng phân khu bệnh nhân">
                {NAV_ITEMS.map(({ to, code, label, subtitle, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-150 border',
                        isActive
                          ? 'bg-[#FCFBF8] text-slate-900 border-[#FCFBF8] shadow-[0_4px_0_0_#4338CA]'
                          : 'bg-slate-800/50 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-colors',
                            isActive ? 'bg-slate-900 text-[#F6F3EC]' : 'bg-slate-900/80 text-teal-400 group-hover:bg-teal-600 group-hover:text-white'
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display font-bold text-sm truncate">{label}</span>
                            <span
                              className={cn(
                                'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                                isActive ? 'bg-teal-100 text-teal-800' : 'text-slate-500'
                              )}
                            >
                              {code}
                            </span>
                          </div>
                          <p className={cn('text-[11px] truncate mt-0.5', isActive ? 'text-slate-600 font-medium' : 'text-slate-400')}>
                            {subtitle}
                          </p>
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Emergency Red-Flag Quick Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/90 to-slate-900 border border-rose-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-rose-300 font-bold">
                  RED-FLAG PROTOCOL
                </span>
                <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-[11px] text-rose-100/80 leading-relaxed">
                Đau ngực cấp, khó thở hoặc dấu hiệu đột quỵ FAST? Bỏ qua chờ khám và gọi cấp cứu ngay.
              </p>
              <a
                href="tel:115"
                className="inline-flex items-center justify-center w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition"
              >
                GỌI CẤP CỨU 115
              </a>
            </div>
          </div>

          {/* Patient Bio-Identity Card Footer */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/70">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-display font-bold text-sm flex items-center justify-center shrink-0 border border-teal-400">
                    {(user.fullName || user.email || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-white truncate">{user.fullName}</p>
                    <p className="font-mono text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0 border border-slate-800"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center w-full py-2.5 text-sm font-display font-bold text-slate-900 bg-[#FCFBF8] hover:bg-teal-400 rounded-xl transition"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </aside>

        {/* RIGHT WORKSPACE COLUMN */}
        <div className="flex-1 flex flex-col min-w-0 bg-atelier-dots">
          {/* Top Architectural Telemetry Header */}
          <header className="bg-[#FCFBF8]/90 backdrop-blur-md border-b-2 border-slate-200 sticky top-0 z-30">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link to="/patient" className="md:hidden flex items-center gap-2 shrink-0">
                  <div className="p-2 bg-slate-900 rounded-xl text-[#F6F3EC] shadow-[0_2px_0_0_#4338CA]">
                    <HeartPulse className="w-4 h-4 text-teal-400" aria-hidden />
                  </div>
                  <span className="font-display font-bold text-slate-900 text-base tracking-tight">MediAssist</span>
                </Link>

                <div className="hidden md:flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-900 text-[#F6F3EC]">
                    MODULE {activeNav.code}
                  </span>
                  <div>
                    <span className="font-display font-bold text-slate-900 text-sm block leading-none">
                      {activeNav.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {activeNav.subtitle}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <Link
                  to="/patient/triage"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-mono text-[11px] font-bold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>AI TRIAGE 24/7</span>
                </Link>

                {isAuthenticated && user ? (
                  <>
                    <NotificationBell />
                    <div className="text-right hidden sm:block md:hidden lg:block pl-2 border-l border-slate-200">
                      <p className="text-xs font-display font-bold text-slate-900 leading-tight">{user.fullName}</p>
                      <p className="font-mono text-[10px] text-slate-500">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="md:hidden p-2 text-slate-700 hover:text-rose-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                      aria-label="Đăng xuất"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 text-xs font-display font-bold text-[#F6F3EC] bg-slate-900 hover:bg-teal-600 rounded-xl shadow-xs transition"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Main Workspace Container */}
          <main ref={mainRef} className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-10">
            <Outlet />
          </main>

          <footer className="hidden md:block bg-[#FCFBF8] border-t border-slate-200 py-5 px-8">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between font-mono text-[11px] text-slate-500">
              <p>© 2026 MEDIASSIST-AI // AETHER CLINICAL ATELIER · ĐỀ TÀI TỐT NGHIỆP KỸ SƯ PHẦN MỀM</p>
              <span className="text-slate-400">HL7 FHIR v4 · AES-256-GCM · PGVECTOR HNSW</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Floating Island Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t-2 border-slate-800 grid grid-cols-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
        aria-label="Điều hướng chính (di động)"
        data-testid="mobile-bottom-nav"
      >
        {NAV_ITEMS.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 min-h-[58px] font-mono text-[10px] font-bold transition',
                isActive ? 'text-teal-300 bg-slate-900' : 'text-slate-400 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5] text-teal-400')} aria-hidden />
                <span>{short}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
