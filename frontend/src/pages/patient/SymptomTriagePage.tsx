import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  Send,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  HelpCircle,
  Star,
  RotateCcw,
  Bot,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { api } from '../../services/api';

gsap.registerPlugin(useGSAP);
import { BookingModal, type BookableDoctor } from '../../components/booking/BookingModal';
import { EMERGENCY_NUMBER } from '../../config/app';
import { formatRating, formatVnd } from '../../utils/display';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DoctorMatch {
  doctorId: string;
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

export const SymptomTriagePage: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.gsap-triage-shell', {
          y: 18,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 0.45,
          ease: 'power3.out',
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef }
  );

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

  // Booking: the triage session id + an editable symptom/SBAR summary are sent with the appointment
  const [bookingDoctor, setBookingDoctor] = useState<BookableDoctor | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSessionId, setBookingSessionId] = useState<string | null>(null);

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

  // Booking: pre-fill a readable summary the patient can edit (not an internal session id)
  // Notes carry only what the patient typed (+ suggested specialty). The full SBAR and urgency
  // reach the doctor through triageSessionId (AppointmentDto.triageSbarSummary/triageUrgencyLevel),
  // so they are not duplicated — or silently truncated — in the 1000-char notes field.
  const handleOpenBooking = (doc: DoctorMatch, msg: ChatMessage) => {
    const symptoms = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.trim())
      .filter(Boolean)
      .slice(-3)
      .join('; ');
    const parts = [
      symptoms && `Triệu chứng: ${symptoms}`,
      msg.recommendedSpecialty && `Chuyên khoa AI gợi ý: ${msg.recommendedSpecialty}`,
    ].filter(Boolean);
    setBookingNotes(parts.join('\n'));
    const triageSessionId = msg.sessionId || sessionId;
    setBookingSessionId(triageSessionId && UUID_RE.test(triageSessionId) ? triageSessionId : null);
    setBookingDoctor({
      id: doc.doctorId,
      fullName: doc.fullName,
      specialties: doc.specialties,
      consultationFee: doc.consultationFee,
      hospitalAffiliation: doc.hospitalAffiliation,
    });
  };

  return (
    <div ref={rootRef} className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-110px)] min-h-[560px] pb-4">
      {/* 🤖 Luminous AI Triage Console Header */}
      <div className="gsap-triage-shell flex items-center justify-between px-5 py-3.5 bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-sm mb-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                🤖 Trợ lý Triệu chứng AI
              </h1>
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-500">
              Mô tả triệu chứng để được tư vấn chuyên khoa phù hợp (O2O In-Person Visit)
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 font-display text-xs font-bold text-slate-700 bg-[#FCFBF8] hover:bg-teal-50 hover:text-teal-800 border border-slate-200/90 rounded-xl transition cursor-pointer shadow-2xs"
          title="Bắt đầu phiên phân tích mới"
        >
          <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
          <span>Làm mới hội thoại</span>
        </button>
      </div>

      {/* 🚨 Full-Width Persistent Emergency Banner (when emergency is triggered) */}
      {isEmergencyLocked && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-md border border-rose-700 mb-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm uppercase tracking-wide">
                  🚨 TÌNH TRẠNG KHẨN CẤP — Gọi ngay 115 hoặc đến phòng cấp cứu gần nhất!
                </h3>
                <p className="text-xs text-rose-100 mt-0.5 font-medium">
                  {latestEmergencyAlert ||
                    'Hệ thống nhận diện triệu chứng của bạn mang đặc điểm nguy kịch. Tuyệt đối không chờ đặt lịch hẹn thông thường!'}
                </p>
              </div>
            </div>

            <a
              href={`tel:${EMERGENCY_NUMBER}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-display font-bold text-sm rounded-xl border border-rose-200 shadow-sm transition shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>📞 Gọi 115</span>
            </a>
          </div>
        </div>
      )}

      {/* 💬 Chat Area Container */}
      <div className="gsap-triage-shell flex-1 bg-white rounded-3xl border border-slate-200/90 overflow-y-auto p-4 md:p-6 space-y-4 shadow-sm">
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
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold border ${
                    isUser
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
                      : 'bg-[#FCFBF8] text-teal-700 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-teal-600" />}
                </div>

                {/* Bubble Container */}
                <div
                  className={`px-4 py-3.5 text-sm leading-relaxed border ${
                    isUser
                      ? 'bg-teal-600 text-white border-teal-600 rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl rounded-br-xs shadow-sm shadow-teal-600/20'
                      : 'bg-[#FCFBF8] border-slate-200/90 text-slate-900 rounded-tr-2xl rounded-br-2xl rounded-tl-2xl rounded-bl-xs shadow-2xs'
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
                        href={`tel:${EMERGENCY_NUMBER}`}
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
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <span>
                                    {doc.specialties?.length ? doc.specialties.join(', ') : 'Chưa cập nhật chuyên khoa'}
                                    {doc.yearsOfExperience ? ` • ${doc.yearsOfExperience} năm kinh nghiệm` : ''}
                                  </span>
                                  <span>•</span>
                                  {formatRating(doc.rating, doc.reviewCount) ? (
                                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />
                                      {formatRating(doc.rating, doc.reviewCount)}
                                      <span className="text-slate-500 font-normal">({doc.reviewCount})</span>
                                    </span>
                                  ) : (
                                    <span className="italic">Chưa có đánh giá</span>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="font-bold text-teal-700">
                                  {formatVnd(doc.consultationFee) ?? 'Phí: liên hệ'}
                                </span>
                                <button
                                  type="button"
                                  disabled={isEmergencyLocked}
                                  title={isEmergencyLocked ? 'Tình trạng khẩn cấp: hãy gọi 115 thay vì đặt lịch thường' : undefined}
                                  onClick={() => handleOpenBooking(doc, msg)}
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
              className="flex-1 px-3.5 py-2 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none disabled:bg-slate-100"
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

      <BookingModal
        open={bookingDoctor !== null}
        doctor={bookingDoctor}
        onClose={() => setBookingDoctor(null)}
        initialNotes={bookingNotes}
        notesLabel="Ghi chú cho bác sĩ (triệu chứng bạn đã nhập — bạn có thể sửa)"
        extra={{ triageSessionId: bookingSessionId }}
        fromTriage
      />
    </div>
  );
};
