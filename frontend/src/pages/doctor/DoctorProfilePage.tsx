import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Award,
  Save,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileBadge,
  Banknote,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { ErrorState, Skeleton, useToast } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { ENABLE_DEMO_LOGIN } from '../../config/app';

interface SpecialtyOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const ACADEMIC_TITLES = [
  { value: 'GS.TS', label: 'GS.TS (Giáo sư - Tiến sĩ)' },
  { value: 'PGS.TS', label: 'PGS.TS (Phó Giáo sư - Tiến sĩ)' },
  { value: 'TS.BS', label: 'TS.BS (Tiến sĩ Bác sĩ)' },
  { value: 'ThS.BS', label: 'ThS.BS (Thạc sĩ Bác sĩ)' },
  { value: 'BS.CKII', label: 'BS.CKII (Bác sĩ Chuyên khoa II)' },
  { value: 'BS.CKI', label: 'BS.CKI (Bác sĩ Chuyên khoa I)' },
  { value: 'BS', label: 'BS (Bác sĩ)' },
];

const QUICK_LICENSE_ISSUERS = [
  'Bộ Y Tế',
  'Sở Y Tế TP.HCM',
  'Sở Y Tế Hà Nội',
  'Sở Y Tế Đà Nẵng',
];

const DEMO_CLINICAL_PRESETS = [
  {
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Đại Học Y Dược TP.HCM',
    department: 'Khoa Nội Tổng Quát',
    licenseIssuedBy: 'Bộ Y Tế',
    yearsOfExperience: 10,
    consultationFee: 350000,
    specialtyCandidates: ['general-internal-medicine', 'noi-tong-quat'],
    bio: 'Hơn 10 năm kinh nghiệm khám tầm soát bệnh lý nội khoa, kiểm soát tăng huyết áp, đái tháo đường và đọc chỉ số xét nghiệm cận lâm sàng.',
  },
  {
    academicTitle: 'TS.BS',
    hospitalAffiliation: 'Bệnh viện Bạch Mai Hà Nội',
    department: 'Viện Tim Mạch Quốc Gia',
    licenseIssuedBy: 'Bộ Y Tế',
    yearsOfExperience: 14,
    consultationFee: 450000,
    specialtyCandidates: ['cardiology', 'tim-mach'],
    bio: 'Chuyên gia tim mạch can thiệp, điều trị tăng huyết áp kháng trị, suy tim, rối loạn nhịp tim và bệnh lý mạch vành.',
  },
  {
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Chợ Rẫy TP.HCM',
    department: 'Khoa Thần Kinh Lâm Sàng',
    licenseIssuedBy: 'Sở Y Tế TP.HCM',
    yearsOfExperience: 12,
    consultationFee: 400000,
    specialtyCandidates: ['neurology', 'than-kinh'],
    bio: 'Bác sĩ chuyên khoa II Thần Kinh, chuyên sâu điều trị đau đầu mạn tính, rối loạn tiền đình và tầm soát đột quỵ.',
  },
];

const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition';

