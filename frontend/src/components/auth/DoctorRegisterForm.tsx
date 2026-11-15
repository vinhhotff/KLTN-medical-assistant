import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileBadge,
  Lock,
  Mail,
  Phone,
  Sparkles,
  Stethoscope,
  User as UserIcon,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ENABLE_DEMO_LOGIN } from '../../config/app';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const ACADEMIC_TITLES = [
  { value: 'BS', label: 'BS (Bác sĩ)' },
  { value: 'BS.CKI', label: 'BS.CKI (Bác sĩ Chuyên khoa I)' },
  { value: 'BS.CKII', label: 'BS.CKII (Bác sĩ Chuyên khoa II)' },
  { value: 'ThS.BS', label: 'ThS.BS (Thạc sĩ Bác sĩ)' },
  { value: 'TS.BS', label: 'TS.BS (Tiến sĩ Bác sĩ)' },
  { value: 'PGS.TS', label: 'PGS.TS (Phó Giáo sư - Tiến sĩ)' },
  { value: 'GS.TS', label: 'GS.TS (Giáo sư - Tiến sĩ)' },
] as const;

const LICENSE_ISSUERS = [
  'Bộ Y Tế',
  'Sở Y Tế TP.HCM',
  'Sở Y Tế Hà Nội',
  'Sở Y Tế Đà Nẵng',
] as const;

interface SpecialtyOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const FALLBACK_SPECIALTIES: SpecialtyOption[] = [
  { id: 'sp-cardiology', name: 'Cardiology (Tim mạch)', slug: 'cardiology' },
  { id: 'sp-general', name: 'General Internal Medicine (Nội tổng quát)', slug: 'general-internal-medicine' },
  { id: 'sp-neurology', name: 'Neurology (Thần kinh)', slug: 'neurology' },
  { id: 'sp-gastro', name: 'Gastroenterology (Tiêu hóa - Gan mật)', slug: 'gastroenterology' },
  { id: 'sp-pulmo', name: 'Pulmonology (Hô hấp & Phổi)', slug: 'pulmonology' },
  { id: 'sp-endo', name: 'Endocrinology (Nội tiết & Đái tháo đường)', slug: 'endocrinology' },
  { id: 'sp-peds', name: 'Pediatrics (Nhi khoa)', slug: 'pediatrics' },
  { id: 'sp-derm', name: 'Dermatology (Da liễu)', slug: 'dermatology' },
  { id: 'sp-ortho', name: 'Orthopedics (Cơ Xương Khớp)', slug: 'orthopedics' },
  { id: 'sp-obgyn', name: 'Obstetrics & Gynecology (Sản Phụ Khoa)', slug: 'obstetrics-gynecology' },
  { id: 'sp-nephro', name: 'Nephrology (Thận & Tiết niệu)', slug: 'nephrology' },
  { id: 'sp-ent', name: 'Otolaryngology (Tai Mũi Họng)', slug: 'ent' },
];

const DEMO_RANDOM_DOCTORS = [
  {
    academicTitle: 'ThS.BS',
    fullName: 'Nguyễn Hoàng Minh',
    hospitalAffiliation: 'Bệnh viện Đại Học Y Dược TP.HCM',
    department: 'Khoa Nội Tổng Quát',
    licenseIssuedBy: 'Bộ Y Tế',
    yearsOfExperience: 11,
    consultationFee: 350000,
    specialtyCandidates: ['general-internal-medicine', 'noi-tong-quat'],
    bio: 'Hơn 11 năm kinh nghiệm khám tầm soát bệnh lý nội khoa, kiểm soát tăng huyết áp, đái tháo đường và rối loạn chuyển hóa.',
  },
  {
    academicTitle: 'TS.BS',
    fullName: 'Trần Thị Ngọc Lan',
    hospitalAffiliation: 'Bệnh viện Bạch Mai Hà Nội',
    department: 'Trung tâm Thần Kinh Lâm Sàng',
    licenseIssuedBy: 'Bộ Y Tế',
    yearsOfExperience: 15,
    consultationFee: 450000,
    specialtyCandidates: ['neurology', 'than-kinh'],
    bio: 'Chuyên sâu điều trị đau đầu mạn tính, rối loạn tiền đình, phục hồi sau đột quỵ và các bệnh lý thần kinh ngoại biên.',
  },
  {
    academicTitle: 'BS.CKII',
    fullName: 'Lê Quang Khải',
    hospitalAffiliation: 'Bệnh viện Chợ Rẫy TP.HCM',
    department: 'Khoa Ngoại Chấn Thương Chỉnh Hình',
    licenseIssuedBy: 'Sở Y Tế TP.HCM',
    yearsOfExperience: 14,
    consultationFee: 400000,
    specialtyCandidates: ['orthopedics', 'co-xuong-khop'],
    bio: 'Chuyên gia điều trị thoái hóa cột sống, chấn thương thể thao và phục hồi chức năng cơ xương khớp ít xâm lấn.',
  },
  {
    academicTitle: 'BS.CKI',
    fullName: 'Phạm Thu Hà',
    hospitalAffiliation: 'Bệnh viện Nhi Trung Ương',
    department: 'Khoa Khám Bệnh Nhi Đa Khoa',
    licenseIssuedBy: 'Sở Y Tế Hà Nội',
    yearsOfExperience: 9,
    consultationFee: 300000,
    specialtyCandidates: ['pediatrics', 'nhi-khoa'],
    bio: 'Bác sĩ chuyên khoa Nhi với 9 năm điều trị hô hấp nhi, dinh dưỡng trẻ nhỏ và tư vấn tiêm chủng dự phòng.',
  },
];

