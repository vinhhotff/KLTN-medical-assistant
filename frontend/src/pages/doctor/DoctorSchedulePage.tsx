import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  doctorScheduleService,
  extractScheduleConflicts,
} from '../../services/doctorScheduleService';
import { useAuthStore } from '../../store/useAuthStore';
import { Badge, Button, ErrorState, Skeleton, useToast, cn } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatLocalDate } from '../../utils/date';
import {
  BUFFER_OPTIONS,
  DAYS,
  DURATIONS,
  DayKey,
  DayPlan,
  DoctorAppointmentSummary,
  ScheduleConflictItem,
  ScheduleExceptionItem,
  ScheduleShiftItem,
  SlotItem,
  WeeklyPlan,
  emptyWeeklyPlan,
  generatePreviewTimeSlots,
  hm,
  mergeWeeklyConfigRows,
  slotsInRange,
  toMinutes,
  validateRanges,
} from '../../types/schedule';
import { TimeSelect } from '../../components/doctor/schedule/TimeSelect';
import { CopyToDaysPopover } from '../../components/doctor/schedule/CopyToDaysPopover';
import { ScheduleExceptionsTab } from '../../components/doctor/schedule/ScheduleExceptionsTab';
import { ConflictWarningModal } from '../../components/doctor/schedule/ConflictWarningModal';

const ACTIVE_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'];

interface PendingForceAction {
  kind: 'weekly' | 'exception';
  label: string;
  conflicts: ScheduleConflictItem[];
  exceptionPayload?: {
    exceptionDate: string;
    dayOff: boolean;
    customShifts: ScheduleShiftItem[];
    reason?: string;
  };
}

