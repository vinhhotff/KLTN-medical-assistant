import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TriangleAlert,
  Phone,
  Sparkles,
  Send,
  ShieldCheck,
  Stethoscope,
  HelpCircle,
  Star,
  History,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  User,
  CalendarDays,
} from 'lucide-react';
import { api } from '../../services/api';
import { BookingModal, type BookableDoctor } from '../../components/booking/BookingModal';
import { EMERGENCY_NUMBER } from '../../config/app';
import { formatRating, formatVnd } from '../../utils/display';
import { cn } from '../../components/ui';
import { initialsOf, type PatientProfileData } from '../../types/patient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCKOUT_KEY = 'EMERGENCY_LOCKOUT';

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

type Urgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

interface TriageResponseData {
  sessionId: string;
  emergency: boolean;
  emergencyAlert: string | null;
  medicalRelated?: boolean;
  urgencyLevel: Urgency;
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
  specialtyReason?: string;
  isEmergency?: boolean;
  medicalRelated?: boolean;
  matchedDoctors?: DoctorMatch[];
  sbarSummary?: string;
  urgencyLevel?: Urgency;
  sessionId?: string;
}

interface LockoutState {
  locked: boolean;
  at?: number;
  alert?: string;
  symptom?: string;
  sessionId?: string;
}

/** Red-flag groups screened by backend RedFlagService before any LLM call. */
const RED_FLAG_GROUPS = [
  'Đau ngực nghi hội chứng vành cấp',
  'Dấu hiệu đột quỵ (méo miệng, yếu liệt, nói khó)',
  'Sốc phản vệ, phù nề khó thở',
  'Xuất huyết ồ ạt hoặc mất tri giác',
];

const URGENCY_STEPS: { level: Urgency; label: string }[] = [
  { level: 'ROUTINE', label: 'Theo dõi tại nhà' },
  { level: 'URGENT', label: 'Khám trong 1–3 ngày' },
  { level: 'EMERGENCY', label: 'Cấp cứu ngay' },
];

const WAITING_FOR_AMBULANCE = [
  'Ngừng mọi hoạt động, ngồi hoặc nằm nghỉ ở tư thế dễ thở nhất.',
  'Không tự lái xe đến bệnh viện.',
  'Mở khóa cửa và nhờ một người ở bên cạnh bạn.',
  'Chuẩn bị giấy tờ tùy thân, thẻ BHYT và danh sách thuốc đang dùng.',
];

const welcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'ai',
  content:
    'Chào bạn. Bạn đang gặp triệu chứng gì? Hãy kể bằng lời của bạn: đau ở đâu, từ khi nào, và điều gì làm nặng hơn.',
  timestamp: new Date(),
  clarifyingQuestions: [
    'Tôi hay bị hồi hộp, đánh trống ngực khi vận động mạnh',
    'Tôi thường xuyên bị đau đầu âm ỉ kèm chóng mặt và mất ngủ',
    'Tôi bị đau quặn vùng thượng vị, đầy bụng ợ chua sau ăn',
    'Da tôi nổi nhiều nốt mẩn đỏ ngứa ngáy sau khi ăn hải sản',
  ],
});

