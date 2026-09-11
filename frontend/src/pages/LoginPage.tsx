import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight
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
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Commercial Value Proposition & Pricing Tiers */}
        <div className="lg:col-span-6 text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400 backdrop-blur-xs">
              <HeartPulse className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                MediAssist-AI
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                  Bảo Mật Cao Cấp
                </span>
              </h1>
              <p className="text-sm text-indigo-200/80">Hệ Thống Y Tế Trực Tuyến & Bệnh Án Điện Tử Chuẩn Bộ Y Tế</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Chính Sách Bảo Vệ Dữ Liệu & Zero-Trust Architecture</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mọi tính năng lâm sàng (Phân luồng Triage AI, Quét PDF Xét nghiệm, Đặt lịch bác sĩ) bắt buộc xác thực danh tính. Hệ thống tự động kích hoạt phòng thủ Brute-force khóa tài khoản sau 5 lần vi phạm và kiểm soát tải phân tán Redis Rate-Limiter.
            </p>

            {/* Commercial Plan Highlight Card */}
            <div className="p-4 rounded-xl bg-linear-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-400/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-white">Gói Hội Viên MediPass VIP</span>
                </div>
                <span className="text-sm font-black text-amber-300">149.000đ / tháng</span>
              </div>
              <ul className="text-xs text-slate-200 space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Triage AI Phân luồng triệu chứng 24/7 không giới hạn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>10 lượt Phân tích OCR Báo cáo Xét nghiệm chuyên sâu</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Giảm 10% phí khám trực tuyến với Bác sĩ CKI / CKII</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Quét OCR Xét Nghiệm</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Miễn phí scan đầu tiên; 29.000đ/lần lẻ hoặc gói 99.000đ/5 lần</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  <span>Khám Bác Sĩ Escrow</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">250.000đ - 450.000đ/phiên. Hoàn tiền 100% nếu phiên khám hủy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card (Dual-Tab) */}
        <div className="lg:col-span-6">
          <div className="bg-white shadow-2xl rounded-3xl p-6 sm:p-8 border border-slate-100">
            
            {/* Tab Header Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setActiveTab('LOGIN'); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'LOGIN'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('REGISTER'); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'REGISTER'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Đăng Ký Bệnh Nhân Mới
              </button>
            </div>

            {/* Error & Account Lockout Notification */}
            {error && (
              <div className={`mb-5 p-4 rounded-xl text-sm flex items-start gap-3 border ${
                isLocked
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {isLocked ? (
                  <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {isLocked ? 'Cảnh Báo Khóa Tài Khoản (Anti-Brute Force)' : 'Lỗi Xác Thực'}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {activeTab === 'LOGIN' ? (
              /* TAB 1: LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Email Tài Khoản
                  </label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="user@mediassist.local"
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Mật Khẩu
                    </label>
                  </div>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Xác Thực & Đăng Nhập</span>
                    </>
                  )}
                </button>

                {/* Fast-Fill Demo Accounts Pills */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Tài khoản demo kiểm thử nhanh:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPresetAccount('admin@mediassist.local', 'Admin@SecurePass2026!')}
                      className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition group"
                    >
                      <span className="text-[10px] font-bold text-indigo-700 block">Quản Trị Viên</span>
                      <span className="text-[9px] text-slate-500 block truncate">admin@mediassist.local</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetAccount('doctor.khoa@mediassist.local', 'Doctor@SecurePass2026!')}
                      className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition group"
                    >
                      <span className="text-[10px] font-bold text-emerald-700 block">BS. Đăng Khoa</span>
                      <span className="text-[9px] text-slate-500 block truncate">doctor.khoa@...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetAccount('patient.binh@mediassist.local', 'Patient@SecurePass2026!')}
                      className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition group"
                    >
                      <span className="text-[10px] font-bold text-purple-700 block">BN. Trần Bình</span>
                      <span className="text-[9px] text-slate-500 block truncate">patient.binh@...</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* TAB 2: REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Họ và Tên Bệnh Nhân
                  </label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                      placeholder="Nguyễn Văn An"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Email Đăng Ký
                    </label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        placeholder="an.nguyen@email.com"
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Mật Khẩu Mới
                    </label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        placeholder="Tối thiểu 6 ký tự"
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Số Điện Thoại
                    </label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0988xxxxxx"
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Giới Tính
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Ngày Sinh
                    </label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="date"
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Địa Chỉ Liên Hệ
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Quận/Huyện, Tỉnh/Thành phố"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
};
export default LoginPage;

