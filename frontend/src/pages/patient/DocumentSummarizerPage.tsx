import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';

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
}

interface DoctorSlot {
  slotId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  scheduledStart: string;
  scheduledEnd: string;
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
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Không thể phân tích tài liệu y tế. Vui lòng kiểm tra định dạng tệp.');
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

      const res = await api.post('/appointments', {
        doctorId: bookingDoctor.doctorId,
        scheduledStart: selectedSlot.scheduledStart,
        notes: bookingNotes
      });

      if (res.data?.data) {
        setConfirmedAppt({
          appointmentCode: res.data.data.appointmentCode,
          doctorName: bookingDoctor.fullName,
          scheduledStart: selectedSlot.scheduledStart,
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
      <div>
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
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
          {/* Top Medical Disclaimer Notice */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý y tế quan trọng:</strong> Kết quả phân tích được thực hiện bởi Trợ lý AI nhằm hỗ trợ diễn giải các chỉ số chuyên môn phức tạp.
              Đây <strong>không phải là kết luận chẩn đoán thay thế bác sĩ</strong>. Hãy tham khảo ý kiến bác sĩ chuyên khoa bên dưới để được thăm khám chính xác.
            </div>
          </div>

          {/* Scribe Summary & Patient Translation */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-5">
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

              <span className="px-3.5 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-200">
                Chuyên khoa đề xuất: {analysis.recommendedSpecialtyName}
              </span>
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
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-base">{doc.fullName}</h4>
                            <span title="Đã thẩm định CCHN">
                              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">CCHN: {doc.licenseNumber}</p>
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
    </div>
  );
};
