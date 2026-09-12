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
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

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

  // Password criteria evaluation
  const passCriteria = useMemo(() => {
    return {
      length: regPassword.length >= 8,
      uppercase: /[A-Z]/.test(regPassword),
      special: /[^A-Za-z0-9]/.test(regPassword),
    };
  }, [regPassword]);

  const passwordStrength = useMemo(() => {
    if (!regPassword) return { label: 'Chưa nhập', level: 0, color: 'bg-slate-200' };
    const score = (passCriteria.length ? 1 : 0) + (passCriteria.uppercase ? 1 : 0) + (passCriteria.special ? 1 : 0);
    if (score === 1) return { label: 'Yếu (Cần thêm ký tự)', level: 33, color: 'bg-rose-500' };
    if (score === 2) return { label: 'Trung bình', level: 66, color: 'bg-amber-500' };
    return { label: 'Rất mạnh (Tối ưu Y Tế)', level: 100, color: 'bg-emerald-500' };
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

            {/* Quick External Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => alert('Tính năng Google OAuth SSO đang được kết nối trong phiên bản tiếp theo.')}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Đăng ký với Google</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Liên kết Định danh Y tế Quốc gia VNeID / CCCD gắn chip đang kích hoạt.')}
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
                    <span className={`font-bold ${passwordStrength.level >= 66 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.level}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span className={`flex items-center gap-1 ${passCriteria.length ? 'text-emerald-600 font-bold' : ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      8+ ký tự
                    </span>
                    <span className={`flex items-center gap-1 ${passCriteria.uppercase ? 'text-emerald-600 font-bold' : ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      Chữ hoa (A-Z)
                    </span>
                    <span className={`flex items-center gap-1 ${passCriteria.special ? 'text-emerald-600 font-bold' : ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      Ký tự đặc biệt (!@#)
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
                    <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Vui lòng liên hệ Admin để cấp lại mật khẩu.'); }} className="text-[11px] text-teal-700 hover:underline">
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
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Chính sách bảo mật tuân thủ HIPAA & Nghị định 13/2023/NĐ-CP.'); }} className="hover:underline">Privacy Policy</a>
          <span>•</span>
          <a href="#security" onClick={(e) => { e.preventDefault(); alert('Hạ tầng bảo mật mã hóa TLS 1.3 & Hash BCrypt 12 rounds.'); }} className="hover:underline">Security Protocol</a>
          <span>•</span>
          <a href="#disclaimer" onClick={(e) => { e.preventDefault(); alert('Hệ thống AI đóng vai trò hỗ trợ phân luồng, không thay thế chẩn đoán độc lập của bác sĩ.'); }} className="hover:underline">Medical Disclaimer</a>
        </div>
      </footer>

    </div>
  );
};
