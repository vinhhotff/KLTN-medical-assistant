import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Plus, TriangleAlert, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button, ErrorState, Skeleton, useToast, cn } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatLocalDate } from '../../utils/date';

const DAYS = [
  { key: 'MONDAY', label: 'Thứ Hai', js: 1 },
  { key: 'TUESDAY', label: 'Thứ Ba', js: 2 },
  { key: 'WEDNESDAY', label: 'Thứ Tư', js: 3 },
  { key: 'THURSDAY', label: 'Thứ Năm', js: 4 },
  { key: 'FRIDAY', label: 'Thứ Sáu', js: 5 },
  { key: 'SATURDAY', label: 'Thứ Bảy', js: 6 },
  { key: 'SUNDAY', label: 'Chủ Nhật', js: 0 },
] as const;
type DayKey = (typeof DAYS)[number]['key'];
const DURATIONS = [15, 20, 30, 45, 60];

interface Range {
  start: string; // HH:mm
  end: string;
}
interface DayPlan {
  enabled: boolean;
  ranges: Range[];
}
type Plan = Record<DayKey, DayPlan>;

interface ScheduleConfig {
  dayOfWeek: DayKey;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
}
interface DoctorAppointment {
  id: string;
  patientName: string;
  scheduledStart: string;
  status: string;
}
interface Slot {
  startTime: string;
  available?: boolean;
  isAvailable?: boolean;
}

const hm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const emptyPlan = (): Plan => Object.fromEntries(DAYS.map((d) => [d.key, { enabled: false, ranges: [] }])) as unknown as Plan;
const ACTIVE_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'];

