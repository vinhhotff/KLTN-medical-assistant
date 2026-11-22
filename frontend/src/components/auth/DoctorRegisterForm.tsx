import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Dices,
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
import { AuthAlert, AuthLabel, IconInput, PasswordStrengthMeter, SubmitButton } from './authUi';

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
      label: 'Rất mạnh',
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
      errs.push('Vui lòng đồng ý với quy chế bảo mật dữ liệu bệnh nhân và quy trình thẩm định CCHN.');
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* 3-step doctor onboarding */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-800">
            <Stethoscope className="w-4 h-4 text-teal-600" /> Quy trình 3 bước gia nhập MediAssist
          </span>
          <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-xs font-semibold">Bước 1/3</span>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            ['1. Tạo tài khoản', 'Thông tin đăng nhập', true],
            ['2. Khai báo CCHN', 'Chuyên môn và phí khám', false],
            ['3. Quản trị viên duyệt', 'Đối chiếu chứng chỉ', false],
          ].map(([title, sub, current]) => (
            <li
              key={title as string}
              className={`p-2.5 rounded-xl border bg-white ${current ? 'border-2 border-teal-500 text-slate-900' : 'border-slate-200 text-slate-500'}`}
            >
              <span className={`block font-semibold ${current ? 'text-teal-700' : ''}`}>{title}</span>
              <span className="block mt-0.5">{sub}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <AuthAlert tone="error" title="Chưa đăng ký được">
          {error}
        </AuthAlert>
      )}
      {successMsg && <AuthAlert tone="success">{successMsg}</AuthAlert>}

      {ENABLE_DEMO_LOGIN && (
        <div className="p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Sparkles className="w-4 h-4 text-teal-600" /> Điền nhanh dữ liệu mẫu
          </span>
          <button
            type="button"
            onClick={handleQuickDemoDoctor}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5" /> Bác sĩ mẫu
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        <div className="sm:col-span-2 min-w-0">
          <AuthLabel htmlFor="doc-name" required>
            Họ và tên đầy đủ
          </AuthLabel>
          <IconInput id="doc-name" icon={UserIcon} type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="doc-email" required>
            Email đăng nhập &amp; nhận thông báo
          </AuthLabel>
          <IconInput id="doc-email" icon={Mail} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="bacsi.nguyenvana@gmail.com" />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="doc-phone" required>
            Số điện thoại liên hệ
          </AuthLabel>
          <IconInput id="doc-phone" icon={Phone} type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="doc-password" required>
            Mật khẩu
          </AuthLabel>
          <IconInput
            id="doc-password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            reveal={{ shown: showPassword, onToggle: () => setShowPassword(!showPassword), label: showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu' }}
          />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="doc-password2" required>
            Xác nhận mật khẩu
          </AuthLabel>
          <IconInput
            id="doc-password2"
            icon={Lock}
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            reveal={{
              shown: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
              label: showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận',
            }}
          />
        </div>
      </div>

      <PasswordStrengthMeter strength={passwordStrength} criteria={passCriteria} />

      <p className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Sau khi tạo tài khoản, bạn sẽ được chuyển đến màn hình <strong>Khai báo thông tin hành nghề (CCHN)</strong> để quản trị viên thẩm định trước khi tiếp nhận bệnh nhân.
        </span>
      </p>

      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id="doctor-terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <label htmlFor="doctor-terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
          Tôi đồng ý với <span className="font-semibold text-slate-900 underline">Quy chế bảo mật dữ liệu bệnh nhân</span> và sẽ cung cấp{' '}
          <span className="font-semibold text-slate-900 underline">Chứng chỉ hành nghề (CCHN)</span> hợp lệ ở bước tiếp theo.
        </label>
      </div>

      <SubmitButton
        disabled={loading || !agreeTerms}
        loading={loading}
        loadingText="Đang tạo tài khoản và gửi email xác thực…"
        title={!agreeTerms ? 'Vui lòng đồng ý điều khoản trước khi tạo tài khoản' : undefined}
      >
        <span>Tạo tài khoản &amp; khai báo hồ sơ</span>
        <ArrowRight className="w-4 h-4" />
      </SubmitButton>
    </form>
  );
};
