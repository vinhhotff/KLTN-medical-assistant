import React from 'react';
import { Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Xin chào Bác sĩ, {user?.fullName || 'Đồng nghiệp'}!
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Chào mừng bạn đến với khu vực làm việc chuyên môn MediAssist.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          Hồ Sơ Hợp Lệ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Lịch Hẹn Khám Sắp Tới
            </h3>
            <span className="text-xs text-slate-400">Hôm nay</span>
          </div>
          <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            Chưa có lịch hẹn mới trong ngày hôm nay.
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Tóm Tắt Bệnh Án AI Chờ Khám
            </h3>
          </div>
          <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            Khi bệnh nhân đặt lịch, bản tóm tắt hồ sơ & trích xuất triệu chứng từ AI sẽ hiển thị tại đây.
          </div>
        </div>
      </div>
    </div>
  );
};
