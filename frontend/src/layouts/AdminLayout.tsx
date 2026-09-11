import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Shield, Users, Activity, LogOut, CheckCircle, Database } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">MediAssist Admin</h1>
              <span className="text-xs text-indigo-400 font-medium">Bảng Quản Trị Hệ Thống</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              Tổng quan & Giám sát
            </Link>
            <Link
              to="/admin/doctors"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Duyệt Bác Sĩ (Vetting)
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              <Users className="w-4 h-4 text-amber-400" />
              Quản lý Người Dùng
            </Link>
            <Link
              to="/admin/specialties"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              <Database className="w-4 h-4 text-sky-400" />
              Danh mục Chuyên khoa
            </Link>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400">Đang đăng nhập:</p>
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || user?.email}</p>
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
              Hệ thống ổn định
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">MediAssist Enterprise v1.1.0</span>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
