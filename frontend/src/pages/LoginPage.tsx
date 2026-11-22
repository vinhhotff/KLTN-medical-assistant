import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  FileText,
  Activity,
  CalendarCheck,
  PhoneCall,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';
import { PatientRegisterForm } from '../components/auth/PatientRegisterForm';
import { DoctorRegisterForm } from '../components/auth/DoctorRegisterForm';
import { AuthAlert, AuthLabel, IconInput, SubmitButton } from '../components/auth/authUi';
import { ENABLE_DEMO_LOGIN, EMERGENCY_NUMBER } from '../config/app';

type Tab = 'LOGIN' | 'REGISTER';
type Role = 'PATIENT' | 'DOCTOR';
type Policy = 'PRIVACY' | 'SECURITY' | 'DISCLAIMER';

const DEMO_ACCOUNTS = [
  { label: 'Bác sĩ An', email: 'doctor@mediassist.local', password: 'Doctor@SecurePass2026!' },
  { label: 'Bác sĩ Tuấn', email: 'dr.tuan@mediassist.local', password: 'Doctor@SecurePass2026!' },
  { label: 'Bác sĩ Hương', email: 'dr.huong@mediassist.local', password: 'Doctor@SecurePass2026!' },
  { label: 'Bệnh nhân Bình', email: 'patient@mediassist.local', password: 'Patient@SecurePass2026!' },
  { label: 'Quản trị viên', email: 'admin@mediassist.local', password: 'Admin@SecurePass2026!' },
];

const FEATURES = [
  { icon: FileText, title: 'Đọc hiểu kết quả xét nghiệm', text: 'Tải file PDF hoặc ảnh chụp, AI tóm tắt và đánh dấu chỉ số bất thường.' },
  { icon: Activity, title: 'Trợ lý triệu chứng', text: 'Mô tả triệu chứng để được gợi ý chuyên khoa và mức độ ưu tiên phù hợp.' },
  { icon: CalendarCheck, title: 'Đặt lịch với bác sĩ', text: 'Chọn bác sĩ đã được thẩm định chứng chỉ hành nghề và theo dõi lịch khám.' },
];

