import React, { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, CalendarCheck, UserCog, Users, Menu, X } from 'lucide-react';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

const NAV_ITEMS = [
  { to: '/doctor', label: 'Bàn khám & hàng đợi', icon: CalendarCheck, end: true },
  { to: '/doctor/patients', label: 'Danh bạ bệnh nhân', icon: Users },
  { to: '/doctor/profile', label: 'Hồ sơ bác sĩ', icon: UserCog },
];

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-2 px-3 py-2 rounded-xl transition',
      isActive ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
    );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              aria-controls="doctor-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/doctor" className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-teal-600 rounded-xl text-white shadow-xs shrink-0">
                <Stethoscope className="w-5 h-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <span className="font-black text-slate-900 text-base tracking-tight block truncate">MediAssist Doctor</span>
                <span className="hidden sm:block text-[11px] text-teal-700 font-bold">Khu vực chuyên môn</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold" aria-label="Điều hướng bác sĩ">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkClass}>
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
              <span className="text-xs text-emerald-700 font-medium">✓ Đã xác thực</span>
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
          </div>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <nav id="doctor-mobile-menu" className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 text-sm font-semibold" aria-label="Điều hướng bác sĩ (di động)">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={(s) => cn(linkClass(s), 'flex w-full py-3')}>
                <Icon className="w-4 h-4" aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
