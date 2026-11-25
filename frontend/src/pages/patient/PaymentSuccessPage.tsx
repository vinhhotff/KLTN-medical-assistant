import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ArrowRight,
  Printer,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Calendar,
  Ban,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  cancelPendingTransaction,
  getApiErrorMessage,
  type PaymentReceiptDto,
} from '../../services/api';

const MAX_VERIFY_ATTEMPTS = 4;
const VERIFY_POLL_DELAY_MS = 1500;

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const txCode = searchParams.get('tx');
  const sessionId = searchParams.get('session_id');
  const isSandboxParam =
    searchParams.get('sandbox') === 'stripe' || searchParams.get('sandbox') === 'true';
  const isCancelled =
    searchParams.get('cancelled') === '1' || searchParams.get('cancelled') === 'true';

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(1);
  const [receipt, setReceipt] = useState<PaymentReceiptDto | null>(null);
  const [cancelledTx, setCancelledTx] = useState<PaymentReceiptDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOnError, setCancellingOnError] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const runVerification = useCallback(
    async (currentAttempt = 1) => {
      if (cancelledRef.current) return;

      if (!txCode) {
        setError('Không tìm thấy thông tin mã giao dịch trong yêu cầu điều hướng.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setAttempt(currentAttempt);

      try {
        const res = await api.post('/payments/verify', {
          transactionCode: txCode,
          sessionId: sessionId || undefined,
        });
        const data = res.data?.data as PaymentReceiptDto | undefined;

        if (!data) {
          setError('Không thể xác nhận trạng thái giao dịch từ cổng thanh toán.');
          setLoading(false);
          return;
        }

        const upperStatus = (data.status || '').toUpperCase();
        if (upperStatus === 'PENDING' && currentAttempt < MAX_VERIFY_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => {
            void runVerification(currentAttempt + 1);
          }, VERIFY_POLL_DELAY_MS);
          return;
        }

        if (upperStatus === 'FAILED' || upperStatus === 'CANCELLED') {
          setError(data.message || 'Giao dịch thanh toán không thành công hoặc đã bị hủy.');
          setLoading(false);
          return;
        }

        setReceipt(data);
        setLoading(false);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const isTransient = !status || status >= 500 || status === 429;
        if (isTransient && currentAttempt < MAX_VERIFY_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => {
            void runVerification(currentAttempt + 1);
          }, VERIFY_POLL_DELAY_MS);
          return;
        }

        setError(
          getApiErrorMessage(
            err,
            'Quá trình đối soát giao dịch gặp lỗi. Vui lòng kiểm tra lại.'
          )
        );
        setLoading(false);
      }
    },
    [txCode, sessionId]
  );

  useEffect(() => {
    cancelledRef.current = false;
    clearPollTimer();

    if (isCancelled) {
      const releasePending = async () => {
        setLoading(true);
        setError(null);
        if (txCode) {
          const released = await cancelPendingTransaction(txCode);
          if (!cancelledRef.current && released) {
            setCancelledTx(released);
          }
        }
        if (!cancelledRef.current) {
          setLoading(false);
        }
      };
      void releasePending();
    } else {
      void runVerification(1);
    }

    return () => {
      cancelledRef.current = true;
      clearPollTimer();
    };
  }, [isCancelled, txCode, runVerification]);

  const handleCancelAndReturn = async () => {
    if (!txCode || cancellingOnError) {
      navigate('/patient/documents');
      return;
    }
    setCancellingOnError(true);
    const released = await cancelPendingTransaction(txCode);
    setCancellingOnError(false);
    const target = released?.orderType === 'APPOINTMENT_FEE' ? '/patient' : '/patient/documents';
    navigate(target);
  };

  const formatCurrency = (amount?: number, curr?: string) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: curr || 'VND',
    }).format(amount);
  };

  const getOrderDescription = (orderType?: string) => {
    if (orderType === 'QUOTA_PURCHASE') {
      return 'Gói Phân Tích Hồ Sơ Cận Lâm Sàng & Hội Viên VIP';
    }
    if (orderType === 'APPOINTMENT_FEE') {
      return 'Phí Khám Tư Vấn Chuyên Khoa Bác Sĩ Tuyến Trung Ương';
    }
    return 'Dịch Vụ Y Tế Kỹ Thuật Số MediAssist-AI';
  };

  const isMockMode = Boolean(
    isSandboxParam ||
      receipt?.mode === 'MOCK' ||
      (sessionId && sessionId.startsWith('cs_test_mock_'))
  );
  const isRealStripe = Boolean(
    receipt && !isMockMode && (receipt.mode === 'REAL' || receipt.paymentGateway === 'STRIPE')
  );
  const returnPath =
    (receipt?.orderType || cancelledTx?.orderType) === 'APPOINTMENT_FEE'
      ? '/patient'
      : '/patient/documents';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full">
        {/* Loading / Polling State */}
        {loading && (
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isCancelled ? 'Đang hủy phiên thanh toán...' : 'Đang đối soát giao dịch y tế...'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {isCancelled
                ? 'Hệ thống đang giải phóng giao dịch chờ để bạn có thể đặt hoặc thanh toán lại.'
                : attempt > 1
                ? `Đang đồng bộ trạng thái từ Stripe Checkout (lần kiểm tra ${attempt}/${MAX_VERIFY_ATTEMPTS})...`
                : 'Hệ thống đang kiểm tra chữ ký điện tử và xác nhận giao dịch từ Cổng thanh toán. Quá trình này mất vài giây.'}
            </p>
          </div>
        )}

        {/* Cancelled State */}
        {!loading && isCancelled && (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-amber-200/80 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Ban className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider">
                Đã Hủy Thanh Toán
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Bạn đã hủy phiên thanh toán trên Stripe
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Không có khoản tiền nào bị trừ. Giao dịch chờ đã được giải phóng để bạn có thể thử thanh toán lại bất cứ lúc nào.
              </p>
              {txCode && (
                <p className="text-xs text-slate-500 pt-1">
                  Mã giao dịch: <strong className="font-mono text-slate-800">{txCode}</strong>
                  {cancelledTx?.amount ? ` • ${formatCurrency(cancelledTx.amount, cancelledTx.currency)}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate(returnPath)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>
                  {returnPath === '/patient' ? 'Quay Lại Lịch Hẹn Để Thử Lại' : 'Quay Lại Chọn Gói Quét'}
                </span>
              </button>
              <Link
                to="/patient"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
              >
                Bảng Điều Khiển
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isCancelled && error && (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-rose-100 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Giao dịch chưa hoàn tất</h2>
              <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">
                {error}
              </p>
              {txCode && (
                <p className="text-xs text-slate-500">
                  Mã giao dịch: <strong className="font-mono text-slate-700">{txCode}</strong>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleCancelAndReturn}
                disabled={cancellingOnError}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer disabled:opacity-50"
              >
                {cancellingOnError ? 'Đang hủy giao dịch chờ...' : 'Hủy & Về Trang Dịch Vụ'}
              </button>
              {txCode && (
                <button
                  type="button"
                  onClick={() => void runVerification(1)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Thử Kiểm Tra Lại</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && !isCancelled && receipt && (
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 space-y-8 animate-fadeIn">
            {/* Success Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/70 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã Thanh Toán Thành Công
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                  {formatCurrency(receipt.amount, receipt.currency)}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Mã giao dịch: <strong className="font-mono text-slate-800">{receipt.transactionCode}</strong>
                </p>
              </div>
            </div>

            {/* Stripe Mode Notice */}
            {isMockMode ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Stripe Sandbox Test Mode:</strong> Giao dịch thử nghiệm thành công với thẻ test{' '}
                  <code>4242 4242 4242 4242</code>. Hạn ngạch và quyền lợi đã kích hoạt tức thì.
                </span>
              </div>
            ) : isRealStripe ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>
                  <strong>Stripe Checkout (Real Mode):</strong> Phiên thanh toán đã được xác thực trực tiếp qua Stripe API.
                </span>
              </div>
            ) : null}

            {/* Receipt Summary Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Loại dịch vụ</span>
                <span className="font-bold text-slate-800 text-right">{getOrderDescription(receipt.orderType)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Phương thức thanh toán</span>
                <span className="font-bold text-teal-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  {receipt.paymentMethod} ({receipt.paymentGateway})
                  {receipt.mode && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      {receipt.mode}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Trạng thái ghi sổ</span>
                <span className="font-bold text-emerald-600 uppercase font-mono">{receipt.status || 'COMPLETED'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Thông điệp hệ thống</span>
                <span className="text-slate-700 italic text-right max-w-[280px]">{receipt.message}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {receipt.orderType === 'APPOINTMENT_FEE' ? (
                  <>
                    <Link
                      to="/patient"
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Xem Lịch Hẹn Của Tôi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/patient/documents"
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Đọc Hồ Sơ Xét Nghiệm</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/patient/documents"
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Dùng Lượt Quét Ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/patient"
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Bảng Điều Khiển Của Tôi</span>
                    </Link>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Biên Lai Điện Tử</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
