import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
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
import { PatientRegisterForm } from '../components/auth/PatientRegisterForm';
import { DoctorRegisterForm } from '../components/auth/DoctorRegisterForm';
import { ENABLE_DEMO_LOGIN } from '../config/app';

gsap.registerPlugin(useGSAP);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const passwordJustReset = searchParams.get('reset') === 'success';
  const modeParam = searchParams.get('mode')?.toLowerCase();
  const roleParam = searchParams.get('role')?.toLowerCase();
  const { setUser } = useAuthStore();
  const rootRef = useRef<HTMLDivElement>(null);

  // Mode: 'REGISTER' (default per target UI) or 'LOGIN'
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOGIN'>(() => {
    if (sessionExpired || passwordJustReset) return 'LOGIN';
    if (modeParam === 'login') return 'LOGIN';
    return 'REGISTER';
  });
  const [roleType, setRoleType] = useState<'PATIENT' | 'DOCTOR'>(() =>
    roleParam === 'doctor' ? 'DOCTOR' : 'PATIENT'
  );

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI state (Login mode)
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    if (sessionExpired || passwordJustReset || modeParam === 'login') {
      setActiveTab('LOGIN');
    } else if (modeParam === 'register') {
      setActiveTab('REGISTER');
    }

    if (roleParam === 'doctor') {
      setRoleType('DOCTOR');
    } else if (roleParam === 'patient') {
      setRoleType('PATIENT');
    }
  }, [modeParam, roleParam, sessionExpired, passwordJustReset]);

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
                MediAssist <span className="font-semibold text-teal-600">Atelier</span>
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
              {activeTab === 'REGISTER'
                ? roleType === 'DOCTOR'
                  ? 'Đăng Ký Tài Khoản Bác Sĩ'
                  : 'Đăng Ký Tài Khoản'
                : 'Đăng Nhập Hệ Thống'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
              {activeTab === 'REGISTER'
                ? roleType === 'DOCTOR'
                  ? 'Khởi tạo hồ sơ hành nghề y khoa, xác thực email và kết nối mạng lưới hội chẩn trực tuyến MediAssist.'
                  : 'Hệ thống AI phân tích hồ sơ bệnh án tự động, hỗ trợ phân tầng rủi ro lâm sàng và điều hướng bác sĩ chính xác.'
                : 'Truy cập hồ sơ bệnh án điện tử EMR cá nhân hóa, kết quả phân tích AI và lịch khám bác sĩ chuyên khoa.'}
            </p>

            {/* Role Switcher Pills (Register mode) */}
            {activeTab === 'REGISTER' && (
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F6F3EC] rounded-2xl border border-slate-200 mb-4">
                <button
                  type="button"
                  onClick={() => setRoleType('PATIENT')}
                  className={`py-2.5 px-3 rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    roleType === 'PATIENT'
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className={`w-3.5 h-3.5 ${roleType === 'PATIENT' ? 'text-white' : 'text-slate-600'}`} />
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
                  <Stethoscope className={`w-3.5 h-3.5 ${roleType === 'DOCTOR' ? 'text-white' : 'text-slate-600'}`} />
                  <span>Bác Sĩ &amp; Phòng Khám</span>
                </button>
              </div>
            )}

            {activeTab === 'REGISTER' && roleType === 'DOCTOR' && (
              <div className="mb-4 p-3.5 bg-teal-50/90 border border-teal-200 rounded-2xl flex items-start gap-2.5 text-xs text-teal-950">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-teal-900">Dành Cho Y Bác Sĩ CCHN:</div>
                  <div className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                    Quy trình 2 bước: (1) Điền biểu mẫu &amp; xác thực Email gửi về hộp thư → (2) Quản trị viên thẩm định CCHN trực tuyến.
                  </div>
                </div>
              </div>
            )}

            {/* Quick External Actions — Google OAuth2 + VNeID (Login or Patient registration) */}
            {(activeTab === 'LOGIN' || roleType === 'PATIENT') && (
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
            )}

            {/* Divider */}
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-3 font-mono text-[10px] font-bold tracking-widest uppercase text-slate-500">
                {activeTab === 'REGISTER'
                  ? roleType === 'DOCTOR'
                    ? 'Biểu mẫu đăng ký bác sĩ & CCHN'
                    : 'Hoặc điền thông tin y tế'
                  : 'Hoặc đăng nhập bằng tài khoản'}
              </span>
              <div className="flex-grow border-t border-slate-300"></div>
            </div>

            {/* Alert Message Box (Login mode — register forms own their own inline alerts) */}
            {activeTab === 'LOGIN' && error && (
              <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-mono font-bold">LỖI XÁC THỰC:</div>
                  <div className="text-[12px] text-rose-800 mt-0.5 leading-snug">{error}</div>
                </div>
              </div>
            )}

            {activeTab === 'LOGIN' && successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-bold">{successMsg}</div>
              </div>
            )}

            {/* ==================== FORM: REGISTER MODE ==================== */}
            {activeTab === 'REGISTER' ? (
              roleType === 'DOCTOR' ? (
                <DoctorRegisterForm />
              ) : (
                <PatientRegisterForm />
              )
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
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                <span>{activeTab === 'REGISTER' ? 'Đăng nhập hệ thống ngay' : 'Đăng ký tài khoản mới'}</span>
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
