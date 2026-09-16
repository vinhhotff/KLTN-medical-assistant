import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, CalendarCheck, UserCog } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const isDashboard = location.pathname === '/doctor';
  const isProfile = location.pathname === '/doctor/profile';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/doctor" className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-600 rounded-xl text-white shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-slate-900 text-base tracking-tight">MediAssist Doctor</span>
                <span className="block text-[11px] text-teal-600 font-bold">Khu Vực Chuyên Môn & Lâm Sàng</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold">
              <Link
                to="/doctor"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
                  isDashboard
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Bàn Khám & Hàng Đợi</span>
              </Link>
              <Link
                to="/doctor/profile"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
                  isProfile
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>Hồ Sơ Bác Sĩ</span>
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
