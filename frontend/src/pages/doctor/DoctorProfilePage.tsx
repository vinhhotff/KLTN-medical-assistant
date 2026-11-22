import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Mail,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { ErrorState, Skeleton, useToast, cn } from '../../components/ui';
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
  'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 transition disabled:bg-slate-100 disabled:text-slate-500';

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
      <p role="alert" className="text-xs text-rose-700 mt-1">
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
      <div className="space-y-4" role="status" aria-label="Đang tải hồ sơ">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (loadError) return <ErrorState message={loadError} onRetry={fetchProfile} retrying={loading} />;

  const step3Done = Boolean(bio.trim() && consultationFee.trim() && fee > 0);
  const steps = [
    { n: 1, title: 'Tài khoản', state: 'done' as const },
    { n: 2, title: 'Thông tin hành nghề', state: hasSubmittedCchn ? ('done' as const) : ('current' as const) },
    { n: 3, title: 'Hồ sơ công khai', state: step3Done && hasSubmittedCchn ? ('done' as const) : hasSubmittedCchn ? ('current' as const) : ('todo' as const) },
    { n: 4, title: 'Xét duyệt', state: isVerified ? ('done' as const) : hasSubmittedCchn ? ('current' as const) : ('todo' as const) },
  ];
  const stepCaption = (s: (typeof steps)[number]) =>
    s.n === 4 ? (isVerified ? 'đã xác minh' : hasSubmittedCchn ? 'chờ quản trị viên' : 'chưa gửi') : s.state === 'done' ? 'xong' : s.state === 'current' ? 'đang điền' : '';

  const label = 'block text-sm font-medium text-slate-800 mb-1.5';
  const field = (k: string) => cn(inputCls, attempted && errors[k] && 'border-rose-500 focus:ring-rose-500');

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{isVerified ? 'Hồ sơ bác sĩ' : 'Hoàn thiện hồ sơ bác sĩ'}</h1>
          <p className="mt-1.5 text-slate-600">
            Hồ sơ của bác sĩ được quản trị viên xác minh chứng chỉ hành nghề trước khi hiển thị cho bệnh nhân.
          </p>
        </div>
        {ENABLE_DEMO_LOGIN && !isVerified && (
          <button
            type="button"
            onClick={handleQuickFillClinicalDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-teal-300 text-sm font-medium text-teal-800 hover:bg-teal-50 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Điền mẫu (demo)
          </button>
        )}
      </div>

      {/* Stepper */}
      <ol className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border bg-white',
              s.state === 'current' ? 'border-teal-700 border-2' : 'border-slate-200',
            )}
          >
            <span
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
                s.state === 'done' ? 'bg-teal-700 text-white' : s.state === 'current' ? 'border-2 border-teal-700 text-teal-800' : 'border border-slate-300 text-slate-500',
              )}
            >
              {s.state === 'done' ? <Check className="w-4 h-4" /> : s.n}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-slate-500">
                Bước {s.n}
                {stepCaption(s) && ` · ${stepCaption(s)}`}
              </span>
              <span className={cn('block font-semibold truncate', s.state === 'current' ? 'text-teal-900' : 'text-slate-900')}>{s.title}</span>
            </span>
          </li>
        ))}
      </ol>

      {savedBannerMsg && (
        <p className="flex items-center gap-2 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-900" role="status">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {savedBannerMsg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-w-0">
          {/* Account summary */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dp-name" className={label}>
                Họ và tên
              </label>
              <input id="dp-name" className={field('fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              {err('fullName')}
            </div>
            <div>
              <label htmlFor="dp-phone" className={label}>
                Số điện thoại liên hệ
              </label>
              <input id="dp-phone" inputMode="tel" className={field('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
              {err('phone')}
            </div>
            <p className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" /> {user?.email} <span className="text-slate-400">· email đăng nhập</span>
            </p>
          </div>

          {/* License */}
          <section id="license" className="px-5 sm:px-6 py-6 border-b border-slate-200">
            <h2 className="font-display text-lg font-bold text-slate-900">Chứng chỉ hành nghề</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dp-license" className={label}>
                  Số chứng chỉ hành nghề
                </label>
                <input
                  id="dp-license"
                  className={field('licenseNumber')}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Ví dụ: 015482/BYT-CCHN"
                  disabled={isVerified}
                />
                <p className="mt-1 text-xs text-slate-500">{isVerified ? 'Đã xác minh — liên hệ quản trị viên nếu cần đổi.' : 'Ghi đúng như trên chứng chỉ.'}</p>
                {err('licenseNumber')}
              </div>
              <div>
                <label htmlFor="dp-issuer" className={label}>
                  Nơi cấp
                </label>
                <input
                  id="dp-issuer"
                  list="dp-issuers"
                  className={field('licenseIssuedBy')}
                  value={licenseIssuedBy}
                  onChange={(e) => setLicenseIssuedBy(e.target.value)}
                  disabled={isVerified}
                />
                <datalist id="dp-issuers">
                  {QUICK_LICENSE_ISSUERS.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
                {err('licenseIssuedBy')}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="dp-licdoc" className={label}>
                  Đường dẫn ảnh chứng chỉ hành nghề <span className="font-normal text-slate-500">(không bắt buộc)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="dp-licdoc"
                    type="url"
                    className={inputCls}
                    value={licenseDocumentUrl}
                    onChange={(e) => setLicenseDocumentUrl(e.target.value)}
                    placeholder="https://…"
                  />
                  {/^https?:\/\//.test(licenseDocumentUrl.trim()) && (
                    <a
                      href={licenseDocumentUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      Mở <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5" /> Chỉ quản trị viên xem để xác minh. Bệnh nhân không thấy ảnh này.
                </p>
              </div>
            </div>
          </section>

          {/* Expertise */}
          <section id="expertise" className="px-5 sm:px-6 py-6 border-b border-slate-200">
            <h2 className="font-display text-lg font-bold text-slate-900">Chuyên môn</h2>
            <p className="mt-4 text-sm font-medium text-slate-800">
              Chuyên khoa <span className="font-normal text-slate-500">· chọn ít nhất 1</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableSpecialties.map((s) => {
                const on = specialtySlugs.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSpecialty(s.slug)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition cursor-pointer',
                      on ? 'border-teal-700 border-2 bg-teal-50 text-teal-900 font-semibold' : 'border-slate-300 text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {on && <Check className="w-4 h-4" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
            {err('specialtySlugs')}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dp-title" className={label}>
                  Học hàm / học vị
                </label>
                <select id="dp-title" className={inputCls} value={academicTitle} onChange={(e) => setAcademicTitle(e.target.value)}>
                  {ACADEMIC_TITLES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dp-years" className={label}>
                  Số năm kinh nghiệm
                </label>
                <input
                  id="dp-years"
                  type="number"
                  min={0}
                  max={70}
                  className={field('yearsOfExperience')}
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                />
                {err('yearsOfExperience')}
              </div>
              <div>
                <label htmlFor="dp-hospital" className={label}>
                  Nơi công tác hiện tại
                </label>
                <input id="dp-hospital" className={field('hospitalAffiliation')} value={hospitalAffiliation} onChange={(e) => setHospitalAffiliation(e.target.value)} />
                {err('hospitalAffiliation')}
              </div>
              <div>
                <label htmlFor="dp-dept" className={label}>
                  Khoa / phòng <span className="font-normal text-slate-500">(không bắt buộc)</span>
                </label>
                <input id="dp-dept" className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Public profile */}
          <section id="public" className="px-5 sm:px-6 py-6">
            <h2 className="font-display text-lg font-bold text-slate-900">Hồ sơ công khai</h2>
            <p className="mt-1 text-sm text-slate-500">Phần bệnh nhân nhìn thấy khi tìm bác sĩ. Giới thiệu còn được AI dùng để ghép bác sĩ với triệu chứng.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="dp-bio" className={label}>
                  Giới thiệu
                </label>
                <textarea id="dp-bio" rows={4} className={cn(inputCls, 'resize-y')} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div>
                <label htmlFor="dp-fee" className={label}>
                  Phí khám mỗi lượt (VNĐ)
                </label>
                <input
                  id="dp-fee"
                  type="number"
                  min={0}
                  step={10000}
                  className={field('consultationFee')}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">{formattedFeePreview}</p>
                {err('consultationFee')}
              </div>
              <div>
                <label htmlFor="dp-avatar" className={label}>
                  Ảnh đại diện (đường dẫn) <span className="font-normal text-slate-500">(không bắt buộc)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {/^https?:\/\//.test(avatarUrl.trim()) ? (
                      <img src={avatarUrl.trim()} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </span>
                  <input id="dp-avatar" type="url" className={inputCls} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
                </div>
              </div>
            </div>
          </section>

          <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {attempted && hasErrors ? <span className="text-rose-700">Còn {Object.keys(errors).length} mục cần sửa.</span> : isVerified ? 'Thay đổi được cập nhật ngay vào hồ sơ công khai.' : 'Lưu xong, hồ sơ được gửi cho quản trị viên xét duyệt.'}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer"
            >
              {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {hasSubmittedCchn ? 'Lưu thay đổi' : 'Gửi hồ sơ xét duyệt'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Sau khi gửi hồ sơ</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-700">
              {[
                ['Quản trị viên đối chiếu', 'số chứng chỉ, nơi cấp và phạm vi chuyên môn.'],
                ['Nhận thông báo kết quả.', 'Nếu chưa được duyệt, bác sĩ có thể sửa rồi gửi lại.'],
                ['Hồ sơ hiển thị cho bệnh nhân.', 'Bác sĩ mở lịch làm việc và bắt đầu nhận lịch hẹn.'],
              ].map(([b, t], i) => (
                <li key={b} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span>
                    <strong className="text-slate-900">{b}</strong> {t}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-teal-900">
              <ShieldCheck className="w-4 h-4" /> Vì sao cần xác minh?
            </h2>
            <p className="mt-2 text-sm text-teal-900 leading-relaxed">
              Bệnh nhân đặt lịch vì tin rằng mọi bác sĩ trên MediAssist đều có chứng chỉ hành nghề hợp lệ. Bước này bảo vệ cả bệnh nhân lẫn bác sĩ.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
};
