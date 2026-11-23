import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Dices,
  IdCard,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ENABLE_DEMO_LOGIN } from '../../config/app';
import { AuthAlert, AuthLabel, AuthHint, IconInput, PasswordStrengthMeter, SubmitButton } from './authUi';
import { todayLocal } from '../../utils/date';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const FIRST_NAMES_MALE = [
  'Nguyễn Văn An', 'Trần Quốc Bảo', 'Lê Hải Đăng', 'Phạm Minh Đức', 'Hoàng Gia Huy',
  'Vũ Đức Toàn', 'Đặng Minh Khôi', 'Bùi Quang Huy', 'Đỗ Thành Long', 'Ngô Tuấn Kiệt',
];

const FIRST_NAMES_FEMALE = [
  'Trần Thị Mai Hương', 'Nguyễn Thu Trang', 'Lê Bích Thảo', 'Phạm Quỳnh Anh', 'Hoàng Bảo Ngọc',
  'Vũ Hải Yến', 'Đặng Kim Ngân', 'Bùi Mỹ Linh', 'Đỗ Thanh Hà', 'Nguyễn Phương Thảo',
];

export const PatientRegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        color: 'bg-indigo-500',
        textColor: 'text-indigo-600',
      };
    }

    return {
      label: 'Rất mạnh',
      level: 100,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    };
  }, [password, passCriteria]);

  const registerErrors = useMemo(() => {
    const errs: string[] = [];
    if (!fullName.trim()) errs.push('Họ và tên không được để trống.');
    if (!dob) errs.push('Vui lòng chọn ngày sinh.');
    else if (dob > todayLocal()) errs.push('Ngày sinh không được ở tương lai.');
    if (!VN_PHONE_RE.test(phone.replace(/\s/g, ''))) {
      errs.push('Số điện thoại di động không hợp lệ (VD: 0912 345 678).');
    }
    if (!EMAIL_RE.test(email.trim())) errs.push('Email không hợp lệ.');
    if (!passCriteria.length) errs.push('Mật khẩu cần ít nhất 8 ký tự.');
    if (!passCriteria.uppercase) errs.push('Mật khẩu cần ít nhất 1 chữ hoa (A-Z).');
    if (!passCriteria.special) errs.push('Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#...).');
    if (password !== confirmPassword) errs.push('Mật khẩu xác nhận không khớp.');
    if (!agreeTerms) errs.push('Vui lòng đồng ý với Điều khoản dịch vụ và quy chế xử lý dữ liệu y tế.');
    return errs;
  }, [fullName, dob, phone, email, passCriteria, password, confirmPassword, agreeTerms]);

  const handleRandomFill = (profileType: 'RANDOM' | 'SENIOR' | 'YOUNG' = 'RANDOM') => {
    setError(null);
    setSuccessMsg(null);

    const isMale = Math.random() > 0.5;
    const namePool = isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
    const pickedName = namePool[Math.floor(Math.random() * namePool.length)];
    const pickedGender: 'MALE' | 'FEMALE' = isMale ? 'MALE' : 'FEMALE';

    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const emailPrefix = pickedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');
    const pickedEmail = `${emailPrefix}.${randomSuffix}@gmail.com`;

    const phonePrefixes = ['090', '091', '098', '037', '038', '086', '079'];
    const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const pickedPhone = `${randomPrefix}${Math.floor(Math.random() * 9000000 + 1000000)}`;

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
    const pickedDob = `${birthYear}-${birthMonth}-${birthDay}`;

    const generatedPassword = `Medi@Pass${Math.floor(Math.random() * 9000 + 1000)}!`;

    setFullName(pickedName);
    setGender(pickedGender);
    setEmail(pickedEmail);
    setPhone(pickedPhone);
    setDob(pickedDob);
    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setAgreeTerms(true);

    setSuccessMsg(
      `Đã điền dữ liệu mẫu (không phải người thật): ${pickedName} (${pickedGender === 'MALE' ? 'Nam' : 'Nữ'}, sinh năm ${birthYear})`
    );
  };

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
        password,
        gender,
      };
      const normalizedPhone = phone.replace(/\s/g, '');
      if (normalizedPhone) {
        payload.phone = normalizedPhone;
      }
      if (dob.trim()) {
        payload.dateOfBirth = dob.trim();
      }

      const res = await api.post('/auth/register', payload);
      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const token = res.data.data.token;
        setUser(user, token);
        setSuccessMsg(
          `Đăng ký thành công! Chúng tôi đã gửi email xác thực tới ${user.email}. Vui lòng mở hộp thư và xác thực email để có thể đặt lịch khám và thanh toán. Đang chuyển hướng...`
        );
        redirectTimerRef.current = setTimeout(() => {
          navigate('/patient');
        }, 2500);
      }
    } catch (err: unknown) {
      const details = (err as { response?: { data?: { error?: { details?: Record<string, string> } } } })?.response?.data?.error?.details;
      if (details && typeof details === 'object') {
        setError(Object.values(details).join('; '));
      } else {
        setError(getApiErrorMessage(err, 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin gửi lên.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <AuthAlert tone="error" title="Chưa đăng ký được">
          {error}
        </AuthAlert>
      )}
      {successMsg && <AuthAlert tone="success">{successMsg}</AuthAlert>}

      {ENABLE_DEMO_LOGIN && (
        <div className="p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Điền nhanh dữ liệu mẫu
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleRandomFill('RANDOM')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5" /> Ngẫu nhiên
            </button>
            <button
              type="button"
              onClick={() => handleRandomFill('SENIOR')}
              className="px-3 py-1.5 rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Người cao tuổi
            </button>
            <button
              type="button"
              onClick={() => handleRandomFill('YOUNG')}
              className="px-3 py-1.5 rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Thanh niên
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        <div className="min-w-0">
          <AuthLabel htmlFor="reg-name" required>
            Họ và tên bệnh nhân
          </AuthLabel>
          <IconInput id="reg-name" icon={UserIcon} type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
          <AuthHint>Khớp đúng với BHYT hoặc CCCD</AuthHint>
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="reg-dob" required>
            Ngày sinh
          </AuthLabel>
          <IconInput id="reg-dob" icon={Calendar} type="date" required max={todayLocal()} value={dob} onChange={(e) => setDob(e.target.value)} />
          <AuthHint>Dùng để phân chuẩn chỉ số sinh hóa</AuthHint>
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="reg-phone" required>
            Số điện thoại di động
          </AuthLabel>
          <IconInput id="reg-phone" icon={Phone} type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 678" />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="reg-email" required>
            Email nhận phân tích &amp; xác thực
          </AuthLabel>
          <IconInput id="reg-email" icon={Mail} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nguyena@gmail.com" />
        </div>

        <div className="min-w-0">
          <AuthLabel htmlFor="reg-password" required>
            Mật khẩu truy cập
          </AuthLabel>
          <IconInput
            id="reg-password"
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
          <AuthLabel htmlFor="reg-password2" required>
            Xác nhận mật khẩu
          </AuthLabel>
          <IconInput
            id="reg-password2"
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

        <fieldset className="sm:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="float-left mr-1 text-sm font-semibold text-slate-800">Giới tính:</legend>
          {(
            [
              ['MALE', 'Nam'],
              ['FEMALE', 'Nữ'],
              ['OTHER', 'Khác'],
            ] as const
          ).map(([value, text]) => (
            <label key={value} className="flex items-center gap-1.5 text-sm text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="patientGender"
                value={value}
                checked={gender === value}
                onChange={() => setGender(value)}
                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              {text}
            </label>
          ))}
        </fieldset>
      </div>

      <PasswordStrengthMeter strength={passwordStrength} criteria={passCriteria} />

      <p className="flex items-start gap-1.5 text-xs text-slate-600">
        <IdCard className="w-4 h-4 text-indigo-600 shrink-0" />
        Bạn có thể bổ sung số BHYT / CCCD trong mục “Hồ sơ y tế” sau khi đăng ký.
      </p>

      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
          Tôi đồng ý với <span className="font-semibold text-slate-900 underline">Điều khoản Dịch vụ</span> và chấp thuận quy chế xử lý{' '}
          <span className="font-semibold text-slate-900 underline">Chính sách bảo vệ dữ liệu sức khỏe</span>. Dữ liệu chỉ phục vụ mục đích hội chẩn lâm sàng.
        </label>
      </div>

      <SubmitButton
        disabled={loading || !agreeTerms}
        loading={loading}
        loadingText="Đang tạo tài khoản…"
        title={!agreeTerms ? 'Cần đồng ý điều khoản trước khi tạo tài khoản' : undefined}
      >
        <span>Tạo tài khoản</span>
        <ArrowRight className="w-4 h-4" />
      </SubmitButton>
    </form>
  );
};
