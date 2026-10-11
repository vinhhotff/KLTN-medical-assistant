import React, { useState, useEffect, useCallback } from 'react';
import { User, Award, Save, Building2, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { ErrorState, Skeleton, useToast } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

interface SpecialtyOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const ACADEMIC_TITLES = [
  { value: 'GS.TS', label: 'GS.TS (Giáo sư Tiến sĩ)' },
  { value: 'PGS.TS', label: 'PGS.TS (Phó Giáo sư Tiến sĩ)' },
  { value: 'TS.BS', label: 'TS.BS (Tiến sĩ Bác sĩ)' },
  { value: 'BS.CKII', label: 'BS.CKII (Bác sĩ Chuyên khoa II)' },
  { value: 'ThS.BS', label: 'ThS.BS (Thạc sĩ Bác sĩ)' },
  { value: 'BS.CKI', label: 'BS.CKI (Bác sĩ Chuyên khoa I)' },
  { value: 'BS', label: 'BS (Bác sĩ)' },
];

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500';

export const DoctorProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();

  // Every field starts empty and is filled only from GET /doctors/{id}
  const [academicTitle, setAcademicTitle] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [department, setDepartment] = useState('');
  const [licenseIssuedBy, setLicenseIssuedBy] = useState('');
  const [bio, setBio] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<SpecialtyOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [profileRes, specRes] = await Promise.all([api.get(`/doctors/${user.id}`), api.get('/specialties')]);
      const specsList: SpecialtyOption[] = Array.isArray(specRes.data?.data) ? specRes.data.data : [];
      setAvailableSpecialties(specsList);

      const d = profileRes.data?.data;
      if (!d) throw new Error('empty profile');
      setBio(d.bio || '');
      setLicenseNumber(d.licenseNumber || '');
      setConsultationFee(d.consultationFee ? String(d.consultationFee) : '');
      setYearsOfExperience(d.yearsOfExperience !== null && d.yearsOfExperience !== undefined ? String(d.yearsOfExperience) : '');
      setAcademicTitle(d.academicTitle || '');
      setHospitalAffiliation(d.hospitalAffiliation || '');
      setDepartment(d.department || '');
      setLicenseIssuedBy(d.licenseIssuedBy || '');
      const current: string[] = Array.isArray(d.specialties) ? d.specialties.map((s: string) => s.toLowerCase()) : [];
      setSpecialtySlugs(
        specsList.filter((s) => current.includes(s.name.toLowerCase()) || current.includes(s.slug.toLowerCase())).map((s) => s.slug)
      );
    } catch (err) {
      // Never show placeholder data that could be saved over the real profile
      setLoadError(getApiErrorMessage(err, 'Không tải được hồ sơ của bạn. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fee = Number(consultationFee);
  const years = Number(yearsOfExperience);
  const errors: Record<string, string> = {};
  if (!licenseNumber.trim()) errors.licenseNumber = 'Nhập số chứng chỉ hành nghề.';
  if (!consultationFee.trim() || !Number.isFinite(fee) || fee <= 0) errors.consultationFee = 'Phí khám phải lớn hơn 0.';
  if (yearsOfExperience.trim() && (!Number.isInteger(years) || years < 0 || years > 70)) errors.yearsOfExperience = 'Từ 0 đến 70 năm.';
  if (specialtySlugs.length === 0) errors.specialtySlugs = 'Chọn ít nhất 1 chuyên khoa.';
  const hasErrors = Object.keys(errors).length > 0;
  const err = (k: string) => (attempted && errors[k] ? <p role="alert" className="text-[11px] text-rose-600 mt-1">{errors[k]}</p> : null);

  const toggleSpecialty = (slug: string) =>
    setSpecialtySlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (saving || hasErrors) return;
    try {
      setSaving(true);
      await api.put('/doctors/me/profile', {
        bio: bio.trim(),
        licenseNumber: licenseNumber.trim(),
        consultationFee: fee,
        yearsOfExperience: yearsOfExperience.trim() ? years : undefined,
        academicTitle: academicTitle || undefined,
        hospitalAffiliation: hospitalAffiliation.trim() || undefined,
        department: department.trim() || undefined,
        licenseIssuedBy: licenseIssuedBy.trim() || undefined,
        specialtySlugs,
      });
      toast.success('Đã cập nhật hồ sơ chuyên môn.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu hồ sơ.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4" role="status" aria-label="Đang tải hồ sơ">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hồ Sơ Bác Sĩ</h1>
        <ErrorState message={loadError} onRetry={fetchProfile} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hồ Sơ Bác Sĩ</h1>
        <p className="text-slate-600 text-sm mt-1">
          Thông tin này hiển thị cho bệnh nhân khi tìm và đặt lịch khám.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6" noValidate>
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-teal-600" /> Thông tin cơ bản & chức danh
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dp-title" className="block text-xs font-semibold text-slate-700 mb-1">Học hàm / Học vị</label>
              <select id="dp-title" value={academicTitle} onChange={(e) => setAcademicTitle(e.target.value)} className={`${inputCls} font-medium`}>
                <option value="">— Chưa chọn —</option>
                {ACADEMIC_TITLES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dp-name" className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
              <input id="dp-name" type="text" disabled value={user?.fullName ?? ''} className={`${inputCls} bg-slate-100 text-slate-600 cursor-not-allowed`} />
            </div>
            <div>
              <label htmlFor="dp-email" className="block text-xs font-semibold text-slate-700 mb-1">Email công tác</label>
              <input id="dp-email" type="email" disabled value={user?.email ?? ''} className={`${inputCls} bg-slate-100 text-slate-600 cursor-not-allowed`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dp-years" className="block text-xs font-semibold text-slate-700 mb-1">Số năm kinh nghiệm</label>
              <input
                id="dp-years"
                type="number"
                min={0}
                max={70}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="VD: 8"
                className={inputCls}
              />
              {err('yearsOfExperience')}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Chuyên khoa <span className="text-rose-600">*</span> <span className="font-normal text-slate-500">(chọn một hoặc nhiều)</span>
            </span>
            {availableSpecialties.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Chưa có danh mục chuyên khoa. Liên hệ quản trị viên.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableSpecialties.map((s) => {
                  const selected = specialtySlugs.includes(s.slug);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSpecialty(s.slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer inline-flex items-center gap-1 ${
                        selected ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            {err('specialtySlugs')}
          </div>
        </section>

        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-teal-600" /> Đơn vị công tác
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dp-hospital" className="block text-xs font-semibold text-slate-700 mb-1">Bệnh viện / Cơ sở y tế</label>
              <input id="dp-hospital" type="text" value={hospitalAffiliation} onChange={(e) => setHospitalAffiliation(e.target.value)} placeholder="Tên bệnh viện đang công tác" className={inputCls} />
            </div>
            <div>
              <label htmlFor="dp-dept" className="block text-xs font-semibold text-slate-700 mb-1">Khoa / Đơn vị</label>
              <input id="dp-dept" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Tên khoa" className={inputCls} />
            </div>
          </div>
        </section>

        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-teal-600" /> Chứng chỉ hành nghề & phí khám
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dp-license" className="block text-xs font-semibold text-slate-700 mb-1">
                Số CCHN <span className="text-rose-600">*</span>
              </label>
              <input id="dp-license" type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="VD: 008921/BYT-CCHN" className={`${inputCls} font-mono`} />
              {err('licenseNumber')}
            </div>
            <div>
              <label htmlFor="dp-issuer" className="block text-xs font-semibold text-slate-700 mb-1">Cơ quan cấp</label>
              <input id="dp-issuer" type="text" value={licenseIssuedBy} onChange={(e) => setLicenseIssuedBy(e.target.value)} placeholder="Bộ Y Tế / Sở Y Tế ..." className={inputCls} />
            </div>
            <div>
              <label htmlFor="dp-fee" className="block text-xs font-semibold text-slate-700 mb-1">
                Phí khám (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-fee"
                type="number"
                step={1000}
                min={0}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="VD: 250000"
                className={`${inputCls} font-bold text-teal-800`}
              />
              {err('consultationFee')}
            </div>
          </div>
          <div>
            <label htmlFor="dp-bio" className="block text-xs font-semibold text-slate-700 mb-1">Giới thiệu chuyên môn</label>
            <textarea
              id="dp-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Quá trình đào tạo, công tác, thế mạnh chuyên môn..."
              className={`${inputCls} leading-relaxed`}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || (attempted && hasErrors)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};
