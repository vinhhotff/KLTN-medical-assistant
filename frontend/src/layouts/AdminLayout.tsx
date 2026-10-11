import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Shield, Users, Activity, LogOut, Database, Stethoscope, CalendarCheck, HeartPulse, FileSpreadsheet, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../components/ui';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: Activity, end: true },
  { to: '/admin/appointments', label: 'Giám sát lịch khám', icon: CalendarCheck },
  { to: '/admin/triage', label: 'Giám sát phân luồng AI', icon: HeartPulse },
  { to: '/admin/doctors', label: 'Quản lý bác sĩ', icon: Stethoscope },
  { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
  { to: '/admin/specialties', label: 'Danh mục chuyên khoa', icon: Database },
  { to: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: FileSpreadsheet },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const sidebar = (
    <div className="h-full bg-slate-900 text-slate-300 flex flex-col justify-between">
      <div>
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-teal-600 rounded-lg text-white shadow-xs">
            <Shield className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">MediAssist Admin</p>
            <span className="text-xs text-teal-300 font-medium">Quản trị hệ thống</span>
          </div>
        </div>

        <nav className="p-4 space-y-1" aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  isActive ? 'text-white bg-teal-600 shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <p className="text-xs text-slate-400">Đang đăng nhập:</p>
            <p className="text-sm font-semibold text-white truncate">{user?.fullName || user?.email}</p>
            <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-bold uppercase rounded bg-rose-900/60 text-rose-200 border border-rose-700/50">
              Quản trị viên
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="p-2 text-slate-300 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <div className="w-72 max-w-[85vw] h-full shadow-2xl">{sidebar}</div>
          <button type="button" className="flex-1 bg-slate-900/60" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Mở menu quản trị"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden></span>
              Đang giám sát trực tiếp
            </span>
          </div>
          {drawerOpen && (
            <button type="button" className="lg:hidden p-2 rounded-lg" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
