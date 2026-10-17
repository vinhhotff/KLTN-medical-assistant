import React, { useEffect } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { HeartPulse, MessageSquare, UploadCloud, LogOut, Search, CalendarDays } from 'lucide-react';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

const NAV_ITEMS = [
  { to: '/patient', label: 'Lịch hẹn của tôi', short: 'Lịch hẹn', icon: CalendarDays, end: true },
  { to: '/patient/triage', label: 'Trợ lý triệu chứng', short: 'Triệu chứng', icon: MessageSquare },
  { to: '/patient/doctors', label: 'Tìm & đặt bác sĩ', short: 'Bác sĩ', icon: Search },
  { to: '/patient/documents', label: 'Đọc kết quả xét nghiệm', short: 'Xét nghiệm', icon: UploadCloud },
];

export const PatientLayout: React.FC = () => {
  const { user, logout, isAuthenticated, refreshCurrentUser } = useAuthStore();

  // User lưu trong localStorage có thể cũ (thiếu emailVerified): đồng bộ lại khi vào khu vực bệnh nhân
  useEffect(() => {
    if (isAuthenticated) {
      void refreshCurrentUser();
    }
  }, [isAuthenticated, refreshCurrentUser]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Permanent Medical Disclaimer Banner — required on every patient page */}
      <MedicalDisclaimerBanner dismissible={false} />
      <EmailVerificationBanner />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/patient" className="flex items-center gap-2 shrink-0">
              <div className="p-2 bg-teal-600 rounded-lg text-white">
                <HeartPulse className="w-5 h-5" aria-hidden />
              </div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">MediAssist</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Điều hướng chính">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition',
                      isActive ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <NotificationBell />
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* pb-24 keeps content clear of the mobile bottom navigation */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      <footer className="hidden md:block bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 MediAssist-AI · Đề tài tốt nghiệp Kỹ sư Phần mềm.</p>
      </footer>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]"
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
                'flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition',
                isActive ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} aria-hidden />
                <span>{short}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
