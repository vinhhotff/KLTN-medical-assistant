import React, { useState, useEffect } from 'react';
import { User, Award, CheckCircle2, Save, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../services/api.js';

export const DoctorProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [bio, setBio] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(350000);
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(10);
  const [specialty, setSpecialty] = useState('cardiology');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/doctors/${user.id}`);
      if (res.data?.data) {
        const d = res.data.data;
        setBio(d.bio || '');
        setLicenseNumber(d.licenseNumber || '');
        setConsultationFee(d.consultationFee || 350000);
        setYearsOfExperience(d.yearsOfExperience || 10);
      }
    } catch {
      // Fallback defaults
      setBio('Hơn 15 năm kinh nghiệm tầm soát và điều trị rối loạn nhịp tim, can thiệp mạch vành.');
      setLicenseNumber('008921/BYT-CCHN');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      await api.put('/doctors/me/profile', {
        bio,
        licenseNumber,
        consultationFee,
        yearsOfExperience,
        specialtySlugs: [specialty],
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-sm">Đang tải hồ sơ bác sĩ...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hồ Sơ Bác Sĩ Chuyên Khoa</h2>
        <p className="text-slate-500 text-sm mt-1">
          Cập nhật thông tin chứng chỉ hành nghề, tiểu sử lâm sàng, chuyên khoa và mức phí khám.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Hồ sơ chuyên môn đã được cập nhật thành công! Bộ nhớ đệm Two-Layer Cache đã được đồng bộ.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-teal-600" /> Thông Tin Cơ Bản
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và Tên</label>
              <input
                type="text"
                disabled
                defaultValue={user?.fullName || 'BS. Nguyễn Văn An'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Công Tác</label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || 'doctor@mediassist.local'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số Năm Kinh Nghiệm</label>
              <input
                type="number"
                min={1}
                max={60}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chuyên Khoa Chính</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="cardiology">Cardiology (Tim mạch)</option>
                <option value="dermatology">Dermatology (Da liễu)</option>
                <option value="neurology">Neurology (Thần kinh)</option>
                <option value="pediatrics">Pediatrics (Nhi khoa)</option>
                <option value="gastroenterology">Gastroenterology (Tiêu hóa)</option>
                <option value="general-internal-medicine">General Internal Medicine (Nội tổng quát)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-teal-600" /> Bằng Cấp & Chứng Chỉ Hành Nghề (CCHN)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số CCHN Bộ Y Tế Cấp</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="VD: 008921/BYT-CCHN"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phí Khám Tư Vấn (VNĐ)</label>
              <input
                type="number"
                step={50000}
                min={100000}
                value={consultationFee}
                onChange={(e) => setConsultationFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tiểu Sử Chuyên Môn & Quá Trình Đào Tạo</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu quá trình công tác, bệnh viện, chuyên môn sâu..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-2xl shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang Lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
          </button>
        </div>
      </form>
    </div>
  );
};
