import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  UploadCloud,
  FileText,
  AlertCircle,
  FileBadge,
  Eye,
  X,
  RefreshCw,
  FileCheck,
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

type VerificationStatusType = 'UNSUBMITTED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';

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
    clinicAddress: '215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh',
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
    clinicAddress: '78 Giải Phóng, Phường Phương Mai, Quận Đống Đa, Hà Nội',
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
    clinicAddress: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
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

  // Nhóm 2: Pháp lý & Bằng cấp (Chuẩn Bộ Y Tế & Supabase Storage)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedBy, setLicenseIssuedBy] = useState('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
  const [licenseDocumentStoragePath, setLicenseDocumentStoragePath] = useState('');
  const [hasLicenseDocument, setHasLicenseDocument] = useState(false);
  const [licenseIssuedDate, setLicenseIssuedDate] = useState('');
  const [scopeOfPractice, setScopeOfPractice] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusType>('UNSUBMITTED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [rejectionAt, setRejectionAt] = useState<string | null>(null);
  const [hasSubmittedCchn, setHasSubmittedCchn] = useState(false);

  // Upload tệp CCHN lên Supabase
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadedLicenseName, setUploadedLicenseName] = useState<string | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [loadingPreviewUrl, setLoadingPreviewUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nhóm 3: Chuyên môn & Nơi công tác
  const [academicTitle, setAcademicTitle] = useState('BS');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
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
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [savedBannerMsg, setSavedBannerMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [profileRes, specRes] = await Promise.all([
        api.get('/doctors/me/profile').catch(() => api.get(`/doctors/${user.id}`)),
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
      setLicenseDocumentStoragePath(d.licenseDocumentStoragePath || '');
      setHasLicenseDocument(Boolean(d.hasLicenseDocument || d.licenseDocumentStoragePath || d.licenseDocumentUrl));
      setLicenseIssuedDate(d.licenseIssuedDate || '');
      setScopeOfPractice(d.scopeOfPractice || '');
      const verifiedFlag = Boolean(d.isVerified ?? d.verified);
      setIsVerified(verifiedFlag);
      
      const status: VerificationStatusType = (d.verificationStatus as VerificationStatusType) || (verifiedFlag ? 'APPROVED' : (d.licenseNumber ? 'PENDING_VERIFICATION' : 'UNSUBMITTED'));
      setVerificationStatus(status);
      setRejectionReason(d.rejectionReason || null);
      setRejectionAt(d.rejectionAt || null);
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
      setClinicAddress(d.clinicAddress || '');
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
    setLicenseIssuedDate('2020-05-15');
    setScopeOfPractice('Khám bệnh, chữa bệnh chuyên khoa Nội khoa tổng quát, chỉ định cận lâm sàng và tư vấn đơn thuốc.');
    if (!licenseDocumentUrl.trim()) {
      setLicenseDocumentUrl(`https://res.cloudinary.com/demo/image/upload/v1/sample.jpg`);
    }
    setHasLicenseDocument(true);
    setAcademicTitle(preset.academicTitle);
    if (pickedSlug) setSpecialtySlugs([pickedSlug]);
    setHospitalAffiliation(preset.hospitalAffiliation);
    setClinicAddress(preset.clinicAddress);
    setDepartment(preset.department);
    setYearsOfExperience(String(preset.yearsOfExperience));
    setConsultationFee(String(preset.consultationFee));
    setBio(preset.bio);
    setSavedBannerMsg(null);
    toast.success(`Đã điền mẫu hồ sơ CCHN (${cchn}). Nhấn "Gửi Hồ Sơ Chờ Thẩm Định" để lưu.`);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước tệp không được vượt quá 10MB.');
      return;
    }
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Vui lòng chọn file PDF, JPEG, PNG hoặc WEBP.');
      return;
    }

    try {
      setUploadingLicense(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/doctors/me/license-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data;
      if (data) {
        setLicenseDocumentStoragePath(data.storagePath || '');
        setLicenseDocumentUrl(data.viewUrl || '');
        setPreviewSignedUrl(data.viewUrl || null);
        setHasLicenseDocument(true);
        setUploadedLicenseName(file.name);
        if (data.verificationStatus) {
          setVerificationStatus(data.verificationStatus as VerificationStatusType);
        }
        toast.success(`Đã tải lên bản scan CCHN (${file.name}) lên Supabase Storage bảo mật thành công!`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Tải lên bản scan CCHN thất bại. Vui lòng thử lại.'));
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleViewLicenseDocument = async () => {
    if (previewSignedUrl) {
      setPreviewModalOpen(true);
      return;
    }
    try {
      setLoadingPreviewUrl(true);
      const res = await api.get('/doctors/me/license-document/view');
      const access = res.data?.data;
      if (access?.url) {
        setPreviewSignedUrl(access.url);
        setPreviewModalOpen(true);
      } else {
        toast.error('Không tìm thấy tệp chứng chỉ hành nghề.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể lấy liên kết xem tài liệu CCHN.'));
    } finally {
      setLoadingPreviewUrl(false);
    }
  };

  const handleSaveInternal = async (submitForVerification = false) => {
    setAttempted(true);
    setSavedBannerMsg(null);
    if (saving || hasErrors) return;

    try {
      setSaving(true);
      if (submitForVerification) setSubmittingVerification(true);

      const res = await api.put('/doctors/me/profile', {
        fullName: fullName.trim(),
        phone: phone.replace(/\s/g, ''),
        avatarUrl: avatarUrl.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseIssuedBy: licenseIssuedBy.trim(),
        licenseDocumentUrl: licenseDocumentUrl.trim(),
        licenseIssuedDate: licenseIssuedDate.trim() || null,
        scopeOfPractice: scopeOfPractice.trim() || null,
        submitForVerification,
        academicTitle: academicTitle || 'BS',
        specialtySlugs,
        hospitalAffiliation: hospitalAffiliation.trim(),
        clinicAddress: clinicAddress.trim(),
        department: department.trim(),
        yearsOfExperience: years,
        bio: bio.trim(),
        consultationFee: fee,
      });

      const updated = res.data?.data;
      const verifiedAfterSave = Boolean(updated?.isVerified ?? updated?.verified ?? isVerified);
      setIsVerified(verifiedAfterSave);
      setHasSubmittedCchn(true);
      if (updated?.verificationStatus) {
        setVerificationStatus(updated.verificationStatus as VerificationStatusType);
      } else if (submitForVerification) {
        setVerificationStatus('PENDING_VERIFICATION');
      }

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
      } else if (submitForVerification) {
        const msg = 'Hồ sơ CCHN của bạn đã được gửi tới Ban Quản Trị và đang chờ thẩm định.';
        setSavedBannerMsg(msg);
        toast.success(msg);
      } else {
        const msg = 'Đã lưu thông tin hồ sơ bác sĩ thành công.';
        setSavedBannerMsg(msg);
        toast.success(msg);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu hồ sơ bác sĩ.'));
    } finally {
      setSaving(false);
      setSubmittingVerification(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveInternal(false);
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

      {/* VERIFICATION LIFECYCLE STATUS BANNER */}
      {verificationStatus === 'REJECTED' && (
        <div className="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50/90 text-rose-950 space-y-2 shadow-xs" role="alert">
          <div className="flex items-center gap-2.5 font-bold text-base text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>Hồ Sơ Chứng Chỉ Hành Nghề (CCHN) Cần Bổ Sung / Bị Từ Chối</span>
          </div>
          <p className="text-sm text-rose-800 leading-relaxed">
            <strong>Phản hồi từ Hội đồng thẩm định / Ban Quản Trị:</strong>{' '}
            <span className="font-semibold underline">{rejectionReason || 'Hồ sơ chưa đạt tiêu chuẩn thẩm định.'}</span>
            {rejectionAt && <span className="block text-xs text-rose-600 mt-0.5">Thời điểm xét duyệt: {new Date(rejectionAt).toLocaleString('vi-VN')}</span>}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-rose-700">
              Vui lòng kiểm tra lại số CCHN, tải lên bản scan rõ nét (có mộc đỏ) và nhấn nút bên dưới để gửi lại hồ sơ xét duyệt.
            </p>
            <button
              type="button"
              disabled={submittingVerification || saving}
              onClick={() => handleSaveInternal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', submittingVerification && 'animate-spin')} />
              <span>Nộp lại hồ sơ thẩm định</span>
            </button>
          </div>
        </div>
      )}

      {verificationStatus === 'PENDING_VERIFICATION' && (
        <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/80 text-indigo-950 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2.5 font-bold text-base text-indigo-900">
            <Clock className="w-5 h-5 shrink-0 text-indigo-600 animate-pulse" />
            <span>Hồ Sơ Đang Trong Hàng Đợi Thẩm Định (Pending Vetting)</span>
          </div>
          <p className="text-sm text-indigo-800 leading-relaxed">
            Chứng chỉ hành nghề và hồ sơ chuyên môn của Bác sĩ đã được lưu trữ an toàn trên <strong>Supabase Cloud Storage</strong>. Quản trị viên y tế đang tiến hành đối chiếu với Cổng thông tin Quốc gia về Khám chữa bệnh (Bộ Y Tế).
          </p>
          <p className="text-xs text-indigo-600">
            ⏱️ Quá trình xác thực thường hoàn tất trong vòng 12 - 24 giờ làm việc. Bác sĩ sẽ nhận được thông báo in-app ngay khi hoàn tất.
          </p>
        </div>
      )}

      {verificationStatus === 'APPROVED' && (
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-base text-emerald-900">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>Chứng Chỉ Hành Nghề Đã Được Thẩm Định Thành Công ✅</span>
            </div>
            <p className="text-xs text-emerald-800">
              Hồ sơ của bạn đã được xác thực đạt chuẩn Bộ Y Tế. Hệ thống đã đồng bộ Vector pgvector và cho phép bệnh nhân tìm kiếm, đặt lịch.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 w-fit shrink-0">
            Đã Kích Hoạt (Verified)
          </span>
        </div>
      )}

      {verificationStatus === 'UNSUBMITTED' && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 flex items-start gap-3 shadow-xs">
          <FileBadge className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900">
            <p className="font-bold text-sm">Bước 2/3: Hoàn tất khai báo thông tin CCHN &amp; Tải lên tệp chứng chỉ</p>
            <p className="leading-relaxed">
              Theo Luật Khám bệnh, chữa bệnh 2023, Bác sĩ cần cung cấp Số CCHN, Ngày cấp và tải lên bản scan hợp lệ lên Supabase để Hội đồng y tế đối soát trước khi mở lịch khám.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-w-0">
          {/* Account summary */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4 pb-2 border-b border-slate-200/70">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || 'Ảnh đại diện bác sĩ'}
                  className="w-16 h-16 rounded-2xl object-cover border border-teal-200 bg-white shadow-xs shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-display font-bold text-xl flex items-center justify-center shrink-0">
                  {(fullName || 'BS').trim().split(' ').pop()?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label htmlFor="dp-avatar-url" className={label}>
                  Ảnh đại diện hồ sơ (Avatar URL)
                </label>
                <input
                  id="dp-avatar-url"
                  className={inputCls}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="/avatars/doctors/doc-01.svg hoặc https://..."
                />
                <p className="mt-1 text-xs text-slate-500">Hiển thị công khai trên thẻ bác sĩ khi bệnh nhân tìm kiếm và đặt lịch.</p>
              </div>
            </div>
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

          {/* License & Credentials Section (Chuẩn Bộ Y Tế & Supabase Storage) */}
          <section id="license" className="px-5 sm:px-6 py-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-teal-700" />
                  <span>Chứng chỉ hành nghề &amp; Pháp lý y tế</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thông tin phục vụ thẩm định cấp phép hành nghề theo Luật Khám bệnh, chữa bệnh 2023.
                </p>
              </div>
              {isVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" /> Đã xác thực Bộ Y Tế
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dp-license" className={label}>
                  Số chứng chỉ hành nghề (CCHN) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="dp-license"
                  className={field('licenseNumber')}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: 015482/BYT-CCHN"
                  disabled={isVerified}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {isVerified ? 'Đã xác minh pháp lý — vui lòng liên hệ Admin nếu cần điều chỉnh.' : 'Ghi đúng như trên văn bằng chứng chỉ.'}
                </p>
                {err('licenseNumber')}
              </div>

              <div>
                <label htmlFor="dp-issuer" className={label}>
                  Cơ quan cấp CCHN <span className="text-rose-600">*</span>
                </label>
                <input
                  id="dp-issuer"
                  list="dp-issuers"
                  className={field('licenseIssuedBy')}
                  value={licenseIssuedBy}
                  onChange={(e) => setLicenseIssuedBy(e.target.value)}
                  disabled={isVerified}
                  placeholder="Bộ Y Tế / Sở Y Tế..."
                />
                <datalist id="dp-issuers">
                  {QUICK_LICENSE_ISSUERS.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
                {err('licenseIssuedBy')}
              </div>

              <div>
                <label htmlFor="dp-license-date" className={label}>
                  Ngày cấp CCHN
                </label>
                <input
                  id="dp-license-date"
                  type="date"
                  className={inputCls}
                  value={licenseIssuedDate}
                  onChange={(e) => setLicenseIssuedDate(e.target.value)}
                  disabled={isVerified}
                />
                <p className="mt-1 text-xs text-slate-500">Ngày ký quyết định cấp chứng chỉ hành nghề.</p>
              </div>

              <div>
                <label htmlFor="dp-scope" className={label}>
                  Phạm vi hoạt động chuyên môn theo CCHN
                </label>
                <input
                  id="dp-scope"
                  className={inputCls}
                  value={scopeOfPractice}
                  onChange={(e) => setScopeOfPractice(e.target.value)}
                  placeholder="Ví dụ: Khám bệnh, chữa bệnh chuyên khoa Nội..."
                  disabled={isVerified}
                />
                <p className="mt-1 text-xs text-slate-500">Phạm vi chuyên môn được phép hành nghề ghi trên chứng chỉ.</p>
              </div>

              {/* UPLOAD ZONE: TẢI LÊN SUPABASE STORAGE */}
              <div className="sm:col-span-2">
                <label className={label}>
                  Bản scan / Ảnh Chứng chỉ hành nghề (CCHN) <span className="text-rose-600">*</span>
                </label>

                {/* Ẩn file input để kích hoạt qua nút bấm */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={isVerified || uploadingLicense}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />

                {hasLicenseDocument || licenseDocumentStoragePath || licenseDocumentUrl ? (
                  <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {uploadedLicenseName || (licenseDocumentStoragePath ? licenseDocumentStoragePath.split('/').pop() : 'Bản scan CCHN')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 shrink-0">
                            Supabase Cloud Storage
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Lưu trữ bucket private an toàn · Truy cập qua signed URL
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleViewLicenseDocument}
                        disabled={loadingPreviewUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600 bg-white text-teal-700 text-xs font-semibold hover:bg-teal-50 transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{loadingPreviewUrl ? 'Đang tải...' : 'Xem bản scan CCHN'}</span>
                      </button>

                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLicense}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={cn('w-3 h-3', uploadingLicense && 'animate-spin')} />
                          <span>{uploadingLicense ? 'Đang tải...' : 'Thay tệp khác'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (isVerified || uploadingLicense) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    onClick={() => {
                      if (!isVerified && !uploadingLicense) fileInputRef.current?.click();
                    }}
                    className={cn(
                      'p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 transition text-center cursor-pointer space-y-2',
                      uploadingLicense && 'opacity-60 cursor-wait'
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                      <UploadCloud className={cn('w-6 h-6', uploadingLicense && 'animate-bounce')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {uploadingLicense ? 'Đang tải tệp lên Supabase Storage bảo mật...' : 'Kéo thả hoặc bấm để tải lên bản scan CCHN'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ định dạng PDF, JPEG, PNG, WEBP (Dung lượng tối đa 10MB)
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold shadow-xs">
                        <UploadCloud className="w-3.5 h-3.5" /> Chọn tệp từ máy
                      </span>
                    </div>
                  </div>
                )}

                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Tệp lưu trữ tại Supabase Private Bucket. Bệnh nhân không nhìn thấy tệp này; chỉ Quản trị viên y tế xem khi đối soát cấp phép.</span>
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
              <div className="sm:col-span-2">
                <label htmlFor="dp-clinic-address" className={label}>
                  Địa chỉ phòng khám <span className="font-normal text-slate-500">(hiển thị để bệnh nhân tìm đường đến khám)</span>
                </label>
                <input
                  id="dp-clinic-address"
                  className={inputCls}
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Ví dụ: 215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh"
                />
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
              {attempted && hasErrors ? (
                <span className="text-rose-700">Còn {Object.keys(errors).length} mục cần sửa.</span>
              ) : isVerified ? (
                'Thay đổi được cập nhật ngay vào hồ sơ công khai.'
              ) : verificationStatus === 'PENDING_VERIFICATION' ? (
                'Hồ sơ đang chờ Quản trị viên thẩm định. Bạn vẫn có thể cập nhật thông tin bổ sung.'
              ) : (
                'Điền đầy đủ Số CCHN, tải lên bản scan và nhấn "Gửi hồ sơ thẩm định" để hoàn tất.'
              )}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={saving || submittingVerification}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {saving && !submittingVerification ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu thông tin</span>
              </button>

              {!isVerified && (
                <button
                  type="button"
                  disabled={saving || submittingVerification || !licenseNumber.trim()}
                  onClick={() => handleSaveInternal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer shadow-xs"
                >
                  {submittingVerification ? <Clock className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{verificationStatus === 'REJECTED' ? 'Nộp lại hồ sơ thẩm định' : 'Gửi hồ sơ thẩm định CCHN'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Quy trình thẩm định CCHN</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-700">
              {[
                ['1. Tải lên CCHN:', 'Ảnh chụp rõ nét 2 mặt hoặc file scan PDF có dấu đỏ.'],
                ['2. Ban Quản Trị đối soát:', 'Kiểm tra số chứng chỉ, nơi cấp và phạm vi hoạt động.'],
                ['3. Tự động kích hoạt:', 'Khi được duyệt, bác sĩ có thể mở lịch khám và tiếp nhận bệnh nhân.'],
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

      {/* MODAL XEM BẢN SCAN CCHN (SUPABASE SIGNED URL) */}
      {previewModalOpen && previewSignedUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bản Scan Chứng Chỉ Hành Nghề (CCHN)</h3>
                  <p className="text-xs text-slate-500">Lưu trữ an toàn trên Supabase Private Bucket · Signed URL có hiệu lực 15 phút</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở tab mới</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  title="Đóng xem trước"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto bg-slate-100/60 flex items-center justify-center min-h-[400px]">
              {previewSignedUrl.includes('.pdf') || previewSignedUrl.includes('application%2Fpdf') || previewSignedUrl.includes('format=pdf') ? (
                <iframe
                  src={previewSignedUrl}
                  title="CCHN Document"
                  className="w-full h-[65vh] rounded-xl border border-slate-300 bg-white"
                />
              ) : (
                <img
                  src={previewSignedUrl}
                  alt="Bản scan CCHN"
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-xs border border-slate-200 bg-white"
                />
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Bác sĩ: <strong>{fullName || user?.fullName}</strong> ({licenseNumber || 'Chưa có số CCHN'})</span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
