import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface AuthCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Khung chung cho các trang xác thực công khai mở từ email
 * (quên mật khẩu, đặt lại mật khẩu, xác thực email).
 */
export const AuthCard: React.FC<AuthCardProps> = ({ icon, title, subtitle, children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 flex flex-col items-center justify-center px-4 py-10">
    <Link to="/" className="flex items-center gap-2 mb-6 text-slate-900">
      <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <span className="text-lg font-black tracking-tight">MediAssist AI</span>
    </Link>

    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>

    <p className="mt-6 text-[11px] text-slate-400 text-center max-w-md">
      MediAssist AI không thay thế chẩn đoán của bác sĩ. Trường hợp cấp cứu, hãy gọi 115.
    </p>
  </div>
);
