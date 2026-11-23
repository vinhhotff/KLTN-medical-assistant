import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download } from 'lucide-react';
import { api } from '../../services/api';
import { ErrorState, Skeleton } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { downloadCsv } from '../../utils/csv';
import { AI_SERVICE_LABEL, RANGE_OPTIONS, shortDay, type AiUsage } from '../../types/admin';

/** Small amounts keep 4 decimals so a real $0.0008 is never shown as "$0.00". */
const usd = (n: number, digits = 2) => {
  const d = n !== 0 && Math.abs(n) < 1 ? Math.max(digits, 4) : digits;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};
const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu` : n.toLocaleString('vi-VN');

export const AiCostPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get(`/admin/ai-usage?days=${days}`);
      setUsage(res.data?.data ?? null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được số liệu chi phí AI.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [days]);

  const totalUsd = Number(usage?.totalCostUsd ?? 0);
  const totalVnd = Number(usage?.totalCostVnd ?? 0);
  const rate = totalUsd > 0 ? totalVnd / totalUsd : null;
  const services = usage?.serviceStats ?? [];
  const perUnit = (code: string) => {
    const s = services.find((x) => x.service === code);
    return s && s.requests > 0 ? Number(s.costUsd) / s.requests : null;
  };

  const daily = useMemo(
    () => (usage?.dailyStats ?? []).map((d) => ({ ...d, costUsd: Number(d.costUsd), label: shortDay(String(d.date).slice(0, 10)) })),
    [usage],
  );
  const activeDays = daily.filter((d) => d.costUsd > 0).length;

  const exportCsv = () =>
    downloadCsv(
      `chi-phi-ai-${days}-ngay.csv`,
      ['Ngày', 'Token', 'Chi phí (USD)'],
      daily.map((d) => [String(d.date).slice(0, 10), d.tokens, d.costUsd.toFixed(6)]),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Chi phí AI</h1>
          <p className="mt-1.5 text-slate-600">Ước tính từ số token của mỗi lần gọi AI, theo đơn giá cấu hình ở backend.</p>
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
            disabled={loading || daily.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </div>
      </div>

      {loadError && <ErrorState message={loadError} onRetry={load} retrying={loading} />}

      {/* Headline */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <p className="text-sm text-slate-600">Chi phí ước tính {days} ngày qua</p>
          {loading ? (
            <Skeleton className="mt-2 h-12 w-40" />
          ) : (
            <>
              <p className="mt-1 font-display text-5xl font-bold text-slate-900 tabular-nums">{usd(totalUsd)}</p>
              <p className="mt-2 text-sm text-slate-600">
                ≈ <strong className="text-slate-900">{vnd(totalVnd)}</strong>
                {rate && <> · tỷ giá {Math.round(rate).toLocaleString('vi-VN')}₫/USD</>}
                {activeDays > 0 && <> · trung bình {usd(totalUsd / activeDays, 3)} mỗi ngày có phát sinh</>}
              </p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-0 lg:min-w-[320px]">
          <Mini label="Lượt gọi AI" value={loading ? null : (usage?.totalRequests ?? 0).toLocaleString('vi-VN')} />
          <Mini label="Tổng token" value={loading ? null : compact(usage?.totalTokens ?? 0)} />
          <Mini label="Mỗi phiên phân luồng" value={loading ? null : perUnit('TRIAGE') === null ? '—' : usd(perUnit('TRIAGE')!, 4)} />
          <Mini label="Mỗi tài liệu" value={loading ? null : perUnit('DOCUMENT_ANALYSIS') === null ? '—' : usd(perUnit('DOCUMENT_ANALYSIS')!, 4)} />
        </div>
      </section>

      {/* Daily cost */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Chi phí mỗi ngày (USD)</h2>
          <p className="text-xs text-slate-500">Backend chưa tách chi phí theo tính năng cho từng ngày</p>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-64 w-full" />
        ) : daily.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Chưa có lượt gọi AI nào trong khoảng thời gian này.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap={2}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} minTickGap={16} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  formatter={(v, _n, item) => [`${usd(Number(v), 4)} · ${Number(item.payload.tokens).toLocaleString('vi-VN')} token`, 'Chi phí']}
                  labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 13 }}
                />
                <Bar dataKey="costUsd" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* By feature */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold text-slate-900">Theo tính năng</h2>
        {loading ? (
          <Skeleton className="mx-5 mb-5 h-24" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-5 font-semibold">Tính năng</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Lượt gọi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Token</th>
                  <th className="py-2.5 px-5 font-semibold text-right">Chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-5 text-slate-500">
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  services.map((s) => {
                    const meta = AI_SERVICE_LABEL[s.service];
                    return (
                      <tr key={s.service}>
                        <td className="py-3 px-5">
                          <p className="font-medium text-slate-900">{meta?.label ?? s.service}</p>
                          <p className="text-xs font-code text-slate-500">{s.service}</p>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-800">{s.requests.toLocaleString('vi-VN')}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-800">{compact(s.tokens)}</td>
                        <td className="py-3 px-5 text-right tabular-nums">
                          <p className="font-semibold text-slate-900">{usd(Number(s.costUsd))}</p>
                          <p className="text-xs text-slate-500">{totalUsd > 0 ? `${Math.round((Number(s.costUsd) / totalUsd) * 100)}%` : '—'}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {services.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                    <td className="py-3 px-5">Tổng</td>
                    <td className="py-3 px-3 text-right tabular-nums">{(usage?.totalRequests ?? 0).toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{compact(usage?.totalTokens ?? 0)}</td>
                    <td className="py-3 px-5 text-right tabular-nums">{usd(totalUsd)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {!loading && usage && (
          <p className="px-5 py-3 border-t border-slate-200 text-sm text-slate-600">
            Tỉ lệ lỗi gọi AI: <strong className="text-slate-900">{(usage.errorRatePercent ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</strong>. Khi mô hình AI lỗi, hệ thống chuyển sang mô hình dự phòng hoặc chế độ ngoại tuyến.
          </p>
        )}
      </section>
    </div>
  );
};

const Mini: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50">
    <p className="text-xs text-slate-500">{label}</p>
    {value === null ? <Skeleton className="mt-1 h-6 w-16" /> : <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{value}</p>}
  </div>
);
