import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Stethoscope, FileText, MessageSquare, Search, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';
import { ErrorState, Skeleton, cn } from '../../components/ui';
import { devLog } from '../../utils/logger';
import {
  APPOINTMENT_STATUS_LABEL,
  URGENCY_LABEL,
  type AppointmentItem,
  type PatientDocumentItem,
  type TriageHistoryItem,
} from '../../types/patient';

type Kind = 'ai' | 'document' | 'visit';

interface TimelineItem {
  key: string;
  kind: Kind;
  at: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badges: { text: string; className: string }[];
  action?: { label: string; to: string };
  detail?: string;
  icon: typeof CalendarDays;
  tone: string;
}

const FILTERS: { key: 'all' | Kind; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'ai', label: 'Trợ lý AI' },
  { key: 'document', label: 'Tài liệu & xét nghiệm' },
  { key: 'visit', label: 'Khám & lịch hẹn' },
];

const URGENCY_BADGE: Record<string, string> = {
  EMERGENCY: 'bg-rose-50 text-rose-700 border-rose-200',
  URGENT: 'bg-orange-50 text-orange-700 border-orange-200',
  ROUTINE: 'bg-slate-50 text-slate-700 border-slate-200',
  SELF_CARE: 'bg-slate-50 text-slate-700 border-slate-200',
};

