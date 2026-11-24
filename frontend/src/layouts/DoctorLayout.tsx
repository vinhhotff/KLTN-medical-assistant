import React, { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, CalendarCheck, CalendarClock, UserCog, Users, Menu, X, Check } from 'lucide-react';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { cn } from '../components/ui';

const NAV_ITEMS = [
  { to: '/doctor', label: 'Lịch hẹn & khám bệnh', compact: 'Lịch khám', icon: CalendarCheck, end: true },
  { to: '/doctor/schedule', label: 'Lịch làm việc', compact: 'Lịch làm việc', icon: CalendarClock },
  { to: '/doctor/patients', label: 'Danh bạ bệnh nhân', compact: 'Bệnh nhân', icon: Users },
  { to: '/doctor/profile', label: 'Hồ sơ bác sĩ', compact: 'Hồ sơ', icon: UserCog },
];

export const DoctorLayout: React.FC = () => {
  const { user, logout, isAuthenticated, refreshCurrentUser } = useAuthStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCchnVerified, setIsCchnVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCurrentUser();
    }
  }, [isAuthenticated, refreshCurrentUser]);

  useEffect(() => {
    if (!user?.id) {
      setIsCchnVerified(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/doctors/${user.id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data;
        setIsCchnVerified(Boolean(d?.isVerified ?? d?.verified));
      })
      .catch(() => {
        if (!cancelled) setIsCchnVerified(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, location.pathname]);

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const cchnStatus =
    isCchnVerified === true ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
        <Check className="w-3.5 h-3.5" /> Đã xác thực
      </span>
    ) : isCchnVerified === false ? (
      <Link to="/doctor/profile" className="text-xs font-medium text-amber-700 underline underline-offset-2" title="Hoàn thiện hồ sơ & CCHN để quản trị viên thẩm định">
        Chờ thẩm định CCHN
      </Link>
    ) : (
      <span className="text-xs text-slate-500">Đang kiểm tra…</span>
    );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <EmailVerificationBanner />

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-clinical-sm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-3 lg:gap-4">
          <div className="flex items-center gap-3 xl:gap-5 min-w-0 flex-1 overflow-hidden">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 cursor-pointer shrink-0"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              aria-controls="doctor-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/doctor" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-clinical-sm">
                <Stethoscope className="w-5 h-5" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block font-display font-bold text-slate-900 whitespace-nowrap">MediAssist Doctor</span>
                <span className="hidden sm:block text-xs font-medium text-teal-700 whitespace-nowrap">Khu vực chuyên môn</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Điều hướng bác sĩ">
              {NAV_ITEMS.map(({ to, label, compact, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 px-2.5 xl:px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0',
                      isActive ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 xl:hidden" aria-hidden />
                  <span className="hidden lg:inline xl:hidden">{compact}</span>
                  <span className="hidden xl:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 md:pl-3 md:border-l md:border-slate-200/80">
            <NotificationBell />
            <div className="hidden xl:block text-right leading-tight">
              <p className="text-sm font-semibold text-slate-900 truncate max-w-[168px]">{user?.fullName}</p>
              {cchnStatus}
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="w-9 h-9 inline-flex items-center justify-center shrink-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="doctor-mobile-menu" className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1" aria-label="Điều hướng bác sĩ (di động)">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm transition',
                    isActive ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </NavLink>
            ))}
            <div className="px-3.5 pt-2 text-sm text-slate-700">
              {user?.fullName} · {cchnStatus}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
