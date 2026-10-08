import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  X,
  HelpCircle,
  RotateCcw,
  Bot,
  User,
  ChevronDown,
  ChevronUp
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
  medicalRelated?: boolean;
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

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  clarifyingQuestions?: string[];
  recommendedSpecialty?: string;
  recommendedSpecialtySlug?: string;
  isEmergency?: boolean;
  emergencyAlert?: string;
  medicalRelated?: boolean;
  matchedDoctors?: DoctorMatch[];
  sbarSummary?: string;
  urgencyLevel?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  modelUsed?: string;
  sessionId?: string;
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
  const navigate = useNavigate();

  // Multi-turn Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content:
        'Xin chào! Tôi là Trợ lý Y tế AI của MediAssist. Bạn đang gặp vấn đề sức khỏe hay có triệu chứng khó chịu gì? Hãy mô tả chi tiết để tôi phân tích và gợi ý chuyên khoa phù hợp.',
      timestamp: new Date(),
      clarifyingQuestions: [
        'Tôi bị đau thắt ngực dữ dội lan ra tay trái và khó thở',
        'Tôi hay bị hồi hộp, đánh trống ngực khi vận động mạnh',
        'Tôi thường xuyên bị đau đầu âm ỉ kèm chóng mặt và mất ngủ',
        'Tôi bị đau quặn vùng thượng vị, đầy bụng ợ chua sau ăn',
        'Da tôi nổi nhiều nốt mẩn đỏ ngứa ngáy sau khi ăn hải sản'
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isEmergencyLocked, setIsEmergencyLocked] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('EMERGENCY_LOCKOUT');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.locked) return true;
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [latestEmergencyAlert, setLatestEmergencyAlert] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem('EMERGENCY_LOCKOUT');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.locked && parsed?.alert) return parsed.alert;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [expandedSbars, setExpandedSbars] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Booking Modal State
  const [bookingDoctor, setBookingDoctor] = useState<DoctorMatch | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatLocalDate(tomorrow);
  });
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppt, setConfirmedAppt] = useState<AppointmentConfirmation | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleSbar = (msgId: string) => {
    setExpandedSbars((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'ai',
        content:
          'Xin chào! Tôi là Trợ lý Y tế AI của MediAssist. Bạn đang gặp vấn đề sức khỏe hay có triệu chứng khó chịu gì? Hãy mô tả chi tiết để tôi phân tích và gợi ý chuyên khoa phù hợp.',
        timestamp: new Date(),
        clarifyingQuestions: [
          'Tôi bị đau thắt ngực dữ dội lan ra tay trái và khó thở',
          'Tôi hay bị hồi hộp, đánh trống ngực khi vận động mạnh',
          'Tôi thường xuyên bị đau đầu âm ỉ kèm chóng mặt và mất ngủ',
          'Tôi bị đau quặn vùng thượng vị, đầy bụng ợ chua sau ăn',
          'Da tôi nổi nhiều nốt mẩn đỏ ngứa ngáy sau khi ăn hải sản'
        ]
      }
    ]);
    setInputText('');
    setSessionId(null);
    setIsEmergencyLocked(false);
    setLatestEmergencyAlert(null);
    sessionStorage.removeItem('EMERGENCY_LOCKOUT');
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isTyping || isEmergencyLocked) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Build conversation history for multi-turn clinical context
      const historyStrings = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Bệnh nhân' : 'Bác sĩ AI'}: ${m.content}`);

      const res = await api.post('/triage/assess', {
        symptoms: text,
        conversationHistory: historyStrings.length > 0 ? historyStrings : undefined
      });

      if (res.data?.data) {
        const data: TriageResponseData = res.data.data;
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
        }

        const emergencyTriggered = !!data.emergency;
        if (emergencyTriggered) {
          setIsEmergencyLocked(true);
          const alertMsg = data.emergencyAlert || 'CẢNH BÁO Y TẾ NGUY KỊCH';
          setLatestEmergencyAlert(alertMsg);
          sessionStorage.setItem('EMERGENCY_LOCKOUT', JSON.stringify({ locked: true, at: Date.now(), alert: alertMsg }));
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: data.aiAdvice || data.sbarSummary || 'Hệ thống đã hoàn tất phân tích triệu chứng của bạn.',
          timestamp: new Date(),
          clarifyingQuestions: data.clarifyingQuestions || [],
          recommendedSpecialty: data.primarySpecialtyName,
          recommendedSpecialtySlug: data.primarySpecialtySlug,
          isEmergency: emergencyTriggered,
          emergencyAlert: data.emergencyAlert || undefined,
          medicalRelated: data.medicalRelated,
          matchedDoctors: data.matchedDoctors || [],
          sbarSummary: data.sbarSummary,
          urgencyLevel: data.urgencyLevel,
          modelUsed: data.modelUsed,
          sessionId: data.sessionId
        };

        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage =
        axiosErr.response?.data?.error?.message ||
        'Không thể kết nối đến Trợ lý Triage AI. Vui lòng kiểm tra kết nối mạng và thử lại.';

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'ai',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Booking Modal handlers
  const handleOpenBooking = (doc: DoctorMatch) => {
    setBookingDoctor(doc);
    setSelectedSlot(null);
    setBookingError(null);
    setConfirmedAppt(null);
    setBookingNotes(`Triage AI Session: ${sessionId ? sessionId.slice(0, 8) : 'Khám chuyên khoa'}`);
    loadSlots(doc.doctorId, selectedDate);
  };

  const loadSlots = async (doctorId: string, date: string) => {
    try {
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlot(null);
      const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.data?.data) {
        setSlots(res.data.data);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setSlotsError(
        axiosErr.response?.data?.error?.message ||
          'Không thể tải lịch khám của bác sĩ. Vui lòng kiểm tra lại kết nối.'
      );
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
          scheduledStart: slotTime || '',
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
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-100px)] min-h-[550px] pb-4">
      {/* 🤖 Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-2xs mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                🤖 Trợ lý Triệu chứng AI
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Mô tả triệu chứng để được tư vấn chuyên khoa phù hợp (O2O In-Person Visit)
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer"
          title="Bắt đầu phiên phân tích mới"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới hội thoại</span>
        </button>
      </div>

      {/* 🚨 Full-Width Persistent Emergency Banner (when emergency is triggered) */}
      {isEmergencyLocked && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg border-2 border-rose-700 mb-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  🚨 TÌNH TRẠNG KHẨN CẤP — Gọi ngay 115 hoặc đến phòng cấp cứu gần nhất!
                </h3>
                <p className="text-xs text-rose-100 mt-0.5 font-medium">
                  {latestEmergencyAlert ||
                    'Hệ thống nhận diện triệu chứng của bạn mang đặc điểm nguy kịch. Tuyệt đối không chờ đặt lịch hẹn thông thường!'}
                </p>
              </div>
            </div>

            <a
              href="tel:115"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-black text-sm rounded-xl shadow-md transition shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>📞 Gọi 115</span>
            </a>
          </div>
        </div>
      )}

      {/* 💬 Chat Area Container */}
      <div className="flex-1 bg-slate-50/80 rounded-2xl border border-slate-200 overflow-y-auto p-4 md:p-6 space-y-4 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in duration-200`}
            >
              <div className={`flex items-start gap-2.5 max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-indigo-600'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble Container */}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl rounded-br-xs'
                      : 'bg-white border border-slate-200 text-gray-800 rounded-tr-2xl rounded-br-2xl rounded-tl-2xl rounded-bl-xs'
                  }`}
                >
                  {/* Text Content */}
                  <div className="whitespace-pre-line font-normal">{msg.content}</div>

                  {/* 🚨 Emergency Alert inside AI message */}
                  {msg.isEmergency && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>CẢNH BÁO NGUY HIỂM TÍNH MẠNG</span>
                      </div>
                      <p className="text-rose-700">
                        {msg.emergencyAlert || 'Triệu chứng có thể liên quan đến đột quỵ, nhồi máu cơ tim hoặc sốc phản vệ.'}
                      </p>
                      <a
                        href="tel:115"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 transition"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Gọi 115 Ngay
                      </a>
                    </div>
                  )}

                  {/* ℹ️ Non-Medical Notice */}
                  {msg.medicalRelated === false && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Câu hỏi ngoài phạm vi y tế. Hệ thống chỉ tư vấn cho các vấn đề sức khỏe lâm sàng.</span>
                    </div>
                  )}

                  {/* 📋 Collapsible SBAR Clinical Summary */}
                  {msg.sbarSummary && (
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleSbar(msg.id)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chi tiết Phân luồng SBAR</span>
                        </span>
                        {expandedSbars[msg.id] ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedSbars[msg.id] && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                          {msg.sbarSummary}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ✅ Recommendation Card */}
                  {msg.recommendedSpecialty && (
                    <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>AI gợi ý chuyên khoa: <strong className="text-emerald-950 font-black">{msg.recommendedSpecialty}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/patient/doctors?specialty=${encodeURIComponent(
                              msg.recommendedSpecialtySlug || msg.recommendedSpecialty || ''
                            )}`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
                      >
                        <span>🔍 Tìm bác sĩ {msg.recommendedSpecialty}</span>
                      </button>
                    </div>
                  )}

                  {/* 🧑‍⚕️ Matched Doctors (Inline booking cards) */}
                  {msg.matchedDoctors && msg.matchedDoctors.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600" /> Bác sĩ phù hợp tại bệnh viện ({msg.matchedDoctors.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {msg.matchedDoctors.slice(0, 3).map((doc) => {
                          const matchPct = Math.round(doc.similarityScore * 100);
                          return (
                            <div
                              key={doc.doctorId}
                              className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span>{doc.fullName}</span>
                                  <span title="Đã thẩm định CCHN">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  </span>
                                  <span className="font-normal text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded-full border border-indigo-200">
                                    Độ khớp {matchPct}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {doc.specialties?.join(', ') || 'Chuyên khoa Nội'} • {doc.yearsOfExperience} năm kinh nghiệm
                                </p>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="font-bold text-indigo-700">
                                  {Number(doc.consultationFee || 350000).toLocaleString('vi-VN')} đ
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(doc)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                  Đặt Khám
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className={`text-[10px] text-slate-400 px-10 ${isUser ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* 💡 Suggestion Chips (Rendered under AI message) */}
              {!isUser && msg.clarifyingQuestions && msg.clarifyingQuestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pl-10 pr-2 max-w-[90%] md:max-w-[85%]">
                  {msg.clarifyingQuestions.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      type="button"
                      disabled={isEmergencyLocked || isTyping}
                      onClick={() => handleSend(chip)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ⏳ Typing Indicator (3 bouncing dots) */}
        {isTyping && (
          <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-tr-2xl rounded-br-2xl rounded-tl-2xl rounded-bl-xs shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="text-xs text-slate-400 font-medium ml-1.5">AI đang phân tích triệu chứng...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ⌨️ Sticky Bottom Input Area */}
      <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2">
        {isEmergencyLocked ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center justify-between">
            <span>⛔ Phiên phân luồng đã khóa để bảo đảm tính mạng. Vui lòng liên hệ cấp cứu hoặc gọi 115 ngay.</span>
            <button
              onClick={handleResetChat}
              className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-700 text-xs font-bold hover:bg-rose-100 cursor-pointer"
            >
              Mở phiên mới
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Nhập triệu chứng của bạn (ví dụ: Tôi bị đau thắt ngực khi gắng sức, khó thở về đêm...)..."
              className="flex-1 px-3.5 py-2 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl shadow-xs transition cursor-pointer disabled:cursor-not-allowed shrink-0"
              title="Gửi triệu chứng (Enter)"
            >
              {isTyping ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            Nhấn <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-mono">Enter</kbd> để gửi, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-mono">Shift + Enter</kbd> xuống dòng.
          </span>
          <span className="hidden sm:inline italic">
            * Khuyến cáo: Phân luồng AI hỗ trợ định hướng chuyên khoa, không thay thế chẩn đoán bác sĩ.
          </span>
        </div>
      </div>

      {/* 📅 Interactive Slot Booking Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Đặt Lịch Khám Trực Tiếp</h3>
                <p className="text-xs text-slate-500">với {bookingDoctor.fullName}</p>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Chọn Khung Giờ Khám (30 phút/ca)
                  </label>
                  {slotsLoading ? (
                    <div className="py-6 text-center text-slate-400">Đang tải lịch trống...</div>
                  ) : slotsError ? (
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-center text-xs border border-rose-200">
                      {slotsError}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-center">
                      Bác sĩ không có lịch trống trong ngày này. Vui lòng chọn ngày khác.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button
                          key={slot.startDateTime || slot.slotId || slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                            !slot.available
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                              : selectedSlot?.startDateTime === slot.startDateTime
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot || bookingSubmitting}
                    onClick={handleConfirmBooking}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold transition cursor-pointer"
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
