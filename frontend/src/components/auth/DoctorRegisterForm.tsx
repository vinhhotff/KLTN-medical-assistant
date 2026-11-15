import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User as UserIcon,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ENABLE_DEMO_LOGIN } from '../../config/app';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const DEMO_DOCTOR_ACCOUNTS = [
  { fullName: 'Nguyễn Minh Quân', slug: 'nguyenminhquan' },
  { fullName: 'Trần Thị Ngọc Lan', slug: 'tranthingoclan' },
  { fullName: 'Lê Quang Khải', slug: 'lequangkhai' },
  { fullName: 'Phạm Thu Hà', slug: 'phamthuha' },
];

export const DoctorRegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bước 1: Chỉ thu thập Nhóm 1 (Định danh & Tài khoản) để tránh Form Fatigue
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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

  const handleQuickDemoDoctor = () => {
    setError(null);
    setSuccessMsg(null);
    const suffix = Math.floor(10000 + Math.random() * 89999);
    const phonePrefixes = ['090', '091', '098', '037', '086', '079'];
    const randomPhone = `${phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)]}${Math.floor(1000000 + Math.random() * 8999999)}`;
    const picked = DEMO_DOCTOR_ACCOUNTS[Math.floor(Math.random() * DEMO_DOCTOR_ACCOUNTS.length)];
    const generatedPass = `Doctor@Pass${Math.floor(1000 + Math.random() * 9000)}!`;

    setFullName(picked.fullName);
    setEmail(`bacsi.${picked.slug}.${suffix}@gmail.com`);
    setPhone(randomPhone);
    setAvatarUrl('');
    setPassword(generatedPass);
    setConfirmPassword(generatedPass);
    setAgreeTerms(true);

    setSuccessMsg(`Đã điền nhanh tài khoản mẫu (Bước 1): BS. ${picked.fullName} — bacsi.${picked.slug}.${suffix}@gmail.com`);
  };

  const registerErrors = useMemo(() => {
    const errs: string[] = [];
    if (!fullName.trim()) errs.push('Họ và tên đầy đủ không được để trống.');
    if (!EMAIL_RE.test(email.trim())) errs.push('Email đăng nhập / nhận thông báo không hợp lệ.');
    if (!VN_PHONE_RE.test(phone.replace(/\s/g, ''))) {
      errs.push('Số điện thoại liên hệ khẩn cấp không hợp lệ (VD: 0901234567).');
    }
    if (!passCriteria.length) errs.push('Mật khẩu phải chứa ít nhất 8 ký tự.');
    if (!passCriteria.uppercase) errs.push('Mật khẩu cần ít nhất 1 chữ hoa (A-Z).');
    if (!passCriteria.special) errs.push('Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#...).');
    if (password !== confirmPassword) errs.push('Mật khẩu xác nhận không khớp.');
    if (!agreeTerms) {
      errs.push('Vui lòng đồng ý với điều khoản bảo mật e-PHI và quy trình thẩm định CCHN.');
    }
    return errs;
  }, [fullName, email, phone, passCriteria, password, confirmPassword, agreeTerms]);

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
      const payload: Record<string, string> = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\s/g, ''),
        password,
      };
      if (avatarUrl.trim()) {
        payload.avatarUrl = avatarUrl.trim();
      }

      const res = await api.post('/auth/register/doctor', payload);
      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        setSuccessMsg(
          `Đăng ký tài khoản Bác sĩ thành công! Email xác thực đã được gửi tới ${user.email}. Đang chuyển đến trang Khai báo thông tin hành nghề (Bước 2/3)...`
        );
        redirectTimerRef.current = setTimeout(() => {
          navigate('/doctor/profile');
        }, 1200);
      }
    } catch (err: unknown) {
      const details = (err as { response?: { data?: { error?: { details?: Record<string, string> } } } })?.response?.data?.error?.details;
      if (details && typeof details === 'object') {
        setError(Object.values(details).join('; '));
      } else {
        setError(getApiErrorMessage(err, 'Đăng ký bác sĩ không thành công. Vui lòng kiểm tra lại thông tin tài khoản.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lộ trình 3 bước Onboarding Bác Sĩ */}
      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-800">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <span>Quy trình 3 bước gia nhập MediAssist Bác sĩ</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-mono text-[10px] font-bold">
            BƯỚC 1 / 3
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <div className="p-2 rounded-xl bg-white border-2 border-teal-500 text-slate-900 shadow-2xs">
            <span className="font-mono font-bold text-teal-700 block text-[10px]">1. Tạo tài khoản</span>
            <span className="text-[10px] text-slate-600 leading-tight block mt-0.5">Định danh cơ bản</span>
          </div>
          <div className="p-2 rounded-xl bg-white/60 border border-slate-200 text-slate-500">
            <span className="font-mono font-bold block text-[10px]">2. Khai báo CCHN</span>
            <span className="text-[10px] leading-tight block mt-0.5">Chuyên môn &amp; phí</span>
          </div>
          <div className="p-2 rounded-xl bg-white/60 border border-slate-200 text-slate-500">
            <span className="font-mono font-bold block text-[10px]">3. Admin duyệt</span>
            <span className="text-[10px] leading-tight block mt-0.5">Kích hoạt 24h</span>
          </div>
        </div>
      </div>

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
            <span>Tài khoản bác sĩ mẫu (Bước 1):</span>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoDoctor}
            className="px-3 py-1.5 rounded-xl font-display text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">casino</span>
            <span>Điền nhanh BS mẫu</span>
          </button>
        </div>
      )}

      {/* Nhóm 1: Định danh & Tài khoản */}
      <div className="space-y-3.5 p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-bold text-teal-700">
            <UserIcon className="w-3.5 h-3.5" />
            <span>Nhóm 1: Định Danh &amp; Tài Khoản (Bước 1)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Nhanh gọn trong 30 giây</span>
        </div>

        {/* Họ và tên */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Họ và tên đầy đủ <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Email */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Email đăng nhập &amp; nhận thông báo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bacsi.nguyenvana@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
              Số điện thoại liên hệ khẩn cấp <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
          </div>
        </div>

        {/* Ảnh chân dung áo blouse trắng (tùy chọn ở Bước 1) */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Ảnh chân dung áo blouse trắng <span className="font-normal normal-case text-slate-500">(URL - Tùy chọn, có thể bổ sung ở Bước 2)</span>
          </label>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://.../avatar.jpg"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
              />
            </div>
            {avatarUrl.trim() && (
              <img
                src={avatarUrl.trim()}
                alt="Xem trước ảnh chân dung"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0 bg-slate-100"
              />
            )}
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Mật khẩu <span className="text-rose-500">*</span>
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

      {/* Ghi chú pháp lý + Terms */}
      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          Sau khi tạo tài khoản, hệ thống sẽ chuyển bạn đến màn hình <strong>Khai báo thông tin hành nghề (CCHN)</strong> để Ban quản trị thẩm định trong vòng 24h trước khi tiếp nhận bệnh nhân.
        </span>
      </div>

      <div className="flex items-start gap-2 pt-0.5">
        <input
          type="checkbox"
          id="doctor-terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <label htmlFor="doctor-terms" className="text-[11px] text-slate-600 leading-snug cursor-pointer">
          Tôi đồng ý với{' '}
          <span className="text-slate-900 font-bold underline">Quy chế bảo mật dữ liệu bệnh nhân e-PHI</span>{' '}
          và sẽ cung cấp <span className="text-slate-900 font-bold underline">Chứng chỉ hành nghề (CCHN)</span> hợp lệ ở bước tiếp theo.
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !agreeTerms}
        title={!agreeTerms ? 'Vui lòng đồng ý điều khoản trước khi tạo tài khoản' : undefined}
        className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-display text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span>Đang tạo tài khoản &amp; gửi email xác thực...</span>
          </>
        ) : (
          <>
            <span>Tạo Tài Khoản &amp; Tiếp Tục Khai Báo Hồ Sơ</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
