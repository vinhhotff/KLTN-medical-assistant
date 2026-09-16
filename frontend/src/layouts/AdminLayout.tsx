import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Activity, 
  LogOut, 
  Database, 
  Stethoscope, 
  CalendarCheck, 
  HeartPulse, 
  FileSpreadsheet 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { to: '/admin', label: 'Tổng quan & KPIs', icon: Activity, exact: true },
    { to: '/admin/appointments', label: 'Giám sát Lịch Khám', icon: CalendarCheck },
    { to: '/admin/triage', label: 'Giám sát Triage AI', icon: HeartPulse },
    { to: '/admin/doctors', label: 'Quản lý Bác Sĩ', icon: Stethoscope },
    { to: '/admin/users', label: 'Quản lý Người Dùng', icon: Users },
    { to: '/admin/specialties', label: 'Danh mục Chuyên khoa', icon: Database },
    { to: '/admin/audit-logs', label: 'Nhật ký Kiểm Toán', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">MediAssist Admin</h1>
              <span className="text-xs text-indigo-400 font-medium">Bảng Quản Trị Hệ Thống</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? location.pathname === item.to 
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'text-white bg-indigo-600/90 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400">Đang đăng nhập:</p>
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || user?.email}</p>
              <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-bold uppercase rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">
                Super Admin
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Trung Tâm Vận Hành Hoạt Động (Live Monitoring)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-500">MediAssist Enterprise v1.2.0-AuditReady</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
