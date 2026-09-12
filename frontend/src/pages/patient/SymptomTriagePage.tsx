import React, { useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

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

interface TriageResponseData {
  sessionId: string;
  emergency: boolean;
  emergencyAlert: string | null;
  urgencyLevel: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  primarySpecialtySlug: string;
  primarySpecialtyName: string;
  sbarSummary: string;
  aiAdvice: string;
  clarifyingQuestions: string[];
  matchedDoctors: DoctorMatch[];
  modelUsed?: string;
  doctorRecommendationReason?: string;
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

// Helper to format local date YYYY-MM-DD
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const SymptomTriagePage: React.FC = () => {
  const { user } = useAuthStore();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResponseData | null>(null);

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

  const sampleSymptoms = [
    { label: 'Cấp cứu: Đau thắt ngực lan ra tay trái', text: 'Tôi bị đau thắt ngực dữ dội lan ra cánh tay trái và khó thở' },
    { label: 'Tim mạch: Hồi hộp & đánh trống ngực', text: 'Tôi hay bị hồi hộp, đánh trống ngực và choáng váng khi vận động mạnh' },
    { label: 'Thần kinh: Đau đầu & chóng mặt tiền đình', text: 'Tôi thường xuyên bị đau nửa đầu âm ỉ kèm chóng mặt hoa mắt mất ngủ' },
    { label: 'Tiêu hóa: Đau thượng vị & ợ chua', text: 'Tôi bị đau quặn vùng thượng vị, đầy bụng ợ chua sau mỗi bữa ăn' },
    { label: 'Da liễu: Mẩn đỏ & ngứa dị ứng', text: 'Da tôi bị nổi nhiều nốt mẩn đỏ ngứa ngáy và phát ban sau khi ăn hải sản' }
  ];

  const handleAssess = async (textToAssess?: string) => {
    const text = textToAssess || symptoms;
    if (!text.trim()) {
      setError('Vui lòng nhập mô tả triệu chứng của bạn.');
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/triage/assess', { symptoms: text });
      if (res.data?.data) {
        setResult(res.data.data);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Không thể kết nối đến Trợ lý Triage. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (doc: DoctorMatch) => {
    setBookingDoctor(doc);
    setSelectedSlot(null);
    setBookingError(null);
    setConfirmedAppt(null);
    setBookingNotes(symptoms ? `Triage AI: ${symptoms}` : '');
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
      setBookingError('Vui lòng đăng nhập tài khoản bệnh nhân để xác nhận đặt lịch khám.');
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
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Phân Luồng Triệu Chứng & Khớp Bác Sĩ Bằng AI (Symptom Triage)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Nhận diện rào chắn cấp cứu tức thì, phân loại mức độ khẩn cấp SBAR và tìm kiếm bác sĩ chuyên khoa sâu qua vector ngữ nghĩa.
            </p>
          </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">
          Mô Tả Triệu Chứng Hoặc Cảm Giác Khó Chịu Của Bạn
        </label>
        <textarea
          rows={3}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Ví dụ: Tôi bị đau thắt ngực dữ dội, hồi hộp đánh trống ngực... Hoặc: Tôi hay bị đau đầu âm ỉ kèm chóng mặt và mất ngủ kéo dài..."
          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
        />

        {/* Sample Symptoms Quick Chips */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Thử nhanh các triệu chứng lâm sàng mẫu:</p>
          <div className="flex flex-wrap gap-2">
            {sampleSymptoms.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSymptoms(chip.text);
                  handleAssess(chip.text);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition border border-slate-200"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleAssess()}
            disabled={loading || !symptoms.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold shadow-xs transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> Đang Phân Tích...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Bắt Đầu Đánh Giá Triage
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🚨 Red-Flag Emergency Alert Card */}
      {result && result.emergency && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-6 md:p-8 space-y-6 animate-fadeIn shadow-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-600 text-white rounded-2xl animate-pulse flex-shrink-0">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-rose-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-full">
                Mức Độ Nguy Kịch: Cấp Cứu 115
              </span>
              <h2 className="text-xl md:text-2xl font-black text-rose-900 leading-snug">
                {result.emergencyAlert || 'CẢNH BÁO Y TẾ NGUY KỊCH'}
              </h2>
              <p className="text-sm text-rose-800 leading-relaxed">
                Hệ thống nhận diện triệu chứng của bạn mang đặc điểm của tình trạng cấp cứu khẩn cấp (Hội chứng mạch vành cấp, nhồi máu cơ tim hoặc đột quỵ não). 
                <strong> TUYỆT ĐỐI KHÔNG CHỜ ĐỢI TƯ VẤN TRỰC TUYẾN.</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="tel:115"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-base rounded-2xl shadow-lg transition"
            >
              <PhoneCall className="w-5 h-5 animate-bounce" />
              Gọi Ngay Cấp Cứu 115
            </a>
            <span className="text-xs text-rose-700">
              Hoặc nhờ người thân đưa ngay đến khoa Cấp cứu bệnh viện gần nhất!
            </span>
          </div>
        </div>
      )}

      {/* 🟢 Routine / Urgent Triage Assessment Card */}
      {result && !result.emergency && (
        <div className="space-y-6 animate-fadeIn">
          {/* SBAR & Clinical Evaluation Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Bản Đánh Giá Phân Luồng Lâm Sàng (SBAR)</h3>
                  <p className="text-xs text-slate-500">Mã phiên Triage: {result.sessionId.slice(0, 8)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  result.urgencyLevel === 'URGENT'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}>
                  Mức độ: {result.urgencyLevel === 'URGENT' ? 'CẦN KHÁM ƯU TIÊN' : 'THĂM KHÁM TIÊU CHUẨN'}
                </span>
                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
                  {result.primarySpecialtyName}
                </span>
              </div>
            </div>

            {/* 🤖 OpenRouter AI Model Badge */}
            {result.modelUsed && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-indigo-900">Động cơ Phân Luồng & Triage Lâm Sàng: </span>
                    <span className="font-mono font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md border border-indigo-300">
                      {result.modelUsed}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-white text-indigo-800 font-medium rounded-full text-[11px] border border-indigo-300">
                  OpenRouter 0đ Gateway • Tự động Xoay Tua Model
                </span>
              </div>
            )}

            {/* SBAR Text Block */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed">
              {result.sbarSummary}
            </div>

            {/* AI Advice */}
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Lời Khuyên Ban Đầu Từ AI Scribe
              </h4>
              <p className="text-xs text-indigo-950 leading-relaxed">{result.aiAdvice}</p>
            </div>

            {/* Clarifying Questions */}
            {result.clarifyingQuestions && result.clarifyingQuestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Gợi Ý Chuẩn Bị Cho Buổi Khám Với Bác Sĩ
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                  {result.clarifyingQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 🧑‍⚕️ Matched Doctors Section (Semantic Search by pgvector) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Bác Sĩ Chuyên Khoa Được AI Đề Xuất (pgvector Match)
                </h3>
                <p className="text-xs text-slate-500">
                  Thuật toán Cosine Similarity khớp triệu chứng của bạn với hồ sơ chuyên môn của các bác sĩ đã xác minh.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Tìm thấy {result.matchedDoctors.length} bác sĩ phù hợp
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {result.matchedDoctors.map((doc) => {
                const matchPct = Math.round(doc.similarityScore * 100);
                return (
                  <div
                    key={doc.doctorId}
                    className={`rounded-2xl transition p-5 flex flex-col justify-between space-y-4 ${
                      doc.aiRecommended
                        ? 'bg-gradient-to-b from-indigo-50/50 to-white border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white border border-slate-200 shadow-xs hover:shadow-md'
                    }`}
                  >
                    {doc.aiRecommended && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg shadow-xs -mt-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Được AI Lựa Chọn Ưu Tiên Cho Ca Bệnh Này</span>
                      </div>
                    )}
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
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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

                      {doc.aiRecommendationReason && (
                        <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2">
                          <span className="font-bold text-indigo-800 flex-shrink-0">Lý do đề xuất:</span>
                          <span className="leading-relaxed">{doc.aiRecommendationReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer / Booking Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400">Giá khám tư vấn:</span>
                        <p className="text-sm font-bold text-indigo-700">
                          {doc.consultationFee.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Đặt Khám Ngay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 📅 Interactive Slot Booking Modal (Integrated from Milestone 2) */}
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
                    <span className="font-mono font-bold text-indigo-600">{confirmedAppt.appointmentCode}</span>
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
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
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
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
                  <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Triệu Chứng Cho Bác Sĩ</label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Mô tả cụ thể để bác sĩ chuẩn bị trước buổi khám..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
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
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold transition"
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
