import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartPulse,
  LogIn,
  Lock,
  Mail,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  User as UserIcon,
  Crown,
  FileText,
  Stethoscope,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('admin@mediassist.local');
  const [password, setPassword] = useState('Admin@SecurePass2026!');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('MALE');
  const [regDob, setRegDob] = useState('1995-05-15');
  const [regAddress, setRegAddress] = useState('TP. Hồ Chí Minh');

  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLocked(false);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLocked(false);
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        fullName: regFullName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        gender: regGender,
        dateOfBirth: regDob,
        address: regAddress,
      });

      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        navigate('/patient');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Đăng ký không thành công. Vui lòng thử lại.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const setPresetAccount = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
    setIsLocked(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Glowing Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/15 blur-[120px]" />
      </div>

      {/* Top Header Bar with Home Link */}
      <div className="max-w-6xl w-full mx-auto mb-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 transition shadow-sm text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>Về Trang Chủ MediAssist</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Mã Hóa Chuẩn HL7 / ISO 27001</span>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Left Column: Commercial Value Proposition & Trust Badges */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-7 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
                <HeartPulse className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    MediAssist-AI
                  </h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase tracking-wider">
                    Chuẩn BYT
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Hệ Thống Y Tế Trực Tuyến & Bệnh Án Điện Tử EMR</p>
              </div>
            </div>

            {/* Architecture / Security Card */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>Bảo Mật Zero-Trust & Phân Luồng Y Tế</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Mọi tính năng lâm sàng (Sàng lọc Triage AI, Quét PDF Xét nghiệm, Đặt lịch khám Bác sĩ CCHN) đều yêu cầu xác thực bảo mật. Hệ thống tích hợp rào chắn chống Brute-Force tự động khóa tài khoản sau 5 lần đăng nhập thất bại liên tiếp.
              </p>
            </div>

            {/* Commercial Plan Highlight Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-white">Gói Hội Viên MediPass VIP</span>
                </div>
                <span className="text-sm font-black text-amber-400">149.000đ / tháng</span>
              </div>
              <ul className="text-xs text-slate-200 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sàng lọc Triage AI SBAR & Red-Flag 24/7 không giới hạn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>10 lượt Phân tích OCR Báo cáo Xét nghiệm chuyên sâu</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ưu đãi 10% phí khám Telehealth Bác sĩ CKI/CKII tuyến đầu</span>
                </li>
              </ul>
            </div>

            {/* Feature Mini Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Quét OCR Xét Nghiệm</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Miễn phí scan đầu tiên; 29.000đ/lần lẻ hoặc 99.000đ/5 lần</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  <span>Khám Bác Sĩ Escrow</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">250.000đ - 450.000đ. Hoàn 100% nếu phiên khám hủy</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>© 2026 MediAssist-AI Hệ Thống Y Tế Số</span>
            <span className="text-emerald-400 font-mono">Status: Online (200 OK)</span>
          </div>
        </div>

        {/* Right Column: Authentication Form Card (High Contrast White Card) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white text-slate-900 shadow-2xl rounded-3xl p-6 sm:p-8 border border-slate-200 flex-1 flex flex-col justify-between">
            <div>
              {/* Tab Header Switcher */}
              <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('LOGIN'); setError(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'LOGIN'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Đăng Nhập Hệ Thống
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('REGISTER'); setError(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'REGISTER'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Đăng Ký Bệnh Nhân
                </button>
              </div>

              {/* Error & Account Lockout Notification */}
              {error && (
                <div className={`mb-5 p-4 rounded-2xl text-sm flex items-start gap-3 border shadow-sm ${
                  isLocked
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  {isLocked ? (
                    <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">
                      {isLocked ? 'Cảnh Báo Khóa Tài Khoản (Anti-Brute Force)' : 'Thông Báo Xác Thực'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed font-medium">{error}</p>
                  </div>
                </div>
              )}

              {activeTab === 'LOGIN' ? (
                /* TAB 1: LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Email Tài Khoản
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="user@mediassist.local"
                        className="block w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Mật Khẩu
                      </label>
                    </div>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Xác Thực & Đăng Nhập Hệ Thống</span>
                      </>
                    )}
                  </button>

                  {/* Fast-Fill Demo Accounts Pills */}
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Tài khoản demo kiểm thử nhanh (1-Click):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPresetAccount('admin@mediassist.local', 'Admin@SecurePass2026!')}
                        className="p-2.5 rounded-xl border-2 border-indigo-100 bg-indigo-50/70 hover:border-indigo-400 hover:bg-indigo-100/70 text-left transition cursor-pointer"
                      >
                        <span className="text-[11px] font-extrabold text-indigo-950 block">Quản Trị Viên</span>
                        <span className="text-[10px] text-indigo-800 font-medium block truncate">admin@mediassist...</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetAccount('doctor.khoa@mediassist.local', 'Doctor@SecurePass2026!')}
                        className="p-2.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-100/70 text-left transition cursor-pointer"
                      >
                        <span className="text-[11px] font-extrabold text-emerald-950 block">BS. Đăng Khoa</span>
                        <span className="text-[10px] text-emerald-800 font-medium block truncate">doctor.khoa@...</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetAccount('patient.binh@mediassist.local', 'Patient@SecurePass2026!')}
                        className="p-2.5 rounded-xl border-2 border-purple-100 bg-purple-50/70 hover:border-purple-400 hover:bg-purple-100/70 text-left transition cursor-pointer"
                      >
                        <span className="text-[11px] font-extrabold text-purple-950 block">BN. Trần Bình</span>
                        <span className="text-[10px] text-purple-800 font-medium block truncate">patient.binh@...</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* TAB 2: REGISTER FORM */
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Họ và Tên Bệnh Nhân
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        required
                        placeholder="Nguyễn Văn An"
                        className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Email Đăng Ký
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          placeholder="an.nguyen@email.com"
                          className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Mật Khẩu Mới
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          placeholder="Tối thiểu 6 ký tự"
                          className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Số Điện Thoại
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0988xxxxxx"
                          className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 shadow-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Giới Tính
                      </label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-600 shadow-xs"
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Ngày Sinh
                      </label>
                      <div className="relative rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="date"
                          value={regDob}
                          onChange={(e) => setRegDob(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-600 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Địa Chỉ Liên Hệ
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Quận/Huyện, Tỉnh/Thành phố"
                      className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 shadow-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Tạo Hồ Sơ Bệnh Án & Bắt Đầu</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-500 mt-6 pt-4 border-t border-slate-100">
              Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật y tế EMR của MediAssist-AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

