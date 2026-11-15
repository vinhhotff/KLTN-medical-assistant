import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ENABLE_DEMO_LOGIN } from '../../config/app';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-mono font-bold">LỖI ĐĂNG KÝ BỆNH NHÂN:</div>
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
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
              value={dob}
              onChange={(e) => setDob(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              className="w-full pl-9 pr-3 py-2.5 bg-[#F6F3EC] border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-slate-900 transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-1">
            Email nhận phân tích &amp; xác thực <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        {/* Gender Selection */}
        <div className="col-span-1 sm:col-span-2 flex items-center gap-4 py-0.5">
          <span className="font-mono text-[11px] uppercase font-bold text-slate-800">Giới tính:</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
            <input
              type="radio"
              name="patientGender"
              value="MALE"
              checked={gender === 'MALE'}
              onChange={() => setGender('MALE')}
              className="text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span>Nam</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
            <input
              type="radio"
              name="patientGender"
              value="FEMALE"
              checked={gender === 'FEMALE'}
              onChange={() => setGender('FEMALE')}
              className="text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span>Nữ</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-semibold">
            <input
              type="radio"
              name="patientGender"
              value="OTHER"
              checked={gender === 'OTHER'}
              onChange={() => setGender('OTHER')}
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

      <p className="text-[11px] text-slate-600 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] text-teal-600">badge</span>
        Bạn có thể bổ sung số BHYT / CCCD trong mục &quot;Hồ sơ y tế&quot; sau khi đăng ký.
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
          Tôi đồng ý với <span className="text-slate-900 font-bold underline">Điều khoản Dịch vụ</span> và chấp thuận quy chế xử lý{' '}
          <span className="text-slate-900 font-bold underline">Dữ liệu Y tế e-PHI chuẩn HIPAA / Bộ Y Tế</span>. Dữ liệu chỉ phục vụ mục đích hội chẩn lâm sàng.
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
  );
};
