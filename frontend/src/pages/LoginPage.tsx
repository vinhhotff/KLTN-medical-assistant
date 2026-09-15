import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  // Mode: 'REGISTER' (default per target UI) or 'LOGIN'
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [roleType, setRoleType] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regBhyt, setRegBhyt] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Login state
  const [loginEmail, setLoginEmail] = useState('patient.nam@mediassist.local');
  const [loginPassword, setLoginPassword] = useState('Patient@SecurePass2026!');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Interactive Modals State (Eliminate all alerts)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [ssoModalType, setSsoModalType] = useState<'GOOGLE' | 'VNEID' | null>(null);
  const [complianceModalType, setComplianceModalType] = useState<'PRIVACY' | 'SECURITY' | 'DISCLAIMER' | null>(null);

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

    // If under 8 characters, it is strictly NOT compliant with HIPAA / EMR standards
    if (!length) {
      return {
        label: `Không đạt chuẩn (${regPassword.length}/8 ký tự)`,
        level: Math.max(15, Math.min(Math.round((regPassword.length / 8) * 33), 33)),
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
      };
    }

    // Length is >= 8 characters
    let criteriaMet = 1; // has length >= 8
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

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side validation
    if (!regFullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Email không được để trống.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Mật khẩu bắt buộc phải có ít nhất 8 ký tự theo tiêu chuẩn bảo mật y tế.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }
    if (!agreeTerms) {
      setError('Vui lòng đồng ý với Điều khoản Dịch vụ và Quy chế Dữ liệu Y tế e-PHI.');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        fullName: regFullName.trim(),
        email: regEmail.toLowerCase().trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
        gender: regGender,
        address: 'Việt Nam',
      };

      if (regDob && regDob.trim()) {
        payload.dateOfBirth = regDob.trim();
      }

      const res = await api.post('/auth/register', payload);

      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/patient');
        }, 800);
      }
    } catch (err: any) {
      const errorObj = err.response?.data?.error;
      if (errorObj?.details && typeof errorObj.details === 'object') {
        // Backend validation errors map: {"password": "...", "email": "..."}
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

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Unique email using timestamp suffix to guarantee zero duplicate conflict errors
    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const emailPrefix = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');
    const email = `${emailPrefix}.${randomSuffix}@gmail.com`;

    // Valid Vietnam mobile numbers (09x, 03x, 08x, 07x)
    const phonePrefixes = ['090', '091', '098', '037', '038', '086', '079'];
    const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const phone = `${randomPrefix}${Math.floor(Math.random() * 9000000 + 1000000)}`;

    // Birth date calculation
    let birthYear: number;
    if (profileType === 'SENIOR') {
      birthYear = 1950 + Math.floor(Math.random() * 15); // 1950 - 1964
    } else if (profileType === 'YOUNG') {
      birthYear = 1995 + Math.floor(Math.random() * 10); // 1995 - 2004
    } else {
      birthYear = 1975 + Math.floor(Math.random() * 30); // 1975 - 2004
    }
    const birthMonth = String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0');
    const dob = `${birthYear}-${birthMonth}-${birthDay}`;

    // Valid strong password >= 8 characters with upper, lower, number, special char
    const password = `Medi@Pass${Math.floor(Math.random() * 9000 + 1000)}!`;

    // Sample BHYT / CCCD number
    const bhyt = `GD479${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

    setRegFullName(fullName);
    setRegGender(gender);
    setRegEmail(email);
    setRegPhone(phone);
    setRegDob(dob);
    setRegPassword(password);
    setRegConfirmPassword(password);
    setRegBhyt(bhyt);
    setAgreeTerms(true);

    setSuccessMsg(`✓ Đã tạo ngẫu nhiên hồ sơ: ${fullName} (${gender === 'MALE' ? 'Nam' : 'Nữ'}, sinh năm ${birthYear})`);
  };

  const handleQuickPreset = (presetEmail: string, presetPass: string) => {
    setLoginEmail(presetEmail);
    setLoginPassword(presetPass);
    setError(null);
    setIsLocked(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white">
      
      {/* ==================== 1. TOP HEADER ==================== */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">add</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              MedConnect AI
            </span>
            <span className="text-[10px] font-bold text-teal-700 tracking-wider uppercase -mt-0.5">
              Clinical Triage &amp; Telehealth
            </span>
          </div>
        </Link>

        {/* Right Badges & Home Link */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-200/80 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold border border-slate-300/60">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] tracking-wide">HIPAA COMPLIANT VAULT</span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* ==================== 2. MAIN CONTAINER ==================== */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==================== LEFT COLUMN: MAIN AUTH FORM CARD ==================== */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8">
            
            {/* Top Security Indicators */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-teal-700">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>Cổng Khởi Tạo Danh Tính Y Tế</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Mã hóa TLS 1.3</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 mb-1.5">
              {activeTab === 'REGISTER' ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Hệ Thống'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
              {activeTab === 'REGISTER'
                ? 'Hệ thống AI phân tích hồ sơ bệnh án tự động, hỗ trợ phân tầng rủi ro lâm sàng và điều hướng bác sĩ chính xác.'
                : 'Truy cập hồ sơ bệnh án điện tử EMR cá nhân hóa, kết quả phân tích AI và lịch khám bác sĩ chuyên khoa.'}
            </p>

            {/* Role Switcher Pills */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setRoleType('PATIENT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleType === 'PATIENT'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-xs'
                    : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100/60 border border-transparent'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-teal-600" />
                <span>Dành Cho Bệnh Nhân</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleType('DOCTOR')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleType === 'DOCTOR'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-xs'
                    : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100/60 border border-transparent'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Bác Sĩ &amp; Phòng Khám</span>
              </button>
            </div>

            {/* Doctor Notification notice if doctor tab clicked */}
            {roleType === 'DOCTOR' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
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
              {/*
               * GoogleLoginButton: redirect TRUC TIEP den backend OAuth2 endpoint.
               * KHONG goi qua Axios — OAuth2 flow yeu cau browser redirect thuc su.
               * Backend set HttpOnly Cookie sau khi Google xac thuc, sau do redirect
               * ve /oauth2/callback tren Frontend.
               */}
              <GoogleLoginButton
                label="Tiếp tục với Google"
                className="py-2.5 px-3 rounded-xl text-xs shadow-2xs"
              />

              <button
                type="button"
                onClick={() => setSsoModalType('VNEID')}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-600">badge</span>
                <span>Liên kết CCCD / VNeID</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                {activeTab === 'REGISTER' ? 'Hoặc điền thông tin y tế' : 'Hoặc đăng nhập bằng tài khoản'}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Alert Message Box */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">LỖI XÁC THỰC:</div>
                  <div className="text-[12px] text-rose-800 mt-0.5 leading-snug">{error}</div>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-bold">{successMsg}</div>
              </div>
            )}

            {/* ==================== FORM: REGISTER MODE ==================== */}
            {activeTab === 'REGISTER' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* Tech Lead Quick Fill Bar (Randomized Data) */}
                <div className="p-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-sky-50 rounded-xl border border-teal-200/80 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                    <span>Điền nhanh Test (Random 100% hợp lệ):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRandomFill('RANDOM')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span className="material-symbols-outlined text-[15px]">casino</span>
                      <span>🎲 Random Bệnh Nhân</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRandomFill('SENIOR')}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                    >
                      Người Cao Tuổi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRandomFill('YOUNG')}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                    >
                      Thanh Niên
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên bệnh nhân <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Khớp đúng với BHYT hoặc CCCD</span>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày sinh <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Dùng để phân chuẩn chỉ số sinh hóa</span>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại di động <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0912 345 678"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email nhận phân tích <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nguyena@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mật khẩu truy cập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {/* Gender Selection */}
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-4 py-0.5">
                    <span className="text-xs font-bold text-slate-700">Giới tính:</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
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
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
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
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
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
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-semibold text-slate-600">Độ mạnh mật khẩu y tế:</span>
                    <span className={`font-bold ${passwordStrength.textColor}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.level}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px]">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.length
                        ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span>{passCriteria.length ? '✓' : '○'}</span>
                      <span>8+ ký tự</span>
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.uppercase
                        ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span>{passCriteria.uppercase ? '✓' : '○'}</span>
                      <span>Chữ hoa (A-Z)</span>
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      passCriteria.special
                        ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span>{passCriteria.special ? '✓' : '○'}</span>
                      <span>Ký tự đặc biệt (!@#)</span>
                    </span>
                  </div>
                </div>

                {/* Optional Health ID Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-teal-600">badge</span>
                      <span>Mã thẻ BHYT hoặc Số Căn cước (CCCD / VNeID)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">Tùy chọn</span>
                  </div>
                  <input
                    type="text"
                    value={regBhyt}
                    onChange={(e) => setRegBhyt(e.target.value)}
                    placeholder="Ví dụ: GD4790123456789 hoặc 001201012345"
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                  />
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-teal-600">info</span>
                    <span>Giúp tự động đồng bộ kết quả xét nghiệm quá khứ từ các bệnh viện đối tác.</span>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-500 leading-snug cursor-pointer">
                    Tôi đồng ý với <span className="text-teal-700 font-bold underline">Điều khoản Dịch vụ</span> và chấp thuận quy chế xử lý <span className="text-teal-700 font-bold underline">Dữ liệu Y tế e-PHI chuẩn HIPAA / Bộ Y Tế</span>. Dữ liệu chỉ phục vụ mục đích hội chẩn lâm sàng.
                  </label>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Đang khởi tạo danh tính y tế...</span>
                    </>
                  ) : (
                    <>
                      <span>Tạo Tài Khoản &amp; Tải Lên Hồ Sơ Đầu Tiên</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ==================== FORM: LOGIN MODE ==================== */
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Tech Lead Presets Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tài khoản kiểm thử nhanh (1-Click Fill):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('admin@mediassist.local', 'Admin@SecurePass2026!')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Quản Trị Viên (Admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('dr.an@mediassist.local', 'Doctor@SecurePass2026!')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Bác Sĩ (GS.TS Nguyễn Văn An)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('patient.nam@mediassist.local', 'Patient@SecurePass2026!')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Bệnh Nhân (Trần Văn Nam)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@mediassist.local"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        setForgotEmail(loginEmail || '');
                        setForgotSubmitted(false);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-teal-700 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Mật khẩu tài khoản"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLocked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    Hệ thống tạm thời khóa đăng nhập do phát hiện thử nghiệm sai nhiều lần. Vui lòng chờ 15 phút hoặc liên hệ hỗ trợ.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {activeTab === 'REGISTER'
                  ? 'Đã có tài khoản MedConnect AI?'
                  : 'Chưa có tài khoản MedConnect AI?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(activeTab === 'REGISTER' ? 'LOGIN' : 'REGISTER');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{activeTab === 'REGISTER' ? 'Đăng nhập hệ thống ngay' : 'Đăng ký tài khoản bệnh nhân'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* ==================== RIGHT COLUMN: CLINICAL TRUST & OCR BENEFITS SIDEBAR ==================== */}
          {/* IMPORTANT: Hidden on mobile screens (hidden lg:flex), perfectly satisfying user request:
              "hiện nếu ở điện thoại thì response chỉ đúng phần form đăng kí thôi chứ không có phải như hiện tại" */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-5">
            
            {/* Box 1: Special Patient Privilege (Dark Teal/Navy Medical Card) */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#0f172a] text-white shadow-xl shadow-teal-950/20 border border-teal-700/30">
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] tracking-wider uppercase border border-emerald-400/30 mb-3">
                Ưu Đãi Đặc Quyền Bệnh Nhân Mới
              </span>
              <h2 className="text-lg font-black text-white tracking-tight leading-snug mb-2">
                Miễn phí phân tích báo cáo PDF xét nghiệm đầu tiên
              </h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
                Chỉ cần tải lên file chụp hoặc file PDF kết quả máu, CT/MRI, nước tiểu. Hệ thống bóc tách 45+ chỉ số sinh hóa và chỉ điểm bất thường trong 30 giây.
              </p>

              {/* Sample OCR Interactive Result Box */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-teal-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>KQ_SinhHoa_Mau_2025.pdf</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Hoàn tất OCR 100%
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                    ● HbA1c: 7.2% (Tăng cao)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    ● Creatinine: 82 µmol/L (Bình thường)
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-teal-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>98% khớp Chuyên khoa Nội Tiết</span>
                </div>
              </div>
            </div>

            {/* Box 2: Doctor Network Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">1.200+ Bác Sĩ</div>
                  <div className="text-xs text-slate-500 font-medium">Sẵn sàng hội chẩn trực tuyến</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <span className="material-symbols-outlined text-[24px]">local_hospital</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 pb-2 border-b border-slate-100">
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
                  <div className="font-bold text-slate-800">
                    <span className="text-amber-500">★ 4.98 / 5.0</span> (18.400+ đánh giá xác thực)
                  </div>
                  <span className="text-slate-400">Từ các bệnh viện tuyến trung ương</span>
                </div>
              </div>

              <ul className="text-xs text-slate-600 space-y-2.5">
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
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900">Tiêu Chuẩn Bảo Mật Y Tế Cấp 4</div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed mt-0.5">
                  Tuân thủ Thông tư 46/2018/TT-BYT về bệnh án điện tử và quy định bảo vệ dữ liệu cá nhân Nghị định 13/2023/NĐ-CP.
                </p>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* ==================== 3. FOOTER ==================== */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <div>
          © 2026 MedConnect AI Clinical Technologies Inc. All rights reserved. 256-Bit SSL Encrypted.
        </div>
        <div className="flex items-center gap-4 font-medium text-slate-600">
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Khôi Phục Mật Khẩu Y Tế</h3>
                  <p className="text-xs text-slate-500">Bảo mật cấp độ xác thực 2 lớp EMR</p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!forgotSubmitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmail.trim()) setForgotSubmitted(true);
                }}
                className="space-y-4"
              >
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhập địa chỉ email đăng ký hồ sơ bệnh án hoặc tài khoản bác sĩ. Hệ thống sẽ cấp mã xác thực OTP khôi phục quyền truy cập an toàn.
                </p>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email tài khoản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@mediassist.local"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                  <p className="font-semibold">Lưu ý bảo vệ dữ liệu sức khỏe (HIPAA):</p>
                  <p>Mã OTP có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai kể cả nhân viên y tế.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Gửi Mã Xác Thực OTP
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Yêu Cầu Khôi Phục Đã Được Ghi Nhận!</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Hệ thống đã gửi liên kết xác minh đến hòm thư <strong className="text-slate-900">{forgotEmail}</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
                  <p className="text-slate-500 text-[11px]">DEMO / STAGING OTP CODE:</p>
                  <p className="text-lg font-black text-teal-700 tracking-widest text-center">882 941</p>
                  <p className="text-[11px] text-slate-400 text-center">Tài khoản mặc định: patient@mediassist.local / password123</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Đóng & Đăng Nhập Ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SSO Federation Modal */}
      {ssoModalType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {ssoModalType === 'GOOGLE' ? 'Định Danh Google Workspace SSO' : 'Định Danh Y Tế Quốc Gia VNeID'}
                  </h3>
                  <p className="text-xs text-slate-500">Kiến trúc xác thực liên đoàn OpenID Connect & CCCD</p>
                </div>
              </div>
              <button
                onClick={() => setSsoModalType(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              {ssoModalType === 'GOOGLE' ? (
                <>
                  <p>
                    Hệ thống **MediAssist-AI** đã xây dựng sẵn hạ tầng lọc bảo mật Spring Security JWT tương thích với chuẩn **Google OAuth 2.0 / OpenID Connect**.
                  </p>
                  <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1 text-[11px] text-indigo-900 font-mono">
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
                    Hệ sinh thái liên thông căn cước công dân gắn chip **VNeID Cấp độ 2** tuân thủ Đề án 06/CP của Chính phủ về phát triển ứng dụng dữ liệu dân cư, định danh và xác thực điện tử phục vụ chuyển đổi số y tế quốc gia.
                  </p>
                  <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-1 text-[11px] text-teal-900 font-mono">
                    <p>• Tích hợp: Mã định danh công dân 12 số (Citizen ID)</p>
                    <p>• Đồng bộ: Thẻ Bảo hiểm Y tế (BHYT) & Sổ Sức Khỏe Điện Tử</p>
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
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance & Policy Modal */}
      {complianceModalType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {complianceModalType === 'PRIVACY'
                      ? 'Chính Sách Bảo Mật Dữ Liệu Y Tế'
                      : complianceModalType === 'SECURITY'
                      ? 'Giao Thức An Toàn & Mã Hóa'
                      : 'Quy Chuẩn & Miễn Trừ Trách Nhiệm'}
                  </h3>
                  <p className="text-xs text-slate-500">Chuẩn bảo mật y tế Quốc tế & Pháp lý Việt Nam</p>
                </div>
              </div>
              <button
                onClick={() => setComplianceModalType(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
              {complianceModalType === 'PRIVACY' && (
                <>
                  <p className="font-semibold text-slate-800">1. Tuân thủ HIPAA (Mỹ) & Nghị định 13/2023/NĐ-CP (Việt Nam):</p>
                  <p>Mọi hồ sơ sức khỏe điện tử (e-PHI) của người bệnh bao gồm tiền sử bệnh, kết quả xét nghiệm sinh hóa, hình ảnh chẩn đoán và đơn thuốc đều được phân tách biệt lập, mã hóa dữ liệu khi nghỉ (Data-at-Rest) bằng thuật toán AES-256 GCM.</p>
                  <p className="font-semibold text-slate-800 mt-2">2. Kiểm soát quyền riêng tư:</p>
                  <p>Người bệnh có toàn quyền xem, cập nhật, xuất bản sao hoặc yêu cầu ẩn hồ sơ bệnh án cá nhân trên nền tảng bất cứ lúc nào.</p>
                </>
              )}

              {complianceModalType === 'SECURITY' && (
                <>
                  <p className="font-semibold text-slate-800">1. Mã hóa đường truyền & Lưu trữ mật khẩu:</p>
                  <p>Dữ liệu truyền tải giữa Trình duyệt và Máy chủ được bảo vệ bằng TLS 1.3 với chứng chỉ mã hóa 256-Bit SSL. Mật khẩu người dùng được băm một chiều bằng chuẩn BCrypt 12 rounds kèm salt chống Rainbow Table.</p>
                  <p className="font-semibold text-slate-800 mt-2">2. Rào chắn chống tấn công Brute-force & Rate Limit:</p>
                  <p>Cơ chế chống dò quét tự động khóa tài khoản tạm thời trong 15 phút nếu nhập sai mật khẩu quá 5 lần liên tiếp. Bộ nhớ đệm Two-Layer Cache L1/L2 ngăn chặn quá tải DB.</p>
                </>
              )}

              {complianceModalType === 'DISCLAIMER' && (
                <>
                  <p className="font-semibold text-slate-800">1. Vai trò hỗ trợ quyết định lâm sàng (CDSS):</p>
                  <p>MediAssist-AI là công cụ hỗ trợ phân luồng thông minh (AI Triage) và trích xuất hồ sơ bệnh án. Đề xuất của AI mang tính tham vấn định hướng chuyên khoa, tuyệt đối **không thay thế chẩn đoán độc lập và quyết định điều trị của Bác sĩ có Chứng chỉ hành nghề (CCHN)**.</p>
                  <p className="font-semibold text-slate-800 mt-2">2. Rào chắn Cấp cứu Red-Flag:</p>
                  <p>Hệ thống tự động phát hiện các từ khóa cấp cứu nguy kịch (nhồi máu cơ tim, đột quỵ FAST, sốc phản vệ, khó thở cấp) trong dưới 5ms và kích hoạt cảnh báo gọi cấp cứu 115 ngay lập tức mà không chờ gọi LLM.</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setComplianceModalType(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs cursor-pointer"
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