const monthLabel = (iso: string) => {
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const HealthHistoryPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [triage, setTriage] = useState<TriageHistoryItem[]>([]);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    let failed = 0;
    const soft = <T,>(p: Promise<T>): Promise<T | null> =>
      p.catch((err) => {
        failed += 1;
        devLog.warn('Health history request failed', err);
        return null;
      });
    const [a, t, d] = await Promise.all([soft(api.get('/appointments/my')), soft(api.get('/triage/history')), soft(api.get('/documents/my'))]);
    if (Array.isArray(a?.data?.data)) setAppointments(a!.data.data);
    if (Array.isArray(t?.data?.data)) setTriage(t!.data.data);
    if (Array.isArray(d?.data?.data)) setDocuments(d!.data.data);
    setLoadError(failed > 0 ? 'Một phần dữ liệu chưa tải được. Lịch sử bên dưới có thể chưa đầy đủ.' : null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    appointments.forEach((apt) => {
      const done = apt.status === 'COMPLETED';
      const status = APPOINTMENT_STATUS_LABEL[apt.status];
      out.push({
        key: `apt-${apt.id}`,
        kind: 'visit',
        at: apt.scheduledStart,
        eyebrow: done ? 'Lần khám' : 'Lịch hẹn',
        title: done ? `Khám xong với ${apt.doctorName}` : apt.status === 'CANCELLED' ? 'Lịch hẹn đã hủy' : 'Lịch khám',
        subtitle: `${fullDateTime(apt.scheduledStart)} · ${apt.doctorName}`,
        badges: [
          ...(status ? [status] : []),
          ...(done && (apt.consultationNotes || apt.treatmentPlan) ? [{ text: 'Có lời dặn từ bác sĩ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }] : []),
        ],
        action: { label: done ? 'Xem lời dặn' : 'Xem lịch hẹn', to: `/patient/appointments/${apt.id}` },
        icon: done ? Stethoscope : CalendarDays,
        tone: 'text-sky-700',
      });
    });
    triage.forEach((t) => {
      const emergency = t.emergency ?? t.isEmergency;
      const level = emergency ? 'EMERGENCY' : t.urgencyLevel;
      out.push({
        key: `tri-${t.id}`,
        kind: 'ai',
        at: t.createdAt,
        eyebrow: 'Trợ lý AI',
        title: t.symptomsText.length > 90 ? `${t.symptomsText.slice(0, 90)}…` : t.symptomsText,
        subtitle: t.primarySpecialty ? `Gợi ý: ${t.primarySpecialty}` : emergency ? 'Phiên dừng vì có dấu hiệu cấp cứu' : undefined,
        badges: level ? [{ text: URGENCY_LABEL[level] ?? level, className: URGENCY_BADGE[level] ?? URGENCY_BADGE.ROUTINE }] : [],
        detail: t.aiAdvice || t.sbarSummary,
        icon: MessageSquare,
        tone: 'text-indigo-700',
      });
    });
    documents.forEach((doc) => {
      const valid = doc.validMedical ?? doc.isValidMedical;
      out.push({
        key: `doc-${doc.id}`,
        kind: 'document',
        at: doc.createdAt,
        eyebrow: 'Tài liệu & xét nghiệm',
        title: doc.fileName,
        subtitle: `${(doc.fileSizeBytes / 1024).toFixed(0)} KB`,
        badges:
          valid === false
            ? [{ text: 'Không phải tài liệu y tế', className: 'bg-amber-50 text-amber-800 border-amber-200' }]
            : [{ text: 'AI đã đọc', className: 'bg-teal-50 text-teal-800 border-teal-200' }],
        action: { label: 'Xem kết quả', to: `/patient/documents?focusId=${doc.id}` },
        icon: FileText,
        tone: 'text-teal-700',
      });
    });
    return out.sort((x, y) => (x.at < y.at ? 1 : -1));
  }, [appointments, triage, documents]);

  const counts = useMemo(
    () => ({
      all: items.length,
      ai: items.filter((i) => i.kind === 'ai').length,
      document: items.filter((i) => i.kind === 'document').length,
      visit: items.filter((i) => i.kind === 'visit').length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (filter === 'all' || i.kind === filter) &&
        (!q || [i.title, i.subtitle, i.eyebrow, i.detail].some((s) => s?.toLowerCase().includes(q))),
    );
  }, [items, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    visible.forEach((i) => {
      const k = monthLabel(i.at);
      map.set(k, [...(map.get(k) || []), i]);
    });
    return Array.from(map.entries());
  }, [visible]);

  // scheduledStart is a zone-less local date-time; compare as Date (string compare against UTC ISO would be off by the TZ offset)
  const nowMs = Date.now();
  const upcoming = appointments
    .filter((a) => (a.status === 'SCHEDULED' || a.status === 'CHECKED_IN') && new Date(a.scheduledStart).getTime() >= nowMs)
    .sort((a, b) => (a.scheduledStart > b.scheduledStart ? 1 : -1))[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Lịch sử sức khỏe</h1>
        <p className="mt-1.5 text-slate-600">Mọi phiên trợ lý AI, tài liệu và lần khám của bạn ở một nơi.</p>
      </div>

      {loadError && <ErrorState message={loadError} onRetry={load} retrying={loading} />}

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                'px-4 py-2 rounded-full border text-sm transition cursor-pointer',
                filter === f.key ? 'bg-indigo-600 border-indigo-600 text-white font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              {f.label} · {counts[f.key]}
            </button>
          ))}
        </div>
        <label className="flex-1 flex items-center gap-2 px-3.5 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Triệu chứng, tên bác sĩ, tên tài liệu…"
            aria-label="Tìm trong lịch sử"
            className="w-full py-2.5 text-sm bg-transparent focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="min-w-0">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-600">
              {items.length === 0 ? (
                <>
                  Chưa có hoạt động nào.{' '}
                  <Link to="/patient/triage" className="text-indigo-700 underline">
                    Bắt đầu với trợ lý triệu chứng
                  </Link>
                  .
                </>
              ) : (
                'Không có mục nào khớp bộ lọc.'
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(([month, list]) => (
                <section key={month}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{month}</h2>
                  <ol className="space-y-4">
                    {list.map((item, idx) => {
                      const Icon = item.icon;
                      const open = !!expanded[item.key];
                      return (
                        <li key={item.key} className="grid grid-cols-[56px_32px_1fr] sm:grid-cols-[64px_36px_1fr] gap-2 sm:gap-3">
                          <div className="text-right pt-4">
                            <p className="text-sm font-bold text-slate-900">{dayLabel(item.at)}</p>
                            <p className="text-xs text-slate-500">{timeLabel(item.at)}</p>
                          </div>
                          <div className="relative flex justify-center">
                            {idx < list.length - 1 && <span className="absolute top-12 bottom-[-1rem] w-px bg-slate-200" aria-hidden />}
                            <span className={cn('mt-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center', item.tone)}>
                              <Icon className="w-4 h-4" aria-hidden />
                            </span>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[11px] font-semibold uppercase tracking-wider', item.tone)}>{item.eyebrow}</p>
                                <p className="mt-0.5 font-semibold text-slate-900 break-words">{item.title}</p>
                                {item.subtitle && <p className="mt-0.5 text-sm text-slate-600">{item.subtitle}</p>}
                                {item.badges.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.badges.map((b) => (
                                      <span key={b.text} className={cn('px-2 py-0.5 rounded-full border text-xs font-medium', b.className)}>
                                        {b.text}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {item.action ? (
                                <Link
                                  to={item.action.to}
                                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition shrink-0"
                                >
                                  {item.action.label} <ChevronRight className="w-4 h-4" />
                                </Link>
                              ) : item.detail ? (
                                <button
                                  type="button"
                                  onClick={() => setExpanded((p) => ({ ...p, [item.key]: !p[item.key] }))}
                                  aria-expanded={open}
                                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition shrink-0 cursor-pointer"
                                >
                                  {open ? 'Thu gọn' : 'Xem tóm tắt'} {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              ) : null}
                            </div>
                            {open && item.detail && (
                              <p className="mt-3 p-3 rounded-lg bg-slate-50 text-sm text-slate-700 whitespace-pre-line leading-relaxed">{item.detail}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {upcoming && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Sắp tới</p>
              <p className="mt-1 font-display text-lg font-bold text-slate-900">
                {new Date(upcoming.scheduledStart).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-sm text-indigo-800">
                {timeLabel(upcoming.scheduledStart)} · {upcoming.doctorName}
              </p>
              <Link
                to={`/patient/appointments/${upcoming.id}`}
                className="mt-4 w-full inline-flex items-center justify-center py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
              >
                Xem lịch hẹn
              </Link>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Tổng cộng</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { n: appointments.filter((a) => a.status === 'COMPLETED').length, l: 'lần khám' },
                { n: triage.length, l: 'phiên AI' },
                { n: documents.length, l: 'tài liệu' },
              ].map((s) => (
                <div key={s.l} className="p-3 rounded-xl bg-slate-50">
                  <p className="text-2xl font-bold text-slate-900">{loading ? '–' : s.n}</p>
                  <p className="text-xs text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
