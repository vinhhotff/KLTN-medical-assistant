import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, TriangleAlert, ArrowUp, ArrowDown, Table2, LineChart as LineIcon } from 'lucide-react';
import { api } from '../../services/api';
import { ErrorState, Skeleton, cn } from '../../components/ui';
import { devLog } from '../../utils/logger';
import { downloadCsv } from '../../utils/csv';
import { RANGE_OPTIONS, dayKey, shortDay, type AdminTriageSession, type AiUsage } from '../../types/admin';

const URGENCY_ROWS = [
  { key: 'HOME', label: 'Theo dõi tại nhà', levels: ['ROUTINE', 'SELF_CARE'] },
  { key: 'URGENT', label: 'Khám trong 1–3 ngày', levels: ['URGENT'] },
  { key: 'EMERGENCY', label: 'Cấp cứu ngay', levels: ['EMERGENCY'] },
];

const isEmergency = (s: AdminTriageSession) => Boolean(s.emergency ?? s.isEmergency) || s.urgencyLevel === 'EMERGENCY';
const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—');

export const AiStatsPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [sessions, setSessions] = useState<AdminTriageSession[]>([]);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [specNames, setSpecNames] = useState<Record<string, string>>({});

  // primarySpecialty may hold a slug (e.g. general-internal-medicine) — show the catalog name
  useEffect(() => {
    api
      .get('/specialties')
      .then((res) => {
        const list: { slug: string; name: string }[] = Array.isArray(res.data?.data) ? res.data.data : [];
        setSpecNames(Object.fromEntries(list.map((s) => [s.slug.toLowerCase(), s.name])));
      })
      .catch(() => undefined);
  }, []);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const [s, u] = await Promise.allSettled([api.get('/admin/triage-sessions'), api.get(`/admin/ai-usage?days=${days}`)]);
    if (s.status === 'fulfilled' && Array.isArray(s.value.data?.data)) setSessions(s.value.data.data);
    else setLoadError('Không tải được danh sách phiên phân luồng.');
    if (u.status === 'fulfilled') setUsage(u.value.data?.data ?? null);
    else devLog.warn('ai-usage failed', u.reason);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [days]);

  const view = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);

    const inRange = sessions.filter((s) => new Date(s.createdAt) >= start);
    const prev = sessions.filter((s) => {
      const t = new Date(s.createdAt);
      return t >= prevStart && t < start;
    });

    const daily: { day: string; label: string; sessions: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      daily.push({ day: dayKey(d), label: shortDay(dayKey(d)), sessions: 0 });
    }
    const idx = new Map(daily.map((d, i) => [d.day, i]));
    inRange.forEach((s) => {
      const i = idx.get(dayKey(new Date(s.createdAt)));
      if (i !== undefined) daily[i].sessions += 1;
    });

    const emergencies = inRange.filter(isEmergency);
    const urgency = URGENCY_ROWS.map((r) => ({
      ...r,
      count: r.key === 'EMERGENCY' ? emergencies.length : inRange.filter((s) => !isEmergency(s) && r.levels.includes(s.urgencyLevel || '')).length,
    }));
    const specCount = new Map<string, number>();
    inRange
      .filter((s) => !isEmergency(s) && s.primarySpecialty)
      .forEach((s) => {
        const name = specNames[s.primarySpecialty!.toLowerCase()] || s.primarySpecialty!;
        specCount.set(name, (specCount.get(name) || 0) + 1);
      });
    const specialties = [...specCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const nonEmergency = inRange.length - emergencies.length;

    return { inRange, prev, daily, emergencies, urgency, specialties, nonEmergency };
  }, [sessions, days, specNames]);

  const docRequests = usage ? usage.serviceStats?.find((s) => s.service === 'DOCUMENT_ANALYSIS')?.requests ?? 0 : null;
  const delta = view.prev.length > 0 ? Math.round(((view.inRange.length - view.prev.length) / view.prev.length) * 100) : null;

  const exportCsv = () =>
    downloadCsv(
      `thong-ke-ai-${days}-ngay.csv`,
      ['Ngày', 'Số phiên phân luồng'],
      view.daily.map((d) => [d.day, d.sessions]),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Thống kê AI &amp; an toàn</h1>
          <p className="mt-1.5 text-slate-600">Hoạt động của trợ lý triệu chứng và tính năng giải nghĩa bệnh án.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Khoảng thời gian"
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800"
          >
            {RANGE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} ngày qua
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </div>
      </div>

      {loadError && <ErrorState message={loadError} onRetry={load} retrying={loading} />}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Tile label="Phiên phân luồng" loading={loading} value={view.inRange.length.toLocaleString('vi-VN')}>
          {delta !== null && (
            <span className={cn('inline-flex items-center gap-1 font-medium', delta >= 0 ? 'text-emerald-700' : 'text-slate-600')}>
              {delta >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              {Math.abs(delta)}% so với {days} ngày trước
            </span>
          )}
        </Tile>
        <Tile label="Lượt giải nghĩa tài liệu" loading={loading} value={docRequests === null ? '—' : docRequests.toLocaleString('vi-VN')}>
          Lượt gọi AI đọc xét nghiệm trong {days} ngày
        </Tile>
        <Tile label="Cảnh báo đỏ kích hoạt" loading={loading} value={view.emergencies.length.toLocaleString('vi-VN')}>
          {pct(view.emergencies.length, view.inRange.length)} số phiên
        </Tile>
        <Tile label="Tỉ lệ lỗi gọi AI" loading={loading} value={usage ? `${(usage.errorRatePercent ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—'}>
          {usage ? `${usage.totalRequests.toLocaleString('vi-VN')} lượt gọi` : 'Chưa tải được'}
        </Tile>
      </div>

      {/* Daily sessions */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Số phiên phân luồng mỗi ngày</h2>
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {asTable ? <LineIcon className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
            {asTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
          </button>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-64 w-full" />
        ) : asTable ? (
          <div className="mt-4 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Ngày</th>
                  <th className="py-2 font-semibold text-right">Phiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.daily.map((d) => (
                  <tr key={d.day}>
                    <td className="py-2 text-slate-700">{d.label}</td>
                    <td className="py-2 text-right font-medium text-slate-900 tabular-nums">{d.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view.daily} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: '#94A3B8', strokeDasharray: '3 3' }}
                  formatter={(v) => [`${v} phiên`, 'Phân luồng']}
                  labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 13 }}
                />
                <Line type="monotone" dataKey="sessions" stroke="#4F46E5" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Urgency distribution */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Mức khẩn cấp do AI đánh giá</h2>
          <p className="text-sm text-slate-500">{view.inRange.length.toLocaleString('vi-VN')} phiên phân luồng</p>
          <ul className="mt-4 space-y-3">
            {view.urgency.map((r) => {
              const max = Math.max(1, ...view.urgency.map((x) => x.count));
              const isEm = r.key === 'EMERGENCY';
              return (
                <li key={r.key} className="grid grid-cols-[150px_1fr_96px] items-center gap-3 text-sm">
                  <span className={cn('flex items-center gap-1.5', isEm ? 'font-semibold text-rose-800' : 'text-slate-800')}>
                    {isEm && <TriangleAlert className="w-4 h-4 text-rose-600" aria-hidden />}
                    {r.label}
                  </span>
                  <span className="h-4 rounded-sm bg-slate-100">
                    <span className={cn('block h-full rounded-sm', isEm ? 'bg-rose-600' : 'bg-slate-500')} style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 4 : 0 }} />
                  </span>
                  <span className="text-slate-700 tabular-nums">
                    <strong className="text-slate-900">{r.count}</strong> · {pct(r.count, view.inRange.length)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-slate-500">Phiên cấp cứu không được gợi ý chuyên khoa vì hệ thống dừng hội thoại ngay.</p>
        </section>

        {/* Suggested specialties */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Chuyên khoa được gợi ý</h2>
          <p className="text-sm text-slate-500">{view.nonEmergency.toLocaleString('vi-VN')} phiên không cấp cứu</p>
          {view.specialties.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu trong khoảng thời gian này.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {view.specialties.map(([name, n]) => (
                <li key={name} className="grid grid-cols-[200px_1fr_48px] items-center gap-3 text-sm">
                  <span className="text-slate-800 truncate" title={name}>
                    {name}
                  </span>
                  <span className="h-4 rounded-sm bg-slate-100">
                    <span className="block h-full rounded-sm bg-indigo-600" style={{ width: `${(n / view.specialties[0][1]) * 100}%`, minWidth: 4 }} />
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent red flags */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Cảnh báo đỏ gần đây</h2>
            <p className="text-sm text-slate-500">Do bộ lọc quy tắc phát hiện, trước khi gọi AI</p>
          </div>
          <Link to="/admin/triage" className="text-sm font-medium text-indigo-700 underline underline-offset-2">
            Xem các phiên
          </Link>
        </div>
        {view.emergencies.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Không có cảnh báo đỏ trong {days} ngày qua.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-5 font-semibold">Thời gian</th>
                  <th className="py-2.5 px-3 font-semibold">Bệnh nhân</th>
                  <th className="py-2.5 px-5 font-semibold">Triệu chứng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...view.emergencies]
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .slice(0, 8)
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-5 text-slate-700 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{s.patientName || '—'}</td>
                      <td className="py-3 px-5 text-slate-700">{s.symptomsText.length > 90 ? `${s.symptomsText.slice(0, 90)}…` : s.symptomsText}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; loading: boolean; children?: React.ReactNode }> = ({ label, value, loading, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <p className="text-sm text-slate-600">{label}</p>
    {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-1 font-display text-3xl font-bold text-slate-900 tabular-nums">{value}</p>}
    {!loading && children && <p className="mt-1 text-xs text-slate-500">{children}</p>}
  </div>
);
