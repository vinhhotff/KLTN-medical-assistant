import React, { useState } from 'react';
import { User, Award, CheckCircle2, Building2, Save } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';

export const DoctorProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hồ Sơ Bác Sĩ Chuyên Khoa</h2>
        <p className="text-slate-500 text-sm mt-1">
          Cập nhật thông tin chứng chỉ hành nghề, học vị, tiểu sử lâm sàng và lịch tiếp nhận bệnh nhân.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Thông tin hồ sơ chuyên môn đã được lưu thành công!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-teal-600" /> Thông Tin Cơ Bản
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và Tên</label>
              <input
                type="text"
                defaultValue={user?.fullName || 'TS. BS. Nguyễn Văn An'}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Công Tác</label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || 'doctor@mediassist.ai'}
                className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Học Vị / Chức Danh</label>
              <input
                type="text"
                defaultValue="Tiến sĩ Y khoa, Bác sĩ Chuyên khoa II"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chuyên Khoa Chính</label>
              <select
                defaultValue="CARDIO"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="CARDIO">Tim Mạch</option>
                <option value="DERMA">Da Liễu</option>
                <option value="PEDIA">Nhi Khoa</option>
                <option value="NEURO">Thần Kinh</option>
                <option value="GENMED">Nội Tổng Quát</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-teal-600" /> Bằng Cấp & Chứng Chỉ Hành Nghề (CCHN)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số CCHN Bộ Y Tế Cấp</label>
              <input
                type="text"
                defaultValue="008921/BYT-CCHN"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bệnh Viện Công Tác</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  defaultValue="Bệnh Viện Đại Học Y Dược TP.HCM"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tóm Tắt Quá Trình Đào Tạo & Kinh Nghiệm</label>
            <textarea
              rows={4}
              defaultValue="Hơn 15 năm kinh nghiệm trong lĩnh vực tầm soát, điều trị rối loạn nhịp tim và bệnh mạch vành can thiệp. Từng tu nghiệp tại Viện Tim Mạch Quốc Gia Pháp (Hopital Bichat-Claude Bernard, Paris)."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Lưu Thay Đổi
          </button>
        </div>
      </form>
    </div>
  );
};
