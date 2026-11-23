import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  X,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Printer,
  RotateCcw,
  ExternalLink,
  Zap,
  Crown,
  QrCode,
  CreditCard,
  Wallet,
  BadgeCheck,
  TriangleAlert,
  FileQuestion,
  Download,
  Image as ImageIcon,
  Plus,
  Trash2,
  Users,
  Star,
  Camera,
  Info,
  Lock,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  Loader2,
} from 'lucide-react';
import { api, EMAIL_NOT_VERIFIED_MESSAGE, EMAIL_NOT_VERIFIED_TOOLTIP, isEmailNotVerified } from '../../services/api';
import { useEmailVerification } from '../../hooks/useEmailVerification';
import { EmailNotVerifiedHint } from '../../components/common/EmailNotVerifiedHint';
import { DocumentFileAccessError, openDocumentFile } from '../../services/documentFileService';
import { useAuthStore } from '../../store/useAuthStore';
import { BookingModal, type BookableDoctor } from '../../components/booking/BookingModal';
import { Skeleton, useToast } from '../../components/ui';
import { formatPackagePrice, type PackageCode, type ScanPackage } from '../../config/pricing';
import { useScanPackages } from '../../hooks/useScanPackages';
import { getApiErrorMessage, isQuotaError, isRetryableError } from '../../utils/apiError';
import { devLog } from '../../utils/logger';
import { formatRating, formatVnd } from '../../utils/display';

/** Accepted upload types: extension → MIME types browsers report for it. */
const ACCEPTED_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
};
const MIN_FILE_BYTES = 100;

const formatMoney = (amount: number, currency: string) =>
  currency === 'VND' ? formatPackagePrice(amount) : `${amount.toLocaleString('vi-VN')} ${currency}`;

/** Scan entitlement derived from the package data (not from marketing copy). */
const packageEntitlement = (pkg: ScanPackage) =>
  pkg.unlimitedScans
    ? `Quét không giới hạn${pkg.durationDays ? ` trong ${pkg.durationDays} ngày` : ''}`
    : pkg.scans
    ? `+${pkg.scans} lượt quét`
    : pkg.description;

/** PaymentResponseDto.amount is a BigDecimal: number in JSON, tolerate a numeric string. */
const parseAmount = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

type AnalysisErrorKind = 'validation' | 'quota' | 'retryable' | 'other';

/** Marketing copy per package code; name, price and duration come from GET /payments/packages (fallback: config/pricing). */
const PACKAGE_DISPLAY: Record<PackageCode, { tag: string; badge?: string; highlights: string[]; cta: string; tone: 'slate' | 'teal' | 'amber' }> = {
  BASIC_5: {
    tag: 'Gói lẻ',
    highlights: ['Cộng thêm 5 lượt quét', 'Bóc tách chỉ số xét nghiệm', 'Gợi ý bác sĩ phù hợp'],
    cta: 'Mua 5 lượt',
    tone: 'slate',
  },
  VIP_MONTHLY: {
    tag: 'VIP 30 ngày',
    badge: 'Phổ biến',
    highlights: ['Quét không giới hạn trong 30 ngày', 'Tóm tắt gửi kèm khi đặt lịch'],
    cta: 'Đăng ký VIP 30 ngày',
    tone: 'teal',
  },
  VIP_ENTERPRISE: {
    tag: 'VIP 90 ngày',
    highlights: ['Quét không giới hạn trong 90 ngày', 'Phù hợp theo dõi bệnh mạn tính'],
    cta: 'Đăng ký VIP 90 ngày',
    tone: 'amber',
  },
};
import { Link, useSearchParams } from 'react-router-dom';
import type { PatientDocumentItem } from '../../types/patient';
import { placeOnRange } from '../../utils/labRange';

interface AbnormalIndicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'ELEVATED' | 'NORMAL' | 'LOW';
  clinicalSignificance: string;
  loincCode?: string;
  bytReferenceRange?: string;
  scientificBasis?: string;
}

interface DoctorMatch {
  doctorId?: string;
  id?: string;
  fullName: string;
  bio: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number | null;
  similarityScore: number;
  specialties: string[];
  academicTitle?: string;
  hospitalAffiliation?: string;
  rating?: number;
  reviewCount?: number;
  aiRecommended?: boolean;
  aiRecommendationReason?: string;
}

interface DocumentPatientAnalysis {
  sourceFileName: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  hospitalName?: string;
  departmentName?: string;
  orderingDoctor?: string;
  testDate?: string;
  sidCode?: string;
  deviceModel?: string;
  clinicalSummary: string;
  plainLanguageExplanation: string;
  indicators: AbnormalIndicator[];
  recommendedSpecialtySlug?: string;
  recommendedSpecialtyName?: string;
  doctorRecommendationReason?: string;
  matchedDoctors: DoctorMatch[];
  suggestedQuestions: string[];
}

interface AnalysisResult {
  documentId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  clinicalSummary: string;
  plainLanguageExplanation: string;
  indicators: AbnormalIndicator[];
  recommendedSpecialtySlug: string;
  recommendedSpecialtyName: string;
  suggestedQuestions: string[];
  matchedDoctors: DoctorMatch[];
  hasFile?: boolean;
  cachedResult?: boolean;
  modelUsed?: string;
  doctorRecommendationReason?: string;
  hospitalName?: string;
  departmentName?: string;
  orderingDoctor?: string;
  testDate?: string;
  sidCode?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  deviceModel?: string;
  filesCount?: number;
  fileNames?: string[];
  multiPatientDetected?: boolean;
  patientAnalyses?: DocumentPatientAnalysis[];
}

interface UserQuota {
  scanQuota: number;
  subscriptionTier: string;
  vipValidUntil: string | null;
  vip: boolean;
  hasQuota: boolean;
}