const readLockout = (): LockoutState | null => {
  try {
    const saved = sessionStorage.getItem(LOCKOUT_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as LockoutState;
    return parsed?.locked ? parsed : null;
  } catch {
    return null;
  }
};

const shortSessionCode = (id?: string | null) => (id ? `TRG-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : null);
const timeOf = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const hasResult = (m: ChatMessage) =>
  m.role === 'ai' && !m.isEmergency && (!!m.recommendedSpecialty || (m.matchedDoctors?.length ?? 0) > 0);

export const SymptomTriagePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lockout, setLockout] = useState<LockoutState | null>(readLockout);
  const [expandedSbars, setExpandedSbars] = useState<Record<string, boolean>>({});
  const [shareSummary, setShareSummary] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState<{ name: string; phone: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Booking: the triage session id + an editable symptom summary are sent with the appointment
  const [bookingDoctor, setBookingDoctor] = useState<BookableDoctor | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSessionId, setBookingSessionId] = useState<string | null>(null);

  const isEmergencyLocked = !!lockout?.locked;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping]);

  // Emergency screen offers a one-tap call to the patient's own emergency contact (from their profile)
  useEffect(() => {
    if (!isEmergencyLocked) return;
    let cancelled = false;
    api
      .get('/patient/profile')
      .then((res) => {
        const p: PatientProfileData | undefined = res.data?.data;
        if (!cancelled && p?.emergencyContactPhone) {
          setEmergencyContact({ name: p.emergencyContactName || 'người thân', phone: p.emergencyContactPhone });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isEmergencyLocked]);

  const userMessages = messages.filter((m) => m.role === 'user');
  const latestResult = useMemo(() => [...messages].reverse().find(hasResult), [messages]);

  const handleResetChat = () => {
    setMessages([welcomeMessage()]);
    setInputText('');
    setSessionId(null);
    setLockout(null);
    setEmergencyContact(null);
    sessionStorage.removeItem(LOCKOUT_KEY);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isTyping || isEmergencyLocked) return;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }]);
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
        conversationHistory: historyStrings.length > 0 ? historyStrings : undefined,
      });

      if (res.data?.data) {
        const data: TriageResponseData = res.data.data;
        if (!sessionId && data.sessionId) setSessionId(data.sessionId);

        if (data.emergency) {
          const next: LockoutState = {
            locked: true,
            at: Date.now(),
            alert: data.emergencyAlert || 'Triệu chứng bạn mô tả cần được nhân viên y tế đánh giá ngay.',
            symptom: text,
            sessionId: data.sessionId || sessionId || undefined,
          };
          setLockout(next);
          sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(next));
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'ai',
            content: data.aiAdvice || data.sbarSummary || 'Hệ thống đã hoàn tất phân tích triệu chứng của bạn.',
            timestamp: new Date(),
            clarifyingQuestions: data.clarifyingQuestions || [],
            recommendedSpecialty: data.primarySpecialtyName,
            recommendedSpecialtySlug: data.primarySpecialtySlug,
            specialtyReason: data.doctorRecommendationReason,
            isEmergency: !!data.emergency,
            medicalRelated: data.medicalRelated,
            matchedDoctors: data.matchedDoctors || [],
            sbarSummary: data.sbarSummary,
            urgencyLevel: data.urgencyLevel,
            sessionId: data.sessionId,
          },
        ]);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage =
        axiosErr.response?.data?.error?.message ||
        'Không thể kết nối đến Trợ lý Triage AI. Vui lòng kiểm tra kết nối mạng và thử lại.';
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'ai', content: `⚠️ ${errorMessage}`, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Notes carry only what the patient typed (+ suggested specialty). The full SBAR and urgency
  // reach the doctor through triageSessionId (AppointmentDto.triageSbarSummary/triageUrgencyLevel).
  const handleOpenBooking = (doc: DoctorMatch, msg: ChatMessage) => {
    if (shareSummary) {
      const symptoms = userMessages
        .map((m) => m.content.trim())
        .filter(Boolean)
        .slice(-3)
        .join('; ');
      const parts = [symptoms && `Triệu chứng: ${symptoms}`, msg.recommendedSpecialty && `Chuyên khoa AI gợi ý: ${msg.recommendedSpecialty}`].filter(Boolean);
      setBookingNotes(parts.join('\n'));
      const triageSessionId = msg.sessionId || sessionId;
      setBookingSessionId(triageSessionId && UUID_RE.test(triageSessionId) ? triageSessionId : null);
    } else {
      setBookingNotes('');
      setBookingSessionId(null);
    }
    setBookingDoctor({
      id: doc.doctorId,
      fullName: doc.fullName,
      specialties: doc.specialties,
      consultationFee: doc.consultationFee,
      hospitalAffiliation: doc.hospitalAffiliation,
    });
  };

  const bookingModal = (
    <BookingModal
      open={bookingDoctor !== null}
      doctor={bookingDoctor}
      onClose={() => setBookingDoctor(null)}
      initialNotes={bookingNotes}
      notesLabel="Ghi chú cho bác sĩ (triệu chứng bạn đã nhập — bạn có thể sửa)"
      extra={{ triageSessionId: bookingSessionId }}
      fromTriage
    />
  );

  /* ───────────────────────── 03 · Emergency screen ───────────────────────── */
  if (isEmergencyLocked) {
    const code = shortSessionCode(lockout?.sessionId || sessionId);
    return (
      <div className="max-w-[1120px] mx-auto space-y-5">
        <section className="bg-white rounded-2xl border-2 border-rose-700 overflow-hidden" role="alert">
          <div className="bg-rose-700 text-white px-6 sm:px-8 py-6 flex items-center gap-5">
            <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center shrink-0">
              <TriangleAlert className="w-7 h-7 sm:w-8 sm:h-8 text-rose-700" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Có dấu hiệu cần cấp cứu ngay</h1>
              <p className="mt-1 text-rose-50 text-sm sm:text-base">
                Những triệu chứng bạn vừa mô tả cần được nhân viên y tế đánh giá ngay lập tức. Đừng chờ đặt lịch khám.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-5">
              <a
                href={`tel:${EMERGENCY_NUMBER}`}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-display text-xl sm:text-2xl font-bold transition"
              >
                <Phone className="w-6 h-6" aria-hidden />
                Gọi cấp cứu {EMERGENCY_NUMBER}
              </a>

              {emergencyContact && (
                <a
                  href={`tel:${emergencyContact.phone.replace(/\s/g, '')}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold transition"
                >
                  <User className="w-4 h-4" aria-hidden />
                  Gọi người thân: {emergencyContact.name}
                </a>
              )}

              {lockout?.symptom && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bạn vừa mô tả</p>
                  <p className="mt-2 text-slate-900">“{lockout.symptom}”</p>
                  {lockout.alert && <p className="mt-3 text-sm text-rose-800">{lockout.alert}</p>}
                </div>
              )}

              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Trong lúc chờ xe cấp cứu</h2>
                <ol className="mt-3 space-y-3">
                  {WAITING_FOR_AMBULANCE.map((step, i) => (
                    <li key={step} className="flex items-center gap-3 text-slate-800">
                      <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Lock className="w-4 h-4" aria-hidden />
                  Cuộc trò chuyện đã tạm dừng
                </p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Trợ lý AI không tư vấn thêm cho tình huống này.
                  {code && <> Phiên {code} đã được lưu để bác sĩ xem lại.</>}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetChat}
                className="px-1 text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900 cursor-pointer"
              >
                Tôi đã mô tả nhầm triệu chứng
              </button>
            </aside>
          </div>
        </section>

        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-100/70 px-5 py-4 text-sm text-slate-600">
          <Lock className="w-4 h-4 shrink-0" aria-hidden />
          Khung chat đã khóa vì phát hiện dấu hiệu cấp cứu.
        </div>
        {bookingModal}
      </div>
    );
  }

  /* ───────────────────────── 01 · Chat screen ───────────────────────── */
  const code = shortSessionCode(sessionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Trợ lý triệu chứng AI</h1>
          <p className="mt-1.5 text-slate-600">
            Mô tả triệu chứng bằng lời của bạn. Trợ lý sẽ hỏi thêm vài câu, kiểm tra dấu hiệu nguy hiểm, rồi gợi ý chuyên khoa và bác sĩ phù hợp.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/patient/history"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
          >
            <History className="w-4 h-4" aria-hidden />
            Lịch sử phiên
          </Link>
          <button
            type="button"
            onClick={handleResetChat}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Phiên mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_256px] xl:grid-cols-[1fr_280px] gap-5 items-start">
        {/* Chat card */}
        <section className="bg-white rounded-2xl border border-slate-200 flex flex-col min-h-[560px]">
          <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="font-semibold text-slate-900 text-sm">Trợ lý MediAssist</p>
                <p className={cn('text-xs', latestResult ? 'text-emerald-700' : 'text-slate-500')}>
                  {isTyping ? 'Đang phân tích…' : latestResult ? 'Đã hoàn tất phân luồng' : 'Sẵn sàng lắng nghe'}
                </p>
              </div>
            </div>
            {code && <span className="text-xs text-slate-500">Mã phiên {code}</span>}
          </header>

          <div className="flex-1 px-4 sm:px-5 py-5 space-y-5">
            <div className="flex items-center gap-3 text-xs text-slate-400" aria-hidden>
              <span className="flex-1 h-px bg-slate-200" />
              Hôm nay, {timeOf(messages[0].timestamp)}
              <span className="flex-1 h-px bg-slate-200" />
            </div>

            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              const result = hasResult(msg);
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <span className="w-6 h-6 mt-1 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0" aria-hidden>
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>

                  {result ? (
                    <ResultCard
                      msg={msg}
                      expanded={!!expandedSbars[msg.id]}
                      onToggleSbar={() => setExpandedSbars((p) => ({ ...p, [msg.id]: !p[msg.id] }))}
                      onBook={(doc) => handleOpenBooking(doc, msg)}
                      shareSummary={shareSummary}
                      onShareSummaryChange={setShareSummary}
                    />
                  ) : (
                    <div className="max-w-[90%] sm:max-w-[80%] space-y-2.5">
                      <div className="rounded-xl bg-slate-100 text-slate-900 px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                        {msg.content}
                        {msg.medicalRelated === false && (
                          <p className="mt-2 flex items-center gap-2 text-xs text-amber-800">
                            <HelpCircle className="w-4 h-4 shrink-0" aria-hidden />
                            Câu hỏi ngoài phạm vi y tế. Hệ thống chỉ tư vấn cho các vấn đề sức khỏe.
                          </p>
                        )}
                      </div>
                      {msg.clarifyingQuestions && msg.clarifyingQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.clarifyingQuestions.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              disabled={isTyping}
                              onClick={() => handleSend(chip)}
                              className="text-left px-3 py-1.5 rounded-full border border-indigo-200 bg-white text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition cursor-pointer disabled:opacity-50"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-start gap-3" role="status">
                <span className="w-6 h-6 mt-1 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0" aria-hidden>
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="rounded-xl bg-slate-100 px-4 py-3 flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="ml-1.5 text-xs text-slate-500">AI đang phân tích triệu chứng…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="border-t border-slate-200 px-4 sm:px-5 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping}
                aria-label="Mô tả triệu chứng"
                placeholder={
                  latestResult ? 'Hỏi thêm, ví dụ: tôi có nên nhịn ăn trước khi khám không?' : 'Mô tả triệu chứng, ví dụ: tôi đau bụng vùng trên rốn 3 ngày nay…'
                }
                className="flex-1 min-h-[44px] max-h-40 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                title="Gửi (Enter)"
                aria-label="Gửi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Mọi tin nhắn đều được kiểm tra dấu hiệu cấp cứu trước khi gửi tới AI.</p>
          </footer>
        </section>

        {/* Right column */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Tóm tắt phiên</h2>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                  latestResult ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {latestResult ? 'Đủ thông tin' : 'Đang thu thập'}
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Triệu chứng" value={userMessages[0]?.content} clamp />
              <SummaryRow label="Số lượt trao đổi" value={userMessages.length ? `${userMessages.length} tin nhắn` : undefined} />
              <SummaryRow
                label="Mức độ"
                value={latestResult?.urgencyLevel ? URGENCY_STEPS.find((s) => s.level === latestResult.urgencyLevel)?.label : undefined}
              />
              <SummaryRow label="Chuyên khoa" value={latestResult?.recommendedSpecialty} />
            </dl>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              Bảng này tự tổng hợp từ cuộc trò chuyện. Nếu chưa đúng, hãy nhắn thêm cho trợ lý.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="flex items-center gap-2.5 font-semibold text-slate-900">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" aria-hidden />
              </span>
              Kiểm tra dấu hiệu nguy hiểm
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              {userMessages.length
                ? 'Chưa phát hiện dấu hiệu cần cấp cứu trong cuộc trò chuyện này.'
                : 'Mỗi tin nhắn sẽ được kiểm tra các nhóm dấu hiệu sau:'}
            </p>
            <ul className="mt-3 space-y-2">
              {RED_FLAG_GROUPS.map((g) => (
                <li key={g} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className={cn('w-4 h-4 mt-0.5 shrink-0', userMessages.length ? 'text-emerald-600' : 'text-slate-400')} aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
            <p className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
              Nếu phát hiện dấu hiệu nguy hiểm, cuộc trò chuyện sẽ dừng ngay và hướng dẫn bạn gọi cấp cứu {EMERGENCY_NUMBER}.
            </p>
          </div>
        </aside>
      </div>

      {bookingModal}
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value?: string | null; clamp?: boolean }> = ({ label, value, clamp }) => (
  <div className="grid grid-cols-[96px_1fr] gap-3">
    <dt className="text-slate-500">{label}</dt>
    <dd className={cn('font-medium', value ? 'text-slate-900' : 'text-slate-400', clamp && 'line-clamp-3')}>{value || '—'}</dd>
  </div>
);

interface ResultCardProps {
  msg: ChatMessage;
  expanded: boolean;
  onToggleSbar: () => void;
  onBook: (doc: DoctorMatch) => void;
  shareSummary: boolean;
  onShareSummaryChange: (v: boolean) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ msg, expanded, onToggleSbar, onBook, shareSummary, onShareSummaryChange }) => {
  const doctors = (msg.matchedDoctors || []).slice(0, 3);
  const specialtyQuery = encodeURIComponent(msg.recommendedSpecialtySlug || msg.recommendedSpecialty || '');

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-indigo-200 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <h3 className="font-semibold text-indigo-900">Kết quả phân luồng</h3>
        <span className="text-xs text-indigo-700">Thông tin tham khảo, không phải chẩn đoán</span>
      </div>

      <div className="p-4 space-y-5 bg-white">
        {msg.urgencyLevel && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mức độ khẩn cấp</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {URGENCY_STEPS.map((s) => {
                const active = s.level === msg.urgencyLevel;
                return (
                  <div
                    key={s.level}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border',
                      active
                        ? s.level === 'URGENT'
                          ? 'bg-orange-50 border-orange-400 text-orange-800 font-semibold'
                          : s.level === 'EMERGENCY'
                            ? 'bg-rose-50 border-rose-400 text-rose-800 font-semibold'
                            : 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                        : 'bg-slate-100 border-transparent text-slate-500',
                    )}
                  >
                    {active && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                    {s.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{msg.content}</p>

        {msg.recommendedSpecialty && (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Chuyên khoa phù hợp</p>
              <p className="font-display text-lg font-bold text-slate-900">{msg.recommendedSpecialty}</p>
              {msg.specialtyReason && <p className="mt-1 text-sm text-slate-700 leading-relaxed">{msg.specialtyReason}</p>}
            </div>
          </div>
        )}

        {msg.sbarSummary && (
          <div>
            <button
              type="button"
              onClick={onToggleSbar}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              Tóm tắt cho bác sĩ (SBAR)
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {msg.sbarSummary}
              </div>
            )}
          </div>
        )}

        {doctors.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bác sĩ phù hợp nhất</p>
              {specialtyQuery && (
                <Link to={`/patient/doctors?specialty=${specialtyQuery}`} className="text-xs font-medium text-indigo-700 underline underline-offset-2">
                  Xem tất cả bác sĩ {msg.recommendedSpecialty}
                </Link>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {doctors.map((doc) => {
                const rating = formatRating(doc.rating, doc.reviewCount);
                const meta = [
                  doc.specialties?.length ? doc.specialties.join(' – ') : null,
                  doc.yearsOfExperience ? `${doc.yearsOfExperience} năm kinh nghiệm` : null,
                  formatVnd(doc.consultationFee) ?? 'Phí: liên hệ',
                ].filter(Boolean);
                return (
                  <li key={doc.doctorId} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 p-3.5">
                    <span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {initialsOf(doc.fullName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {doc.academicTitle ? `${doc.academicTitle} ` : ''}
                        {doc.fullName}
                      </p>
                      {meta.length > 0 && <p className="text-xs text-slate-500 truncate">{meta.join(' · ')}</p>}
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                          Phù hợp {Math.round(doc.similarityScore * 100)}%
                        </span>
                        {rating ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />
                            {rating} ({doc.reviewCount})
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa có đánh giá</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/patient/doctors?doctorId=${encodeURIComponent(doc.doctorId)}`}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
                      >
                        Hồ sơ
                      </Link>
                      <button
                        type="button"
                        onClick={() => onBook(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition cursor-pointer"
                      >
                        <CalendarDays className="w-4 h-4" aria-hidden />
                        Đặt lịch
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="mt-3 flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={shareSummary}
                onChange={(e) => onShareSummaryChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Gửi kèm bản tóm tắt triệu chứng cho bác sĩ khi đặt lịch
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
