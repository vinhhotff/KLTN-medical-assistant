import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, LockKeyhole } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { AuthCard } from '../../components/auth/AuthCard';
import { readTokenFromUrl, useStripTokenFromUrl } from '../../hooks/useUrlToken';

const MIN_PASSWORD_LENGTH = 8;

type PageState = 'checking' | 'invalid' | 'ready';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [token] = useState<string | null>(readTokenFromUrl);
  useStripTokenFromUrl();
  const [pageState, setPageState] = useState<PageState>(token ? 'checking' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get('/auth/reset-password/validate', { params: { token } })
      .then((res) => {
        if (!cancelled) setPageState(res.data?.data?.valid ? 'ready' : 'invalid');
      })
      .catch((err) => {
        if (cancelled) return;
        // Không kiểm tra được (mạng/429): vẫn cho nhập, backend sẽ kiểm tra lại khi gửi
        setPageState('ready');
        setError(getApiErrorMessage(err, 'Không kiểm tra được liên kết. Bạn vẫn có thể thử đặt mật khẩu mới.'));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      navigate('/login?reset=success', { replace: true });
    } catch (err) {
      const code = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { code?: string } } | undefined)?.error?.code
        : undefined;
      if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        setPageState('invalid');
      } else {
        setError(getApiErrorMessage(err, 'Không đặt lại được mật khẩu. Vui lòng thử lại.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard icon={<LockKeyhole className="w-5 h-5" />} title="Đặt lại mật khẩu" subtitle="Tạo mật khẩu mới cho tài khoản MediAssist AI">
      {pageState === 'checking' && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra liên kết...
        </div>
      )}

      {pageState === 'invalid' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Liên kết đã hết hạn hoặc không hợp lệ</p>
              <p className="text-xs mt-1">
                Liên kết đặt lại mật khẩu chỉ có hiệu lực 30 phút và chỉ dùng được một lần. Vui lòng yêu cầu liên kết mới.
              </p>
            </div>
          </div>
          <Link
            to="/forgot-password"
            className="block w-full text-center py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm"
          >
            Yêu cầu liên kết mới
          </Link>
        </div>
      )}

      {pageState === 'ready' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="text-xs font-bold text-slate-700 block mb-1">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-[11px] mt-1 ${password.length >= MIN_PASSWORD_LENGTH ? 'text-emerald-600' : 'text-slate-400'}`}>
              {password.length}/{MIN_PASSWORD_LENGTH} ký tự tối thiểu
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="text-xs font-bold text-slate-700 block mb-1">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition"
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-[11px] mt-1 text-rose-600">Mật khẩu xác nhận không khớp.</p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition shadow-sm"
          >
            {submitting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </button>
        </form>
      )}

      <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-teal-700">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
      </Link>
    </AuthCard>
  );
};
