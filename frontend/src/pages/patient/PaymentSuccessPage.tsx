import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, FileText, ArrowRight, Printer, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface PaymentReceipt {
  transactionCode: string;
  orderType: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentGateway: string;
  message: string;
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const txCode = searchParams.get('tx');
  const sessionId = searchParams.get('session_id');
  const isSandbox = searchParams.get('sandbox') === 'stripe' || searchParams.get('sandbox') === 'true';

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyTransaction = async () => {
      if (!txCode) {
        setError('Không tìm thấy thông tin mã giao dịch trong yêu cầu điều hướng.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.post('/payments/verify', {
          transactionCode: txCode,
          sessionId: sessionId || undefined,
        });

        if (res.data?.data) {
          setReceipt(res.data.data);
        } else {
          setError('Không thể xác nhận trạng thái giao dịch từ cổng thanh toán.');
        }
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
        setError(axiosError.response?.data?.error?.message || 'Quá trình đối soát giao dịch gặp lỗi. Vui lòng kiểm tra lại.');
      } finally {
        setLoading(false);
      }
    };

    verifyTransaction();
  }, [txCode, sessionId]);

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
    } else if (orderType === 'APPOINTMENT_FEE') {
      return 'Phí Khám Tư Vấn Chuyên Khoa Bác Sĩ Tuyến Trung Ương';
    }
    return 'Dịch Vụ Y Tế Kỹ Thuật Số MediAssist-AI';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Đang đối soát giao dịch y tế...</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Hệ thống đang kiểm tra chữ ký điện tử và xác nhận giao dịch từ Cổng thanh toán. Quá trình này mất vài giây.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-rose-100 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Giao dịch chưa hoàn tất</h2>
              <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">
                {error}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => navigate('/patient/documents')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
              >
                Về Trang Dịch Vụ
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-xs"
              >
                Thử Kiểm Tra Lại
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && receipt && (
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

            {/* Sandbox Notice */}
            {isSandbox && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Stripe Sandbox Test Mode:</strong> Giao dịch thử nghiệm thành công với thẻ test <code>4242 4242 4242 4242</code>. Hạn ngạch và quyền lợi đã kích hoạt tức thì.
                </span>
              </div>
            )}

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
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Trạng thái ghi sổ</span>
                <span className="font-bold text-emerald-600 uppercase font-mono">COMPLETED</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Thông điệp hệ thống</span>
                <span className="text-slate-700 italic text-right max-w-[280px]">{receipt.message}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