export const DocumentSummarizerPage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const { isUnverified } = useEmailVerification();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('focusId');
  const [loadingFocusDoc, setLoadingFocusDoc] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const file = selectedFiles[0] || null;
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setErrorText] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AnalysisErrorKind>('other');
  const setError = (message: string | null, kind: AnalysisErrorKind = 'validation') => {
    setErrorText(message);
    setErrorKind(kind);
  };
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [activePatientIndex, setActivePatientIndex] = useState<number>(0);

  // Auto-load document if focusId is present in URL
  useEffect(() => {
    if (focusId) {
      const loadFocusDocument = async () => {
        try {
          setLoadingFocusDoc(true);
          const res = await api.get(`/documents/${focusId}/analysis`);
          if (res.data?.data) {
            setAnalysis(res.data.data);
            setTimeout(() => {
              const el = document.getElementById('analysis-results');
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          }
        } catch (err) {
          devLog.warn('Could not load analysis for focusId:', focusId, err);
          toast.error(getApiErrorMessage(err, 'Không mở được kết quả phân tích của tài liệu này.'));
        } finally {
          setLoadingFocusDoc(false);
        }
      };
      loadFocusDocument();
    }
  }, [focusId]);

  // Progressive Visual Pipeline Stepper Timer
  useEffect(() => {
    if (!analyzing) {
      setAnalysisStage(0);
      return;
    }
    const t1 = setTimeout(() => setAnalysisStage(1), 900);
    const t2 = setTimeout(() => setAnalysisStage(2), 2400);
    const t3 = setTimeout(() => setAnalysisStage(3), 4400);
    const t4 = setTimeout(() => setAnalysisStage(4), 6800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [analyzing]);

  // Quota & Commercial Monetization State
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Sandbox Payment Checkout Modal State
  const { packages: scanPackages, source: packageSource, loading: packagesLoading } = useScanPackages();
  const [selectedPaymentPackage, setSelectedPaymentPackage] = useState<ScanPackage | null>(null);
  /** Amount the backend will actually charge (POST /payments/checkout), once known */
  const [chargedAmount, setChargedAmount] = useState<{ amount: number; currency: string } | null>(null);
  /** Checkout created but held because its amount differs from the displayed price */
  const [pendingTx, setPendingTx] = useState<{ transactionCode: string; gatewayReference?: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'VIETQR' | 'VNPAY' | 'MOMO'>('STRIPE');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const methodLocked = pendingTx !== null;

  // Analysis Success Notification Banner
  const [analysisSuccessNotification, setAnalysisSuccessNotification] = useState<{
    fileName: string;
    indicatorsCount: number;
    specialtyName: string;
    matchedDoctorsCount: number;
    modelUsed?: string;
  } | null>(null);

  // Random Meddies PDF Download State
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const closeCheckout = () => {
    setSelectedPaymentPackage(null);
    setChargedAmount(null);
    setPendingTx(null);
    setPaymentError(null);
  };

  const verifyPayment = async (tx: { transactionCode: string; gatewayReference?: string }, pkg: ScanPackage) => {
    const verifyRes = await api.post('/payments/verify', {
      transactionCode: tx.transactionCode,
      sessionId: tx.gatewayReference,
    });
    if (!verifyRes.data?.success) {
      setPaymentError(verifyRes.data?.message || 'Chưa xác nhận được thanh toán. Nếu đã chuyển khoản, vui lòng chờ vài phút rồi kiểm tra lại.');
      return;
    }
    await fetchQuota();
    toast.success(`Thanh toán thành công — đã kích hoạt ${pkg.name}.`);
    closeCheckout();
    setShowPricingModal(false);
    setError(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentPackage || processingPayment) return;
    const pkg = selectedPaymentPackage;
    try {
      setProcessingPayment(true);
      setPaymentError(null);

      // User already saw and accepted the backend amount → verify the held transaction
      if (pendingTx) {
        await verifyPayment(pendingTx, pkg);
        return;
      }

      const res = await api.post('/payments/checkout', {
        orderType: 'QUOTA_PURCHASE',
        packageId: pkg.code,
        paymentMethod,
      });
      const data = res.data?.data;
      const official = parseAmount(data?.amount);
      const currency = typeof data?.currency === 'string' && data.currency ? data.currency : 'VND';
      const differs = official !== null && (official !== pkg.priceVnd || currency !== 'VND');

      if (paymentMethod === 'STRIPE' && data?.checkoutUrl) {
        // Stripe's hosted page shows the backend amount itself
        if (differs) devLog.warn('Checkout amount differs from displayed price', { displayed: pkg.priceVnd, official, currency });
        window.location.href = data.checkoutUrl;
        return;
      }

      if (!data?.transactionCode) {
        setPaymentError('Cổng thanh toán không trả về mã giao dịch. Vui lòng thử lại sau.');
        return;
      }
      const tx = { transactionCode: data.transactionCode, gatewayReference: data.gatewayReference };
      if (official !== null) setChargedAmount({ amount: official, currency });
      if (differs) {
        // Never silently charge a different amount: show it and wait for a second confirmation
        setPendingTx(tx);
        return;
      }
      await verifyPayment(tx, pkg);
    } catch (err: unknown) {
      if (isEmailNotVerified(err)) {
        setPaymentError(EMAIL_NOT_VERIFIED_MESSAGE);
        return;
      }
      setPaymentError(getApiErrorMessage(err, 'Giao dịch thanh toán không thành công.'));
    } finally {
      setProcessingPayment(false);
    }
  };
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [downloadPdfError, setDownloadPdfError] = useState<string | null>(null);
  const [originalFileError, setOriginalFileError] = useState<string | null>(null);

  // Mở tệp gốc qua signed URL 15 phút (backend kiểm tra quyền + ghi audit). Gọi trực tiếp trong click handler.
  const handleViewOriginalFile = (documentId: string) => {
    setOriginalFileError(null);
    openDocumentFile(documentId).catch((err: DocumentFileAccessError) => setOriginalFileError(err.message));
  };
  const downloadToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (downloadToastTimerRef.current) {
        clearTimeout(downloadToastTimerRef.current);
      }
    };
  }, []);

  const handleDownloadRandomMeddiesPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setDownloadPdfError(null);
    try {
      const response = await api.get('/documents/sample-random-pdf', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size < 100) {
        throw new Error('Tệp PDF nhận được không hợp lệ hoặc rỗng.');
      }

      let fileName = 'Phieu_Xet_Nghiem_Meddies_Sample.pdf';
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1500);

      if (downloadToastTimerRef.current) {
        clearTimeout(downloadToastTimerRef.current);
      }
      setDownloadSuccessToast(`Đã tải về tệp "${fileName}"! Bạn hãy kéo thả tệp này vào khung bên trên để quét.`);
      downloadToastTimerRef.current = setTimeout(() => setDownloadSuccessToast(null), 8000);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: Blob } };
      if (errObj.response?.data instanceof Blob) {
        try {
          const errText = await errObj.response.data.text();
          const parsed = JSON.parse(errText);
          setDownloadPdfError(parsed?.error?.message || 'Không thể tải file PDF ngẫu nhiên từ Meddies. Vui lòng thử lại.');
        } catch {
          setDownloadPdfError('Không thể tải file PDF ngẫu nhiên từ Meddies. Vui lòng thử lại sau giây lát.');
        }
      } else {
        setDownloadPdfError('Không thể tải file PDF ngẫu nhiên từ Meddies. Vui lòng thử lại sau giây lát.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fetchQuota = async () => {
    try {
      const res = await api.get('/documents/quota');
      if (res.data?.data) {
        const q = res.data.data;
        // Jackson may serialise `boolean isVip` as either `vip` or `isVip`
        setQuota({ ...q, vip: Boolean(q.vip ?? q.isVip) });
        setQuotaStatus('loaded');
      } else {
        setQuotaStatus('error');
      }
    } catch (err) {
      devLog.warn('Could not load user quota:', err);
      setQuotaStatus('error');
    }
  };

  const quotaExhausted = quotaStatus === 'loaded' && quota !== null && !quota.vip && quota.scanQuota <= 0;
  const scanBlockedReason = analyzing
    ? 'Đang phân tích, vui lòng đợi.'
    : quotaExhausted
    ? 'Bạn đã hết lượt quét. Mua thêm lượt hoặc gói VIP để tiếp tục.'
    : user && quotaStatus === 'loading'
    ? 'Đang kiểm tra số lượt quét...'
    : null;

  useEffect(() => {
    if (user) {
      fetchQuota();
    }
  }, [user]);

  // Booking from analysis results (shared BookingModal, attaches medicalDocumentId)
  const [bookingDoctor, setBookingDoctor] = useState<BookableDoctor | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');

  const samplePresets = [
    {
      title: 'Phiếu Xét Nghiệm Máu & Mỡ Máu (Lipid Panel)',
      fileName: 'Xet_Nghiem_Sinh_Hoa_Mo_Mau.pdf',
      content: `BỆNH VIỆN ĐẠI HỌC Y DƯỢC - KHOA XÉT NGHIỆM
Bệnh nhân: Nguyễn Văn B - Tuổi: 48
1. Cholesterol toàn phần: 6.8 mmol/L (Tham chiếu: 3.9 - 5.2) -> TĂNG
2. Triglyceride: 2.6 mmol/L (Tham chiếu: 0.46 - 1.88) -> TĂNG
3. HDL-Cholesterol: 1.1 mmol/L (Tham chiếu: > 1.3) -> GIẢM
4. Fasting Glucose: 5.2 mmol/L (Tham chiếu: 4.1 - 5.9) -> Bình thường
Kết luận: Rối loạn mỡ máu hỗn hợp, xơ vữa mạch vành tiềm ẩn.`
    },
    {
      title: 'Phiếu Đánh Giá Chức Năng Gan Mật (Liver Panel)',
      fileName: 'Xet_Nghiem_Chuc_Nang_Gan.pdf',
      content: `TRUNG TÂM Y KHOA CHẨN ĐOÁN
Chỉ định: Đánh giá men gan & tiêu hóa
1. Men gan ALT (GPT): 86 U/L (Tham chiếu: 0 - 41) -> TĂNG CAO
2. Men gan AST (GOT): 79 U/L (Tham chiếu: 0 - 37) -> TĂNG CAO
3. Bilirubin toàn phần: 14.2 µmol/L (Tham chiếu: 5.1 - 17.0) -> Bình thường
Kết luận: Viêm gan cấp tính, theo dõi gan nhiễm mỡ hoặc do bia rượu.`
    },
    {
      title: 'Kết Quả Đo Điện Não Đồ & Tiền Đình (EEG / Neurology)',
      fileName: 'Ket_Qua_Dien_Nao_EEG.pdf',
      content: `KHOA THĂM DÒ CHỨC NĂNG THẦN KINH
Chỉ định: Đau đầu âm ỉ, hoa mắt chóng mặt
1. Điện não đồ (EEG): Rối loạn sóng chậm Theta rải rác vùng thái dương
2. Lưu lượng máu não: Giảm tuần hoàn động mạch đốt sống thân nền 20%
Kết luận: Thiểu năng tuần hoàn não, rối loạn tiền đình trung ương.`
    }
  ];

  const handleFilesSelected = (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    if (analyzing) return; // the queue is frozen while a scan is running

    // Extension AND (when the browser reports it) MIME type must match
    const invalidFile = newFiles.find((f) => {
      const name = f.name.toLowerCase();
      const ext = Object.keys(ACCEPTED_TYPES).find((x) => name.endsWith(x));
      if (!ext) return true;
      return f.type !== '' && !ACCEPTED_TYPES[ext].includes(f.type.toLowerCase());
    });
    if (invalidFile) {
      setError(`Tệp "${invalidFile.name}" không đúng định dạng. Chỉ nhận PDF, PNG, JPG, JPEG.`);
      return;
    }

    const emptyFile = newFiles.find((f) => f.size < MIN_FILE_BYTES);
    if (emptyFile) {
      setError(`Tệp "${emptyFile.name}" rỗng hoặc bị hỏng (dưới ${MIN_FILE_BYTES} byte). Vui lòng chọn tệp khác.`);
      return;
    }

    // Deduplicate against existing queue by name and size
    const existingKeys = new Set(selectedFiles.map((f) => `${f.name}-${f.size}`));
    const uniqueIncoming = newFiles.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));

    const merged = [...selectedFiles, ...uniqueIncoming];

    if (merged.length > 5) {
      setError(`Hệ thống hỗ trợ phân tích tối đa 5 tệp cho một lần quét tổng hợp (kết hợp PDF và Ảnh). Bạn đang chọn ${merged.length} tệp.`);
      return;
    }

    // Check individual file size limit (10MB)
    const oversizedFile = merged.find((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setError(`Tệp "${oversizedFile.name}" vượt quá giới hạn 10MB (Khuyến nghị 500KB - 5MB cho phiếu xét nghiệm). Vui lòng giảm dung lượng.`);
      return;
    }

    // Check total batch size limit (25MB)
    const totalBytes = merged.reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > 25 * 1024 * 1024) {
      setError(`Tổng dung lượng các tệp (${(totalBytes / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn 25MB cho một lần quét.`);
      return;
    }

    setError(null);
    setSelectedFiles(merged);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow re-selecting same file if deleted
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    if (analyzing) return;
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setError(null);
  };

  const handleClearFiles = () => {
    if (analyzing) return;
    setSelectedFiles([]);
    setError(null);
  };

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    if (scanBlockedReason) return;
    const blob = new Blob([preset.content], { type: 'text/plain;charset=utf-8' });
    const fakeFile = new File([blob], preset.fileName.replace('.pdf', '.txt'), { type: 'text/plain' });
    setSelectedFiles([fakeFile]);
    setError(null);
    setAnalysis(null);
    setAnalysisSuccessNotification(null);
    executeAnalysis([fakeFile]);
  };

  const executeAnalysis = async (filesToAnalyze?: File[]) => {
    const targetFiles = filesToAnalyze && filesToAnalyze.length > 0 ? filesToAnalyze : selectedFiles;
    if (analyzing) return;
    if (quotaExhausted) {
      setError('Bạn đã hết lượt quét. Mua thêm lượt hoặc gói VIP để tiếp tục.', 'quota');
      return;
    }
    if (targetFiles.length === 0) {
      setError('Vui lòng chọn ít nhất một tệp PDF hoặc ảnh phiếu xét nghiệm để phân tích.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setAnalysisSuccessNotification(null);

    try {
      const formData = new FormData();
      // Primary multi-file batch parameter
      targetFiles.forEach((f) => {
        formData.append('files', f);
      });
      // Backward compatibility parameter for single-file consumers
      formData.append('file', targetFiles[0]);

      // Resilient endpoint routing: authenticated users get EMR storage + quota, guest/preview users get zero-barrier preview
      const endpoint = user ? '/documents/analyze' : '/documents/analyze-preview';
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.data) {
        const data: AnalysisResult = res.data.data;
        setAnalysis(data);
        setActivePatientIndex(0);
        if (user) {
          fetchQuota();
        }

        const displayName = data.filesCount && data.filesCount > 1
          ? `${data.filesCount} tệp (${data.fileNames?.join(', ') || targetFiles.map((f) => f.name).join(', ')})`
          : (data.fileName || targetFiles[0].name);

        setAnalysisSuccessNotification({
          fileName: displayName,
          indicatorsCount: data.indicators ? data.indicators.length : 0,
          specialtyName: data.recommendedSpecialtyName || 'Chuyên khoa phù hợp',
          matchedDoctorsCount: data.matchedDoctors ? data.matchedDoctors.length : 0,
          modelUsed: data.modelUsed
        });

        // Instant smooth scroll down to analysis results section
        setTimeout(() => {
          document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Không thể phân tích tài liệu. Vui lòng kiểm tra tệp và thử lại.');
      if (isQuotaError(err)) {
        setError(message, 'quota');
        setShowPricingModal(true);
        if (user) fetchQuota();
      } else if (isRetryableError(err)) {
        setError('Không kết nối được máy chủ phân tích. Vui lòng thử lại.', 'retryable');
      } else {
        setError(message, 'other');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenBooking = (doc: DoctorMatch, customNotes?: string) => {
    const docId = doc.doctorId || (doc as unknown as { id?: string }).id;
    if (!docId) return;
    setBookingNotes(
      customNotes || (analysis ? `Kết quả xét nghiệm (${analysis.fileName}): ${analysis.clinicalSummary.slice(0, 300)}` : '')
    );
    setBookingDoctor({
      id: docId,
      fullName: doc.fullName,
      specialties: doc.specialties,
      consultationFee: doc.consultationFee,
      hospitalAffiliation: doc.hospitalAffiliation,
    });
  };

  // Recent documents (GET /documents/my) for the "Tài liệu gần đây" sidebar
  const [recentDocs, setRecentDocs] = useState<PatientDocumentItem[]>([]);
  useEffect(() => {
    if (!user) return;
    api
      .get('/documents/my')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          const docs = [...(res.data.data as PatientDocumentItem[])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          setRecentDocs(docs.slice(0, 5));
        }
      })
      .catch((err) => devLog.warn('Could not load recent documents:', err));
  }, [user, analysis?.documentId]);

  const [indicatorFilter, setIndicatorFilter] = useState<'all' | 'abnormal'>('all');

  const resetToUpload = () => {
    if (analyzing) return;
    setAnalysis(null);
    setAnalysisSuccessNotification(null);
    setSelectedFiles([]);
    setError(null);
    if (focusId) setSearchParams({}, { replace: true });
  };

  const isAbnormal = (ind: AbnormalIndicator) => ind.status === 'ELEVATED' || ind.status === 'LOW' || (ind.status as string) === 'HIGH';
  const isHigh = (ind: AbnormalIndicator) => ind.status === 'ELEVATED' || (ind.status as string) === 'HIGH';

  const STEPS = [
    { title: 'Tải lên an toàn', desc: 'Ẩn tên, số định danh trước khi phân tích' },
    { title: 'Nhận dạng chữ trên phiếu', desc: 'Đọc bảng kết quả xét nghiệm' },
    { title: 'Đối chiếu khoảng tham chiếu', desc: 'So từng chỉ số với ngưỡng bình thường in trên phiếu' },
    { title: 'Tìm bác sĩ phù hợp', desc: 'Theo chuyên khoa liên quan' },
    { title: 'Viết lời giải thích dễ hiểu', desc: 'Kèm gợi ý chuyên khoa nếu cần' },
  ];
  const progressPct = Math.min(95, (analysisStage + 1) * 20);

  const errorAlert = error && (
    <div role="alert" data-testid="scan-error" data-kind={errorKind} className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2 max-w-2xl">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <span>{error}</span>
      </div>
      <div className="flex items-center gap-2">
        {errorKind === 'retryable' && selectedFiles.length > 0 && (
          <button
            type="button"
            onClick={() => executeAnalysis()}
            disabled={Boolean(scanBlockedReason)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Thử lại
          </button>
        )}
        {errorKind === 'quota' && (
          <button
            type="button"
            onClick={() => setShowPricingModal(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-4 h-4" /> Gói quét / VIP
          </button>
        )}
      </div>
    </div>
  );

  const quotaBadge = quota?.vip ? (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm font-medium">
      <Crown className="w-4 h-4 text-amber-600" /> Hội viên VIP
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm">
      <Zap className="w-4 h-4 text-teal-600" />
      <span className="inline-flex items-center gap-1" data-testid="quota-badge">
        Lượt quét:{' '}
        {quotaStatus === 'loading' ? (
          <Skeleton className="inline-block h-3.5 w-5 align-middle" />
        ) : quotaStatus === 'error' || !quota ? (
          <strong className="text-slate-500" title="Chưa tải được số lượt quét">—</strong>
        ) : (
          <strong className={quota.scanQuota <= 0 ? 'text-rose-600' : 'text-teal-700'}>{quota.scanQuota}</strong>
        )}
      </span>
      <button
        type="button"
        onClick={() => setShowPricingModal(true)}
        className="ml-1 px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-xs font-semibold transition cursor-pointer"
      >
        + Mua thêm
      </button>
    </span>
  );

  return (
    <div className="space-y-6">
      {loadingFocusDoc && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-sm text-teal-800" role="status">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
          Đang tải kết quả đọc phiếu của tài liệu đã chọn…
        </div>
      )}

      {/* ─────────────── 05 · Result view ─────────────── */}
      {analysis && !analyzing ? (
        (() => {
          const isMulti = Boolean(analysis.multiPatientDetected && analysis.patientAnalyses && analysis.patientAnalyses.length > 1);
          const activePatient = isMulti ? analysis.patientAnalyses![activePatientIndex] || analysis.patientAnalyses![0] : null;

          const displayHospital = activePatient?.hospitalName || analysis.hospitalName;
          const displayDate = activePatient?.testDate || analysis.testDate;
          const displayPatientName = activePatient?.patientName || analysis.patientName || user?.fullName || 'Người bệnh';
          const displaySpecialtyName = activePatient?.recommendedSpecialtyName || analysis.recommendedSpecialtyName;
          const displaySpecialtySlug = activePatient?.recommendedSpecialtySlug || analysis.recommendedSpecialtySlug;
          const displaySpecialtyReason = activePatient?.doctorRecommendationReason || analysis.doctorRecommendationReason;
          const displayExplanation = activePatient?.plainLanguageExplanation || analysis.plainLanguageExplanation;
          const displaySummary = activePatient?.clinicalSummary || analysis.clinicalSummary;
          const displayIndicators = activePatient?.indicators ?? analysis.indicators ?? [];
          const displayDoctors = activePatient?.matchedDoctors ?? analysis.matchedDoctors ?? [];
          const displayQuestions = activePatient?.suggestedQuestions ?? analysis.suggestedQuestions ?? [];
          const displayFileName = activePatient?.sourceFileName || analysis.fileName;
          const isOffline = !!analysis.modelUsed && /offline|deterministic/i.test(analysis.modelUsed);

          const abnormal = displayIndicators.filter(isAbnormal);
          const shown = indicatorFilter === 'abnormal' ? abnormal : displayIndicators;
          const meta = [
            displayHospital,
            displayDate && `Lấy mẫu ${displayDate}`,
            analysis.filesCount && analysis.filesCount > 1 ? `${analysis.filesCount} tệp` : null,
          ].filter(Boolean);

          return (
            <div id="analysis-results" className="space-y-5 scroll-mt-6">
              <button
                type="button"
                onClick={resetToUpload}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Tải tài liệu khác
              </button>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 break-words">{displayFileName}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {meta.length > 0 ? meta.join(' · ') : 'Kết quả AI đọc phiếu'}
                    {isMulti && <> · Bệnh nhân: {displayPatientName}</>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> In kết quả
                  </button>
                  {displaySpecialtyName && (
                    <a
                      href="#matched-doctors"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition"
                    >
                      <Stethoscope className="w-4 h-4" /> Đặt lịch với bác sĩ
                    </a>
                  )}
                </div>
              </div>

              {analysisSuccessNotification && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900" role="status">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Đã đọc xong {analysisSuccessNotification.indicatorsCount} chỉ số từ {analysisSuccessNotification.fileName}.
                  </span>
                  <button type="button" onClick={() => setAnalysisSuccessNotification(null)} className="p-1 rounded hover:bg-emerald-100 cursor-pointer" aria-label="Đóng thông báo">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-900">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
                <p>
                  <strong>Chưa có bác sĩ xem lại.</strong> Lời giải thích dưới đây do AI viết để bạn dễ hiểu, không thay thế kết luận của bác sĩ. Nếu số nào khác với phiếu gốc, hãy đối chiếu lại với tệp gốc.
                </p>
              </div>

              {analysis.cachedResult && (
                <p className="flex items-center gap-2 text-sm text-emerald-800">
                  <Zap className="w-4 h-4 text-emerald-600" /> Tài liệu này bạn đã quét trước đó — kết quả lấy lại từ hồ sơ và không trừ lượt quét.
                </p>
              )}
              {isOffline && (
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                  <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <p>
                    <strong>Chế độ hạn chế:</strong> trợ lý AI tạm thời không khả dụng nên kết quả chỉ gồm các chỉ số đọc được trực tiếp từ tài liệu, không có phần diễn giải. Hãy hỏi bác sĩ để được giải thích đầy đủ.
                  </p>
                </div>
              )}

              {isMulti && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                    <Users className="w-4 h-4" /> Phát hiện tài liệu của {analysis.patientAnalyses!.length} người bệnh khác nhau — mỗi người được phân tích riêng.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.patientAnalyses!.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePatientIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition cursor-pointer ${
                          activePatientIndex === idx ? 'bg-white border-teal-600 text-teal-800 font-semibold' : 'bg-white/60 border-amber-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        {p.patientName || `Bệnh nhân #${idx + 1}`} · {p.indicators?.length ?? 0} chỉ số
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
                <div className="space-y-5 min-w-0">
                  {/* Quick summary */}
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tóm tắt nhanh</p>
                      <p className="mt-2 text-base sm:text-lg text-slate-900 leading-relaxed whitespace-pre-line">
                        {displayExplanation || displaySummary || 'Chưa có phần diễn giải cho tài liệu này.'}
                      </p>
                    </div>
                    {displayIndicators.length > 0 && (
                      <div className="flex sm:flex-col lg:flex-row gap-2 shrink-0">
                        <div className="w-24 p-3 rounded-xl bg-orange-50 border border-orange-200">
                          <p className="text-2xl font-bold text-orange-700">{abnormal.length}</p>
                          <p className="text-xs text-orange-800">Cần chú ý</p>
                        </div>
                        <div className="w-24 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-2xl font-bold text-slate-900">{displayIndicators.length - abnormal.length}</p>
                          <p className="text-xs text-slate-600">Bình thường</p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Indicator table */}
                  <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <h2 className="font-semibold text-slate-900">Chỉ số chi tiết</h2>
                      {displayIndicators.length > 0 && (
                        <div className="inline-flex p-1 rounded-lg bg-slate-100 text-sm" role="tablist">
                          {(['all', 'abnormal'] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              role="tab"
                              aria-selected={indicatorFilter === f}
                              onClick={() => setIndicatorFilter(f)}
                              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                                indicatorFilter === f ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {f === 'all' ? `Tất cả (${displayIndicators.length})` : `Cần chú ý (${abnormal.length})`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {displayIndicators.length === 0 ? (
                      <div className="mx-5 mb-5 p-5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
                        <p className="flex items-center gap-2 font-semibold">
                          <FileQuestion className="w-4 h-4" /> Chưa đọc được chỉ số nào trên phiếu
                        </p>
                        <p>
                          Phiếu có thể chưa điền kết quả, hoặc ảnh bị mờ. Hệ thống không suy đoán chẩn đoán hay gợi ý bác sĩ khi thiếu số liệu. Hãy chụp lại rõ nét, đủ sáng, hoặc tải tệp PDF gốc từ bệnh viện.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[640px]">
                          <thead>
                            <tr className="border-y border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                              <th className="py-2.5 px-5 font-semibold">Chỉ số</th>
                              <th className="py-2.5 px-3 font-semibold">Kết quả</th>
                              <th className="py-2.5 px-3 font-semibold">Tham chiếu</th>
                              <th className="py-2.5 px-3 font-semibold w-[170px]">So với ngưỡng</th>
                              <th className="py-2.5 px-5 font-semibold">Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {shown.map((ind, idx) => {
                              const high = isHigh(ind);
                              const low = ind.status === 'LOW';
                              const place = placeOnRange(ind.value, ind.referenceRange);
                              return (
                                <tr key={`${ind.name}-${idx}`}>
                                  <td className="py-3 px-5">
                                    <p className="font-medium text-slate-900">{ind.name}</p>
                                    {ind.loincCode && <p className="text-xs text-slate-500">LOINC {ind.loincCode}</p>}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`font-bold ${high ? 'text-rose-700' : low ? 'text-blue-700' : 'text-slate-900'}`}>{ind.value}</span>{' '}
                                    <span className="text-xs text-slate-500">{ind.unit}</span>
                                  </td>
                                  <td className="py-3 px-3 text-slate-600">
                                    {ind.referenceRange}
                                    {ind.bytReferenceRange && ind.bytReferenceRange !== ind.referenceRange && (
                                      <p className="text-xs text-emerald-700">Chuẩn BYT: {ind.bytReferenceRange}</p>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    {place ? (
                                      <div className="relative h-1.5 rounded-full bg-slate-200" aria-hidden>
                                        <span
                                          className="absolute inset-y-0 rounded-full bg-teal-300"
                                          style={{ left: `${place.bandStart}%`, width: `${Math.max(2, place.bandEnd - place.bandStart)}%` }}
                                        />
                                        <span
                                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white ${
                                            high ? 'bg-rose-600' : low ? 'bg-blue-600' : 'bg-slate-800'
                                          }`}
                                          style={{ left: `${place.marker}%` }}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-5">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${
                                        high
                                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                                          : low
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {high ? <ArrowUp className="w-3 h-3" /> : low ? <ArrowDown className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                      {high ? 'Cao' : low ? 'Thấp' : 'Bình thường'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 border-t border-slate-200 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-5 h-1.5 rounded-full bg-teal-300" /> Khoảng bình thường theo phiếu
                          </span>
                          Khoảng tham chiếu có thể khác nhau giữa các phòng xét nghiệm.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* What abnormal indicators mean */}
                  {abnormal.some((i) => i.clinicalSignificance) && (
                    <section className="space-y-3">
                      <h2 className="font-semibold text-slate-900">Các chỉ số cần chú ý nghĩa là gì?</h2>
                      {abnormal
                        .filter((i) => i.clinicalSignificance)
                        .map((ind, idx) => (
                          <div key={`${ind.name}-mean-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-5">
                            <p className="flex items-center gap-2 font-semibold text-slate-900">
                              {ind.name}
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                                  isHigh(ind) ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                                }`}
                              >
                                {isHigh(ind) ? 'Cao' : 'Thấp'}
                              </span>
                            </p>
                            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{ind.clinicalSignificance}</p>
                            {ind.scientificBasis && <p className="mt-2 text-xs text-slate-500">Nguồn tham chiếu: {ind.scientificBasis}</p>}
                          </div>
                        ))}
                    </section>
                  )}

                  {displaySummary && displayExplanation && (
                    <details className="bg-white rounded-2xl border border-slate-200 p-5 group">
                      <summary className="cursor-pointer font-semibold text-slate-900 text-sm">Tóm tắt lâm sàng (dành cho bác sĩ)</summary>
                      <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{displaySummary}</p>
                    </details>
                  )}

                  {/* Matched doctors (pgvector) — booking attaches medicalDocumentId */}
                  <section id="matched-doctors" className="space-y-3 scroll-mt-6">
                    <h2 className="font-semibold text-slate-900">
                      Bác sĩ phù hợp {displaySpecialtyName ? `· ${displaySpecialtyName}` : ''}
                    </h2>
                    {displayDoctors.length > 0 && displayIndicators.length > 0 ? (
                      <ul className="space-y-2">
                        {displayDoctors.map((doc) => {
                          const docKey = doc.doctorId || doc.id || doc.fullName;
                          const rating = formatRating(doc.rating, doc.reviewCount);
                          const sub = [doc.specialties?.join(' – '), doc.yearsOfExperience ? `${doc.yearsOfExperience} năm kinh nghiệm` : null, formatVnd(doc.consultationFee)].filter(Boolean);
                          return (
                            <li
                              key={docKey}
                              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-white p-4 ${doc.aiRecommended ? 'border-teal-400' : 'border-slate-200'}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {doc.academicTitle ? `${doc.academicTitle} ` : ''}
                                  {doc.fullName}
                                </p>
                                {sub.length > 0 && <p className="text-xs text-slate-500">{sub.join(' · ')}</p>}
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                    Phù hợp {Math.round(doc.similarityScore * 100)}%
                                  </span>
                                  {doc.aiRecommended && <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">AI ưu tiên</span>}
                                  {rating ? (
                                    <span className="inline-flex items-center gap-1 text-slate-600">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden /> {rating} ({doc.reviewCount})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Chưa có đánh giá</span>
                                  )}
                                </p>
                                {doc.aiRecommendationReason && <p className="mt-1.5 text-xs text-slate-600">{doc.aiRecommendationReason}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenBooking(
                                    doc,
                                    isMulti ? `Bệnh nhân: ${displayPatientName} (${displayFileName}) - ${displaySummary.slice(0, 140)}...` : undefined,
                                  )
                                }
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition cursor-pointer shrink-0"
                              >
                                <CalendarDays className="w-4 h-4" /> Đặt lịch
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="p-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-600">
                        {abnormal.length === 0 ? (
                          'Hệ thống chỉ gợi ý bác sĩ khi đọc được chỉ số bất thường cụ thể trên phiếu.'
                        ) : (
                          <>
                            Chưa tìm được bác sĩ phù hợp cho kết quả này.{' '}
                            <Link
                              to={`/patient/doctors${displaySpecialtySlug || displaySpecialtyName ? `?specialty=${encodeURIComponent(displaySpecialtySlug || displaySpecialtyName || '')}` : ''}`}
                              className="font-medium text-indigo-700 underline underline-offset-2"
                            >
                              Tìm bác sĩ theo chuyên khoa
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                  </section>
                </div>

                {/* Sidebar */}
                <aside className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="h-36 rounded-xl bg-slate-100 flex items-center justify-center">
                      <div className="w-24 h-28 rounded-md bg-white border border-slate-200 p-2.5 space-y-1.5" aria-hidden>
                        <span className="block h-1.5 w-12 rounded bg-slate-300" />
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`block h-1 rounded ${i === 2 ? 'bg-orange-200' : i === 3 ? 'bg-blue-200' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    {analysis.hasFile && analysis.documentId ? (
                      <button
                        type="button"
                        onClick={() => handleViewOriginalFile(analysis.documentId)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                        title="Mở tệp gốc bằng liên kết tạm thời (hết hạn sau 15 phút)"
                      >
                        Xem ảnh gốc <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <p className="mt-3 text-center text-xs text-slate-500">Tệp gốc không được lưu cho lượt quét này.</p>
                    )}
                    {originalFileError && (
                      <p className="mt-2 text-xs text-rose-700" role="alert">
                        {originalFileError}
                      </p>
                    )}
                  </div>

                  {displayQuestions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h2 className="font-semibold text-slate-900">Câu hỏi nên hỏi bác sĩ</h2>
                      <ul className="mt-3 space-y-2">
                        {displayQuestions.map((q, idx) => (
                          <li key={idx} className="p-3 rounded-lg bg-slate-50 text-sm text-slate-700">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displaySpecialtyName && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Nên trao đổi với</p>
                      <p className="mt-1 font-display text-xl font-bold text-slate-900">{displaySpecialtyName}</p>
                      {displaySpecialtyReason && <p className="mt-1.5 text-sm text-indigo-800">{displaySpecialtyReason}</p>}
                      <Link
                        to={`/patient/doctors?specialty=${encodeURIComponent(displaySpecialtySlug || displaySpecialtyName)}`}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
                      >
                        <Search className="w-4 h-4" /> Tìm bác sĩ phù hợp
                      </Link>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          );
        })()
      ) : (
        /* ─────────────── 04 · Upload view ─────────────── */
        <>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Tóm tắt &amp; giải nghĩa bệnh án</h1>
              <p className="mt-1.5 text-slate-600">
                Tải lên phiếu xét nghiệm, đơn thuốc hoặc kết quả chẩn đoán hình ảnh. AI sẽ đọc từng chỉ số và giải thích bằng lời dễ hiểu.
              </p>
            </div>
            <div className="shrink-0">{quotaBadge}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
            <div className="space-y-5 min-w-0">
              {/* Drop zone */}
              <div
                aria-busy={analyzing || undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!analyzing) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (!analyzing && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesSelected(Array.from(e.dataTransfer.files));
                  }
                }}
                className={`px-5 py-10 sm:py-12 rounded-2xl border-2 border-dashed text-center transition ${
                  analyzing ? 'bg-slate-100 border-slate-300 opacity-80' : isDragging ? 'bg-teal-50 border-teal-500' : 'bg-white border-teal-300'
                }`}
              >
                <span className="w-14 h-14 mx-auto rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </span>
                <p className="mt-4 font-semibold text-slate-900 text-lg">Kéo thả ảnh hoặc PDF vào đây</p>
                <p className="mt-1 text-sm text-slate-500">PDF, JPG, PNG · tối đa 5 tệp · mỗi tệp ≤ 10 MB, tổng ≤ 25 MB</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <label
                    htmlFor="multi-file-upload-input"
                    aria-disabled={analyzing || undefined}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer transition ${
                      analyzing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Chọn tệp
                    <input
                      id="multi-file-upload-input"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      onChange={handleFileUpload}
                      disabled={analyzing}
                      className="hidden"
                    />
                  </label>
                  <label
                    htmlFor="camera-upload-input"
                    aria-disabled={analyzing || undefined}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium cursor-pointer transition ${
                      analyzing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Camera className="w-4 h-4" /> Chụp ảnh
                    <input
                      id="camera-upload-input"
                      type="file"
                      accept="image/jpeg,image/png"
                      capture="environment"
                      onChange={handleFileUpload}
                      disabled={analyzing}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="mt-5 text-xs text-slate-500 max-w-md mx-auto">
                  Mẹo: đặt phiếu trên mặt phẳng, đủ sáng, chụp thẳng và thấy đủ 4 góc giấy để AI đọc chính xác hơn.
                </p>
              </div>

              {/* Selected files queue */}
              {selectedFiles.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Tệp đã chọn ({selectedFiles.length}/5) · {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFiles}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {selectedFiles.map((f, idx) => {
                      const isPdf = f.name.toLowerCase().endsWith('.pdf');
                      return (
                        <li key={`${f.name}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
                          <span className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                            <p className="text-xs text-slate-500">
                              {isPdf ? 'PDF' : 'Ảnh'} · {(f.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            disabled={analyzing}
                            aria-label={`Xóa tệp ${f.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="multi-file-upload-input"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition ${
                        selectedFiles.length >= 5 || analyzing ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Plus className="w-4 h-4 text-teal-600" /> Thêm tệp
                    </label>
                    {quotaExhausted && !analyzing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-rose-700" data-testid="quota-exhausted">
                          Hết lượt quét
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPricingModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition cursor-pointer"
                        >
                          <Crown className="w-4 h-4" /> Xem bảng giá
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => executeAnalysis()}
                        disabled={Boolean(scanBlockedReason)}
                        title={scanBlockedReason || undefined}
                        aria-busy={analyzing || undefined}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition cursor-pointer"
                      >
                        {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {analyzing ? `Đang phân tích ${selectedFiles.length} tệp…` : `Phân tích ${selectedFiles.length} tệp`}
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Progress */}
              {analyzing && (
                <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6" aria-live="polite">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      {file && file.name.toLowerCase().endsWith('.pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {selectedFiles.length > 1 ? `${selectedFiles.length} tệp: ${selectedFiles.map((f) => f.name).join(', ')}` : file?.name || 'Tài liệu'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">Đang xử lý</span>
                  </div>

                  <div className="mt-5 h-2 rounded-full bg-teal-100 overflow-hidden">
                    <div className="h-full bg-teal-700 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>
                      Bước {analysisStage + 1}/{STEPS.length}
                    </span>
                    <span>{progressPct}%</span>
                  </div>

                  <ol className="mt-4 space-y-1">
                    {STEPS.map((s, i) => {
                      const done = analysisStage > i;
                      const current = analysisStage === i;
                      return (
                        <li key={s.title} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${current ? 'bg-teal-50' : ''}`}>
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                              done ? 'bg-teal-700 text-white' : current ? 'text-teal-700' : 'border border-slate-300 text-slate-500'
                            }`}
                          >
                            {done ? <Check className="w-4 h-4" /> : current ? <Loader2 className="w-5 h-5 animate-spin" /> : i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${current ? 'text-teal-900' : done ? 'text-slate-900' : 'text-slate-600'}`}>{s.title}</p>
                            <p className={`text-xs ${current ? 'text-teal-700' : 'text-slate-500'}`}>{s.desc}</p>
                          </div>
                          <span className={`text-xs ${current ? 'text-teal-700 font-semibold' : 'text-slate-500'}`}>
                            {done ? 'Xong' : current ? 'Đang chạy' : 'Chờ'}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
                    Thông tin cá nhân (họ tên, CCCD, số điện thoại) được ẩn tự động trước khi gửi tới AI. Vui lòng giữ trang này mở đến khi có kết quả.
                  </p>
                </section>
              )}

              {errorAlert}

              {/* Sample data for trying the feature */}
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Chưa có phiếu để thử?</p>
                    <p className="text-xs text-slate-500">Tải một phiếu xét nghiệm mẫu (bộ dữ liệu Meddies, không phải hồ sơ của bạn) rồi kéo thả vào khung trên.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadRandomMeddiesPdf}
                    disabled={downloadingPdf || analyzing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloadingPdf ? 'Đang tạo PDF…' : 'Tải PDF mẫu'}
                  </button>
                </div>
                {downloadSuccessToast && (
                  <p className="flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {downloadSuccessToast}
                    </span>
                    <button type="button" onClick={() => setDownloadSuccessToast(null)} className="p-0.5 cursor-pointer" aria-label="Đóng thông báo">
                      <X className="w-4 h-4" />
                    </button>
                  </p>
                )}
                {downloadPdfError && (
                  <p className="flex items-center justify-between gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-900" role="alert">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      {downloadPdfError}
                    </span>
                    <button type="button" onClick={() => setDownloadPdfError(null)} className="p-0.5 cursor-pointer" aria-label="Đóng thông báo">
                      <X className="w-4 h-4" />
                    </button>
                  </p>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Hoặc thử nhanh với phiếu mẫu (mỗi lần thử dùng 1 lượt quét):</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {samplePresets.map((preset) => (
                      <button
                        key={preset.fileName}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        disabled={Boolean(scanBlockedReason)}
                        title={scanBlockedReason || undefined}
                        className="group flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-800 truncate">{preset.title}</span>
                          <span className="block text-[11px] text-slate-500">{preset.fileName}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {user && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h2 className="font-semibold text-slate-900">Tài liệu gần đây</h2>
                  {recentDocs.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Bạn chưa tải tài liệu nào.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {recentDocs.map((d) => (
                        <li key={d.id}>
                          <Link to={`/patient/documents?focusId=${d.id}`} className="flex items-center gap-3 py-3 group">
                            <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-slate-900 truncate group-hover:text-teal-800">{d.fileName}</span>
                              <span className="block text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900">AI đọc được gì?</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                  <li>Phiếu xét nghiệm máu, nước tiểu</li>
                  <li>Đơn thuốc in hoặc viết tay rõ chữ</li>
                  <li>Phần kết luận bằng chữ của siêu âm, X-quang</li>
                </ul>
                <p className="mt-3 text-xs text-slate-500">AI không đọc trực tiếp ảnh phim X-quang hay ảnh siêu âm.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Lock className="w-4 h-4" /> Dữ liệu của bạn
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Chỉ bạn xem được tài liệu này, trừ khi bạn chọn chia sẻ với bác sĩ khi đặt lịch. Tệp gốc chỉ mở qua liên kết tạm thời 15 phút.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      <BookingModal
        open={bookingDoctor !== null}
        doctor={bookingDoctor}
        onClose={() => setBookingDoctor(null)}
        initialNotes={bookingNotes}
        notesLabel="Ghi chú cho bác sĩ (tóm tắt kết quả xét nghiệm — bạn có thể sửa)"
        extra={{ medicalDocumentId: analysis?.documentId }}
        context={
          analysis?.documentId ? (
            <p className="text-xs p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
              Hồ sơ <strong>{analysis.fileName}</strong> sẽ được đính kèm để bác sĩ xem trước buổi khám.
            </p>
          ) : undefined
        }
      />

      {/* 💳 Commercial Pricing & Scan Quota Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Bảng giá gói quét</h3>
                  <p className="text-xs text-slate-500">Giá đã gồm VAT. Thanh toán một lần, không tự gia hạn.</p>
                  {packageSource === 'fallback' && (
                    <p className="text-[11px] text-amber-700 mt-0.5" data-testid="price-fallback-note">
                      Giá tham khảo, số tiền chính xác hiển thị ở bước thanh toán.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                aria-label="Đóng bảng giá"
                className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packagesLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
              {scanPackages.map((pkg) => {
                const code: PackageCode = pkg.code;
                const display = PACKAGE_DISPLAY[code];
                const toneCard = display.tone === 'teal'
                  ? 'border-2 border-teal-500 bg-teal-50/40'
                  : display.tone === 'amber'
                  ? 'border-2 border-amber-400 bg-amber-50/40'
                  : 'border border-slate-200 bg-slate-50';
                const toneButton = display.tone === 'teal'
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : display.tone === 'amber'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white';
                return (
                  <div key={code} className={`p-5 rounded-2xl flex flex-col justify-between space-y-4 relative ${toneCard}`} data-testid={`package-${code}`}>
                    {display.badge && (
                      <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-teal-600 text-white rounded-full text-[10px] font-bold">{display.badge}</span>
                    )}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{display.tag}</span>
                      <h4 className="text-2xl font-black text-slate-900">{formatPackagePrice(pkg.priceVnd)}</h4>
                      <p className="text-xs text-slate-700 font-semibold">{packageEntitlement(pkg)}</p>
                      {pkg.description !== packageEntitlement(pkg) && <p className="text-[11px] text-slate-500">{pkg.description}</p>}
                      <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                        {display.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeCheckout();
                        setSelectedPaymentPackage(pkg);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${toneButton}`}
                    >
                      {display.cta} ({formatPackagePrice(pkg.priceVnd)})
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-slate-500 text-xs text-center border border-slate-200">
              💡 <em>Tải lại đúng tài liệu đã quét trước đó sẽ <strong>không bị trừ thêm lượt</strong>.</em>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Payment & VietQR Checkout Modal */}
      {selectedPaymentPackage && (
        <div className="fixed inset-0 z-[60] flex overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          {/* m-auto (not items-center) so a modal taller than the phone screen scrolls instead of clipping its buttons */}
          <div className="m-auto bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thanh Toán Dịch Vụ Y Tế</h3>
                  <p className="text-xs text-slate-500">Cổng thanh toán điện tử & Quỹ khám bệnh MediAssist</p>
                </div>
              </div>
              <button
                onClick={closeCheckout}
                disabled={processingPayment}
                aria-label="Đóng thanh toán"
                className="p-1 rounded-xl text-slate-500 hover:text-slate-700 transition cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Package Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{selectedPaymentPackage.name}</p>
                <p className="text-[11px] text-teal-700 font-medium">{selectedPaymentPackage.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Tổng tiền</span>
                <span className="text-lg font-black text-teal-700" data-testid="checkout-total">
                  {chargedAmount ? formatMoney(chargedAmount.amount, chargedAmount.currency) : formatPackagePrice(selectedPaymentPackage.priceVnd)}
                </span>
              </div>
            </div>

            {pendingTx && chargedAmount && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900" data-testid="amount-changed">
                Máy chủ xác nhận số tiền thanh toán là <strong>{formatMoney(chargedAmount.amount, chargedAmount.currency)}</strong>, khác giá{' '}
                {formatPackagePrice(selectedPaymentPackage.priceVnd)} đang hiển thị. Bấm "Xác nhận thanh toán" để tiếp tục với số tiền mới, hoặc "Hủy bỏ".
              </div>
            )}

            {/* Payment Method Selector — locked while a held transaction exists, since it was created for this method */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Chọn phương thức thanh toán:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('STRIPE')}
                  disabled={methodLocked}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'STRIPE'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Stripe Sandbox</span>
                  <span className="text-[9px] text-indigo-700 font-normal">Thẻ Visa/Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VIETQR')}
                  disabled={methodLocked}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'VIETQR'
                      ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-teal-600" />
                  <span>VietQR Pro</span>
                  <span className="text-[9px] text-teal-700 font-normal">Napas 247</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VNPAY')}
                  disabled={methodLocked}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'VNPAY'
                      ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>VNPAY QR</span>
                  <span className="text-[9px] text-slate-400 font-normal">Cổng VNPAY</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MOMO')}
                  disabled={methodLocked}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'MOMO'
                      ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-pink-600" />
                  <span>Ví MoMo</span>
                  <span className="text-[9px] text-slate-400 font-normal">Ví điện tử</span>
                </button>
              </div>
              {methodLocked && (
                <p className="text-[11px] text-slate-500" data-testid="method-locked-hint">
                  Bấm Hủy bỏ để đổi phương thức.
                </p>
              )}
            </div>

            {/* Simulated Payment Details */}
            {paymentMethod === 'STRIPE' ? (
              <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-indigo-950">Cổng Thanh Toán Quốc Tế Stripe Sandbox</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                    Test Mode
                  </span>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Hỗ trợ thẻ thử nghiệm (Stripe Sandbox Cards):
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Số thẻ test</span>
                      <strong className="text-indigo-950">4242 4242 4242 4242</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Hạn dùng / CVC</span>
                      <strong className="text-slate-800">Tương lai / 123</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    Hệ thống sẽ điều hướng an toàn qua trang Stripe Hosted Checkout Sandbox để xác thực thẻ và tự động ghi sổ giao dịch.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-teal-50/40 rounded-2xl border border-teal-200/80 flex flex-col items-center text-center space-y-3">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center relative">
                  {/* SVG Mock QR Code */}
                  <svg viewBox="0 0 100 100" className="w-28 h-28 text-slate-900">
                    <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="10" width="15" height="15" fill="white" />
                    <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                    <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="75" y="10" width="15" height="15" fill="white" />
                    <rect x="77" y="12" width="11" height="11" fill="currentColor" />
                    <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="75" width="15" height="15" fill="white" />
                    <rect x="12" y="77" width="11" height="11" fill="currentColor" />
                    <rect x="40" y="15" width="20" height="5" fill="currentColor" />
                    <rect x="45" y="25" width="10" height="5" fill="currentColor" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    <rect x="70" y="40" width="10" height="10" fill="currentColor" />
                    <rect x="85" y="40" width="10" height="10" fill="currentColor" />
                    <rect x="40" y="70" width="15" height="15" fill="currentColor" />
                    <rect x="65" y="70" width="20" height="5" fill="currentColor" />
                    <rect x="70" y="80" width="25" height="15" fill="currentColor" />
                  </svg>
                  <span className="text-[9px] font-mono font-bold text-teal-800 uppercase tracking-wider">VietQR NAPAS 247</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold" data-testid="sandbox-warning">
                    Môi trường thử nghiệm — mã QR minh hoạ, KHÔNG chuyển tiền thật.
                  </p>
                  <p className="text-slate-600">
                    Bấm xác nhận để hệ thống mô phỏng giao dịch thành công và cộng lượt quét.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <EmailNotVerifiedHint className="justify-end" />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeCheckout}
                disabled={processingPayment}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={processingPayment || isUnverified}
                title={isUnverified ? EMAIL_NOT_VERIFIED_TOOLTIP : undefined}
                aria-busy={processingPayment || undefined}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  paymentMethod === 'STRIPE'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {processingPayment ? (
                  'Đang xử lý giao dịch...'
                ) : paymentMethod === 'STRIPE' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Thanh toán qua Stripe ({formatPackagePrice(selectedPaymentPackage.priceVnd)})</span>
                  </>
                ) : pendingTx && chargedAmount ? (
                  <>
                    <BadgeCheck className="w-4 h-4" />
                    <span>Xác nhận thanh toán {formatMoney(chargedAmount.amount, chargedAmount.currency)}</span>
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4" />
                    <span>Mô phỏng thanh toán thành công</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
