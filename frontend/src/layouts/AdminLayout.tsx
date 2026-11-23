import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Shield, Users, Activity, LogOut, Database, Stethoscope, CalendarCheck, HeartPulse, BarChart3, CircleDollarSign, History, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { cn } from '../components/ui';

const NAV_GROUPS = [
  {
    title: 'Vận hành',
    items: [
      { to: '/admin', label: 'Tổng quan & giám sát', icon: Activity, end: true },
      { to: '/admin/doctors', label: 'Quản lý bác sĩ', icon: Stethoscope },
      { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
      { to: '/admin/specialties', label: 'Danh mục chuyên khoa', icon: Database },
      { to: '/admin/appointments', label: 'Giám sát lịch khám', icon: CalendarCheck },
      { to: '/admin/triage', label: 'Giám sát phân luồng AI', icon: HeartPulse },
    ],
  },
  {
    title: 'AI & An toàn',
    items: [
      { to: '/admin/ai-stats', label: 'Thống kê AI', icon: BarChart3 },
      { to: '/admin/ai-cost', label: 'Chi phí AI', icon: CircleDollarSign },
      { to: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: History },
    ],
  },
];

type Health = 'ok' | 'down' | 'unknown';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [health, setHealth] = useState<Health>('unknown');

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

  // Real readiness probe (DB + cache) instead of a decorative "live" badge
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      api
        .get('/health/ready')
        .then(() => !cancelled && setHealth('ok'))
        .catch(() => !cancelled && setHealth('down'));
    void check();
    const t = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const sidebar = (
    <div className="h-full bg-slate-900 text-slate-300 flex flex-col justify-between select-none">
      <div className="overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block font-display font-bold text-white">MediAssist Admin</span>
            <span className="block text-xs text-indigo-300">Bảng quản trị hệ thống</span>
          </span>
        </div>

        <nav className="px-3 py-4 space-y-6" aria-label="Điều hướng quản trị">
          {NAV_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.title}</p>
              <div className="space-y-1">
                {g.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-slate-400">Đang đăng nhập</p>
          <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'Quản trị viên'}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <div className="w-72 max-w-[85vw] h-full shadow-2xl">{sidebar}</div>
          <button type="button" className="flex-1 bg-slate-900/40" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer"
              aria-label="Mở menu quản trị"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold',
                health === 'ok' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
                health === 'down' && 'bg-rose-50 border-rose-200 text-rose-800',
                health === 'unknown' && 'bg-slate-50 border-slate-200 text-slate-600',
              )}
              role="status"
            >
              <span className={cn('w-2 h-2 rounded-full', health === 'ok' ? 'bg-emerald-500' : health === 'down' ? 'bg-rose-500' : 'bg-slate-400')} />
              {health === 'ok' ? 'Hệ thống ổn định' : health === 'down' ? 'Hệ thống gặp sự cố' : 'Đang kiểm tra hệ thống'}
            </span>
          </div>
          {drawerOpen && (
            <button type="button" className="lg:hidden p-2 rounded-lg" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