/** Backend stores ranges; the old editor saved one row per 30-min slot — merge contiguous rows back into ranges. */
const toPlan = (configs: ScheduleConfig[]): { plan: Plan; duration: number } => {
  const plan = emptyPlan();
  const durCount = new Map<number, number>();
  DAYS.forEach(({ key }) => {
    const rows = configs
      .filter((c) => c.dayOfWeek === key && c.active)
      .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    const ranges: Range[] = [];
    rows.forEach((r) => {
      durCount.set(r.slotDurationMinutes || 30, (durCount.get(r.slotDurationMinutes || 30) || 0) + 1);
      const last = ranges[ranges.length - 1];
      if (last && toMin(last.end) === toMin(r.startTime)) last.end = hm(r.endTime);
      else ranges.push({ start: hm(r.startTime), end: hm(r.endTime) });
    });
    plan[key] = { enabled: ranges.length > 0, ranges };
  });
  const duration = [...durCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 30;
  return { plan, duration: DURATIONS.includes(duration) ? duration : 30 };
};

const slotsIn = (r: Range, duration: number) => Math.max(0, Math.floor((toMin(r.end) - toMin(r.start)) / duration));

export const DoctorSchedulePage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [saved, setSaved] = useState<{ plan: Plan; duration: number } | null>(null);
  const [duration, setDuration] = useState(30);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [daySlots, setDaySlots] = useState<Slot[] | null>(null);
  const [daySlotsLoading, setDaySlotsLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [sRes, aRes] = await Promise.all([api.get('/doctors/me/schedules'), api.get('/appointments/my').catch(() => null)]);
      const parsed = toPlan(Array.isArray(sRes.data?.data) ? sRes.data.data : []);
      setPlan(parsed.plan);
      setDuration(parsed.duration);
      setSaved(parsed);
      if (Array.isArray(aRes?.data?.data)) setAppointments(aRes!.data.data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được lịch làm việc.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dirty = !!saved && (saved.duration !== duration || JSON.stringify(saved.plan) !== JSON.stringify(plan));

  const errors = useMemo(() => {
    const out: Partial<Record<DayKey, string>> = {};
    DAYS.forEach(({ key }) => {
      const p = plan[key];
      if (!p.enabled) return;
      if (p.ranges.length === 0) out[key] = 'Thêm ít nhất một khung giờ hoặc tắt ngày này.';
      const sorted = [...p.ranges].sort((a, b) => toMin(a.start) - toMin(b.start));
      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        if (!r.start || !r.end || toMin(r.end) <= toMin(r.start)) {
          out[key] = 'Giờ kết thúc phải sau giờ bắt đầu.';
          break;
        }
        if (slotsIn(r, duration) === 0) {
          out[key] = `Khung ${r.start}–${r.end} ngắn hơn một ca (${duration} phút).`;
          break;
        }
        if (i > 0 && toMin(r.start) < toMin(sorted[i - 1].end)) {
          out[key] = 'Các khung giờ trong ngày đang chồng lên nhau.';
          break;
        }
      }
    });
    return out;
  }, [plan, duration]);

  // Upcoming appointments that would fall outside the edited hours (they stay booked, but the doctor should know)
  const outsideWarnings = useMemo(() => {
    const out: Partial<Record<DayKey, DoctorAppointment[]>> = {};
    const now = Date.now();
    appointments
      .filter((a) => ACTIVE_STATUSES.includes(a.status) && new Date(a.scheduledStart).getTime() >= now)
      .forEach((a) => {
        const d = new Date(a.scheduledStart);
        const day = DAYS.find((x) => x.js === d.getDay())!;
        const p = plan[day.key];
        const m = d.getHours() * 60 + d.getMinutes();
        const inside = p.enabled && p.ranges.some((r) => m >= toMin(r.start) && m < toMin(r.end));
        if (!inside) out[day.key] = [...(out[day.key] || []), a];
      });
    return out;
  }, [appointments, plan]);

  const perDay = (key: DayKey) => (plan[key].enabled ? plan[key].ranges.reduce((s, r) => s + slotsIn(r, duration), 0) : 0);
  const weekly = DAYS.reduce((s, d) => s + perDay(d.key), 0);

  const update = (key: DayKey, fn: (p: DayPlan) => DayPlan) => setPlan((prev) => ({ ...prev, [key]: fn(prev[key]) }));

  const handleSave = async () => {
    if (saving || Object.keys(errors).length > 0) return;
    try {
      setSaving(true);
      const slots = DAYS.flatMap(({ key }) =>
        plan[key].enabled
          ? plan[key].ranges.map((r) => ({ dayOfWeek: key, startTime: `${r.start}:00`, endTime: `${r.end}:00`, slotDurationMinutes: duration, active: true }))
          : [],
      );
      const res = await api.put('/doctors/me/schedules', { slots });
      const parsed = toPlan(Array.isArray(res.data?.data) ? res.data.data : []);
      setPlan(parsed.plan);
      setDuration(parsed.duration);
      setSaved(parsed);
      toast.success('Đã lưu lịch làm việc.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể lưu lịch làm việc.'));
    } finally {
      setSaving(false);
    }
  };

  // Day view: real bookable slots for the selected date + who booked them
  const viewKey = DAYS.find((d) => d.js === viewDate.getDay())!.key;
  const viewDateStr = formatLocalDate(viewDate);
  const savedDayEnabled = !!saved?.plan[viewKey].enabled;
  useEffect(() => {
    if (!user?.id || !savedDayEnabled) {
      // Never query a day without configured hours: the backend would seed default hours for it.
      setDaySlots(null);
      return;
    }
    let cancelled = false;
    setDaySlotsLoading(true);
    api
      .get(`/doctors/${user.id}/slots`, { params: { date: viewDateStr } })
      .then((res) => !cancelled && setDaySlots(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => !cancelled && setDaySlots([]))
      .finally(() => !cancelled && setDaySlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id, viewDateStr, savedDayEnabled]);

  const dayAppointments = appointments.filter((a) => a.scheduledStart.slice(0, 10) === viewDateStr && a.status !== 'CANCELLED');
  const dayRows = useMemo(() => {
    const rows = new Map<string, { time: string; apt?: DoctorAppointment }>();
    (daySlots || []).forEach((s) => rows.set(hm(s.startTime), { time: hm(s.startTime) }));
    dayAppointments.forEach((a) => {
      const t = new Date(a.scheduledStart).toTimeString().slice(0, 5);
      rows.set(t, { time: t, apt: a });
    });
    return [...rows.values()].sort((a, b) => toMin(a.time) - toMin(b.time));
  }, [daySlots, dayAppointments]);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const bookedThisWeek = appointments.filter((a) => {
    const t = new Date(a.scheduledStart).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime() && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW';
  }).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (loadError) return <ErrorState message={loadError} onRetry={load} retrying={loading} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Lịch làm việc</h1>
          <p className="mt-1.5 text-slate-600">Lịch lặp lại hằng tuần. Bệnh nhân chỉ đặt được các ca nằm trong khung giờ bạn mở.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Có thay đổi chưa lưu
            </span>
          )}
          <Button variant="secondary" className="!rounded-lg" disabled={!dirty || saving} onClick={() => saved && (setPlan(saved.plan), setDuration(saved.duration))}>
            Hủy thay đổi
          </Button>
          <Button className="!rounded-lg !bg-teal-700 !border-teal-700 hover:!bg-teal-800" loading={saving} disabled={!dirty || Object.keys(errors).length > 0} onClick={handleSave}>
            Lưu lịch
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Lịch hằng tuần</h2>
              <p className="text-sm text-slate-500">{weekly} ca mỗi tuần</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">Thời lượng mỗi ca</span>
              <div className="inline-flex p-1 rounded-lg bg-slate-100" role="radiogroup" aria-label="Thời lượng mỗi ca">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={duration === d}
                    onClick={() => setDuration(d)}
                    className={cn('px-3 py-1.5 rounded-md text-sm transition cursor-pointer', duration === d ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900')}
                  >
                    {d}′
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {DAYS.map(({ key, label }) => {
              const p = plan[key];
              const warn = outsideWarnings[key];
              return (
                <li key={key} className={cn('px-5 sm:px-6 py-4', warn && 'bg-amber-50/60')}>
                  <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_56px] gap-3 md:items-start">
                    <label className="flex items-center gap-3 cursor-pointer pt-1.5">
                      <span className="relative inline-flex">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={p.enabled}
                          onChange={(e) =>
                            update(key, (d) => ({ enabled: e.target.checked, ranges: e.target.checked && d.ranges.length === 0 ? [{ start: '08:00', end: '11:30' }] : d.ranges }))
                          }
                        />
                        <span className="w-11 h-6 rounded-full bg-slate-300 peer-checked:bg-teal-700 transition" />
                        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                      </span>
                      <span className={cn('font-semibold', p.enabled ? 'text-slate-900' : 'text-slate-400')}>{label}</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {!p.enabled ? (
                        <span className="pt-1.5 text-sm text-slate-500">Nghỉ</span>
                      ) : (
                        <>
                          {p.ranges.map((r, i) => (
                            <div key={i} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg border border-slate-300 bg-white">
                              <Clock className="w-4 h-4 text-slate-400" aria-hidden />
                              <input
                                type="time"
                                value={r.start}
                                step={300}
                                aria-label={`${label} bắt đầu`}
                                onChange={(e) => update(key, (d) => ({ ...d, ranges: d.ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) }))}
                                className="text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
                              />
                              <span className="text-slate-400">–</span>
                              <input
                                type="time"
                                value={r.end}
                                step={300}
                                aria-label={`${label} kết thúc`}
                                onChange={(e) => update(key, (d) => ({ ...d, ranges: d.ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) }))}
                                className="text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => update(key, (d) => ({ ...d, ranges: d.ranges.filter((_, j) => j !== i) }))}
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                aria-label={`Xóa khung ${r.start}–${r.end}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              update(key, (d) => {
                                const last = d.ranges[d.ranges.length - 1];
                                const next = last && toMin(last.end) < toMin('13:30') ? { start: '13:30', end: '17:00' } : { start: '18:00', end: '20:00' };
                                return { ...d, ranges: [...d.ranges, next] };
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> Thêm khung giờ
                          </button>
                        </>
                      )}
                    </div>

                    <span className="text-sm text-slate-500 md:text-right md:pt-1.5">{p.enabled ? `${perDay(key)} ca` : '—'}</span>
                  </div>
                  {errors[key] && <p className="mt-2 md:ml-[162px] text-sm text-rose-700">{errors[key]}</p>}
                  {warn && (
                    <p className="mt-3 md:ml-[162px] flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
                      <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                      {warn.length} lịch hẹn sắp tới vào {label.toLowerCase()} nằm ngoài khung giờ này (
                      {warn
                        .slice(0, 3)
                        .map((a) => `${new Date(a.scheduledStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${new Date(a.scheduledStart).toTimeString().slice(0, 5)}`)
                        .join(', ')}
                      ). Các lịch này vẫn giữ nguyên; hãy nhắn bệnh nhân nếu muốn đổi giờ.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            Thay đổi chỉ áp dụng cho lượt đặt mới. Lịch hẹn đã đặt được giữ nguyên.
          </p>
        </section>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Xem theo ngày</h2>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewDate((d) => new Date(d.getTime() - 86400000))}
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                aria-label="Ngày trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="font-semibold text-slate-900">
                  {viewDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-500">
                  {savedDayEnabled ? `${dayAppointments.length} lịch hẹn` : 'Ngày nghỉ theo lịch đã lưu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewDate((d) => new Date(d.getTime() + 86400000))}
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                aria-label="Ngày sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <ul className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
              {daySlotsLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : dayRows.length === 0 ? (
                <li className="text-sm text-slate-500">Không có ca nào trong ngày này.</li>
              ) : (
                dayRows.map((r) => (
                  <li
                    key={r.time}
                    className={cn('flex items-center gap-4 px-4 py-3 rounded-lg border', r.apt ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}
                  >
                    <span className="font-semibold text-slate-900 w-12">{r.time}</span>
                    {r.apt ? (
                      <>
                        <span className="flex-1 min-w-0 truncate font-medium text-teal-900">{r.apt.patientName}</span>
                        <Link to={`/doctor/appointments/${r.apt.id}`} className="text-sm font-medium text-teal-700 underline underline-offset-2">
                          Mở
                        </Link>
                      </>
                    ) : (
                      <span className="flex-1 text-sm text-slate-500">Còn trống</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Tuần này</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{bookedThisWeek}</p>
                <p className="text-xs text-slate-500">ca đã đặt</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{saved ? DAYS.reduce((s, d) => s + (saved.plan[d.key].enabled ? saved.plan[d.key].ranges.reduce((x, r) => x + slotsIn(r, saved.duration), 0) : 0), 0) : 0}</p>
                <p className="text-xs text-slate-500">ca mở mỗi tuần</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Phí khám chỉnh trong{' '}
              <Link to="/doctor/profile" className="font-medium text-teal-700 underline underline-offset-2">
                Hồ sơ bác sĩ
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
