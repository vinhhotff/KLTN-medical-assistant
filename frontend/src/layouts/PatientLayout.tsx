import React, { useEffect } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { HeartPulse, MessageSquare, UploadCloud, LogOut, Search, CalendarDays, History } from 'lucide-react';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { initialsOf } from '../types/patient';
import { cn } from '../components/ui';

type Accent = 'indigo' | 'teal';

const NAV_ITEMS: { to: string; label: string; short: string; icon: typeof CalendarDays; accent: Accent; end?: boolean }[] = [
  { to: '/patient', label: 'Lịch hẹn', short: 'Lịch hẹn', icon: CalendarDays, accent: 'indigo', end: true },
  { to: '/patient/triage', label: 'Trợ lý triệu chứng AI', short: 'Trợ lý AI', icon: MessageSquare, accent: 'indigo' },
  { to: '/patient/documents', label: 'Tóm tắt bệnh án', short: 'Bệnh án', icon: UploadCloud, accent: 'teal' },
  { to: '/patient/doctors', label: 'Tìm & đặt bác sĩ', short: 'Bác sĩ', icon: Search, accent: 'indigo' },
  { to: '/patient/history', label: 'Lịch sử sức khỏe', short: 'Lịch sử', icon: History, accent: 'indigo' },
];

const ACTIVE: Record<Accent, string> = {
  indigo: 'bg-indigo-50 text-indigo-700',
  teal: 'bg-teal-50 text-teal-800',
};
const ICON: Record<Accent, string> = {
  indigo: 'text-indigo-600',
  teal: 'text-teal-600',
};

export const PatientLayout: React.FC = () => {
  const { user, logout, isAuthenticated, refreshCurrentUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCurrentUser();
    }
  }, [isAuthenticated, refreshCurrentUser]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Permanent Medical Disclaimer Banner — required on every patient page */}
      <MedicalDisclaimerBanner dismissible={false} />
      <EmailVerificationBanner />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-20 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/patient" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <HeartPulse className="w-5 h-5" aria-hidden />
              </span>
              <span className="font-display font-bold text-lg tracking-tight text-slate-900">MediAssist-AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 min-w-0" aria-label="Điều hướng chính">
              {NAV_ITEMS.map(({ to, label, icon: Icon, accent, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                      isActive ? cn(ACTIVE[accent], 'font-semibold') : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon className={cn('w-4 h-4', ICON[accent])} aria-hidden />
                  <span className="hidden lg:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated && user ? (
              <>
                <NotificationBell />
                <Link
                  to="/patient/profile"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-slate-100 transition"
                  title="Hồ sơ của tôi"
                >
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {initialsOf(user.fullName || user.email)}
                  </span>
                  <span className="hidden xl:block text-right leading-tight">
                    <span className="block text-sm font-semibold text-slate-900 truncate max-w-[160px]">{user.fullName}</span>
                    <span className="block text-xs text-slate-500">Hồ sơ của tôi</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-10 h-10 inline-flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-20 py-6 sm:py-8 pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
        aria-label="Điều hướng chính (di động)"
        data-testid="mobile-bottom-nav"
      >
        {NAV_ITEMS.map(({ to, short, icon: Icon, accent, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 min-h-[58px] text-[11px] font-medium transition-colors',
                isActive ? ACTIVE[accent] : 'text-slate-500 hover:text-slate-900',
              )
            }
          >
            <Icon className="w-5 h-5" aria-hidden />
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
