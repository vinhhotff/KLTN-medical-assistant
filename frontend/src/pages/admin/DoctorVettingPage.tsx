import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

export const DoctorVettingPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quy Trình Duyệt Bác Sĩ (Doctor Vetting)</h2>
        <p className="text-slate-500 text-sm mt-1">
          Xác minh chứng chỉ hành nghề, bằng cấp và chuyên khoa trước khi kích hoạt hồ sơ công khai.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Danh Sách Bác Sĩ Chờ Xác Thực</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
            0 Hồ Sơ Đang Chờ
          </span>
        </div>

        <div className="p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-600">Hiện tại không có hồ sơ bác sĩ mới nào cần phê duyệt</p>
          <p className="text-xs text-slate-400 mt-1">Các bác sĩ đăng ký mới sẽ xuất hiện tại đây cùng bản scan chứng chỉ để Admin đối chiếu.</p>
        </div>
      </div>
    </div>
  );
};
