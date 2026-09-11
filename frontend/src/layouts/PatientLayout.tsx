import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { HeartPulse, MessageSquare, UploadCloud, LogOut, Search } from 'lucide-react';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner.js';
import { useAuthStore } from '../store/useAuthStore.js';

export const PatientLayout: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Permanent Medical Disclaimer Banner */}
      <MedicalDisclaimerBanner dismissible={false} />

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/patient" className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">MediAssist-AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              <Link
                to="/patient/triage"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              >
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Trợ Lý Triệu Chứng AI
              </Link>
              <Link
                to="/patient"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              >
                <HeartPulse className="w-4 h-4 text-emerald-600" />
                Lịch Hẹn Của Tôi
              </Link>
              <Link
                to="/patient/doctors"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              >
                <Search className="w-4 h-4 text-sky-600" />
                Tìm & Đặt Bác Sĩ
              </Link>
              <Link
                to="/patient/documents"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              >
                <UploadCloud className="w-4 h-4 text-teal-600" />
                Tóm Tắt Bệnh Án
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
              >
                Đăng Nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 MediAssist-AI Telehealth Platform. Đề tài tốt nghiệp Kỹ sư Phần mềm - AI, Đại học FPT.</p>
      </footer>
    </div>
  );
};
