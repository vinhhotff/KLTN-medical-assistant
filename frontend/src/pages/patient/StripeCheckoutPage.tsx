import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Check,
  Building2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  cancelPendingTransaction,
  getTransactionDetails,
  type PaymentReceiptDto,
} from '../../services/api';

export function StripeCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const txCode = searchParams.get('tx') || '';
  const sessionId = searchParams.get('session_id') || '';

  const [txDetails, setTxDetails] = useState<PaymentReceiptDto | null>(null);
  const [loadingTx, setLoadingTx] = useState(true);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('NGUYEN VAN A');
  const [country, setCountry] = useState('VN');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch transaction details
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!txCode) {
        setLoadingTx(false);
        return;
      }
      try {
        const details = await getTransactionDetails(txCode);
        if (isMounted) {
          setTxDetails(details);
          if (details?.status === 'COMPLETED') {
            navigate(`/payment/success?tx=${encodeURIComponent(txCode)}&session_id=${encodeURIComponent(sessionId)}&sandbox=stripe`, { replace: true });
          }
        }
      } catch {
        // fallback to query params
      } finally {
        if (isMounted) setLoadingTx(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [txCode, sessionId, navigate]);

  // Card brand detection
  const cardBrand = useMemo<'visa' | 'mastercard' | 'jcb' | 'unknown'>(() => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^(352[89]|35[3-8][0-9])/.test(clean)) return 'jcb';
    return 'unknown';
  }, [cardNumber]);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
    setFormError(null);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      const month = parseInt(raw.slice(0, 2), 10);
      if (month > 12) raw = '12' + raw.slice(2);
      if (month === 0) raw = '01' + raw.slice(2);
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiry(raw);
    setFormError(null);
  };

  // Format CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(raw);
    setFormError(null);
  };

  // Quick fill sandbox buttons
  const fillSuccessCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
    setCardholderName('NGUYEN VAN A');
    setFormError(null);
  };

  const fillDeclinedCard = () => {
    setCardNumber('4000 0000 0000 0002');
    setExpiry('12/28');
    setCvc('999');
    setCardholderName('NGUYEN VAN B');
    setFormError(null);
  };

  // Cancel flow
  const handleCancel = async () => {
    if (cancelling) return;
    try {
      setCancelling(true);
      if (txCode) {
        await cancelPendingTransaction(txCode);
      }
      navigate(`/payment/cancel?tx=${encodeURIComponent(txCode)}`, { replace: true });
    } catch {
      navigate('/patient', { replace: true });
    } finally {
      setCancelling(false);
    }
  };

  // Submit payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 16) {
      setFormError('Vui lòng nhập đủ 16 chữ số thẻ thanh toán.');
      return;
    }
    if (!expiry || expiry.length < 5) {
      setFormError('Vui lòng nhập ngày hết hạn hợp lệ (MM/YY).');
      return;
    }
    if (!cvc || cvc.length < 3) {
      setFormError('Vui lòng nhập mã bảo mật CVC (3-4 chữ số).');
      return;
    }
    if (!cardholderName.trim()) {
      setFormError('Vui lòng nhập tên chủ thẻ in trên mặt thẻ.');
      return;
    }

    // Check for simulated decline card
    if (cleanNumber === '4000000000000002') {
      setSubmitting(true);
      setSubmitStep('Đang kiểm tra thông tin thẻ với ngân hàng phát hành...');
      setTimeout(() => {
        setSubmitting(false);
        setFormError('Thẻ của bạn đã bị từ chối do không đủ số dư hoặc ngân hàng từ chối giao dịch (card_declined). Vui lòng thử thẻ khác.');
      }, 1200);
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setSubmitStep('Đang mã hóa thông tin thẻ theo chuẩn PCI-DSS Level 1...');
      await new Promise((r) => setTimeout(r, 600));

      setSubmitStep('Đang ủy quyền giao dịch qua Stripe Sandbox Gateway...');
      await new Promise((r) => setTimeout(r, 800));

      setSubmitStep('Xác thực 3D-Secure thành công. Đang hoàn tất đơn hàng...');
      await new Promise((r) => setTimeout(r, 500));

      // Redirect to PaymentSuccessPage to trigger verify and fulfillment
      const targetUrl = `/payment/success?session_id=${encodeURIComponent(sessionId || 'cs_test_mock')}&tx=${encodeURIComponent(txCode)}&sandbox=stripe`;
      navigate(targetUrl, { replace: true });
    } catch {
      setSubmitting(false);
      setFormError('Không thể hoàn tất thanh toán. Vui lòng kiểm tra lại kết nối mạng.');
    }
  };

  const amount = txDetails?.amount ?? 350000;
  const currency = txDetails?.currency ?? 'VND';
  const orderType = txDetails?.orderType ?? 'APPOINTMENT_FEE';

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Test Mode Banner */}
      <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-600/20 shadow-xs">
        <span className="px-1.5 py-0.5 bg-amber-950 text-amber-100 rounded text-[10px] font-bold tracking-wide uppercase">
          Stripe Test Mode
        </span>
        <span>
          Môi trường thử nghiệm Sandbox: Không sử dụng số thẻ thực tế. Nhập thẻ test bên dưới để hoàn tất giao dịch.
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-10 flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Left Column: Order Summary */}
        <div className="w-full lg:w-5/12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting || cancelling}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại MediAssist</span>
              </button>
              <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-100">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Stripe Verified</span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Thanh toán dịch vụ y tế
              </p>
              <h1 className="text-2xl font-black text-slate-900 mt-1">MediAssist-AI</h1>
              <p className="text-3xl font-extrabold text-indigo-950 mt-3 font-mono">
                {loadingTx ? (
                  <span className="inline-flex items-center gap-2 text-slate-400 text-lg">
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tải...
                  </span>
                ) : (
                  formatMoney(amount)
                )}
              </p>
            </div>

            <div className="divide-y divide-slate-100 border-t border-b border-slate-100 py-3 text-xs space-y-2">
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Dịch vụ:</span>
                <span className="font-bold text-slate-800 text-right">
                  {orderType === 'APPOINTMENT_FEE'
                    ? 'Phí tư vấn khám trực tuyến Telehealth'
                    : 'Gói nạp lượt quét hồ sơ cận lâm sàng'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Mã giao dịch:</span>
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  {txCode || 'TX-PENDING'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Thuế GTGT (0% y tế):</span>
                <span className="font-semibold text-slate-700">0 ₫</span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-sm text-slate-900">
                <span>Tổng thanh toán:</span>
                <span className="font-mono text-indigo-700">{formatMoney(amount)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>Bảo mật giao dịch tiêu chuẩn quốc tế</span>
              </div>
              <p>
                Dữ liệu thanh toán được xử lý bởi hạ tầng bảo mật của Stripe. Thông tin thẻ không được lưu trữ trên máy chủ MediAssist.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Powered by <strong>stripe</strong></span>
            <span className="font-mono">{currency}</span>
          </div>
        </div>

        {/* Right Column: Stripe Checkout Card Form */}
        <div className="w-full lg:w-7/12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Chi tiết thẻ thanh toán</h2>
              <p className="text-xs text-slate-500 mt-0.5">Hỗ trợ các loại thẻ thanh toán quốc tế</p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className={`px-2 py-1 rounded text-[11px] font-bold border transition ${cardBrand === 'visa' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                VISA
              </span>
              <span className={`px-2 py-1 rounded text-[11px] font-bold border transition ${cardBrand === 'mastercard' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                MC
              </span>
              <span className={`px-2 py-1 rounded text-[11px] font-bold border transition ${cardBrand === 'jcb' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                JCB
              </span>
            </div>
          </div>

          {/* Quick Sandbox Autofill Chips */}
          <div className="mb-6 p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Điền nhanh thẻ thử nghiệm Stripe Sandbox:
              </span>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                1-Click Test
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={fillSuccessCard}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thẻ Visa Test (4242) - Thành công</span>
              </button>
              <button
                type="button"
                onClick={fillDeclinedCard}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Thẻ Test Từ Chối (4000)</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Giao dịch không thành công</p>
                <p className="mt-0.5 leading-relaxed">{formError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số thẻ thanh toán</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={submitting}
                  placeholder="4242  4242  4242  4242"
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded">
                  {cardBrand.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Expiry and CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày hết hạn (MM/YY)</label>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={handleExpiryChange}
                  disabled={submitting}
                  placeholder="MM / YY"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã bảo mật CVC</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={handleCvcChange}
                    disabled={submitting}
                    placeholder="123"
                    className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên chủ thẻ (in trên thẻ)</label>
              <input
                type="text"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                disabled={submitting}
                placeholder="NGUYEN VAN A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold uppercase placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quốc gia hoặc khu vực</label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition appearance-none cursor-pointer"
                >
                  <option value="VN">Việt Nam (Vietnam)</option>
                  <option value="US">Hoa Kỳ (United States)</option>
                  <option value="SG">Singapore</option>
                  <option value="JP">Nhật Bản (Japan)</option>
                  <option value="KR">Hàn Quốc (South Korea)</option>
                  <option value="AU">Úc (Australia)</option>
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting || cancelling || loadingTx}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{submitStep || 'Đang xác thực giao dịch...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Thanh toán {formatMoney(amount)}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Real Stripe Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Ghi chú tích hợp Stripe:</strong> Khi bạn cung cấp mã API Key thật của Stripe (<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">sk_test_...</code>) trong tệp <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">.env</code>, hệ thống sẽ tự động chuyển hướng người dùng trực tiếp sang trang hosted chính thức <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">checkout.stripe.com</code> của Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        © 2026 MediAssist-AI Medical Assistant. Được bảo vệ bởi Stripe Checkout Sandbox.
      </footer>
    </div>
  );
}
export default StripeCheckoutPage;
