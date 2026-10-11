import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  X,
  Stethoscope,
  ChevronRight,
  Building2,
  Printer,
  RotateCcw,
  ExternalLink,
  Zap,
  Crown,
  QrCode,
  CreditCard,
  Wallet,
  BadgeCheck,
  AlertTriangle,
  FileQuestion,
  Download,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  Users,
  User,
  Star
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { BookingModal, type BookableDoctor } from '../../components/booking/BookingModal';
import { Skeleton, useToast } from '../../components/ui';
import { SCAN_PACKAGES, formatPackagePrice, type PackageCode } from '../../config/pricing';
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

type AnalysisErrorKind = 'validation' | 'quota' | 'retryable' | 'other';

/** Display copy for each package; price and duration come from config/pricing (must match PaymentService). */
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
import { useSearchParams } from 'react-router-dom';

interface AbnormalIndicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'ELEVATED' | 'NORMAL' | 'LOW';
  clinicalSignificance: string;
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
  storageUrl?: string;
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
  const [searchParams] = useSearchParams();
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
  const [selectedPackageCode, setSelectedPackageCode] = useState<PackageCode | null>(null);
  const selectedPaymentPackage = selectedPackageCode ? SCAN_PACKAGES[selectedPackageCode] : null;
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'VIETQR' | 'VNPAY' | 'MOMO'>('STRIPE');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const handleConfirmPayment = async () => {
    if (!selectedPaymentPackage || processingPayment) return;
    try {
      setProcessingPayment(true);
      setPaymentError(null);
      const res = await api.post('/payments/checkout', {
        orderType: 'QUOTA_PURCHASE',
        packageId: selectedPaymentPackage.code,
        paymentMethod,
      });

      if (paymentMethod === 'STRIPE' && res.data?.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
        return;
      }

      if (!res.data?.data?.transactionCode) {
        setPaymentError('Cổng thanh toán không trả về mã giao dịch. Vui lòng thử lại sau.');
        return;
      }
      const verifyRes = await api.post('/payments/verify', {
        transactionCode: res.data.data.transactionCode,
        sessionId: res.data.data.gatewayReference,
      });
      if (!verifyRes.data?.success) {
        setPaymentError(verifyRes.data?.message || 'Chưa xác nhận được thanh toán. Nếu đã chuyển khoản, vui lòng chờ vài phút rồi kiểm tra lại.');
        return;
      }
      await fetchQuota();
      toast.success(`Thanh toán thành công — đã kích hoạt ${selectedPaymentPackage.name}.`);
      setSelectedPackageCode(null);
      setShowPricingModal(false);
      setError(null);
    } catch (err: unknown) {
      setPaymentError(getApiErrorMessage(err, 'Giao dịch thanh toán không thành công.'));
    } finally {
      setProcessingPayment(false);
    }
  };
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [downloadPdfError, setDownloadPdfError] = useState<string | null>(null);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {loadingFocusDoc && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3 text-sm font-semibold text-teal-800 animate-fadeIn shadow-xs">
          <Sparkles className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
          <span>Đang tải kết quả bóc tách chỉ số xét nghiệm và gợi ý bác sĩ cho tài liệu đã chọn...</span>
        </div>
      )}

      {/* Prominent Instant Upload & Analysis Success Notification */}
      {analysisSuccessNotification && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500 rounded-3xl flex flex-wrap items-center justify-between gap-4 text-emerald-950 shadow-md animate-fadeIn ring-4 ring-emerald-500/10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 ${analysisSuccessNotification.modelUsed?.toLowerCase().includes('offline') || analysisSuccessNotification.modelUsed?.toLowerCase().includes('deterministic') ? 'bg-amber-600' : 'bg-emerald-600'} text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-xs`}>
                  {analysisSuccessNotification.modelUsed?.toLowerCase().includes('offline') || analysisSuccessNotification.modelUsed?.toLowerCase().includes('deterministic') ? 'Chế Độ Ngoại Tuyến' : 'AI Phân Tích Hoàn Tất'}
                </span>
                <h4 className="font-bold text-emerald-900 text-base">
                  {analysisSuccessNotification.modelUsed?.toLowerCase().includes('offline') || analysisSuccessNotification.modelUsed?.toLowerCase().includes('deterministic')
                    ? 'Đã Bóc Tách Chỉ Số & Khớp Nối Bác Sĩ (Ngoại Tuyến)!'
                    : 'Đã Phân Tích & Số Hóa Tài Liệu Y Tế Thành Công!'}
                </h4>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Tệp <strong>{analysisSuccessNotification.fileName}</strong> đã được trích xuất{' '}
                <strong>{analysisSuccessNotification.indicatorsCount} chỉ số lâm sàng</strong>, định hướng chuyên khoa{' '}
                <strong className="underline decoration-emerald-500">{analysisSuccessNotification.specialtyName}</strong>{' '}
                và gợi ý <strong>{analysisSuccessNotification.matchedDoctorsCount} bác sĩ chuyên khoa</strong> phù hợp.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Xem Kết Quả Ngay</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAnalysisSuccessNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Đọc Kết Quả Xét Nghiệm & Gợi Ý Bác Sĩ
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Tải lên phiếu xét nghiệm, đơn thuốc hoặc bệnh án (PDF/ảnh). Hệ thống giải thích các chỉ số bất thường bằng lời dễ hiểu và gợi ý bác sĩ chuyên khoa phù hợp.
            </p>
          </div>
        </div>

        {/* Quota & Subscription Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {quota?.vip ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border border-amber-300 text-amber-900 rounded-full text-xs font-semibold shadow-xs">
              <Crown className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Hội Viên MediPass VIP</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-semibold shadow-xs">
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
                className="ml-1 px-2.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-full text-[11px] font-bold transition border border-teal-200 cursor-pointer"
              >
                + Mua thêm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone */}
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
        className={`p-5 sm:p-8 rounded-3xl border-2 border-dashed transition text-center space-y-4 shadow-xs ${
          analyzing
            ? 'bg-slate-50 border-slate-200 opacity-80'
            : isDragging
            ? 'bg-teal-50/70 border-teal-500 ring-4 ring-teal-500/20'
            : 'bg-white border-slate-300 hover:border-teal-500'
        }`}
      >
        <UploadCloud
          className={`w-14 h-14 mx-auto transition-transform duration-200 ${
            isDragging ? 'text-teal-600 scale-110' : 'text-teal-500'
          }`}
        />
        <div>
          <p className="text-base font-bold text-slate-800">
            Kéo thả tệp PDF và Ảnh phiếu xét nghiệm vào đây hoặc bấm để chọn tệp
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hỗ trợ kết hợp đồng thời nhiều tệp: <strong>PDF, JPG, PNG</strong> (tối đa 5 tệp, tổng dung lượng &le; 25MB, mỗi tệp &le; 10MB). Dữ liệu được mã hóa an toàn.
          </p>
        </div>

        <label
          htmlFor="multi-file-upload-input"
          aria-disabled={analyzing || undefined}
          className={`inline-block px-5 py-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-sm font-semibold cursor-pointer transition border border-teal-200 shadow-xs ${
            analyzing ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          Chọn tệp PDF hoặc ảnh
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

        {/* Selected Multi-File Queue Card */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-5 bg-slate-50/90 rounded-2xl border border-teal-200/80 max-w-xl mx-auto text-left shadow-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Hàng Đợi Tệp Đã Chọn ({selectedFiles.length}/5 tệp)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500">
                  {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB / 25 MB
                </span>
                <button
                  type="button"
                  onClick={handleClearFiles}
                  disabled={analyzing}
                  className="text-[11px] text-slate-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Xóa toàn bộ hàng đợi"
                >
                  <Trash2 className="w-3 h-3" /> Xóa tất cả
                </button>
              </div>
            </div>

            {/* File Queue Items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedFiles.map((f, idx) => {
                const isPdf = f.name.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={`${f.name}-${idx}`}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-300 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`p-1.5 rounded-lg flex-shrink-0 ${
                          isPdf ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                        }`}
                      >
                        {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{f.name}</p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPdf
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isPdf ? 'PDF' : 'ẢNH'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={analyzing}
                      aria-label={`Xóa tệp ${f.name}`}
                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Xóa tệp này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="multi-file-upload-input"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer transition ${
                  selectedFiles.length >= 5 || analyzing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>Thêm tệp (PDF/Ảnh)</span>
              </label>

              {quotaExhausted && !analyzing ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700" data-testid="quota-exhausted">Hết lượt quét</span>
                  <button
                    type="button"
                    onClick={() => setShowPricingModal(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" /> Xem bảng giá
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => executeAnalysis()}
                  disabled={Boolean(scanBlockedReason)}
                  title={scanBlockedReason || undefined}
                  aria-busy={analyzing || undefined}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" /> Đang phân tích {selectedFiles.length} tệp...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Phân Tích {selectedFiles.length} Tệp
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Random Meddies Patient PDF Generator Card */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border border-teal-200 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-[240px]">
              <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs flex-shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span>Tải phiếu xét nghiệm mẫu (bộ dữ liệu Meddies)</span>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-semibold">Dữ liệu mẫu</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Tạo một tệp PDF mẫu (không phải hồ sơ của bạn) để thử tính năng quét.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadRandomMeddiesPdf}
              disabled={downloadingPdf || analyzing}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              {downloadingPdf ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Đang Tạo PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Tải PDF Ngẫu Nhiên
                </>
              )}
            </button>
          </div>

          {downloadSuccessToast && (
            <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{downloadSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setDownloadSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer transition"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {downloadPdfError && (
            <div className="mt-2.5 p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{downloadPdfError}</span>
              </div>
              <button
                type="button"
                onClick={() => setDownloadPdfError(null)}
                className="text-rose-700 hover:text-rose-900 p-0.5 rounded cursor-pointer transition"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Sample Presets */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Hoặc thử với phiếu mẫu <span className="font-normal text-slate-500">(dữ liệu minh hoạ, mỗi lần thử dùng 1 lượt quét)</span>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                disabled={Boolean(scanBlockedReason)}
                title={scanBlockedReason || undefined}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 disabled:hover:border-slate-200"
              >
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">{preset.title}</p>
                  <p className="text-[10px] text-slate-400">{preset.fileName}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" data-testid="scan-error" data-kind={errorKind} className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2 max-w-2xl">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {errorKind === 'retryable' && selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={() => executeAnalysis()}
                disabled={Boolean(scanBlockedReason)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Thử lại
              </button>
            )}
            {errorKind === 'quota' && (
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" /> Gói quét / VIP
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🚀 Multi-Stage Progressive Visual Stepper State */}
      {analyzing && (
        <div className="bg-white rounded-3xl border border-teal-200/80 p-6 sm:p-8 space-y-6 shadow-sm animate-fadeIn">
          {/* Top Progress Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-200">
                <Sparkles className="w-6 h-6 animate-spin text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Hệ Thống Đang Xử Lý Tài Liệu Y Tế</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 animate-pulse">
                    Giai đoạn {analysisStage + 1}/5
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedFiles.length > 1 ? (
                    <span>
                      Đang phân tích đồng thời <strong>{selectedFiles.length} tệp</strong>:{' '}
                      <span className="text-slate-700 font-medium">
                        {selectedFiles.map((f) => f.name).join(', ')}
                      </span>
                    </span>
                  ) : (
                    <span>
                      Đang phân tích tệp: <strong className="text-slate-700">{file?.name || 'Tài liệu cận lâm sàng'}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Percentage Badge */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Tiến độ ước tính</span>
                <p className="text-lg font-black text-teal-700 leading-none">
                  {Math.min(95, (analysisStage + 1) * 20)}%
                </p>
              </div>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(95, (analysisStage + 1) * 20)}%` }}
            />
          </div>

          {/* 5-Stage Stepper Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
            {[
              {
                step: 0,
                title: 'Ẩn thông tin cá nhân',
                desc: 'Che tên, số định danh trước khi phân tích',
                icon: ShieldCheck
              },
              {
                step: 1,
                title: 'Đọc nội dung tài liệu',
                desc: 'Nhận diện bảng kết quả xét nghiệm',
                icon: FileText
              },
              {
                step: 2,
                title: 'Tìm chỉ số bất thường',
                desc: 'So với khoảng tham chiếu',
                icon: AlertTriangle
              },
              {
                step: 3,
                title: 'Tìm bác sĩ phù hợp',
                desc: 'Theo chuyên khoa liên quan',
                icon: Stethoscope
              },
              {
                step: 4,
                title: 'Tổng hợp giải thích',
                desc: 'Viết lời giải thích dễ hiểu',
                icon: Sparkles
              }
            ].map((item) => {
              const Icon = item.icon;
              const isDone = analysisStage > item.step;
              const isCurrent = analysisStage === item.step;

              return (
                <div
                  key={item.step}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isDone
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                      : isCurrent
                      ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-1.5 rounded-xl ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-teal-600 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Xong
                      </span>
                    ) : isCurrent ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md animate-pulse">
                        Đang chạy
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Chờ</span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold leading-tight ${
                        isDone
                          ? 'text-emerald-950'
                          : isCurrent
                          ? 'text-teal-950 font-extrabold'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Medical Privacy & Trust Assurance */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>
              Mọi dữ liệu danh tính cá nhân (CCCD, Họ tên, SĐT) đều được khử định danh tự động theo chuẩn HIPAA trước khi gửi đến mô hình AI.
            </span>
          </div>
        </div>
      )}

      {/* 📊 Analysis Results Display */}
      {analysis && !analyzing && (
        <div id="analysis-results" className="space-y-6 animate-fadeIn scroll-mt-6">
          {/* Deduplication Cache Hit Banner */}
          {analysis.cachedResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-emerald-950 text-xs shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Tài liệu này bạn đã quét trước đó</p>
                  <p className="text-emerald-700 mt-0.5">
                    Kết quả được lấy lại từ hồ sơ của bạn và <strong>không trừ lượt quét</strong>.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] whitespace-nowrap">
                Miễn phí
              </span>
            </div>
          )}

          {/* Multi-Document Synthesis Banner */}
          {analysis.filesCount && analysis.filesCount > 1 && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-teal-50 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs shadow-xs animate-fadeIn">
              <div className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0 mt-0.5 shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-indigo-950 text-sm">
                  Đã Phân Tích Đồng Thời {analysis.filesCount} Tài Liệu Cận Lâm Sàng (PDF & Hình Ảnh)
                </p>
                <p className="text-indigo-800 mt-1 leading-relaxed">
                  Hệ thống AI đã trích xuất đồng thời toàn bộ nội dung từ{' '}
                  <strong>{analysis.fileNames?.join(', ') || analysis.fileName}</strong> và gộp các chỉ số vào một bản tóm tắt chung.
                </p>
              </div>
            </div>
          )}

          {/* Top Medical Disclaimer Notice */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý y tế quan trọng:</strong> Kết quả phân tích được thực hiện bởi Trợ lý AI nhằm hỗ trợ diễn giải các chỉ số chuyên môn phức tạp.
              Đây <strong>không phải là kết luận chẩn đoán thay thế bác sĩ</strong>. Hãy tham khảo ý kiến bác sĩ chuyên khoa bên dưới để được thăm khám chính xác.
            </div>
          </div>

          {/* 🤖 OpenRouter Model Attribution & Failover Status */}
          {analysis.modelUsed && (() => {
            const isOffline = analysis.modelUsed.toLowerCase().includes('offline') || analysis.modelUsed.toLowerCase().includes('deterministic');
            return isOffline ? (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0 shadow-xs">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-950">Chế độ hạn chế</span>
                      <span className="font-mono font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300">
                        {analysis.modelUsed}
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Trợ lý AI tạm thời không khả dụng nên kết quả chỉ gồm các chỉ số đọc được trực tiếp từ tài liệu, <strong>không có phần diễn giải</strong>. Hãy hỏi bác sĩ để được giải thích đầy đủ.
                    </p>
                    <details className="mt-1">
                      <summary className="text-[11px] text-amber-700 cursor-pointer">Chi tiết kỹ thuật</summary>
                      <p className="text-[11px] text-amber-700 mt-1 font-mono">
                        Offline fallback (thiếu OPENROUTER_API_KEY hoặc mất mạng). Parser thô + tìm bác sĩ bằng pgvector cosine.
                      </p>
                    </details>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white text-amber-800 font-semibold rounded-xl border border-amber-200 text-[11px] shadow-2xs whitespace-nowrap">
                  ⚠️ Chế Độ Ngoại Tuyến
                </span>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950">Đã phân tích bằng trợ lý AI</span>
                      <span className="font-mono font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md border border-emerald-300">
                        {analysis.modelUsed}
                      </span>

                    </div>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.
                    </p>
                    <details className="mt-1">
                      <summary className="text-[11px] text-emerald-700 cursor-pointer">Chi tiết kỹ thuật</summary>
                      <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                        OpenRouter AI Gateway · gợi ý bác sĩ bằng PostgreSQL pgvector (cosine).
                      </p>
                    </details>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* 👥 Multi-Patient Clinical Segregation Safety Card & Tab Switcher */}
          {analysis.multiPatientDetected && analysis.patientAnalyses && analysis.patientAnalyses.length > 1 && (
            <div className="p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-400 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-600 text-white rounded-2xl shrink-0 mt-0.5 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-amber-950 text-base">
                      Phát Hiện Hồ Sơ Của Nhiều Bệnh Nhân Khác Nhau ({analysis.patientAnalyses.length} Người Bệnh)
                    </h4>
                    <span className="px-2.5 py-0.5 bg-amber-600 text-white text-[11px] font-bold rounded-full">
                      Tách Biệt Lâm Sàng Độc Lập
                    </span>
                  </div>
                  <p className="text-amber-900 text-xs leading-relaxed">
                    Hệ thống nhận diện các tài liệu tải lên thuộc về các bệnh nhân khác nhau (dựa trên họ tên, giới tính hoặc mã định danh SID).
                    Để đảm bảo <strong>an toàn y khoa và chống nhiễm chéo hồ sơ</strong>, AI đã phân tích độc lập từng bệnh án, bóc tách chỉ số riêng biệt và đối chiếu đề xuất Bác sĩ chuyên khoa phù hợp cho từng người.
                  </p>
                </div>
              </div>

              {/* Patient Selector Tabs */}
              <div className="pt-2 border-t border-amber-200/80">
                <p className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-700" /> Chọn Hồ Sơ Bệnh Nhân Để Xem Chi Tiết & Đặt Khám Bác Sĩ:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {analysis.patientAnalyses.map((p, idx) => {
                    const isSelected = activePatientIndex === idx;
                    const patientName = p.patientName || `Bệnh nhân #${idx + 1}`;
                    const indCount = p.indicators ? p.indicators.length : 0;
                    const docCount = p.matchedDoctors ? p.matchedDoctors.length : 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePatientIndex(idx)}
                        className={`p-3.5 rounded-2xl text-left transition flex flex-col justify-between gap-2 border-2 cursor-pointer ${
                          isSelected
                            ? 'bg-white border-teal-600 shadow-md ring-2 ring-teal-500/20'
                            : 'bg-white/70 hover:bg-white border-amber-200 hover:border-amber-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block leading-tight">
                                {patientName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.patientAge ? `${p.patientAge}t` : ''} {p.patientGender ? `(${p.patientGender})` : ''}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-md">
                              Đang xem
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 font-mono">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 truncate max-w-[140px]" title={p.sourceFileName}>
                            📄 {p.sourceFileName}
                          </span>
                          <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200">
                            {indCount} chỉ số
                          </span>
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                            {docCount} bác sĩ
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Patient Clinical Details & Scribe Summary */}
          {(() => {
            const isMulti = Boolean(analysis.multiPatientDetected && analysis.patientAnalyses && analysis.patientAnalyses.length > 1);
            const activePatient = isMulti ? (analysis.patientAnalyses![activePatientIndex] || analysis.patientAnalyses![0]) : null;

            const displayHospital = activePatient?.hospitalName || analysis.hospitalName;
            const displayDept = activePatient?.departmentName || analysis.departmentName;
            const displayDoctor = activePatient?.orderingDoctor || analysis.orderingDoctor;
            const displayDate = activePatient?.testDate || analysis.testDate;
            const displaySid = activePatient?.sidCode || analysis.sidCode;
            const displayPatientName = activePatient?.patientName || analysis.patientName || user?.fullName || 'Người Bệnh';
            const displayPatientAge = activePatient?.patientAge || analysis.patientAge;
            const displayPatientGender = activePatient?.patientGender || analysis.patientGender;
            const displayDeviceModel = activePatient?.deviceModel || analysis.deviceModel;
            const displaySpecialtyName = activePatient?.recommendedSpecialtyName || analysis.recommendedSpecialtyName;
            const displayExplanation = activePatient?.plainLanguageExplanation || analysis.plainLanguageExplanation;
            const displaySummary = activePatient?.clinicalSummary || analysis.clinicalSummary;
            const displayIndicators = activePatient?.indicators ?? analysis.indicators ?? [];
            const displayDoctors = activePatient?.matchedDoctors ?? analysis.matchedDoctors ?? [];
            const displayQuestions = activePatient?.suggestedQuestions ?? analysis.suggestedQuestions ?? [];
            const displayFileName = activePatient?.sourceFileName || analysis.fileName;

            return (
              <>
                {/* Scribe Summary & Patient Translation */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
                  {/* 🏥 Official Hospital Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base tracking-tight text-white uppercase">
                              {displayHospital || 'Cơ Sở Khám Chữa Bệnh / Đơn Vị Xét Nghiệm'}
                            </h4>
                            {isMulti && (
                              <span className="px-2.5 py-0.5 bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-full text-[11px] font-semibold">
                                Bệnh nhân #{activePatientIndex + 1}/{analysis.patientAnalyses!.length}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {displayDept || 'Khoa Xét Nghiệm Cận Lâm Sàng | Tiêu Chuẩn ISO 15189'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> Chữ ký số điện tử hợp lệ
                        </div>
                        <p className="text-slate-400 font-mono">
                          Mã SID: <span className="text-teal-300 font-bold">{displaySid || (analysis.documentId ? `SID-${analysis.documentId.substring(0, 8).toUpperCase()}` : 'SID-CHƯA-XÁC-ĐỊNH')}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Người Bệnh:</span>
                        <span className="font-bold text-white">
                          {displayPatientName}
                          {displayPatientAge ? ` (${displayPatientAge}t` : ''}
                          {displayPatientGender ? ` - ${displayPatientGender})` : (displayPatientAge ? ')' : '')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Thiết Bị Tự Động:</span>
                        <span className="font-bold text-slate-200">
                          {displayDeviceModel || 'Hệ thống phân tích tự động'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Bác Sĩ Chỉ Định:</span>
                        <span className="font-bold text-slate-200">
                          {displayDoctor || 'Bác sĩ điều trị / KTV'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Thời Gian Tiếp Nhận:</span>
                        <span className="font-mono text-slate-200">
                          {displayDate || 'Không xác định trong tài liệu'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Báo Cáo Phân Tích Chỉ Số Cận Lâm Sàng</h3>
                        {isMulti ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[11px] font-bold flex items-center gap-1">
                              <User className="w-3 h-3" /> Bệnh nhân: {displayPatientName}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono border border-slate-200">
                              📄 Tệp nguồn: {displayFileName}
                            </span>
                          </div>
                        ) : analysis.filesCount && analysis.filesCount > 1 ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[11px] font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Hồ sơ tổng hợp ({analysis.filesCount} tệp):
                            </span>
                            {analysis.fileNames && analysis.fileNames.length > 0 ? (
                              analysis.fileNames.map((name, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono border border-slate-200"
                                >
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">{analysis.fileName}</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Tệp: {analysis.fileName}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {analysis.storageUrl && (
                        <a
                          href={analysis.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition"
                          title="Xem tệp gốc trên Cloud Storage"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                          <span>Supabase Cloud EMR</span>
                          <ExternalLink className="w-3 h-3 text-sky-500" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> In Phiếu Xét Nghiệm
                      </button>
                      <span className="px-3.5 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-200">
                        {displaySpecialtyName
                          ? `Chuyên khoa: ${displaySpecialtyName}`
                          : 'Chuyên khoa: Chưa xác định (Cần bổ sung kết quả)'}
                      </span>
                    </div>
                  </div>

                  {/* Medical Safety Alert Banner when document has NO indicators (blank order form or blurry) */}
                  {displayIndicators.length === 0 && (
                    <div className="p-4.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-start gap-3.5 text-amber-900 shadow-xs">
                      <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                          Phiếu Xét Nghiệm Chưa Có Kết Quả Đo Lường Hoặc Ảnh Không Rõ Số Liệu
                        </h4>
                        <p className="text-amber-900 leading-relaxed">
                          Hệ thống không nhận diện được giá trị kết quả cận lâm sàng nào trong tài liệu này (phiếu chỉ định chưa điền kết quả hoặc ảnh bị mờ/mất nét).
                          Theo tiêu chuẩn an toàn y tế <strong>MediAssist Medical Integrity</strong>: Hệ thống <strong>tuyệt đối không suy đoán chẩn đoán hoặc chỉ định bác sĩ khi thiếu dữ liệu lâm sàng</strong>.
                        </p>
                        <p className="text-amber-800 font-medium">
                          👉 <strong>Khuyến nghị</strong>: Vui lòng chụp lại ảnh rõ nét, đủ ánh sáng, căn thẳng góc hoặc tải tệp PDF điện tử gốc từ bệnh viện để AI phân tích chính xác.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Plain Language Explanation Box */}
                  <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2">
                    <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" /> Bản Dịch Ngôn Ngữ Dễ Hiểu Dành Cho Người Bệnh
                    </h4>
                    <p className="text-xs text-teal-950 whitespace-pre-line leading-relaxed">
                      {displayExplanation}
                    </p>
                  </div>

                  {/* Clinical Summary */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-mono text-xs text-slate-700">
                    <p className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">Tóm tắt lâm sàng (Clinical Summary):</p>
                    <p className="leading-relaxed">{displaySummary}</p>
                  </div>
                </div>

                {/* Indicators Comparison Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-base">
                      Bảng Đối Chiếu Chỉ Số Xét Nghiệm {isMulti ? `- ${displayPatientName}` : ''}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {displayIndicators.length} chỉ số
                    </span>
                  </div>
                  {displayIndicators.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                        <FileQuestion className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <p className="font-bold text-slate-800 text-sm">Chưa có chỉ số cận lâm sàng để đối chiếu</p>
                        <p className="text-xs text-slate-500">
                          Toàn bộ cột kết quả xét nghiệm trong tài liệu đang để trống hoặc chất lượng ảnh quá mờ để nhận diện số liệu đo lường.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <th className="py-3 px-4 font-semibold">Tên Xét Nghiệm</th>
                            <th className="py-3 px-4 font-semibold">Kết Quả Đo Được</th>
                            <th className="py-3 px-4 font-semibold">Khoảng Tham Chiếu</th>
                            <th className="py-3 px-4 font-semibold">Đánh Giá</th>
                            <th className="py-3 px-4 font-semibold">Ý Nghĩa Lâm Sàng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayIndicators.map((ind, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-4 font-bold text-slate-800">{ind.name}</td>
                              <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                                {ind.value} {ind.unit}
                              </td>
                              <td className="py-3 px-4 text-slate-500">{ind.referenceRange}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  ind.status === 'ELEVATED' || (ind.status as string) === 'HIGH'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : ind.status === 'LOW'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {ind.status === 'ELEVATED' || (ind.status as string) === 'HIGH' ? 'TĂNG CAO' : ind.status === 'LOW' ? 'HẠ THẤP' : 'BÌNH THƯỜNG'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-[11px] leading-relaxed">
                                {ind.clinicalSignificance}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 🧑‍⚕️ Recommended Doctors (pgvector Cosine Similarity Match from PDF findings) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                        {isMulti
                          ? `Bác Sĩ Chuyên Khoa Đề Xuất Riêng Cho: ${displayPatientName}`
                          : 'Bác Sĩ Chuyên Khoa Được AI Đề Xuất Cho Bệnh Án Này'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMulti
                          ? `Dựa trên các chỉ số bất thường trong tệp ${displayFileName}, đây là những bác sĩ có chuyên môn phù hợp nhất cho ${displayPatientName}.`
                          : 'Dựa trên các chỉ số bất thường trong tài liệu, đây là những bác sĩ có chuyên môn phù hợp nhất.'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Tìm thấy {displayDoctors.length} bác sĩ phù hợp
                    </span>
                  </div>

                  {displayDoctors.length > 0 && displayIndicators.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {displayDoctors.map((doc) => {
                        const matchPct = Math.round(doc.similarityScore * 100);
                        const docKey = doc.doctorId || (doc as any).id;
                        return (
                          <div
                            key={docKey}
                            className={`rounded-2xl transition p-5 flex flex-col justify-between space-y-4 ${
                              doc.aiRecommended
                                ? 'bg-gradient-to-b from-teal-50/50 to-white border-2 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                                : 'bg-white border border-slate-200 shadow-xs hover:shadow-md'
                            }`}
                          >
                            {/* AI Recommendation Highlight Badge */}
                            {doc.aiRecommended && (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 text-white text-[11px] font-bold rounded-lg shadow-xs -mt-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Được AI Lựa Chọn Ưu Tiên Cho Ca Bệnh Này</span>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    {doc.academicTitle && (
                                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                        {doc.academicTitle}
                                      </span>
                                    )}
                                    <h4 className="font-bold text-slate-900 text-base">{doc.fullName}</h4>
                                    <span title="Đã thẩm định CCHN">
                                      <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                                    {doc.hospitalAffiliation && (
                                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                                        {doc.hospitalAffiliation}
                                      </span>
                                    )}
                                    <span>•</span>
                                    <span className="font-mono">CCHN: {doc.licenseNumber}</span>
                                    <span>•</span>
                                    {formatRating(doc.rating, doc.reviewCount) ? (
                                      <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
                                        {formatRating(doc.rating, doc.reviewCount)}
                                        <span className="text-slate-500 font-normal">({doc.reviewCount})</span>
                                      </span>
                                    ) : (
                                      <span className="italic">Chưa có đánh giá</span>
                                    )}
                                  </div>
                                </div>

                                {/* Match Score Badge */}
                                <div className="flex flex-col items-end">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    matchPct >= 80
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                                  }`}>
                                    Độ khớp: {matchPct}%
                                  </span>
                                </div>
                              </div>

                              {/* Specialties */}
                              <div className="flex flex-wrap gap-1.5">
                                {doc.specialties && doc.specialties.map((spec, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                                    {spec}
                                  </span>
                                ))}
                              </div>

                              {/* Bio */}
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {doc.bio}
                              </p>

                              {/* AI Doctor Recommendation Reason Callout */}
                              {doc.aiRecommendationReason && (
                                <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200 text-xs text-teal-950 flex items-start gap-2">
                                  <span className="font-bold text-teal-800 flex-shrink-0">Lý do đề xuất:</span>
                                  <span className="leading-relaxed">{doc.aiRecommendationReason}</span>
                                </div>
                              )}
                            </div>

                            {/* Footer / Booking Action */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500">Phí khám:</span>
                                <p className="text-sm font-bold text-teal-700">
                                  {formatVnd(doc.consultationFee) ?? 'Liên hệ'}
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenBooking(
                                  doc,
                                  isMulti
                                    ? `Bệnh nhân: ${displayPatientName} (${displayFileName}) - ${displaySummary.slice(0, 140)}...`
                                    : undefined
                                )}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Đặt Khám Với Bác Sĩ Này
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-2">
                      <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">Chưa có chỉ định Bác sĩ chuyên khoa</p>
                      <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                        Hệ thống tuân thủ tiêu chuẩn an toàn y tế <strong>MediAssist Medical Safety</strong>: Chỉ đề xuất Bác sĩ chuyên khoa khi có kết quả xét nghiệm định lượng bất thường cụ thể. Khi tài liệu là phiếu trắng hoặc ảnh không rõ số liệu, hệ thống không chỉ định bác sĩ để bảo đảm an toàn điều trị cho người bệnh.
                      </p>
                    </div>
                  )}
                </div>

                {/* Suggested Questions for Doctor */}
                {displayQuestions.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-teal-600" />
                      Câu Hỏi Gợi Ý Bạn Nên Trao Đổi Với Bác Sĩ Trong Buổi Khám {isMulti ? `Cho ${displayPatientName}` : ''}
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {displayQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-teal-600 flex-shrink-0">{idx + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
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
              {(Object.keys(SCAN_PACKAGES) as PackageCode[]).map((code) => {
                const pkg = SCAN_PACKAGES[code];
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
                      <h4 className="text-2xl font-black text-slate-900">{formatPackagePrice(code)}</h4>
                      <p className="text-xs text-slate-700 font-medium">{pkg.description}</p>
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
                        setPaymentError(null);
                        setSelectedPackageCode(code);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${toneButton}`}
                    >
                      {display.cta} ({formatPackagePrice(code)})
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
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
                onClick={() => setSelectedPackageCode(null)}
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
                <span className="text-lg font-black text-teal-700">{formatPackagePrice(selectedPaymentPackage.code)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Chọn phương thức thanh toán:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('STRIPE')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
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
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
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
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
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
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
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
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPackageCode(null)}
                disabled={processingPayment}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={processingPayment}
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
                    <span>Thanh toán qua Stripe ({formatPackagePrice(selectedPaymentPackage.code)})</span>
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
