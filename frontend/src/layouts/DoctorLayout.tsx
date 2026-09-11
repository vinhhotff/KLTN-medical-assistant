import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Stethoscope, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/doctor" className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-600 rounded-lg text-white">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base">MediAssist Doctor</span>
                <span className="block text-xs text-teal-600 font-medium">Khu vực Chuyên môn</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link to="/doctor" className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 transition">
                Lịch Hẹn & Khám Bệnh
              </Link>
              <Link to="/doctor/profile" className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 transition">
                Hồ Sơ Bác Sĩ
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.fullName || 'Bác sĩ'}</p>
              <span className="text-xs text-emerald-600 font-medium">✓ Đã xác thực</span>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
