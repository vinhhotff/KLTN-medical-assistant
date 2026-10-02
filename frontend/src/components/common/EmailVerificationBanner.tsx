import React, { useEffect, useState } from 'react';
import { MailWarning, Send } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useEmailVerification } from '../../hooks/useEmailVerification';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Banner nhắc bệnh nhân xác thực email. Hiển thị dưới MedicalDisclaimerBanner, không thay thế banner đó.
 */
export const EmailVerificationBanner: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const { isUnverified } = useEmailVerification();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!isUnverified || !user) return null;

  const handleResend = async () => {
    setSending(true);
    setFeedback(null);
    try {
      const res = await api.post('/auth/resend-verification');
      setFeedback({ type: 'success', text: res.data?.message || 'Đã gửi lại email xác thực.' });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // Trường hợp đã xác thực ở tab khác: cập nhật để ẩn banner
      void refreshCurrentUser();
    } catch (err) {
      setFeedback({ type: 'error', text: getApiErrorMessage(err, 'Không gửi lại được email xác thực. Vui lòng thử lại sau.') });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs py-2.5 px-4" role="status">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2">
          <MailWarning className="w-4 h-4 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
          <p>
            <strong>Email chưa được xác thực.</strong> Vui lòng mở liên kết MediAssist đã gửi tới{' '}
            <strong>{user.email}</strong> để có thể đặt lịch khám và thanh toán.
            {feedback && (
              <span className={`ml-2 font-semibold ${feedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {feedback.text}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending || cooldown > 0}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Đang gửi...' : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại email xác thực'}
        </button>
      </div>
    </div>
  );
};
