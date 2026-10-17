import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { AuthCard } from '../../components/auth/AuthCard';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      // Backend luôn trả cùng một thông báo, dù email có tồn tại hay không
      setSubmittedMessage(res.data?.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không gửi được yêu cầu. Vui lòng thử lại sau.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard icon={<KeyRound className="w-5 h-5" />} title="Quên mật khẩu" subtitle="Nhận liên kết đặt lại mật khẩu qua email">
      {submittedMessage ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex gap-3">
            <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{submittedMessage}</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần. Không nhận được email? Hãy kiểm tra thư mục thư rác hoặc thử lại sau vài phút.
          </p>
          <button
            type="button"
            onClick={() => setSubmittedMessage(null)}
            className="w-full py-2.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
          >
            Gửi lại với email khác
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Nhập email bạn đã dùng để đăng ký. Nếu email có trong hệ thống, chúng tôi sẽ gửi liên kết để bạn tạo mật khẩu mới.
          </p>
          <div>
            <label htmlFor="forgot-email" className="text-xs font-bold text-slate-700 block mb-1">
              Email tài khoản <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="forgot-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition shadow-sm"
          >
            {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
          </button>
        </form>
      )}

      <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-teal-700">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
      </Link>
    </AuthCard>
  );
};
