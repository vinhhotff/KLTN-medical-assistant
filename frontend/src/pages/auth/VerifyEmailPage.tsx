import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCard } from '../../components/auth/AuthCard';
import { readTokenFromUrl, useStripTokenFromUrl } from '../../hooks/useUrlToken';

type VerifyState = 'verifying' | 'success' | 'error';

export const VerifyEmailPage: React.FC = () => {
  const { isAuthenticated, user, refreshCurrentUser } = useAuthStore();
  const [token] = useState<string | null>(readTokenFromUrl);
  useStripTokenFromUrl();
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState<string>(token ? '' : 'Liên kết xác thực không hợp lệ hoặc thiếu mã xác thực.');
  // Chặn gọi API 2 lần khi React StrictMode mount lại component ở môi trường dev
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    api
      .post('/auth/verify-email', { token })
      .then(async (res) => {
        setState('success');
        setMessage(res.data?.message || 'Xác thực email thành công!');
        if (useAuthStore.getState().isAuthenticated) {
          await refreshCurrentUser();
        }
      })
      .catch((err) => {
        setState('error');
        setMessage(getApiErrorMessage(err, 'Không xác thực được email. Vui lòng thử lại.'));
      });
  }, [token, refreshCurrentUser]);

  const homePath = !isAuthenticated ? '/login' : user?.role === 'DOCTOR' ? '/doctor' : user?.role === 'ADMIN' ? '/admin' : '/patient';

  return (
    <AuthCard icon={<MailCheck className="w-5 h-5" />} title="Xác thực email" subtitle="Bảo vệ tài khoản và hồ sơ sức khỏe của bạn">
      {state === 'verifying' && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực email...
        </div>
      )}

      {state === 'success' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{message}</p>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Liên kết xác thực có hiệu lực 24 giờ và chỉ liên kết mới nhất dùng được. Hãy đăng nhập rồi bấm
            <strong> "Gửi lại email xác thực"</strong> ở đầu trang để nhận liên kết mới.
          </p>
        </div>
      )}

      {state !== 'verifying' && (
        <Link
          to={homePath}
          className="block w-full text-center py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm"
        >
          {isAuthenticated ? 'Về trang của tôi' : 'Đăng nhập'}
        </Link>
      )}
    </AuthCard>
  );
};