const POLICY: Record<Policy, { title: string; body: React.ReactNode }> = {
  PRIVACY: {
    title: 'Chính sách bảo mật',
    body: (
      <>
        <p>Hồ sơ sức khỏe (tiền sử bệnh, kết quả xét nghiệm, đơn thuốc) chỉ dùng cho mục đích khám chữa bệnh, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</p>
        <p>Tài liệu y tế không để công khai: tệp gốc chỉ mở qua liên kết tạm thời 15 phút và mỗi lần mở đều được ghi nhật ký. Bác sĩ chỉ xem được hồ sơ của bệnh nhân đã đặt lịch với mình.</p>
        <p>Bạn có thể xem và cập nhật hồ sơ của mình bất cứ lúc nào trong mục “Hồ sơ y tế”.</p>
      </>
    ),
  },
  SECURITY: {
    title: 'An toàn dữ liệu',
    body: (
      <>
        <p>Mật khẩu được băm một chiều bằng BCrypt trước khi lưu, hệ thống không lưu mật khẩu gốc.</p>
        <p>Phiên đăng nhập dùng JWT kèm cookie HttpOnly. Nếu nhập sai mật khẩu nhiều lần liên tiếp, tài khoản sẽ bị khóa đăng nhập tạm thời để chống dò mật khẩu.</p>
        <p>Thông tin định danh (họ tên, CCCD, số điện thoại) được ẩn trước khi gửi nội dung tới mô hình AI.</p>
      </>
    ),
  },
  DISCLAIMER: {
    title: 'Miễn trừ trách nhiệm',
    body: (
      <>
        <p>
          MediAssist-AI chỉ hỗ trợ thông tin sơ bộ: gợi ý chuyên khoa và giải thích kết quả xét nghiệm. Kết quả của AI <strong>không thay thế chẩn đoán và quyết định điều trị của bác sĩ</strong>.
        </p>
        <p>
          Khi tin nhắn có dấu hiệu cấp cứu (đau ngực cấp, dấu hiệu đột quỵ, sốc phản vệ…), hệ thống dừng tư vấn và hướng dẫn gọi {EMERGENCY_NUMBER} ngay, trước khi gọi tới AI.
        </p>
      </>
    ),
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const passwordJustReset = searchParams.get('reset') === 'success';
  const modeParam = searchParams.get('mode')?.toLowerCase();
  const roleParam = searchParams.get('role')?.toLowerCase();
  const { setUser } = useAuthStore();

  // /login opens the sign-in tab; ?mode=register opens registration
  const [activeTab, setActiveTab] = useState<Tab>(() => (modeParam === 'register' && !sessionExpired && !passwordJustReset ? 'REGISTER' : 'LOGIN'));
  const [roleType, setRoleType] = useState<Role>(() => (roleParam === 'doctor' ? 'DOCTOR' : 'PATIENT'));

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => (sessionExpired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : null));
  const [successMsg, setSuccessMsg] = useState<string | null>(
    passwordJustReset ? 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' : null,
  );
  const [isLocked, setIsLocked] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    if (sessionExpired || passwordJustReset || modeParam === 'login') {
      setActiveTab('LOGIN');
    } else if (modeParam === 'register') {
      setActiveTab('REGISTER');
    }
    if (roleParam === 'doctor') setRoleType('DOCTOR');
    else if (roleParam === 'patient') setRoleType('PATIENT');
  }, [modeParam, roleParam, sessionExpired, passwordJustReset]);

  useEffect(() => {
    if (!policy) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPolicy(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [policy]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
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

  const handleQuickPreset = (presetEmail: string, presetPass: string) => {
    setLoginEmail(presetEmail);
    setLoginPassword(presetPass);
    setError(null);
    setIsLocked(false);
  };

  const isRegister = activeTab === 'REGISTER';

  return (
    <div className="min-h-screen bg-slate-50 bg-atelier-dots text-slate-900 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Header — same pill as the landing page */}
      <header className="px-4 sm:px-8 pt-3">
        <div className="max-w-[1440px] mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.04)] px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-display font-bold text-base shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
              M+
            </span>
            <span className="min-w-0">
              <span className="font-display text-base sm:text-lg text-slate-900 tracking-tight font-bold block leading-none truncate">
                MediAssist <span className="text-teal-600">Atelier</span>
              </span>
              <span className="text-xs text-slate-500 block mt-1 truncate">Trợ lý sức khỏe AI</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full font-display text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Form card */}
          <section className="lg:col-span-7 relative overflow-hidden bg-white rounded-3xl border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.03)] px-5 py-7 sm:px-10 sm:py-10">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-teal-100/60 blur-3xl" />
            <div className="relative max-w-[576px] mx-auto">
              {/* Sign-in / register switch */}
              <div className="grid grid-cols-2 p-1 rounded-full bg-slate-100 border border-slate-200" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
                {(
                  [
                    ['LOGIN', 'Đăng nhập'],
                    ['REGISTER', 'Đăng ký'],
                  ] as const
                ).map(([tab, text]) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={activeTab === tab}
                    onClick={() => switchTab(tab)}
                    className={`py-2.5 rounded-full font-display text-sm font-bold transition cursor-pointer ${
                      activeTab === tab ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>

              <h1 className="mt-8 font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {isRegister ? (roleType === 'DOCTOR' ? 'Tạo tài khoản bác sĩ' : 'Tạo tài khoản bệnh nhân') : 'Chào mừng trở lại'}
              </h1>
              <p className="mt-2 text-base text-slate-600 leading-relaxed">
                {isRegister
                  ? roleType === 'DOCTOR'
                    ? 'Tạo tài khoản, khai báo chứng chỉ hành nghề và chờ quản trị viên thẩm định.'
                    : 'Chỉ mất khoảng một phút để bắt đầu theo dõi sức khỏe cùng MediAssist.'
                  : 'Đăng nhập để xem hồ sơ sức khỏe, kết quả phân tích và lịch khám của bạn.'}
              </p>

              {/* Role cards (register) */}
              {isRegister && (
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      ['PATIENT', 'Bệnh nhân', 'Theo dõi sức khỏe cá nhân', UserIcon],
                      ['DOCTOR', 'Bác sĩ', 'Khám bệnh và quản lý lịch hẹn', Stethoscope],
                    ] as const
                  ).map(([role, title, sub, Icon]) => {
                    const on = roleType === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setRoleType(role)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition cursor-pointer ${
                          on ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display font-bold text-slate-900">{title}</span>
                          <span className="block text-sm text-slate-600">{sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Google (sign-in and patient registration) */}
              {(!isRegister || roleType === 'PATIENT') && (
                <>
                  <div className="mt-6">
                    <GoogleLoginButton label="Tiếp tục với Google" className="w-full py-3 px-4 rounded-xl text-sm shadow-sm" />
                  </div>
                  <div className="my-6 flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex-1 border-t border-slate-200" />
                    {isRegister ? 'hoặc đăng ký bằng email' : 'hoặc đăng nhập bằng email'}
                    <span className="flex-1 border-t border-slate-200" />
                  </div>
                </>
              )}
              {isRegister && roleType === 'DOCTOR' && <div className="mt-6" />}

              {isRegister ? (
                roleType === 'DOCTOR' ? (
                  <DoctorRegisterForm />
                ) : (
                  <PatientRegisterForm />
                )
              ) : (
                <form onSubmit={handleLogin} className="space-y-5">
                  {error && <AuthAlert tone="error">{error}</AuthAlert>}
                  {successMsg && <AuthAlert tone="success">{successMsg}</AuthAlert>}

                  <div>
                    <AuthLabel htmlFor="login-email">Email</AuthLabel>
                    <IconInput
                      id="login-email"
                      icon={Mail}
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ban@email.com"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label htmlFor="login-password" className="text-sm font-semibold text-slate-800">
                        Mật khẩu
                      </label>
                      <Link to="/forgot-password" className="text-sm font-semibold text-teal-600 hover:underline">
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <IconInput
                      id="login-password"
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      reveal={{ shown: showPassword, onToggle: () => setShowPassword(!showPassword), label: showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu' }}
                    />
                  </div>

                  {isLocked && (
                    <p className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                      Tài khoản tạm thời bị khóa đăng nhập do nhập sai nhiều lần. Vui lòng chờ 15 phút hoặc liên hệ hỗ trợ.
                    </p>
                  )}

                  <SubmitButton disabled={loading || !loginEmail.trim() || !loginPassword} loading={loading} loadingText="Đang đăng nhập…">
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </SubmitButton>

                  {ENABLE_DEMO_LOGIN && (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50" data-testid="demo-presets">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Sparkles className="w-4 h-4 text-teal-600" /> Tài khoản demo — bấm để điền sẵn
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {DEMO_ACCOUNTS.map((a) => (
                          <button
                            key={a.email}
                            type="button"
                            onClick={() => handleQuickPreset(a.email, a.password)}
                            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition cursor-pointer ${
                              loginEmail === a.email ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}

              <p className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
                {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                <button type="button" onClick={() => switchTab(isRegister ? 'LOGIN' : 'REGISTER')} className="font-bold text-teal-600 hover:underline cursor-pointer">
                  {isRegister ? 'Đăng nhập' : 'Đăng ký miễn phí'}
                </button>
              </p>
            </div>
          </section>

          {/* Side column */}
          <aside className="lg:col-span-5 space-y-5">
            <div className="hidden lg:block relative overflow-hidden bg-white rounded-3xl border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-10">
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-100/60 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-sm font-bold text-teal-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> MediAssist AI
                </span>
                <h2 className="mt-6 font-display text-3xl xl:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                  Một tài khoản cho <span className="text-teal-600">cả hành trình chăm sóc sức khỏe.</span>
                </h2>
                <p className="mt-4 text-slate-600 leading-relaxed">Lưu hồ sơ, hiểu kết quả xét nghiệm và kết nối bác sĩ chuyên khoa ở cùng một nơi.</p>

                <ul className="mt-8 space-y-6">
                  {FEATURES.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex gap-4">
                      <span className="w-11 h-11 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-display font-bold text-slate-900">{title}</span>
                        <span className="block text-slate-600 leading-relaxed">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-8 pt-6 border-t border-slate-200 flex gap-3 text-slate-600 leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  Dữ liệu sức khỏe chỉ dùng cho mục đích khám chữa bệnh, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 sm:p-6 rounded-3xl bg-rose-50 border border-rose-200">
              <span className="w-10 h-10 rounded-full bg-white border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </span>
              <p className="text-rose-900 leading-relaxed">
                <strong>
                  Trường hợp cấp cứu, hãy gọi ngay{' '}
                  <a href={`tel:${EMERGENCY_NUMBER}`} className="underline underline-offset-2">
                    {EMERGENCY_NUMBER}
                  </a>
                  .
                </strong>{' '}
                MediAssist chỉ hỗ trợ tham khảo, không thay thế chẩn đoán của bác sĩ.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
        <p className="text-center sm:text-left">© 2026 MediAssist — Đồ án tốt nghiệp. Dữ liệu demo không phải hồ sơ bệnh nhân thật.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-semibold text-slate-800" aria-label="Chính sách">
          {(
            [
              ['PRIVACY', 'Chính sách bảo mật'],
              ['SECURITY', 'An toàn dữ liệu'],
              ['DISCLAIMER', 'Miễn trừ trách nhiệm'],
            ] as const
          ).map(([key, text]) => (
            <button key={key} type="button" onClick={() => setPolicy(key)} className="hover:underline cursor-pointer">
              {text}
            </button>
          ))}
        </nav>
      </footer>

      {policy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPolicy(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <h3 id="policy-title" className="font-display text-lg font-bold text-slate-900">
                {POLICY[policy].title}
              </h3>
              <button type="button" onClick={() => setPolicy(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">{POLICY[policy].body}</div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPolicy(null)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
