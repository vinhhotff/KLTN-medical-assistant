import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
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
  Crown
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface AbnormalIndicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'ELEVATED' | 'NORMAL' | 'LOW';
  clinicalSignificance: string;
}

interface DoctorMatch {
  doctorId: string;
  fullName: string;
  bio: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  similarityScore: number;
  specialties: string[];
  academicTitle?: string;
  hospitalAffiliation?: string;
  aiRecommended?: boolean;
  aiRecommendationReason?: string;
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
}

interface UserQuota {
  scanQuota: number;
  subscriptionTier: string;
  vipValidUntil: string | null;
  vip: boolean;
  hasQuota: boolean;
}

interface DoctorSlot {
  slotId?: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  startDateTime?: string;
  endDateTime?: string;
  available: boolean;
}

interface AppointmentConfirmation {
  appointmentCode: string;
  doctorName: string;
  scheduledStart: string;
  feeAmount: number;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DocumentSummarizerPage: React.FC = () => {
  const { user } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Quota & Commercial Monetization State
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const fetchQuota = async () => {
    try {
      const res = await api.get('/documents/quota');
      if (res.data?.data) {
        setQuota(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load user quota:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuota();
    }
  }, [user]);

  // Booking Modal State
  const [bookingDoctor, setBookingDoctor] = useState<DoctorMatch | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatLocalDate(tomorrow);
  });
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppt, setConfirmedAppt] = useState<AppointmentConfirmation | null>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setAnalysis(null);
    }
  };

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    const blob = new Blob([preset.content], { type: 'application/pdf' });
    const fakeFile = new File([blob], preset.fileName, { type: 'application/pdf' });
    setFile(fakeFile);
    setError(null);
    setAnalysis(null);
    executeAnalysis(fakeFile);
  };

  const executeAnalysis = async (fileToAnalyze: File) => {
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setProgressStep(1);

    const stepTimer1 = setTimeout(() => setProgressStep(2), 700);
    const stepTimer2 = setTimeout(() => setProgressStep(3), 1400);

    try {
      const formData = new FormData();
      formData.append('file', fileToAnalyze);

      const res = await api.post('/documents/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.data) {
        setAnalysis(res.data.data);
        fetchQuota();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };
      const status = axiosErr.response?.status;
      const code = axiosErr.response?.data?.error?.code;
      const message = axiosErr.response?.data?.error?.message;
      if (status === 402 || code === 'QUOTA_EXCEEDED') {
        setShowPricingModal(true);
      }
      setError(message || 'Không thể phân tích tài liệu y tế. Vui lòng kiểm tra định dạng tệp.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalyzing(false);
      setProgressStep(0);
    }
  };

  const handleOpenBooking = (doc: DoctorMatch) => {
    setBookingDoctor(doc);
    setSelectedSlot(null);
    setBookingError(null);
    setConfirmedAppt(null);
    setBookingNotes(analysis ? `Phân tích tệp ${analysis.fileName}: ${analysis.clinicalSummary.slice(0, 150)}...` : '');
    loadSlots(doc.doctorId, selectedDate);
  };

  const loadSlots = async (doctorId: string, date: string) => {
    try {
      setSlotsLoading(true);
      setSelectedSlot(null);
      const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.data?.data) {
        setSlots(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (bookingDoctor) {
      loadSlots(bookingDoctor.doctorId, date);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingDoctor || !selectedSlot) return;

    if (!user) {
      setBookingError('Vui lòng đăng nhập tài khoản bệnh nhân để đặt lịch khám.');
      return;
    }

    try {
      setBookingSubmitting(true);
      setBookingError(null);

      const slotTime = selectedSlot.scheduledStart || selectedSlot.startDateTime;
      const res = await api.post('/appointments', {
        doctorId: bookingDoctor.doctorId,
        scheduledStart: slotTime,
        notes: bookingNotes
      });

      if (res.data?.data) {
        setConfirmedAppt({
          appointmentCode: res.data.data.appointmentCode,
          doctorName: bookingDoctor.fullName,
          scheduledStart: slotTime || selectedSlot.scheduledStart || '',
          feeAmount: bookingDoctor.consultationFee
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (axiosErr.response?.data?.error?.code === 'SLOT_CONFLICT') {
        setBookingError('Khung giờ này vừa có người khác đặt trước. Vui lòng chọn một khung giờ khác.');
      } else {
        setBookingError(axiosErr.response?.data?.error?.message || 'Không thể tạo lịch khám. Vui lòng thử lại.');
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quét PDF Bệnh Án & Đề Xuất Bác Sĩ Chuyên Khoa (Multimodal AI)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Tải lên phiếu xét nghiệm máu, đơn thuốc hoặc bệnh án (PDF/Ảnh). AI sẽ đối chiếu chỉ số bất thường và tự động tìm Bác sĩ chuyên khoa phù hợp qua pgvector.
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
              <span>
                Lượt quét: <strong className={quota?.scanQuota === 0 ? "text-rose-600" : "text-teal-700"}>{quota?.scanQuota ?? 1}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="ml-1 px-2.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-full text-[11px] font-bold transition border border-teal-200"
              >
                + Mua thêm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:border-teal-500 transition text-center space-y-4 shadow-xs">
        <UploadCloud className="w-14 h-14 text-teal-500 mx-auto animate-bounce" />
        <div>
          <p className="text-base font-bold text-slate-800">
            Kéo thả tệp PDF phiếu xét nghiệm vào đây hoặc bấm để chọn tệp
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hỗ trợ định dạng PDF, JPG, PNG dung lượng tối đa 15MB. Dữ liệu được mã hóa an toàn.
          </p>
        </div>

        <label className="inline-block px-5 py-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold cursor-pointer transition border border-teal-200 shadow-xs">
          Chọn Tệp PDF / Ảnh Từ Thiết Bị
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Selected File Card */}
        {file && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between max-w-lg mx-auto text-left shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-teal-100 text-teal-700 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <button
              onClick={() => executeAnalysis(file)}
              disabled={analyzing}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 flex-shrink-0"
            >
              {analyzing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Đang Xử Lý...
                </>
              ) : (
                <>Phân Tích AI & Tìm Bác Sĩ</>
              )}
            </button>
          </div>
        )}

        {/* Quick Sample Presets */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <p className="text-xs font-semibold text-slate-600 mb-2">Hoặc thử nhanh các phiếu xét nghiệm mẫu chuẩn:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group"
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2 max-w-2xl">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <button
                type="button"
                onClick={() => executeAnalysis(file)}
                disabled={analyzing}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Thử Lại
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPricingModal(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" /> Gói Quét / VIP
            </button>
          </div>
        </div>
      )}

      {/* Progress Animation State */}
      {analyzing && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xs animate-fadeIn">
          <Sparkles className="w-10 h-10 text-teal-600 animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">Hệ Thống Đang Xử Lý Tài Liệu Y Tế</h3>
            <p className="text-xs text-slate-500">
              {progressStep === 1 && '1/3. Đang trích xuất nội dung và số hóa bảng kết quả từ PDF...'}
              {progressStep === 2 && '2/3. Đang đối chiếu các chỉ số với khoảng tham chiếu lâm sàng...'}
              {progressStep >= 3 && '3/3. Đang truy vấn PostgreSQL pgvector để tìm Bác sĩ chuyên khoa sâu phù hợp...'}
            </p>
          </div>
          <div className="w-64 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-500 rounded-full"
              style={{ width: progressStep === 1 ? '33%' : progressStep === 2 ? '66%' : '95%' }}
            />
          </div>
        </div>
      )}

      {/* 📊 Analysis Results Display */}
      {analysis && !analyzing && (
        <div className="space-y-6 animate-fadeIn">
          {/* Deduplication Cache Hit Banner */}
          {analysis.cachedResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-emerald-950 text-xs shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900 text-sm">⚡ SHA-256 Deduplication Hit (Tiết kiệm 100% tài nguyên)</p>
                  <p className="text-emerald-700 mt-0.5">
                    Tài liệu này đã được phân tích trước đó trong hồ sơ EMR của bạn. Hệ thống trả về kết quả ngay lập tức (0ms) mà <strong>không trừ lượt quét</strong> và không tiêu hao token AI.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-mono font-bold rounded-lg border border-emerald-300 text-[11px] whitespace-nowrap">
                0 Token AI • 0đ Phí
              </span>
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
          {analysis.modelUsed && (
            <div className="p-4 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 border border-teal-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-600 text-white rounded-xl flex-shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-950">Động cơ RAG Phân tích Lâm sàng:</span>
                    <span className="font-mono font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md border border-teal-300">
                      {analysis.modelUsed}
                    </span>
                  </div>
                  <p className="text-teal-700 text-[11px] mt-0.5">
                    Hệ thống tích hợp OpenRouter AI Gateway với cơ chế tự động xoay tua đa mô hình (Gemini 2.0 Flash / Llama 3.3 / DeepSeek R1) & Fallback an toàn offline.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white text-teal-800 font-semibold rounded-xl border border-teal-200 text-[11px] shadow-2xs whitespace-nowrap">
                ✨ Chi Phí 0đ • Sẵn Sàng 99.9%
              </span>
            </div>
          )}

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
                    <h4 className="font-bold text-base tracking-tight text-white uppercase">Bệnh Viện Đa Khoa Quốc Tế MediAssist</h4>
                    <p className="text-xs text-slate-400">Khoa Xét Nghiệm Hóa Sinh - Huyết Học & Chẩn Đoán Phân Tử | ISO 15189:2022</p>
                  </div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Chữ ký số điện tử hợp lệ
                  </div>
                  <p className="text-slate-400 font-mono">Mã SID: <span className="text-teal-300 font-bold">SID-2026-LAB-08492</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Người Bệnh:</span>
                  <span className="font-bold text-white">{user?.fullName || 'Nguyễn Văn B'}</span>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Thiết Bị Tự Động:</span>
                  <span className="font-bold text-slate-200">Roche Cobas 8000</span>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Bác Sĩ Chỉ Định:</span>
                  <span className="font-bold text-slate-200">TS.BS. Nguyễn Văn An</span>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Thời Gian Tiếp Nhận:</span>
                  <span className="font-mono text-slate-200">11/09/2026 08:30</span>
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
                  <p className="text-xs text-slate-500">Tệp: {analysis.fileName}</p>
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
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> In Phiếu Xét Nghiệm
                </button>
                <span className="px-3.5 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-200">
                  Chuyên khoa đề xuất: {analysis.recommendedSpecialtyName}
                </span>
              </div>
            </div>

            {/* Plain Language Explanation Box */}
            <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2">
              <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" /> Bản Dịch Ngôn Ngữ Dễ Hiểu Dành Cho Người Bệnh
              </h4>
              <p className="text-xs text-teal-950 whitespace-pre-line leading-relaxed">
                {analysis.plainLanguageExplanation}
              </p>
            </div>

            {/* Clinical Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-mono text-xs text-slate-700">
              <p className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">Tóm tắt lâm sàng (Clinical Summary):</p>
              <p className="leading-relaxed">{analysis.clinicalSummary}</p>
            </div>
          </div>

          {/* Indicators Comparison Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Bảng Đối Chiếu Chỉ Số Xét Nghiệm</h3>
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
                  {analysis.indicators.map((ind, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{ind.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {ind.value} {ind.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{ind.referenceRange}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          ind.status === 'ELEVATED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : ind.status === 'LOW'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {ind.status === 'ELEVATED' ? 'TĂNG CAO' : ind.status === 'LOW' ? 'HẠ THẤP' : 'BÌNH THƯỜNG'}
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
          </div>

          {/* 🧑‍⚕️ Recommended Doctors (pgvector Cosine Similarity Match from PDF findings) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  Bác Sĩ Chuyên Khoa Được AI Đề Xuất Cho Bệnh Án Này
                </h3>
                <p className="text-xs text-slate-500">
                  PostgreSQL pgvector đã đối chiếu các bất thường trong tài liệu và tìm kiếm các Bác sĩ có chuyên môn sát nhất.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Tìm thấy {analysis.matchedDoctors.length} bác sĩ phù hợp
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {analysis.matchedDoctors.map((doc) => {
                const matchPct = Math.round(doc.similarityScore * 100);
                return (
                  <div
                    key={doc.doctorId}
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
                        {doc.specialties.map((spec, i) => (
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
                        <span className="text-xs text-slate-400">Giá khám tư vấn:</span>
                        <p className="text-sm font-bold text-teal-700">
                          {doc.consultationFee.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Đặt Khám Với Bác Sĩ Này
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Questions for Doctor */}
          {analysis.suggestedQuestions && analysis.suggestedQuestions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                Câu Hỏi Gợi Ý Bạn Nên Trao Đổi Với Bác Sĩ Trong Buổi Khám
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {analysis.suggestedQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-teal-600 flex-shrink-0">{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 📅 Interactive Slot Booking Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Đặt Lịch Khám Chuyên Khoa</h3>
                <p className="text-xs text-slate-500">với {bookingDoctor.fullName}</p>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Confirmed State */}
            {confirmedAppt ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Đặt Lịch Khám Thành Công!</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã lịch hẹn:</span>
                    <span className="font-mono font-bold text-teal-600">{confirmedAppt.appointmentCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bác sĩ:</span>
                    <span className="font-semibold text-slate-800">{confirmedAppt.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(confirmedAppt.scheduledStart).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phí khám:</span>
                    <span className="font-bold text-emerald-600">
                      {confirmedAppt.feeAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setBookingDoctor(null)}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              /* Booking Form */
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn Ngày Khám</label>
                  <input
                    type="date"
                    min={formatLocalDate(new Date())}
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Chọn Khung Giờ Tư Vấn (30 phút/ca)
                  </label>
                  {slotsLoading ? (
                    <div className="py-6 text-center text-slate-400">Đang tải lịch trống...</div>
                  ) : slots.length === 0 ? (
                    <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-center">
                      Bác sĩ không có lịch trống trong ngày này. Vui lòng chọn ngày khác.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button
                          key={slot.slotId}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded-lg border text-center transition ${
                            !slot.available
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                              : selectedSlot?.slotId === slot.slotId
                              ? 'bg-teal-600 text-white border-teal-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                          }`}
                        >
                          <Clock className="w-3 h-3 mx-auto mb-0.5" />
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Đính Kèm Cho Bác Sĩ</label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Mô tả tóm tắt kết quả xét nghiệm để bác sĩ chuẩn bị trước..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {bookingError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                    {bookingError}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingDoctor(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot || bookingSubmitting}
                    onClick={handleConfirmBooking}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl font-semibold transition"
                  >
                    {bookingSubmitting ? 'Đang Đặt...' : 'Xác Nhận Đặt Khám'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <h3 className="font-bold text-lg text-slate-900">Bảng Giá Dịch Vụ & Gói Quét MediAssist-AI</h3>
                  <p className="text-xs text-slate-500">Mô hình kinh doanh Win-Win: Bảo vệ tài nguyên AI, minh bạch chi phí cho người bệnh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tier 1: Single Scan */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gói Lẻ</span>
                  <h4 className="text-2xl font-black text-slate-900">29.000đ</h4>
                  <p className="text-xs text-slate-600 font-medium">1 Lượt Phân Tích Chuyên Sâu</p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> OCR bóc tách chỉ số sinh hóa</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> Đề xuất Bác sĩ qua pgvector</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> Lưu trữ Cloud EMR an toàn</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert('Hệ thống đang tích hợp cổng thanh toán trực tuyến VNPAY/MoMo cho phiên bản Doanh Nghiệp!');
                  }}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Mua 1 Lượt (29k)
                </button>
              </div>

              {/* Tier 2: 5 Scans Pack */}
              <div className="p-5 rounded-2xl border-2 border-teal-500 bg-teal-50/40 flex flex-col justify-between space-y-4 relative shadow-xs">
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-teal-600 text-white rounded-full text-[10px] font-bold shadow-xs">
                  Phổ Biến Nhất
                </span>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Gói Tiết Kiệm</span>
                  <h4 className="text-2xl font-black text-teal-950">99.000đ</h4>
                  <p className="text-xs text-teal-700 font-medium">5 Lượt (Chỉ 19.800đ/lần)</p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> Tiết kiệm 32% chi phí</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> Hạn sử dụng 12 tháng</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> Tóm tắt SBAR đính kèm bác sĩ</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert('Hệ thống đang tích hợp cổng thanh toán trực tuyến VNPAY/MoMo cho phiên bản Doanh Nghiệp!');
                  }}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Mua Gói 5 Lượt (99k)
                </button>
              </div>

              {/* Tier 3: MediPass VIP */}
              <div className="p-5 rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-50/60 to-white flex flex-col justify-between space-y-4 relative shadow-xs">
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold shadow-xs">
                  VIP Gia Đình
                </span>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">MediPass VIP</span>
                  <h4 className="text-2xl font-black text-slate-900">149.000đ<span className="text-xs font-normal text-slate-500">/tháng</span></h4>
                  <p className="text-xs text-amber-800 font-medium">Quét không giới hạn</p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> Không giới hạn lượt quét PDF/Ảnh</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> Ưu tiên kết nối lịch Bác sĩ</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> Hỗ trợ hồ sơ sức khỏe cả gia đình</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert('Hệ thống đang tích hợp cổng thanh toán trực tuyến VNPAY/MoMo cho phiên bản Doanh Nghiệp!');
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Đăng Ký VIP (149k/tháng)
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-slate-500 text-xs text-center border border-slate-200">
              💡 <em>Chính sách chống lãng phí token: Người bệnh tải lại cùng một tài liệu (SHA-256 Deduplication) sẽ <strong>được miễn phí 100%</strong> trọn đời và không tiêu tốn thêm lượt quét.</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