export const DoctorSchedulePage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');

  const [plan, setPlan] = useState<WeeklyPlan>(emptyWeeklyPlan);
  const [duration, setDuration] = useState<number>(30);
  const [buffer, setBuffer] = useState<number>(0);
  const [saved, setSaved] = useState<{ plan: WeeklyPlan; duration: number; buffer: number } | null>(null);

  const [exceptions, setExceptions] = useState<ScheduleExceptionItem[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointmentSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingException, setSavingException] = useState(false);

  const [pendingConflict, setPendingConflict] = useState<PendingForceAction | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [daySlots, setDaySlots] = useState<SlotItem[] | null>(null);
  const [daySlotsLoading, setDaySlotsLoading] = useState(false);
  const [slotsRefreshTick, setSlotsRefreshTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [bundle, aRes] = await Promise.all([
        doctorScheduleService.getScheduleBundle(),
        api.get('/appointments/my').catch(() => null),
      ]);

      const parsed = mergeWeeklyConfigRows(bundle.weeklySlots);
      const resolvedDuration = (DURATIONS as readonly number[]).includes(bundle.slotDurationMinutes)
        ? bundle.slotDurationMinutes
        : parsed.duration;
      const resolvedBuffer = (BUFFER_OPTIONS as readonly number[]).includes(bundle.bufferTimeMinutes)
        ? bundle.bufferTimeMinutes
        : parsed.buffer;

      setPlan(parsed.plan);
      setDuration(resolvedDuration);
      setBuffer(resolvedBuffer);
      setSaved({ plan: parsed.plan, duration: resolvedDuration, buffer: resolvedBuffer });
      setExceptions(bundle.exceptions || []);

      if (Array.isArray(aRes?.data?.data)) {
        setAppointments(aRes!.data.data);
      }
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được lịch làm việc.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    !!saved &&
    (saved.duration !== duration ||
      saved.buffer !== buffer ||
      JSON.stringify(saved.plan) !== JSON.stringify(plan));

  const errors = useMemo(() => {
    const out: Partial<Record<DayKey, string>> = {};
    DAYS.forEach(({ key }) => {
      const p = plan[key];
      if (!p.enabled) return;
      const errMsg = validateRanges(p.ranges, duration);
      if (errMsg) out[key] = errMsg;
    });
    return out;
  }, [plan, duration]);

  const exceptionByDate = useMemo(() => {
    const map = new Map<string, ScheduleExceptionItem>();
    exceptions.forEach((ex) => map.set(ex.exceptionDate.slice(0, 10), ex));
    return map;
  }, [exceptions]);

  // Warn inline when upcoming non-overridden active appointments fall outside edited weekly hours
  const outsideWarnings = useMemo(() => {
    const out: Partial<Record<DayKey, DoctorAppointmentSummary[]>> = {};
    const now = Date.now();
    appointments
      .filter((a) => ACTIVE_STATUSES.includes(a.status) && new Date(a.scheduledStart).getTime() >= now)
      .forEach((a) => {
        const dateStr = a.scheduledStart.slice(0, 10);
        if (exceptionByDate.has(dateStr)) return;
        const d = new Date(a.scheduledStart);
        const day = DAYS.find((x) => x.js === d.getDay())!;
        const p = plan[day.key];
        const m = d.getHours() * 60 + d.getMinutes();
        const inside = p.enabled && p.ranges.some((r) => m >= toMinutes(r.start) && m < toMinutes(r.end));
        if (!inside) out[day.key] = [...(out[day.key] || []), a];
      });
    return out;
  }, [appointments, plan, exceptionByDate]);

  const activeDaysCount = useMemo(
    () => DAYS.filter(({ key }) => plan[key].enabled && plan[key].ranges.length > 0).length,
    [plan],
  );

  const perDayCount = useCallback(
    (key: DayKey) =>
      plan[key].enabled ? plan[key].ranges.reduce((s, r) => s + slotsInRange(r, duration, buffer), 0) : 0,
    [plan, duration, buffer],
  );

  const weeklyTotalSlots = useMemo(
    () => DAYS.reduce((s, d) => s + perDayCount(d.key), 0),
    [perDayCount],
  );

  const updateDay = (key: DayKey, fn: (p: DayPlan) => DayPlan) =>
    setPlan((prev) => ({ ...prev, [key]: fn(prev[key]) }));

  const applyCopyToDays = (sourceKey: DayKey, targetKeys: DayKey[]) => {
    const sourcePlan = plan[sourceKey];
    const clonedRanges = sourcePlan.ranges.map((r) => ({ ...r }));
    setPlan((prev) => {
      const next = { ...prev };
      targetKeys.forEach((target) => {
        next[target] = {
          enabled: clonedRanges.length > 0 && sourcePlan.enabled,
          ranges: clonedRanges.map((r) => ({ ...r })),
        };
      });
      return next;
    });
    toast.success(`Đã sao chép khung giờ sang ${targetKeys.length} ngày.`);
  };

  const applyStandardPreset = () => {
    setPlan((prev) => {
      const next = { ...prev };
      DAYS.forEach(({ key }) => {
        if (key === 'SATURDAY' || key === 'SUNDAY') {
          next[key] = { enabled: false, ranges: [] };
        } else {
          next[key] = {
            enabled: true,
            ranges: [
              { start: '08:00', end: '12:00' },
              { start: '13:30', end: '17:00' },
            ],
          };
        }
      });
      return next;
    });
    toast.success('Đã nạp mẫu giờ hành chính T2–T6 (bấm Lưu thay đổi để áp dụng).');
  };

  const executeSaveWeekly = async (force: boolean) => {
    if (savingWeekly || Object.keys(errors).length > 0) return;
    try {
      setSavingWeekly(true);
      const bundle = await doctorScheduleService.saveWeeklySchedule({
        plan,
        slotDurationMinutes: duration,
        bufferTimeMinutes: buffer,
        force,
      });

      const parsed = mergeWeeklyConfigRows(bundle.weeklySlots);
      const nextDur = bundle.slotDurationMinutes || duration;
      const nextBuf = bundle.bufferTimeMinutes ?? buffer;

      setPlan(parsed.plan);
      setDuration(nextDur);
      setBuffer(nextBuf);
      setSaved({ plan: parsed.plan, duration: nextDur, buffer: nextBuf });
      if (Array.isArray(bundle.exceptions)) {
        setExceptions(bundle.exceptions);
      }
      setPendingConflict(null);
      setSlotsRefreshTick((t) => t + 1);
      toast.success(
        force
          ? 'Đã lưu lịch làm việc mới (giữ nguyên các lịch hẹn cũ bị ảnh hưởng).'
          : 'Đã lưu cấu hình lịch làm việc.',
      );
    } catch (err) {
      const conflicts = extractScheduleConflicts(err);
      if (conflicts !== null) {
        setPendingConflict({
          kind: 'weekly',
          label: 'Cập nhật lịch làm việc hằng tuần',
          conflicts,
        });
        return;
      }
      toast.error(getApiErrorMessage(err, 'Không thể lưu lịch làm việc.'));
    } finally {
      setSavingWeekly(false);
    }
  };

  const executeSaveException = async (
    payload: { exceptionDate: string; dayOff: boolean; customShifts: ScheduleShiftItem[]; reason?: string },
    force: boolean,
  ): Promise<boolean> => {
    const prevExceptions = exceptions;
    try {
      setSavingException(true);
      const savedEx = await doctorScheduleService.upsertException({ ...payload, force });
      setExceptions((curr) => {
        const filtered = curr.filter((item) => item.exceptionDate.slice(0, 10) !== savedEx.exceptionDate.slice(0, 10));
        return [...filtered, savedEx].sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate));
      });
      setPendingConflict(null);
      setSlotsRefreshTick((t) => t + 1);
      toast.success(payload.dayOff ? 'Đã đánh dấu ngày nghỉ.' : 'Đã lưu khung giờ riêng cho ngày đã chọn.');
      return true;
    } catch (err) {
      const conflicts = extractScheduleConflicts(err);
      if (conflicts !== null) {
        setPendingConflict({
          kind: 'exception',
          label: payload.dayOff
            ? `Đánh dấu nghỉ ngày ${payload.exceptionDate}`
            : `Đổi khung giờ ngày ${payload.exceptionDate}`,
          conflicts,
          exceptionPayload: payload,
        });
        return false;
      }
      setExceptions(prevExceptions);
      toast.error(getApiErrorMessage(err, 'Không thể lưu ngày ngoại lệ.'));
      return false;
    } finally {
      setSavingException(false);
    }
  };

  const handleDeleteException = async (exceptionId: string) => {
    const prev = exceptions;
    setExceptions((curr) => curr.filter((e) => e.id !== exceptionId));
    try {
      await doctorScheduleService.deleteException(exceptionId);
      setSlotsRefreshTick((t) => t + 1);
      toast.success('Đã khôi phục ngày này về lịch hằng tuần.');
    } catch (err) {
      setExceptions(prev);
      toast.error(getApiErrorMessage(err, 'Không thể xóa ngày ngoại lệ.'));
    }
  };

  // Preview sidebar calculation
  const viewKey = DAYS.find((d) => d.js === viewDate.getDay())!.key;
  const viewDateStr = formatLocalDate(viewDate);
  const viewException = exceptionByDate.get(viewDateStr) ?? null;
  const savedDayEnabled = viewException
    ? !viewException.dayOff
    : Boolean(saved?.plan[viewKey].enabled);

  useEffect(() => {
    if (!user?.id || !savedDayEnabled) {
      setDaySlots(null);
      return;
    }
    let cancelled = false;
    setDaySlotsLoading(true);
    doctorScheduleService
      .getDoctorDaySlots(user.id, viewDateStr)
      .then((list) => !cancelled && setDaySlots(list))
      .catch(() => !cancelled && setDaySlots([]))
      .finally(() => !cancelled && setDaySlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id, viewDateStr, savedDayEnabled, slotsRefreshTick]);

  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.scheduledStart.slice(0, 10) === viewDateStr && a.status !== 'CANCELLED'),
    [appointments, viewDateStr],
  );

  const dayRows = useMemo(() => {
    const rows = new Map<string, { time: string; apt?: DoctorAppointmentSummary }>();
    if (dirty && !viewException && activeTab === 'weekly') {
      // Live preview from unsaved draft ranges
      if (plan[viewKey].enabled && !errors[viewKey]) {
        generatePreviewTimeSlots(plan[viewKey].ranges, duration, buffer).forEach((t) =>
          rows.set(t, { time: t }),
        );
      }
    } else {
      (daySlots || []).forEach((s) => rows.set(hm(s.startTime), { time: hm(s.startTime) }));
    }
    dayAppointments.forEach((a) => {
      const t = new Date(a.scheduledStart).toTimeString().slice(0, 5);
      rows.set(t, { time: t, apt: a });
    });
    return [...rows.values()].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }, [daySlots, dayAppointments, dirty, viewException, activeTab, plan, viewKey, errors, duration, buffer]);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const bookedThisWeek = appointments.filter((a) => {
    const t = new Date(a.scheduledStart).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime() && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW';
  }).length;

  const savedWeeklyCount = useMemo(() => {
    if (!saved) return 0;
    return DAYS.reduce(
      (s, d) =>
        s +
        (saved.plan[d.key].enabled
          ? saved.plan[d.key].ranges.reduce((x, r) => x + slotsInRange(r, saved.duration, saved.buffer), 0)
          : 0),
      0,
    );
  }, [saved]);

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
      {/* Page Header & Dirty-State Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Cài đặt lịch làm việc</h1>
          <p className="mt-1.5 text-slate-600 text-sm sm:text-base">
            Thiết lập khung giờ khám hằng tuần, thời gian nghỉ giữa ca và ngày nghỉ ngoại lệ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Có thay đổi chưa lưu
            </span>
          )}
          <Button
            variant="secondary"
            disabled={!dirty || savingWeekly}
            onClick={() => saved && (setPlan(saved.plan), setDuration(saved.duration), setBuffer(saved.buffer))}
          >
            Hủy thay đổi
          </Button>
          <Button
            loading={savingWeekly}
            disabled={!dirty || Object.keys(errors).length > 0 || savingWeekly}
            onClick={() => executeSaveWeekly(false)}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Cal.com Style Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70" role="tablist" aria-label="Phân mục lịch làm việc">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'weekly'}
            onClick={() => setActiveTab('weekly')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'weekly'
                ? 'bg-white text-teal-800 shadow-clinical-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <CalendarDays className="w-4 h-4" aria-hidden />
            <span>Lịch hàng tuần</span>
            <Badge tone={activeTab === 'weekly' ? 'teal' : 'neutral'}>{activeDaysCount}/7</Badge>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'exceptions'}
            onClick={() => setActiveTab('exceptions')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'exceptions'
                ? 'bg-white text-teal-800 shadow-clinical-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <CalendarOff className="w-4 h-4" aria-hidden />
            <span>Ngày nghỉ & Ngoại lệ</span>
            <Badge tone={exceptions.length > 0 ? 'danger' : 'neutral'}>{exceptions.length}</Badge>
          </button>
        </div>

        {activeTab === 'weekly' && (
          <button
            type="button"
            onClick={applyStandardPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50/40 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden />
            Mẫu hành chính (T2–T6)
          </button>
        )}
      </div>

      {activeTab === 'exceptions' ? (
        <ScheduleExceptionsTab
          exceptions={exceptions}
          slotDurationMinutes={duration}
          bufferTimeMinutes={buffer}
          savingException={savingException}
          onSaveException={(payload) => executeSaveException(payload, false)}
          onDeleteException={handleDeleteException}
          onInspectDate={(dateStr) => {
            const d = new Date(`${dateStr}T00:00:00`);
            if (!Number.isNaN(d.getTime())) setViewDate(d);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_348px] gap-5 items-start">
          {/* Weekly Schedule Editor */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Lịch hằng tuần</h2>
                <p className="text-sm text-slate-500 tabular-nums">
                  {weeklyTotalSlots} ca mở mỗi tuần · {duration}′ khám / {buffer}′ nghỉ chuyển ca
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Thời lượng ca</span>
                  <div className="inline-flex p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Thời lượng mỗi ca">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={duration === d}
                        onClick={() => setDuration(d)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums',
                          duration === d ? 'bg-white text-teal-800 font-semibold shadow-clinical-sm' : 'text-slate-600 hover:text-slate-900',
                        )}
                      >
                        {d}′
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Nghỉ giữa ca</span>
                  <div className="inline-flex p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Thời gian nghỉ giữa ca">
                    {BUFFER_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={buffer === b}
                        onClick={() => setBuffer(b)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums',
                          buffer === b ? 'bg-white text-teal-800 font-semibold shadow-clinical-sm' : 'text-slate-600 hover:text-slate-900',
                        )}
                      >
                        {b}′
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {DAYS.map(({ key, label }) => {
                const p = plan[key];
                const dayError = errors[key];
                const warn = outsideWarnings[key];

                return (
                  <li
                    key={key}
                    data-testid={`schedule-day-${key}`}
                    className={cn('px-5 sm:px-6 py-4 transition-colors', warn && 'bg-amber-50/45', dayError && 'bg-rose-50/35')}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 md:items-start">
                      <label className="flex items-center gap-3 cursor-pointer pt-1.5 select-none">
                        <span className="relative inline-flex shrink-0">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={p.enabled}
                            aria-label={`Bật lịch ${label}`}
                            onChange={(e) =>
                              updateDay(key, (d) => ({
                                enabled: e.target.checked,
                                ranges: e.target.checked && d.ranges.length === 0 ? [{ start: '08:00', end: '12:00' }] : d.ranges,
                              }))
                            }
                          />
                          <span className="w-10 h-6 rounded-full bg-slate-300 peer-checked:bg-teal-600 transition-colors" />
                          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                        </span>
                        <span className={cn('text-sm font-semibold', p.enabled ? 'text-slate-900' : 'text-slate-400')}>{label}</span>
                      </label>

                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {!p.enabled ? (
                          <span className="pt-1.5 text-sm text-slate-500">Nghỉ định kỳ</span>
                        ) : (
                          <>
                            {p.ranges.map((r, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-xl border bg-white transition-colors',
                                  dayError ? 'border-rose-300' : 'border-slate-300 focus-within:border-teal-500',
                                )}
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400 mr-0.5 shrink-0" aria-hidden />
                                <TimeSelect
                                  value={r.start}
                                  ariaLabel={`${label} ca ${i + 1} bắt đầu`}
                                  invalid={Boolean(dayError)}
                                  onChange={(val) =>
                                    updateDay(key, (d) => ({
                                      ...d,
                                      ranges: d.ranges.map((x, j) => (j === i ? { ...x, start: val } : x)),
                                    }))
                                  }
                                />
                                <span className="text-slate-400 text-xs">–</span>
                                <TimeSelect
                                  value={r.end}
                                  ariaLabel={`${label} ca ${i + 1} kết thúc`}
                                  invalid={Boolean(dayError)}
                                  onChange={(val) =>
                                    updateDay(key, (d) => ({
                                      ...d,
                                      ranges: d.ranges.map((x, j) => (j === i ? { ...x, end: val } : x)),
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDay(key, (d) => ({
                                      ...d,
                                      ranges: d.ranges.filter((_, j) => j !== i),
                                    }))
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  aria-label={`Xóa khung ${r.start}–${r.end} của ${label}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              aria-label={`Thêm khung giờ ${label}`}
                              onClick={() =>
                                updateDay(key, (d) => {
                                  const last = d.ranges[d.ranges.length - 1];
                                  const next =
                                    last && toMinutes(last.end) < toMinutes('13:30')
                                      ? { start: '13:30', end: '17:00' }
                                      : { start: '18:00', end: '20:00' };
                                  return { ...d, ranges: [...d.ranges, next] };
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-teal-400 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden /> Thêm ca
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-1 shrink-0">
                        {p.enabled && (
                          <CopyToDaysPopover
                            sourceDay={key}
                            sourceLabel={label}
                            disabled={p.ranges.length === 0 || Boolean(dayError)}
                            onApply={(targets) => applyCopyToDays(key, targets)}
                          />
                        )}
                        <span className="text-xs font-semibold text-slate-500 w-12 text-right tabular-nums">
                          {p.enabled ? `${perDayCount(key)} ca` : '—'}
                        </span>
                      </div>
                    </div>

                    {dayError && (
                      <p role="alert" className="mt-2 md:ml-[152px] text-xs font-semibold text-rose-700">
                        {dayError}
                      </p>
                    )}

                    {warn && !dayError && (
                      <p className="mt-3 md:ml-[152px] flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs sm:text-sm text-amber-900">
                        <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden />
                        <span>
                          {warn.length} lịch hẹn sắp tới vào {label.toLowerCase()} nằm ngoài khung giờ này (
                          {warn
                            .slice(0, 3)
                            .map(
                              (a) =>
                                `${new Date(a.scheduledStart).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })} ${new Date(a.scheduledStart).toTimeString().slice(0, 5)}`,
                            )
                            .join(', ')}
                          ). Hệ thống sẽ hiện hộp thoại xác nhận khi bạn bấm Lưu thay đổi.
                        </span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl text-xs sm:text-sm text-slate-600">
              Thay đổi khung giờ áp dụng ngay cho lượt đặt mới và tự động trừ {buffer} phút nghỉ chuyển ca khi sinh lịch trống.
            </p>
          </section>

          {/* Sticky Live Day Preview & Weekly KPI */}
          <aside className="space-y-4 xl:sticky xl:top-20">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-slate-900 text-base">Xem thử khung giờ</h2>
                {dirty ? (
                  <Badge tone="warning">Xem trước bản nháp</Badge>
                ) : viewException ? (
                  <Badge tone={viewException.dayOff ? 'danger' : 'teal'}>
                    {viewException.dayOff ? 'Ngoại lệ: Nghỉ' : 'Ngoại lệ: Giờ riêng'}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Lịch tuần</Badge>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewDate((d) => new Date(d.getTime() - 86400000))}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  aria-label="Ngày trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center min-w-0">
                  <p className="font-semibold text-sm text-slate-900 capitalize truncate">
                    {viewDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {savedDayEnabled || (dirty && plan[viewKey].enabled)
                      ? `${dayAppointments.length} lịch hẹn · ${dayRows.length} khung giờ`
                      : 'Ngày nghỉ'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDate((d) => new Date(d.getTime() + 86400000))}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  aria-label="Ngày sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <ul className="mt-4 space-y-2 max-h-[380px] overflow-y-auto scrollbar-clinical pr-1">
                {daySlotsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : dayRows.length === 0 ? (
                  <li className="py-6 text-center text-sm text-slate-500 rounded-xl border border-dashed border-slate-200">
                    Không có ca khám nào mở trong ngày này.
                  </li>
                ) : (
                  dayRows.map((r) => (
                    <li
                      key={r.time}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-colors',
                        r.apt ? 'border-teal-300 bg-teal-50/70' : 'border-slate-200 bg-white',
                      )}
                    >
                      <span className="font-semibold text-slate-900 w-12 tabular-nums">{r.time}</span>
                      {r.apt ? (
                        <>
                          <span className="flex-1 min-w-0 truncate font-medium text-teal-900">{r.apt.patientName}</span>
                          <Link
                            to={`/doctor/appointments/${r.apt.id}`}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-2 shrink-0"
                          >
                            Mở
                          </Link>
                        </>
                      ) : (
                        <span className="flex-1 text-xs text-slate-500">Còn trống ({duration}′)</span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm p-5">
              <h2 className="font-display font-bold text-slate-900 text-base">Tổng quan tuần</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{bookedThisWeek}</p>
                  <p className="text-xs text-slate-500 mt-0.5">ca đã đặt tuần này</p>
                </div>
                <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                  <p className="text-2xl font-bold text-teal-800 tabular-nums">{savedWeeklyCount}</p>
                  <p className="text-xs text-teal-700 mt-0.5">ca mở mỗi tuần</p>
                </div>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-slate-600">
                Thiết lập phí khám & bằng cấp trong{' '}
                <Link to="/doctor/profile" className="font-semibold text-teal-700 underline underline-offset-2">
                  Hồ sơ bác sĩ
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      )}

      <ConflictWarningModal
        open={Boolean(pendingConflict)}
        busy={savingWeekly || savingException}
        conflicts={pendingConflict?.conflicts || []}
        contextLabel={pendingConflict?.label || ''}
        onCancel={() => setPendingConflict(null)}
        onConfirmForce={() => {
          if (!pendingConflict) return;
          if (pendingConflict.kind === 'weekly') {
            void executeSaveWeekly(true);
          } else if (pendingConflict.kind === 'exception' && pendingConflict.exceptionPayload) {
            void executeSaveException(pendingConflict.exceptionPayload, true);
          }
        }}
      />
    </div>
  );
};
