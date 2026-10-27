import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Calendar,
  User as UserIcon,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  X
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';
import { ENABLE_DEMO_LOGIN } from '../config/app';
import { todayLocal } from '../utils/date';

gsap.registerPlugin(useGSAP);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const passwordJustReset = searchParams.get('reset') === 'success';
  const { setUser } = useAuthStore();
  const rootRef = useRef<HTMLDivElement>(null);

  // Mode: 'REGISTER' (default per target UI) or 'LOGIN'
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOGIN'>(() =>
    sessionExpired || passwordJustReset ? 'LOGIN' : 'REGISTER'
  );
  const [roleType, setRoleType] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    sessionExpired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(
    passwordJustReset ? 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' : null
  );
  const [isLocked, setIsLocked] = useState(false);

  // Interactive Modals State
  const [ssoModalType, setSsoModalType] = useState<'GOOGLE' | 'VNEID' | null>(null);
  const [complianceModalType, setComplianceModalType] = useState<'PRIVACY' | 'SECURITY' | 'DISCLAIMER' | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.gsap-vault-header', { y: -18, autoAlpha: 0, duration: 0.45, ease: 'power3.out' });
        gsap.from('.gsap-vault-card', { y: 24, autoAlpha: 0, duration: 0.55, ease: 'power3.out', delay: 0.08 });
        gsap.from('.gsap-vault-sidebar', { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.55, ease: 'power3.out', delay: 0.14 });
      });
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  // Password criteria evaluation
  const passCriteria = useMemo(() => {
    return {
      length: regPassword.length >= 8,
      uppercase: /[A-Z]/.test(regPassword),
      special: /[^A-Za-z0-9]/.test(regPassword),
    };
  }, [regPassword]);

  const passwordStrength = useMemo(() => {
    if (!regPassword || regPassword.length === 0) {
      return {
        label: 'Chưa nhập',
        level: 0,
        color: 'bg-slate-200',
        textColor: 'text-slate-400',
      };
    }

    const { length, uppercase, special } = passCriteria;
    const hasNumber = /[0-9]/.test(regPassword);
    const hasLower = /[a-z]/.test(regPassword);

    if (!length) {
      return {
        label: `Không đạt chuẩn (${regPassword.length}/8 ký tự)`,
        level: Math.max(15, Math.min(Math.round((regPassword.length / 8) * 33), 33)),
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
  }, [regPassword, passCriteria]);

  const registerErrors = useMemo(() => {
    const errs: string[] = [];
    if (!regFullName.trim()) errs.push('Họ và tên không được để trống.');
    if (!regDob) errs.push('Vui lòng chọn ngày sinh.');
    else if (regDob > todayLocal()) errs.push('Ngày sinh không được ở tương lai.');
    if (!VN_PHONE_RE.test(regPhone.replace(/\s/g, ''))) errs.push('Số điện thoại di động không hợp lệ (VD: 0912 345 678).');
    if (!EMAIL_RE.test(regEmail.trim())) errs.push('Email không hợp lệ.');
    if (!passCriteria.length) errs.push('Mật khẩu cần ít nhất 8 ký tự.');
    if (!passCriteria.uppercase) errs.push('Mật khẩu cần ít nhất 1 chữ hoa (A-Z).');
    if (!passCriteria.special) errs.push('Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#...).');
    if (regPassword !== regConfirmPassword) errs.push('Mật khẩu xác nhận không khớp.');
    if (!agreeTerms) errs.push('Vui lòng đồng ý với Điều khoản dịch vụ và quy chế xử lý dữ liệu y tế.');
    return errs;
  }, [regFullName, regDob, regPhone, regEmail, passCriteria, regPassword, regConfirmPassword, agreeTerms]);

  const handleRegister = async (e: React.FormEvent) => {
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
      const payload: Record<string, any> = {
        fullName: regFullName.trim(),
        email: regEmail.toLowerCase().trim(),
        password: regPassword,
        phone: regPhone.replace(/\s/g, '') || undefined,
        gender: regGender,
      };

      if (regDob && regDob.trim()) {
        payload.dateOfBirth = regDob.trim();
      }

      const res = await api.post('/auth/register', payload);

      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        setSuccessMsg(
          `Đăng ký thành công! Chúng tôi đã gửi email xác thực tới ${user.email}. Vui lòng xác thực để có thể đặt lịch khám và thanh toán. Đang chuyển hướng...`
        );
        setTimeout(() => {
          navigate('/patient');
        }, 2500);
      }
    } catch (err: any) {
      const errorObj = err.response?.data?.error;
      if (errorObj?.details && typeof errorObj.details === 'object') {
        const msgs = Object.values(errorObj.details).join('; ');
        setError(msgs);
      } else if (errorObj?.message) {
        setError(errorObj.message);
      } else {
        setError('Đăng ký không thành công. Vui lòng kiểm tra lại thông tin gửi lên.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !loginEmail.trim() || !loginPassword) return;
    setError(null);
    setSuccessMsg(null);
    setIsLocked(false);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword,
      });

      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);

        if (user.role === 'ADMIN') {
          navigate('/admin');
        } else if (user.role === 'DOCTOR') {
          navigate('/doctor');
        } else {
          navigate('/patient');
        }
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      if (errCode === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const FIRST_NAMES_MALE = [
    'Nguyễn Văn An', 'Trần Quốc Bảo', 'Lê Hải Đăng', 'Phạm Minh Đức', 'Hoàng Gia Huy',
    'Vũ Đức Toàn', 'Đặng Minh Khôi', 'Bùi Quang Huy', 'Đỗ Thành Long', 'Ngô Tuấn Kiệt'
  ];
  const FIRST_NAMES_FEMALE = [
    'Trần Thị Mai Hương', 'Nguyễn Thu Trang', 'Lê Bích Thảo', 'Phạm Quỳnh Anh', 'Hoàng Bảo Ngọc',
    'Vũ Hải Yến', 'Đặng Kim Ngân', 'Bùi Mỹ Linh', 'Đỗ Thanh Hà', 'Nguyễn Phương Thảo'
  ];

  const handleRandomFill = (profileType: 'RANDOM' | 'SENIOR' | 'YOUNG' = 'RANDOM') => {
    setError(null);
    setSuccessMsg(null);

    const isMale = Math.random() > 0.5;
    const namePool = isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
    const fullName = namePool[Math.floor(Math.random() * namePool.length)];
    const gender = isMale ? 'MALE' : 'FEMALE';

    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const emailPrefix = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');
    const email = `${emailPrefix}.${randomSuffix}@gmail.com`;

    const phonePrefixes = ['090', '091', '098', '037', '038', '086', '079'];
    const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const phone = `${randomPrefix}${Math.floor(Math.random() * 9000000 + 1000000)}`;

    let birthYear: number;
    if (profileType === 'SENIOR') {
      birthYear = 1950 + Math.floor(Math.random() * 15);
    } else if (profileType === 'YOUNG') {
      birthYear = 1995 + Math.floor(Math.random() * 10);
    } else {
      birthYear = 1975 + Math.floor(Math.random() * 30);
    }
    const birthMonth = String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0');
    const dob = `${birthYear}-${birthMonth}-${birthDay}`;

    const password = `Medi@Pass${Math.floor(Math.random() * 9000 + 1000)}!`;

    setRegFullName(fullName);
    setRegGender(gender);
    setRegEmail(email);
    setRegPhone(phone);
    setRegDob(dob);
    setRegPassword(password);
    setRegConfirmPassword(password);
    setAgreeTerms(true);

    setSuccessMsg(`Đã điền dữ liệu mẫu (không phải người thật): ${fullName} (${gender === 'MALE' ? 'Nam' : 'Nữ'}, sinh năm ${birthYear})`);
  };

  const handleQuickPreset = (presetEmail: string, presetPass: string) => {
    setLoginEmail(presetEmail);
    setLoginPassword(presetPass);
    setError(null);
    setIsLocked(false);
  };

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[#F6F3EC] bg-atelier-dots text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-600 selection:text-white"
    >
      {/* ==================== 1. TOP ARCHITECTURAL HEADER ==================== */}
      <header className="gsap-vault-header w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.04)] px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-display font-bold text-base shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform duration-200">
              M+
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-display font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                MediAssist <span className="font-serif italic font-normal text-teal-600">Atelier</span>
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">
                Clinical Triage &amp; Telehealth
              </span>
            </div>
          </Link>

          {/* Right Badges & Home Link */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-teal-50 text-teal-800 border border-teal-200 px-3.5 py-1.5 rounded-full font-mono text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span className="tracking-wider">HIPAA COMPLIANT VAULT</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-display text-xs font-bold text-slate-700 bg-[#FCFBF8] hover:bg-slate-100 border border-slate-200/90 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== 2. MAIN BIO-IDENTITY VAULT CONTAINER ==================== */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==================== LEFT COLUMN: NEO-SWISS BIO-VAULT FORM CARD ==================== */}
          <div className="gsap-vault-card lg:col-span-7 bg-white rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] border border-slate-200/90 p-6 sm:p-8">
            {/* Top Security Indicators */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pb-3 border-b border-dashed border-slate-200">
              <div className="flex items-center gap-2 font-mono uppercase tracking-widest text-[11px] text-teal-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <span>Cổng Khởi Tạo Danh Tính Y Tế</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-bold">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>Mã hóa TLS 1.3</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 mb-1.5">
              {activeTab === 'REGISTER' ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Hệ Thống'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              {activeTab === 'REGISTER'
                ? 'Hệ thống AI phân tích hồ sơ bệnh án tự động, hỗ trợ phân tầng rủi ro lâm sàng và điều hướng bác sĩ chính xác.'
                : 'Truy cập hồ sơ bệnh án điện tử EMR cá nhân hóa, kết quả phân tích AI và lịch khám bác sĩ chuyên khoa.'}
            </p>

            {/* Role Switcher Pills */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F6F3EC] rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setRoleType('PATIENT')}
                className={`py-2.5 px-3 rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleType === 'PATIENT'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-white" />
                <span>Dành Cho Bệnh Nhân</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleType('DOCTOR')}
                className={`py-2.5 px-3 rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleType === 'DOCTOR'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-white" />
                <span>Bác Sĩ &amp; Phòng Khám</span>
              </button>
            </div>

            {roleType === 'DOCTOR' && (
              <div className="mb-4 p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Dành Cho Y Bác Sĩ CCHN:</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Để đăng ký tài khoản Bác sĩ, vui lòng gửi số Giấy phép CCHN về <span className="font-semibold underline">support@mediassist.vn</span> hoặc liên hệ Quản trị viên để thẩm định chứng chỉ.
                  </div>
                </div>
              </div>
            )}

            {/* Quick External Actions — Google OAuth2 + VNeID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <GoogleLoginButton
                label="Tiếp tục với Google"
                className="py-2.5 px-3 rounded-xl text-xs shadow-2xs"
              />

              <button
                type="button"
                onClick={() => setSsoModalType('VNEID')}
                className="py-2.5 px-3 rounded-xl border border-slate-300 bg-[#F6F3EC] hover:bg-slate-200/70 transition font-display text-xs font-bold text-slate-900 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-600">badge</span>
                <span>Liên kết CCCD / VNeID</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-3 font-mono text-[10px] font-bold tracking-widest uppercase text-slate-500">
                {activeTab === 'REGISTER' ? 'Hoặc điền thông tin y tế' : 'Hoặc đăng nhập bằng tài khoản'}
              </span>
              <div className="flex-grow border-t border-slate-300"></div>
            </div>

            {/* Alert Message Box */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-mono font-bold">LỖI XÁC THỰC:</div>
                  <div className="text-[12px] text-rose-800 mt-0.5 leading-snug">{error}</div>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-bold">{successMsg}</div>
              </div>
            )}

            {/* ==================== FORM: REGISTER MODE ==================== */}
            {activeTab === 'REGISTER' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                {ENABLE_DEMO_LOGIN && (
                  <div className="p-3 bg-[#F6F3EC] rounded-2xl border border-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                      <span>Dữ liệu mẫu để demo:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRandomFill('RANDOM')}
                        className="px-3 py-1.5 rounded-xl font-display text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">casino</span>
                        <span>🎲 Random Bệnh Nhân</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRandomFill('SENIOR')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold bg-[#FCFBF8] hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
                      >
                        Người Cao Tuổi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRandomFill('YOUNG')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold bg-[#FCFBF8] hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
                      >
                        Thanh Niên
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                      Họ và tên bệnh nhân <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 mt-1 block">Khớp đúng với BHYT hoặc CCCD</span>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                      Ngày sinh <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="date"
                        required
                        max={todayLocal()}
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 mt-1 block">Dùng để phân chuẩn chỉ số sinh hóa</span>
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
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0912 345 678"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                      Email nhận phân tích <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nguyena@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                      Mật khẩu truy cập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full pl-9 pr-9 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full pl-9 pr-9 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Gender Selection */}
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-4 py-0.5">
                    <span className="font-mono text-[11px] uppercase font-bold text-slate-800">Giới tính:</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="regGender"
                        value="MALE"
                        checked={regGender === 'MALE'}
                        onChange={() => setRegGender('MALE')}
                        className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>Nam</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="regGender"
                        value="FEMALE"
                        checked={regGender === 'FEMALE'}
                        onChange={() => setRegGender('FEMALE')}
                        className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>Nữ</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="regGender"
                        value="OTHER"
                        checked={regGender === 'OTHER'}
                        onChange={() => setRegGender('OTHER')}
                        className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>Khác</span>
                    </label>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                <div className="p-3.5 bg-[#F6F3EC] rounded-2xl border border-slate-300">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-mono font-bold text-slate-700">Độ mạnh mật khẩu y tế:</span>
                    <span className={`font-mono font-bold ${passwordStrength.textColor}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.level}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[10px]">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.length
                        ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                        : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      <span>{passCriteria.length ? '✓' : '○'}</span>
                      <span>8+ ký tự</span>
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.uppercase
                        ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                        : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      <span>{passCriteria.uppercase ? '✓' : '○'}</span>
                      <span>Chữ hoa (A-Z)</span>
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.special
                        ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                        : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      <span>{passCriteria.special ? '✓' : '○'}</span>
                      <span>Ký tự đặc biệt (!@#)</span>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-teal-600">badge</span>
                  Bạn có thể bổ sung số BHYT / CCCD trong mục "Hồ sơ y tế" sau khi đăng ký.
                </p>

                {/* Terms Agreement */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-600 leading-snug cursor-pointer">
                    Tôi đồng ý với <span className="text-slate-900 font-bold underline">Điều khoản Dịch vụ</span> và chấp thuận quy chế xử lý <span className="text-slate-900 font-bold underline">Dữ liệu Y tế e-PHI chuẩn HIPAA / Bộ Y Tế</span>. Dữ liệu chỉ phục vụ mục đích hội chẩn lâm sàng.
                  </label>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !agreeTerms}
                  title={!agreeTerms ? 'Cần đồng ý điều khoản trước khi tạo tài khoản' : undefined}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-display text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Đang khởi tạo danh tính y tế...</span>
                    </>
                  ) : (
                    <>
                      <span>Tạo Tài Khoản</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ==================== FORM: LOGIN MODE ==================== */
              <form onSubmit={handleLogin} className="space-y-4">
                {ENABLE_DEMO_LOGIN && (
                  <div className="p-3.5 bg-[#F6F3EC] rounded-2xl border border-slate-300" data-testid="demo-presets">
                    <div className="font-mono text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tài khoản demo (dữ liệu mẫu):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('doctor@mediassist.local', 'Doctor@SecurePass2026!')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Stethoscope className="w-3 h-3 text-teal-100" />
                        Bác Sĩ (TS.BS Nguyễn Văn An)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('dr.tuan@mediassist.local', 'Doctor@SecurePass2026!')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-800 transition cursor-pointer shadow-2xs"
                      >
                        Bác Sĩ (BS.CKII Phạm Quốc Tuấn)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('dr.huong@mediassist.local', 'Doctor@SecurePass2026!')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-800 transition cursor-pointer shadow-2xs"
                      >
                        Bác Sĩ (ThS.BS Mai Hương)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('patient@mediassist.local', 'Patient@SecurePass2026!')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-800 transition cursor-pointer shadow-2xs"
                      >
                        Bệnh Nhân (Trần Thị Bình)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('admin@mediassist.local', 'Admin@SecurePass2026!')}
                        className="px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-800 transition cursor-pointer shadow-2xs"
                      >
                        Quản Trị Viên (Admin)
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@mediassist.local"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="font-mono text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Mật khẩu tài khoản"
                      className="w-full pl-9 pr-9 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLocked && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                    Hệ thống tạm thời khóa đăng nhập do phát hiện thử nghiệm sai nhiều lần. Vui lòng chờ 15 phút hoặc liên hệ hỗ trợ.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !loginEmail.trim() || !loginPassword}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-display text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Đang xác thực thông tin...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng Nhập Vào Hệ Thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Switch Mode Footer Link */}
            <div className="mt-5 pt-4 border-t border-dashed border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <span>
                {activeTab === 'REGISTER'
                  ? 'Đã có tài khoản MediAssist?'
                  : 'Chưa có tài khoản MediAssist?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(activeTab === 'REGISTER' ? 'LOGIN' : 'REGISTER');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-display font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{activeTab === 'REGISTER' ? 'Đăng nhập hệ thống ngay' : 'Đăng ký tài khoản bệnh nhân'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN: LUMINOUS BIO-CARE OBSERVATORY SIDEBAR ==================== */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-5">
            {/* Box 1: Luminous Bio-Scanner Card */}
            <div className="gsap-vault-sidebar rounded-3xl p-6 bg-white text-slate-900 shadow-sm border border-slate-200/90">
              <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-mono font-bold text-[10px] tracking-widest uppercase border border-teal-200 mb-3">
                Ưu Đãi Đặc Quyền Bệnh Nhân Mới
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                Miễn phí phân tích báo cáo PDF xét nghiệm đầu tiên
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Chỉ cần tải lên file chụp hoặc file PDF kết quả máu, CT/MRI, nước tiểu. Hệ thống bóc tách 45+ chỉ số sinh hóa và chỉ điểm bất thường trong 30 giây.
              </p>

              {/* Sample OCR Interactive Result Box */}
              <div className="p-3.5 bg-[#FCFBF8] rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[11px] pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>KQ_SinhHoa_Mau_2025.pdf</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Hoàn tất OCR 100%
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                    ● HbA1c: 7.2% (Tăng cao)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-medium">
                    ● Creatinine: 82 µmol/L (Bình thường)
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-1.5 font-mono text-[11px] text-teal-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>98% khớp Chuyên khoa Nội Tiết</span>
                </div>
              </div>
            </div>

            {/* Box 2: Doctor Network Card */}
            <div className="gsap-vault-sidebar bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-xl font-bold text-slate-900 tracking-tight">1.200+ Bác Sĩ</div>
                  <div className="font-mono text-xs text-slate-500 font-medium">Sẵn sàng hội chẩn trực tuyến</div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-[22px] text-teal-600">local_hospital</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 pb-2 border-b border-dashed border-slate-200">
                <div className="flex -space-x-2 overflow-hidden">
                  <img
                    alt="Doctor 1"
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9dNw07t-qFJgqPYpgTRow1U8l_j39x3P-q9tb_n0VzsrsEN9vLwalX_fEWLBV_yVhCIdggIsmpbL4yOTxmNgt7tvsvspQCq0JIBYMidO6EOOpxxdiQuEXr2x5T6vpHCCKF_kf6mEPGFHm5vNI-a1LpmGs5DByOpQYJfwQVYMvhNv84Rr4vR26Lw7v6EXNA4YHb26fSzZNCqE2Eau4B4mgcmDTtSVXgBYAVj1I9IkSCv4ir_SzFe9m7A"
                  />
                  <img
                    alt="Doctor 2"
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9cJehecZXYTwfOiCCLiPD-OUTDDjCmmHEziK1Uv0tNPqNrHoLh7svXrLl27ip7z5If6dVLpfNVYWjp2sEBO4pFqZNpky6Bezg8HcpfTl5XzS8TMBG0kNgPvUdHyl3uSm450LngbLp4T9ZWuEiYjL6jDVOpU_RuhvunIxvtafIiK6qHJ6ORo3b4asi05dvoiW7RDKDNAaR-SDUPP6Qoef7cU5a9dqyeUdDcSwBTtjnE1Og1lflk3TUuw"
                  />
                  <img
                    alt="Doctor 3"
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9uyDi1trgqaS24jm6kY_UkDTY6dgNsu-F4UsPKYAsoAAieXS1tOyTq3kLEe7HPhu5sSbTPpZqsg_tGjKkT1iRtXg-X9pIJa4xsr_LxwDcTp6T9pt0MY4pylx2xdIMW34AQuegw3o0a7hMqtBlOV1V5BSa8Z5aApIuka3NxhlFL1tulF16UgD4tq84WiOZNWUHgWhQuRC1ZyPZApHgqUi9HEHS235KSeEOtqYdxk9xHCa1kuT_KamI5g"
                  />
                </div>
                <div className="text-[11px] leading-tight text-slate-600">
                  <div className="font-mono font-bold text-slate-900">
                    <span className="text-amber-500">★ 4.98 / 5.0</span> (18.400+ đánh giá xác thực)
                  </div>
                  <span className="text-slate-500">Từ các bệnh viện tuyến trung ương</span>
                </div>
              </div>

              <ul className="text-xs text-slate-700 space-y-2.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>Không chuyển dữ liệu cho bên thứ ba vì mục đích quảng cáo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>Lưu trữ hồ sơ sức khỏe trọn đời, đồng bộ đa nền tảng</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>Cảnh báo cờ đỏ (Red-flag) lập tức khi chỉ số cận lâm sàng nguy cấp</span>
                </li>
              </ul>
            </div>

            {/* Box 3: Security Standard Notice */}
            <div className="gsap-vault-sidebar bg-white border border-slate-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-display text-xs font-bold text-slate-900">Tiêu Chuẩn Bảo Mật Y Tế Cấp 4</div>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                  Tuân thủ Thông tư 46/2018/TT-BYT về bệnh án điện tử và quy định bảo vệ dữ liệu cá nhân Nghị định 13/2023/NĐ-CP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== 3. FOOTER ==================== */}
      <footer className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-slate-600">
        <div>
          © 2026 MediAssist — Đồ án tốt nghiệp. Dữ liệu demo không phải hồ sơ bệnh nhân thật.
        </div>
        <div className="flex items-center gap-4 font-bold text-slate-800">
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              setComplianceModalType('PRIVACY');
            }}
            className="hover:underline cursor-pointer"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="#security"
            onClick={(e) => {
              e.preventDefault();
              setComplianceModalType('SECURITY');
            }}
            className="hover:underline cursor-pointer"
          >
            Security Protocol
          </a>
          <span>•</span>
          <a
            href="#disclaimer"
            onClick={(e) => {
              e.preventDefault();
              setComplianceModalType('DISCLAIMER');
            }}
            className="hover:underline cursor-pointer"
          >
            Medical Disclaimer
          </a>
        </div>
      </footer>

      {/* SSO Federation Modal */}
      {ssoModalType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {ssoModalType === 'GOOGLE' ? 'Định Danh Google Workspace SSO' : 'Định Danh Y Tế Quốc Gia VNeID'}
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500">Kiến trúc xác thực liên đoàn OpenID Connect &amp; CCCD</p>
                </div>
              </div>
              <button
                onClick={() => setSsoModalType(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {ssoModalType === 'GOOGLE' ? (
                <>
                  <p>
                    Hệ thống <strong>MediAssist-AI</strong> đã xây dựng sẵn hạ tầng lọc bảo mật Spring Security JWT tương thích với chuẩn <strong>Google OAuth 2.0 / OpenID Connect</strong>.
                  </p>
                  <div className="p-3.5 bg-[#FCFBF8] border border-slate-200/90 rounded-2xl space-y-1 text-[11px] text-teal-800 font-mono">
                    <p>• Endpoint Whitelist: /api/v1/auth/google/**</p>
                    <p>• Protocol: OAuth 2.0 Auth Code Flow with PKCE</p>
                    <p>• Security Layer: Dual-Transport JWT (Bearer + HttpOnly Cookie)</p>
                  </div>
                  <p>
                    Để sử dụng ngay trong buổi bảo vệ Đồ Án, bạn có thể đăng nhập tức thì bằng các tài khoản kiểm thử đã cấp phát sẵn (Admin, Doctor, Patient) trên trang đăng nhập.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Hệ sinh thái liên thông căn cước công dân gắn chip <strong>VNeID Cấp độ 2</strong> tuân thủ Đề án 06/CP của Chính phủ về phát triển ứng dụng dữ liệu dân cư, định danh và xác thực điện tử phục vụ chuyển đổi số y tế quốc gia.
                  </p>
                  <div className="p-3.5 bg-[#FCFBF8] border border-slate-200/90 rounded-2xl space-y-1 text-[11px] text-teal-800 font-mono">
                    <p>• Tích hợp: Mã định danh công dân 12 số (Citizen ID)</p>
                    <p>• Đồng bộ: Thẻ Bảo hiểm Y tế (BHYT) &amp; Sổ Sức Khỏe Điện Tử</p>
                    <p>• Tuân thủ: Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</p>
                  </div>
                  <p>
                    Khi vào giao diện Bệnh nhân, bạn có thể cập nhật trực tiếp số CCCD và Mã BHYT trong phần "Hồ sơ sức khỏe cá nhân".
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSsoModalType(null)}
                className="px-5 py-2.5 font-display text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 rounded-xl transition cursor-pointer"
              >
                Đã Hiểu &amp; Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance & Policy Modal */}
      {complianceModalType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {complianceModalType === 'PRIVACY'
                      ? 'Chính Sách Bảo Mật Dữ Liệu Y Tế'
                      : complianceModalType === 'SECURITY'
                      ? 'Giao Thức An Toàn & Mã Hóa'
                      : 'Quy Chuẩn & Miễn Trừ Trách Nhiệm'}
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500">Chuẩn bảo mật y tế Quốc tế &amp; Pháp lý Việt Nam</p>
                </div>
              </div>
              <button
                onClick={() => setComplianceModalType(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto pr-1">
              {complianceModalType === 'PRIVACY' && (
                <>
                  <p className="font-bold text-slate-900">1. Tuân thủ HIPAA (Mỹ) &amp; Nghị định 13/2023/NĐ-CP (Việt Nam):</p>
                  <p>Mọi hồ sơ sức khỏe điện tử (e-PHI) của người bệnh bao gồm tiền sử bệnh, kết quả xét nghiệm sinh hóa, hình ảnh chẩn đoán và đơn thuốc đều được phân tách biệt lập, mã hóa dữ liệu khi nghỉ (Data-at-Rest) bằng thuật toán AES-256 GCM.</p>
                  <p className="font-bold text-slate-900 mt-2">2. Kiểm soát quyền riêng tư:</p>
                  <p>Người bệnh có toàn quyền xem, cập nhật, xuất bản sao hoặc yêu cầu ẩn hồ sơ bệnh án cá nhân trên nền tảng bất cứ lúc nào.</p>
                </>
              )}

              {complianceModalType === 'SECURITY' && (
                <>
                  <p className="font-bold text-slate-900">1. Mã hóa đường truyền &amp; Lưu trữ mật khẩu:</p>
                  <p>Dữ liệu truyền tải giữa Trình duyệt và Máy chủ được bảo vệ bằng TLS 1.3 với chứng chỉ mã hóa 256-Bit SSL. Mật khẩu người dùng được băm một chiều bằng chuẩn BCrypt 12 rounds kèm salt chống Rainbow Table.</p>
                  <p className="font-bold text-slate-900 mt-2">2. Rào chắn chống tấn công Brute-force &amp; Rate Limit:</p>
                  <p>Cơ chế chống dò quét tự động khóa tài khoản tạm thời trong 15 phút nếu nhập sai mật khẩu quá 5 lần liên tiếp. Bộ nhớ đệm Two-Layer Cache L1/L2 ngăn chặn quá tải DB.</p>
                </>
              )}

              {complianceModalType === 'DISCLAIMER' && (
                <>
                  <p className="font-bold text-slate-900">1. Vai trò hỗ trợ quyết định lâm sàng (CDSS):</p>
                  <p>MediAssist-AI là công cụ hỗ trợ phân luồng thông minh (AI Triage) và trích xuất hồ sơ bệnh án. Đề xuất của AI mang tính tham vấn định hướng chuyên khoa, tuyệt đối <strong>không thay thế chẩn đoán độc lập và quyết định điều trị của Bác sĩ có Chứng chỉ hành nghề (CCHN)</strong>.</p>
                  <p className="font-bold text-slate-900 mt-2">2. Rào chắn Cấp cứu Red-Flag:</p>
                  <p>Hệ thống tự động phát hiện các từ khóa cấp cứu nguy kịch (nhồi máu cơ tim, đột quỵ FAST, sốc phản vệ, khó thở cấp) trong dưới 5ms và kích hoạt cảnh báo gọi cấp cứu 115 ngay lập tức mà không chờ gọi LLM.</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setComplianceModalType(null)}
                className="px-5 py-2.5 font-display text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 rounded-xl transition cursor-pointer"
              >
                Đã Rõ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