export const DoctorRegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [academicTitle, setAcademicTitle] = useState<string>('BS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedBy, setLicenseIssuedBy] = useState<string>('Bộ Y Tế');
  const [customLicenseIssuedBy, setCustomLicenseIssuedBy] = useState('');

  const [specialties, setSpecialties] = useState<SpecialtyOption[]>(FALLBACK_SPECIALTIES);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>([]);

  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [department, setDepartment] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('5');
  const [consultationFee, setConsultationFee] = useState('300000');
  const [bio, setBio] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get('/specialties')
      .then((res) => {
        if (!active) return;
        const list = res.data?.data;
        if (res.data?.success && Array.isArray(list) && list.length > 0) {
          setSpecialties(list);
        }
      })
      .catch(() => {
        // Giữ nguyên FALLBACK_SPECIALTIES khi backend chưa sẵn sàng
      })
      .finally(() => {
        if (active) setLoadingSpecialties(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveIssuedBy = licenseIssuedBy === 'OTHER' ? customLicenseIssuedBy.trim() : licenseIssuedBy;

  const passCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        label: 'Chưa nhập',
        level: 0,
        color: 'bg-slate-200',
        textColor: 'text-slate-400',
      };
    }

    const { length, uppercase, special } = passCriteria;
    const hasNumber = /[0-9]/.test(password);
    const hasLower = /[a-z]/.test(password);

    if (!length) {
      return {
        label: `Không đạt chuẩn (${password.length}/8 ký tự)`,
        level: Math.max(15, Math.min(Math.round((password.length / 8) * 33), 33)),
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
      };
    }

    let criteriaMet = 1;
    if (uppercase) criteriaMet++;
    if (special) criteriaMet++;
    if (hasNumber && hasLower) criteriaMet++;

    if (criteriaMet === 1) {
      return {
        label: 'Yếu (Cần thêm chữ hoa & ký tự đặc biệt)',
        level: 35,
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
      };
    }
    if (criteriaMet === 2) {
      return {
        label: 'Trung bình (Nên thêm chữ hoa hoặc ký tự đặc biệt)',
        level: 66,
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
      };
    }
    if (criteriaMet === 3) {
      return {
        label: 'Khá mạnh (Gần đạt chuẩn tối ưu)',
        level: 85,
        color: 'bg-teal-500',
        textColor: 'text-teal-600',
      };
    }

    return {
      label: 'Rất mạnh (Tối ưu Y Tế 256-Bit)',
      level: 100,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    };
  }, [password, passCriteria]);

  const formattedFeePreview = useMemo(() => {
    const val = Number(consultationFee);
    if (!Number.isFinite(val) || val < 0) return '—';
    return `${new Intl.NumberFormat('vi-VN').format(val)} VNĐ / lượt tư vấn`;
  }, [consultationFee]);

  const toggleSpecialty = (slug: string) => {
    setSpecialtySlugs((prev) =>
      prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]
    );
  };

  const resolveSpecialtySlug = (candidates: string[]): string => {
    const match = specialties.find((s) => candidates.includes(s.slug));
    if (match) return match.slug;
    return specialties[0]?.slug || candidates[0];
  };

  const handleDemoPreset = (preset: 'RANDOM' | 'CARDIO' | 'INTERNAL') => {
    setError(null);
    setSuccessMsg(null);

    const suffix = Math.floor(10000 + Math.random() * 89999);
    const phonePrefixes = ['090', '091', '098', '037', '086', '079'];
    const randomPhone = `${phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)]}${Math.floor(1000000 + Math.random() * 8999999)}`;
    const generatedPass = `Doctor@Pass${Math.floor(1000 + Math.random() * 9000)}!`;

    let template = DEMO_RANDOM_DOCTORS[Math.floor(Math.random() * DEMO_RANDOM_DOCTORS.length)];
    if (preset === 'CARDIO') {
      template = {
        academicTitle: 'ThS.BS',
        fullName: 'Nguyễn Minh Quân',
        hospitalAffiliation: 'Bệnh viện Tim Hà Nội',
        department: 'Khoa Tim Mạch Can Thiệp',
        licenseIssuedBy: 'Bộ Y Tế',
        yearsOfExperience: 10,
        consultationFee: 450000,
        specialtyCandidates: ['cardiology', 'tim-mach'],
        bio: 'Chuyên gia tim mạch can thiệp, điều trị tăng huyết áp kháng trị, suy tim và bệnh mạch vành với hơn 10 năm kinh nghiệm lâm sàng.',
      };
    } else if (preset === 'INTERNAL') {
      template = {
        academicTitle: 'BS.CKI',
        fullName: 'Trần Thị Thanh Tâm',
        hospitalAffiliation: 'Bệnh viện Nhân Dân 115',
        department: 'Khoa Nội Tổng Quát',
        licenseIssuedBy: 'Sở Y Tế TP.HCM',
        yearsOfExperience: 8,
        consultationFee: 300000,
        specialtyCandidates: ['general-internal-medicine', 'noi-tong-quat'],
        bio: 'Bác sĩ Nội tổng quát chuyên sâu tầm soát sức khỏe định kỳ, quản lý bệnh mạn tính và đọc kết quả xét nghiệm cận lâm sàng.',
      };
    }

    const emailSlug = template.fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');

    const cchnCode = `${String(suffix).padStart(6, '0')}/${
      template.licenseIssuedBy === 'Bộ Y Tế' ? 'BYT-CCHN' : 'SYT-CCHN'
    }`;
    const pickedSlug = resolveSpecialtySlug(template.specialtyCandidates);

    setAcademicTitle(template.academicTitle);
    setFullName(template.fullName);
    setEmail(`bs.${emailSlug}.${suffix}@gmail.com`);
    setPhone(randomPhone);
    setLicenseNumber(cchnCode);
    setLicenseIssuedBy(template.licenseIssuedBy);
    setCustomLicenseIssuedBy('');
    setSpecialtySlugs([pickedSlug]);
    setHospitalAffiliation(template.hospitalAffiliation);
    setDepartment(template.department);
    setYearsOfExperience(String(template.yearsOfExperience));
    setConsultationFee(String(template.consultationFee));
    setBio(template.bio);
    setPassword(generatedPass);
    setConfirmPassword(generatedPass);
    setAgreeTerms(true);

    setSuccessMsg(
      `Đã điền hồ sơ mẫu (không phải bác sĩ thật): ${template.academicTitle} ${template.fullName} — CCHN ${cchnCode}`
    );
  };

  const registerErrors = useMemo(() => {
    const errs: string[] = [];
    if (!academicTitle.trim()) errs.push('Vui lòng chọn học hàm / học vị.');
    if (!fullName.trim()) errs.push('Họ và tên bác sĩ không được để trống.');
    if (!VN_PHONE_RE.test(phone.replace(/\s/g, ''))) {
      errs.push('Số điện thoại di động không hợp lệ (VD: 0912 345 678).');
    }
    if (!EMAIL_RE.test(email.trim())) errs.push('Email công tác / xác thực không hợp lệ.');
    if (!licenseNumber.trim() || licenseNumber.trim().length < 5) {
      errs.push('Vui lòng nhập số Chứng chỉ hành nghề (CCHN) hợp lệ.');
    }
    if (!effectiveIssuedBy) {
      errs.push('Vui lòng chọn hoặc nhập nơi cấp Chứng chỉ hành nghề.');
    }
    if (!hospitalAffiliation.trim()) {
      errs.push('Vui lòng nhập Bệnh viện hoặc Phòng khám đang công tác.');
    }
    if (specialtySlugs.length === 0) {
      errs.push('Vui lòng chọn ít nhất 1 chuyên khoa đăng ký.');
    }
    const yearsNum = yearsOfExperience.trim() === '' ? NaN : Number(yearsOfExperience);
    if (!Number.isInteger(yearsNum) || yearsNum < 0 || yearsNum > 70) {
      errs.push('Số năm kinh nghiệm phải là số nguyên từ 0 đến 70.');
    }
    const feeNum = consultationFee.trim() === '' ? NaN : Number(consultationFee);
    if (!Number.isFinite(feeNum) || feeNum < 0 || feeNum > 99999999) {
      errs.push('Phí tư vấn dự kiến phải từ 0 đến 99.999.999 VNĐ.');
    }
    if (!passCriteria.length) errs.push('Mật khẩu cần ít nhất 8 ký tự.');
    if (!passCriteria.uppercase) errs.push('Mật khẩu cần ít nhất 1 chữ hoa (A-Z).');
    if (!passCriteria.special) errs.push('Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#...).');
    if (password !== confirmPassword) errs.push('Mật khẩu xác nhận không khớp.');
    if (!agreeTerms) {
      errs.push('Vui lòng xác nhận cam kết tính chính xác của Chứng chỉ hành nghề CCHN.');
    }
    return errs;
  }, [
    academicTitle,
    fullName,
    phone,
    email,
    licenseNumber,
    effectiveIssuedBy,
    hospitalAffiliation,
    specialtySlugs,
    yearsOfExperience,
    consultationFee,
    passCriteria,
    password,
    confirmPassword,
    agreeTerms,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (loading) return;

    const firstError = registerErrors[0];
    if (firstError) {
      setError(firstError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        academicTitle: academicTitle.trim(),
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\s/g, ''),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseIssuedBy: effectiveIssuedBy,
        specialtySlugs,
        hospitalAffiliation: hospitalAffiliation.trim(),
        department: department.trim() || undefined,
        yearsOfExperience: Number(yearsOfExperience),
        consultationFee: Number(consultationFee),
        bio: bio.trim() || undefined,
        password,
      };

      const res = await api.post('/auth/register/doctor', payload);
      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        setSuccessMsg(
          `Đăng ký tài khoản bác sĩ thành công! Email xác thực đã được gửi tới ${user.email}, đồng thời hồ sơ CCHN của bạn đã được đưa vào hàng đợi Quản trị viên thẩm định trực tuyến. Đang chuyển hướng...`
        );
        redirectTimerRef.current = setTimeout(() => {
          navigate('/doctor');
        }, 2500);
      }
    } catch (err: unknown) {
      const details = (err as { response?: { data?: { error?: { details?: Record<string, string> } } } })?.response?.data?.error?.details;
      if (details && typeof details === 'object') {
        setError(Object.values(details).join('; '));
      } else {
        setError(getApiErrorMessage(err, 'Đăng ký bác sĩ không thành công. Vui lòng kiểm tra lại thông tin hồ sơ.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-mono font-bold">LỖI ĐĂNG KÝ BÁC SĨ:</div>
            <div className="text-[12px] text-rose-800 mt-0.5 leading-snug">{error}</div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold leading-snug">{successMsg}</div>
        </div>
      )}

      {ENABLE_DEMO_LOGIN && (
        <div className="p-3 bg-[#F6F3EC] rounded-2xl border border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>Hồ sơ bác sĩ mẫu để demo:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDemoPreset('RANDOM')}
              className="px-3 py-1.5 rounded-xl font-display text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">casino</span>
              <span>🎲 Random Bác Sĩ</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('CARDIO')}
              className="px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold bg-[#FCFBF8] hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
            >
              BS Tim Mạch
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('INTERNAL')}
              className="px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold bg-[#FCFBF8] hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
            >
              BS Nội Tổng Quát
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Định danh & Liên hệ */}
      <div className="space-y-3 p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-bold text-teal-700">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>1. Thông Tin Định Danh &amp; Liên Hệ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Academic Title */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Học hàm / Học vị <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Award className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <select
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              >
                {ACADEMIC_TITLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor Full Name */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Họ và tên Bác sĩ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Minh Quân"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Email công tác / Gmail xác thực <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bs.minhquan@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Số điện thoại di động <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Chứng chỉ hành nghề & Chuyên môn */}
      <div className="space-y-3 p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-bold text-teal-700">
          <BadgeCheck className="w-3.5 h-3.5" />
          <span>2. Chứng Chỉ Hành Nghề (CCHN) &amp; Đơn Vị Công Tác</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* CCHN License Number */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Số Chứng chỉ hành nghề (CCHN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileBadge className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="045812/BYT-CCHN"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* License Issued By */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Nơi cấp CCHN <span className="text-rose-500">*</span>
            </label>
            <select
              value={licenseIssuedBy}
              onChange={(e) => setLicenseIssuedBy(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            >
              {LICENSE_ISSUERS.map((issuer) => (
                <option key={issuer} value={issuer}>
                  {issuer}
                </option>
              ))}
              <option value="OTHER">Cơ quan y tế khác (Nhập tên)</option>
            </select>
            {licenseIssuedBy === 'OTHER' && (
              <input
                type="text"
                required
                maxLength={150}
                value={customLicenseIssuedBy}
                onChange={(e) => setCustomLicenseIssuedBy(e.target.value)}
                placeholder="VD: Sở Y Tế Cần Thơ"
                className="mt-2 w-full px-3 py-2 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            )}
          </div>

          {/* Hospital Affiliation */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Bệnh viện / Phòng khám công tác <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                maxLength={150}
                value={hospitalAffiliation}
                onChange={(e) => setHospitalAffiliation(e.target.value)}
                placeholder="Bệnh viện Đại Học Y Dược TP.HCM"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Khoa / Phòng ban
            </label>
            <input
              type="text"
              maxLength={150}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Khoa Tim Mạch Can Thiệp"
              className="w-full px-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            />
          </div>

          {/* Years of Experience */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Số năm kinh nghiệm <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="number"
                required
                min={0}
                max={70}
                step={1}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Consultation Fee */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Phí tư vấn dự kiến (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Banknote className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="number"
                required
                min={0}
                max={99999999}
                step={10000}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl font-mono text-xs font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
            <span className="font-mono text-[10px] text-slate-500 mt-1 block">{formattedFeePreview}</span>
          </div>
        </div>

        {/* Specialty Multi-select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800">
              Chuyên khoa đăng ký <span className="text-rose-500">*</span>
              <span className="ml-1.5 font-normal normal-case text-slate-500">(chọn ít nhất 1)</span>
            </label>
            <span className="font-mono text-[10px] font-bold text-teal-700">
              {loadingSpecialties ? 'Đang đồng bộ danh mục...' : `Đã chọn: ${specialtySlugs.length} chuyên khoa`}
            </span>
          </div>
          <div
            role="group"
            aria-label="Danh sách chuyên khoa đăng ký"
            className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 bg-[#F6F3EC] border border-slate-300 rounded-2xl"
          >
            {specialties.map((spec) => {
              const isSelected = specialtySlugs.includes(spec.slug);
              return (
                <button
                  key={spec.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => toggleSpecialty(spec.slug)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:text-slate-900'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  <span>{spec.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Tóm tắt chuyên môn / Quá trình công tác
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Mô tả quá trình đào tạo, chứng chỉ sau đại học và lĩnh vực khám điều trị chuyên sâu..."
            className="w-full px-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition resize-y"
          />
        </div>
      </div>

      {/* Section 3: Password & Commitment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Mật khẩu truy cập <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className="w-full pl-9 pr-9 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Xác nhận mật khẩu <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full pl-9 pr-9 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Password Strength Meter */}
      <div className="p-3.5 bg-[#F6F3EC] rounded-2xl border border-slate-300">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-mono font-bold text-slate-700">Độ mạnh mật khẩu bác sĩ:</span>
          <span className={`font-mono font-bold ${passwordStrength.textColor}`}>
            {passwordStrength.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
            style={{ width: `${passwordStrength.level}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[10px]">
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              passCriteria.length
                ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            <span>{passCriteria.length ? '✓' : '○'}</span>
            <span>8+ ký tự</span>
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              passCriteria.uppercase
                ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            <span>{passCriteria.uppercase ? '✓' : '○'}</span>
            <span>Chữ hoa (A-Z)</span>
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              passCriteria.special
                ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            <span>{passCriteria.special ? '✓' : '○'}</span>
            <span>Ký tự đặc biệt (!@#)</span>
          </span>
        </div>
      </div>

      {/* Terms & CCHN Accuracy Commitment */}
      <div className="flex items-start gap-2 pt-1">
        <input
          type="checkbox"
          id="doctor-terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <label htmlFor="doctor-terms" className="text-[11px] text-slate-600 leading-snug cursor-pointer">
          Tôi cam kết số <span className="text-slate-900 font-bold underline">Chứng chỉ hành nghề (CCHN)</span> và thông tin chuyên môn cung cấp là trung thực, đồng thời đồng ý{' '}
          <span className="text-slate-900 font-bold underline">Quy chế bảo mật dữ liệu bệnh nhân e-PHI</span> của MediAssist.
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !agreeTerms}
        title={!agreeTerms ? 'Vui lòng cam kết thông tin CCHN trước khi đăng ký' : undefined}
        className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-display text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span>Đang khởi tạo hồ sơ bác sĩ &amp; gửi email xác thực...</span>
          </>
        ) : (
          <>
            <span>Đăng Ký Tài Khoản Bác Sĩ</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