export const DoctorProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const toast = useToast();

  // Nhóm 1: Định danh & Tài khoản
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Nhóm 2: Pháp lý & Bằng cấp (Chuẩn Bộ Y Tế)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedBy, setLicenseIssuedBy] = useState('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [hasSubmittedCchn, setHasSubmittedCchn] = useState(false);

  // Nhóm 3: Chuyên môn & Nơi công tác
  const [academicTitle, setAcademicTitle] = useState('BS');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [department, setDepartment] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  // Nhóm 4: Thiết lập dịch vụ khám bệnh
  const [consultationFee, setConsultationFee] = useState('');

  const [availableSpecialties, setAvailableSpecialties] = useState<SpecialtyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [savedBannerMsg, setSavedBannerMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [profileRes, specRes] = await Promise.all([
        api.get(`/doctors/${user.id}`),
        api.get('/specialties'),
      ]);
      const specsList: SpecialtyOption[] = Array.isArray(specRes.data?.data) ? specRes.data.data : [];
      setAvailableSpecialties(specsList);

      const d = profileRes.data?.data;
      if (!d) throw new Error('empty profile');

      setFullName(d.fullName || user.fullName || '');
      setPhone(d.phone || '');
      setAvatarUrl(d.avatarUrl || '');
      setBio(d.bio || '');
      setLicenseNumber(d.licenseNumber || '');
      setLicenseIssuedBy(d.licenseIssuedBy || 'Bộ Y Tế');
      setLicenseDocumentUrl(d.licenseDocumentUrl || '');
      const verifiedFlag = Boolean(d.isVerified ?? d.verified);
      setIsVerified(verifiedFlag);
      setHasSubmittedCchn(Boolean(d.licenseNumber && String(d.licenseNumber).trim().length > 0));

      setConsultationFee(
        d.consultationFee !== null && d.consultationFee !== undefined && Number(d.consultationFee) > 0
          ? String(d.consultationFee)
          : ''
      );
      setYearsOfExperience(
        d.yearsOfExperience !== null && d.yearsOfExperience !== undefined
          ? String(d.yearsOfExperience)
          : ''
      );
      setAcademicTitle(d.academicTitle || 'BS');
      setHospitalAffiliation(d.hospitalAffiliation || '');
      setDepartment(d.department || '');

      const current: string[] = Array.isArray(d.specialties)
        ? d.specialties.map((s: string) => s.toLowerCase())
        : [];
      setSpecialtySlugs(
        specsList
          .filter((s) => current.includes(s.name.toLowerCase()) || current.includes(s.slug.toLowerCase()))
          .map((s) => s.slug)
      );
    } catch (err) {
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
  if (!fullName.trim()) errors.fullName = 'Họ và tên không được để trống.';
  if (!phone.trim() || !VN_PHONE_RE.test(phone.replace(/\s/g, ''))) {
    errors.phone = 'Số điện thoại liên hệ khẩn cấp không hợp lệ (VD: 0901234567).';
  }
  if (!licenseNumber.trim()) errors.licenseNumber = 'Vui lòng nhập số Chứng chỉ hành nghề (CCHN).';
  if (!licenseIssuedBy.trim()) errors.licenseIssuedBy = 'Vui lòng nhập cơ quan cấp CCHN (VD: Bộ Y Tế).';
  if (!hospitalAffiliation.trim()) errors.hospitalAffiliation = 'Vui lòng nhập bệnh viện / cơ sở y tế đang công tác.';
  if (!consultationFee.trim() || !Number.isFinite(fee) || fee <= 0) {
    errors.consultationFee = 'Phí khám bệnh mỗi lượt phải lớn hơn 0 VNĐ.';
  }
  if (!yearsOfExperience.trim() || !Number.isInteger(years) || years < 0 || years > 70) {
    errors.yearsOfExperience = 'Số năm kinh nghiệm phải là số nguyên từ 0 đến 70.';
  }
  if (specialtySlugs.length === 0) errors.specialtySlugs = 'Vui lòng chọn ít nhất 1 chuyên khoa.';

  const hasErrors = Object.keys(errors).length > 0;
  const err = (k: string) =>
    attempted && errors[k] ? (
      <p role="alert" className="text-[11px] text-rose-600 font-medium mt-1">
        {errors[k]}
      </p>
    ) : null;

  const toggleSpecialty = (slug: string) =>
    setSpecialtySlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const formattedFeePreview = useMemo(() => {
    if (!consultationFee.trim() || !Number.isFinite(fee) || fee <= 0) return 'Chưa thiết lập giá khám';
    return `${new Intl.NumberFormat('vi-VN').format(fee)} VNĐ / lượt tư vấn`;
  }, [consultationFee, fee]);

  const handleQuickFillClinicalDemo = () => {
    const preset = DEMO_CLINICAL_PRESETS[Math.floor(Math.random() * DEMO_CLINICAL_PRESETS.length)];
    const randomNum = Math.floor(100000 + Math.random() * 899999);
    const cchn = `${randomNum}/${preset.licenseIssuedBy === 'Bộ Y Tế' ? 'BYT-CCHN' : 'SYT-CCHN'}`;

    const matchedSpec = availableSpecialties.find((s) =>
      preset.specialtyCandidates.includes(s.slug)
    );
    const pickedSlug = matchedSpec?.slug || availableSpecialties[0]?.slug;

    if (!phone.trim()) setPhone('0901234567');
    setLicenseNumber(cchn);
    setLicenseIssuedBy(preset.licenseIssuedBy);
    if (!licenseDocumentUrl.trim()) {
      setLicenseDocumentUrl(`https://res.cloudinary.com/demo/image/upload/v1/sample.jpg`);
    }
    setAcademicTitle(preset.academicTitle);
    if (pickedSlug) setSpecialtySlugs([pickedSlug]);
    setHospitalAffiliation(preset.hospitalAffiliation);
    setDepartment(preset.department);
    setYearsOfExperience(String(preset.yearsOfExperience));
    setConsultationFee(String(preset.consultationFee));
    setBio(preset.bio);
    setSavedBannerMsg(null);
    toast.success(`Đã điền mẫu hồ sơ CCHN (${cchn}). Nhấn "Gửi Hồ Sơ Chờ Thẩm Định" để lưu.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setSavedBannerMsg(null);
    if (saving || hasErrors) return;

    try {
      setSaving(true);
      const res = await api.put('/doctors/me/profile', {
        fullName: fullName.trim(),
        phone: phone.replace(/\s/g, ''),
        avatarUrl: avatarUrl.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseIssuedBy: licenseIssuedBy.trim(),
        licenseDocumentUrl: licenseDocumentUrl.trim(),
        academicTitle: academicTitle || 'BS',
        specialtySlugs,
        hospitalAffiliation: hospitalAffiliation.trim(),
        department: department.trim(),
        yearsOfExperience: years,
        bio: bio.trim(),
        consultationFee: fee,
      });

      const updated = res.data?.data;
      const verifiedAfterSave = Boolean(updated?.isVerified ?? updated?.verified ?? isVerified);
      setIsVerified(verifiedAfterSave);
      setHasSubmittedCchn(true);

      if (user) {
        setUser({
          ...user,
          fullName: updated?.fullName || fullName.trim(),
          avatarUrl: updated?.avatarUrl ?? (avatarUrl.trim() || undefined),
        });
      }

      if (verifiedAfterSave) {
        const msg = 'Đã cập nhật hồ sơ chuyên môn và đồng bộ AI Vector Search thành công.';
        setSavedBannerMsg(msg);
        toast.success(msg);
      } else {
        const msg = 'Hồ sơ của bạn đang được Ban quản trị thẩm định trong vòng 24h.';
        setSavedBannerMsg(msg);
        toast.success(`Đã lưu thông tin hành nghề! ${msg}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu hồ sơ bác sĩ.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4" role="status" aria-label="Đang tải hồ sơ">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Khai Báo &amp; Hồ Sơ Bác Sĩ</h1>
        <ErrorState message={loadError} onRetry={fetchProfile} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Khai Báo Thông Tin Hành Nghề &amp; Hồ Sơ Chuyên Môn
            </h1>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Hoàn thiện 4 nhóm thông tin chuẩn Bộ Y Tế để Ban quản trị thẩm định và kích hoạt AI gợi ý bác sĩ.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-center shrink-0 ${
            isVerified
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isVerified ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã thẩm định (isVerified = true)</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Chờ thẩm định CCHN (isVerified = false)</span>
            </>
          )}
        </span>
      </div>

      {/* Onboarding & Vetting Status Banner */}
      {isVerified ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h2 className="font-bold text-emerald-950">
              Hồ sơ và Chứng chỉ hành nghề (CCHN) đã được Ban quản trị thẩm định
            </h2>
            <p className="text-emerald-800 leading-relaxed text-xs">
              Tài khoản của bạn đã kích hoạt đầy đủ trên trang tìm kiếm bác sĩ và hệ thống gợi ý AI Vector Search (`pgvector`). Mọi cập nhật mới sẽ tự động đồng bộ lại chỉ mục AI.
            </p>
          </div>
        </div>
      ) : hasSubmittedCchn ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h2 className="font-bold text-amber-950 text-sm sm:text-base">
              Hồ sơ của bạn đang được Ban quản trị thẩm định trong vòng 24h
            </h2>
            <p className="text-amber-900 leading-relaxed text-xs">
              Ban quản trị / Hội đồng Y khoa sẽ đối chiếu số Chứng chỉ hành nghề (<span className="font-mono font-bold">{licenseNumber}</span>) với Cổng thông tin Bộ Y Tế. Khi được duyệt, tài khoản sẽ xuất hiện trên trang tìm kiếm bệnh nhân và kích hoạt AI Vector Search. Bạn vẫn có thể cập nhật bổ sung thông tin bên dưới.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-3xl bg-teal-50/80 border-2 border-teal-200 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-2xl bg-teal-600 text-white shrink-0 font-mono text-xs font-bold">
            B2/3
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h2 className="font-bold text-teal-950 text-sm sm:text-base">
              Bước 2/3 — Khai báo thông tin hành nghề (CCHN) để gửi duyệt
            </h2>
            <p className="text-teal-900 leading-relaxed text-xs">
              Tài khoản đăng nhập của bạn đã được khởi tạo thành công. Vui lòng hoàn thiện đầy đủ số Chứng chỉ hành nghề, nơi công tác, chuyên khoa và phí tư vấn bên dưới rồi nhấn lưu để gửi hồ sơ sang hàng đợi thẩm định của Admin.
            </p>
          </div>
        </div>
      )}

      {savedBannerMsg && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center gap-3 text-xs sm:text-sm text-emerald-950 font-semibold animate-fadeIn"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{savedBannerMsg}</span>
        </div>
      )}

      {/* Demo Quick-Fill Helper */}
      {ENABLE_DEMO_LOGIN && (
        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Demo nhanh Bước 2: Điền mẫu Chứng chỉ CCHN, Bệnh viện, Chuyên khoa &amp; Phí khám</span>
          </div>
          <button
            type="button"
            onClick={handleQuickFillClinicalDemo}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Điền nhanh Hồ sơ Chuyên môn mẫu</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6" noValidate>
        {/* NHÓM 1: ĐỊNH DANH & TÀI KHOẢN */}
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Nhóm 1: Định danh &amp; Tài khoản</span>
            </h2>
            <span className="font-mono text-[11px] font-semibold text-slate-500">User Entity</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl.trim()}
                alt={fullName || 'Ảnh chân dung bác sĩ'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-16 h-16 rounded-full object-cover border-2 border-teal-500 shrink-0 bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 font-bold text-xl flex items-center justify-center border-2 border-teal-200 shrink-0">
                {(fullName || user?.fullName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label htmlFor="dp-avatar" className="block text-xs font-semibold text-slate-700 mb-1">
                Ảnh chân dung áo blouse trắng (`avatarUrl`)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="dp-avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://.../avatar.jpg"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dp-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên đầy đủ <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={inputCls}
              />
              {err('fullName')}
            </div>

            <div>
              <label htmlFor="dp-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email đăng nhập &amp; thông báo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="dp-email"
                  type="email"
                  disabled
                  value={user?.email ?? ''}
                  className={`${inputCls} pl-9 bg-slate-100 text-slate-600 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="dp-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại khẩn cấp <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="dp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className={`${inputCls} pl-9`}
                />
              </div>
              {err('phone')}
            </div>
          </div>
        </section>

        {/* NHÓM 2: PHÁP LÝ & BẰNG CẤP (BẮT BUỘC THEO CHUẨN BỘ Y TẾ) */}
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-teal-600" />
              <span>Nhóm 2: Pháp lý &amp; Bằng cấp (Chuẩn Bộ Y Tế)</span>
            </h2>
            <span className="font-mono text-[11px] font-semibold text-slate-500">Vetting CCHN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dp-license" className="block text-xs font-semibold text-slate-700 mb-1">
                Số Chứng chỉ hành nghề (CCHN) <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-license"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="VD: 012345/BYT-CCHN"
                className={`${inputCls} font-mono font-semibold`}
              />
              {err('licenseNumber')}
            </div>

            <div>
              <label htmlFor="dp-issuer" className="block text-xs font-semibold text-slate-700 mb-1">
                Cơ quan cấp CCHN <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-issuer"
                type="text"
                value={licenseIssuedBy}
                onChange={(e) => setLicenseIssuedBy(e.target.value)}
                placeholder="Bộ Y Tế hoặc Sở Y Tế TP.HCM"
                className={inputCls}
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_LICENSE_ISSUERS.map((issuer) => (
                  <button
                    key={issuer}
                    type="button"
                    onClick={() => setLicenseIssuedBy(issuer)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                      licenseIssuedBy === issuer
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {issuer}
                  </button>
                ))}
              </div>
              {err('licenseIssuedBy')}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="dp-license-doc" className="block text-xs font-semibold text-slate-700">
                Link file scan / ảnh chụp CCHN (`licenseDocumentUrl`) để Admin đối soát
              </label>
              {licenseDocumentUrl.trim() && (
                <a
                  href={licenseDocumentUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
                >
                  <span>Mở xem tài liệu</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              id="dp-license-doc"
              type="url"
              value={licenseDocumentUrl}
              onChange={(e) => setLicenseDocumentUrl(e.target.value)}
              placeholder="https://.../cchn-front.pdf"
              className={inputCls}
            />
          </div>
        </section>

        {/* NHÓM 3: CHUYÊN MÔN & NƠI CÔNG TÁC */}
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Nhóm 3: Chuyên môn &amp; Nơi công tác (Dùng cho hiển thị &amp; AI gợi ý)</span>
            </h2>
            <span className="font-mono text-[11px] font-semibold text-slate-500">Clinical &amp; AI Vector</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dp-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Học hàm / Học vị <span className="text-rose-600">*</span>
              </label>
              <select
                id="dp-title"
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                className={`${inputCls} font-medium`}
              >
                {ACADEMIC_TITLES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dp-years" className="block text-xs font-semibold text-slate-700 mb-1">
                Số năm kinh nghiệm lâm sàng <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-years"
                type="number"
                min={0}
                max={70}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="VD: 10"
                className={inputCls}
              />
              {err('yearsOfExperience')}
            </div>

            <div>
              <label htmlFor="dp-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Bệnh viện / Phòng khám đang công tác <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-hospital"
                type="text"
                value={hospitalAffiliation}
                onChange={(e) => setHospitalAffiliation(e.target.value)}
                placeholder="VD: Bệnh viện Chợ Rẫy"
                className={inputCls}
              />
              {err('hospitalAffiliation')}
            </div>

            <div>
              <label htmlFor="dp-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Khoa / Phòng ban cụ thể
              </label>
              <input
                id="dp-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="VD: Khoa Nội Tim Mạch"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Danh sách chuyên khoa <span className="text-rose-600">*</span>{' '}
              <span className="font-normal text-slate-500">(chọn một hoặc nhiều từ danh mục chuyên khoa)</span>
            </span>
            {availableSpecialties.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có danh mục chuyên khoa. Liên hệ quản trị viên.</p>
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
                        selected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
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

          <div>
            <label htmlFor="dp-bio" className="block text-xs font-semibold text-slate-700 mb-1">
              Tiểu sử, kinh nghiệm &amp; thế mạnh chuyên môn <span className="font-normal text-slate-500">(dùng để tạo Vector AI pgvector)</span>
            </label>
            <textarea
              id="dp-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Quá trình đào tạo, chứng chỉ sau đại học, lĩnh vực điều trị chuyên sâu..."
              className={`${inputCls} leading-relaxed`}
            />
          </div>
        </section>

        {/* NHÓM 4: THIẾT LẬP DỊCH VỤ KHÁM BỆNH */}
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-teal-600" />
              <span>Nhóm 4: Thiết lập dịch vụ khám bệnh</span>
            </h2>
            <span className="font-mono text-[11px] font-semibold text-slate-500">Service Pricing</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label htmlFor="dp-fee" className="block text-xs font-semibold text-slate-700 mb-1">
                Giá tiền mỗi lượt tư vấn / khám (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <input
                id="dp-fee"
                type="number"
                step={10000}
                min={0}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="VD: 300000"
                className={`${inputCls} font-mono font-bold text-teal-800`}
              />
              {err('consultationFee')}
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/70 text-xs">
              <span className="text-slate-600 block font-medium">Hiển thị với bệnh nhân khi đặt lịch:</span>
              <span className="text-base font-bold text-teal-800 font-mono mt-1 block">
                {formattedFeePreview}
              </span>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Award className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {isVerified
                ? 'Hồ sơ đã xác minh — cập nhật sẽ tự động đồng bộ AI Vector Search.'
                : 'Sau khi lưu, hồ sơ sẽ chuyển trạng thái chờ Ban quản trị thẩm định trong vòng 24h.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving || (attempted && hasErrors)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? 'Đang lưu hồ sơ...'
                : isVerified
                ? 'Cập nhật hồ sơ chuyên môn'
                : 'Gửi hồ sơ chờ thẩm định'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
