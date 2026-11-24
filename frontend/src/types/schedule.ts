export const DAYS = [
  { key: 'MONDAY', label: 'Thứ Hai', shortLabel: 'T2', js: 1 },
  { key: 'TUESDAY', label: 'Thứ Ba', shortLabel: 'T3', js: 2 },
  { key: 'WEDNESDAY', label: 'Thứ Tư', shortLabel: 'T4', js: 3 },
  { key: 'THURSDAY', label: 'Thứ Năm', shortLabel: 'T5', js: 4 },
  { key: 'FRIDAY', label: 'Thứ Sáu', shortLabel: 'T6', js: 5 },
  { key: 'SATURDAY', label: 'Thứ Bảy', shortLabel: 'T7', js: 6 },
  { key: 'SUNDAY', label: 'Chủ Nhật', shortLabel: 'CN', js: 0 },
] as const;

export type DayKey = (typeof DAYS)[number]['key'];

export const DURATIONS = [15, 20, 30, 45, 60] as const;
export const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30] as const;

export interface TimeRange {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface DayPlan {
  enabled: boolean;
  ranges: TimeRange[];
}

export type WeeklyPlan = Record<DayKey, DayPlan>;

export interface ScheduleShiftItem {
  startTime: string;
  endTime: string;
}

export interface ScheduleExceptionItem {
  id: string;
  exceptionDate: string; // YYYY-MM-DD
  dayOff: boolean;
  customShifts: ScheduleShiftItem[];
  reason?: string | null;
  createdAt?: string;
}

export interface ScheduleConflictItem {
  appointmentId: string;
  appointmentCode: string;
  patientName: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  status: string;
  reason?: string;
}

export interface ScheduleConfigRow {
  id?: string;
  dayOfWeek: DayKey | number;
  dayOfWeekIndex?: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  bufferTimeMinutes?: number;
  active?: boolean;
  isAvailable?: boolean;
}

export interface DoctorScheduleBundle {
  slotDurationMinutes: number;
  bufferTimeMinutes: number;
  weeklySlots: ScheduleConfigRow[];
  exceptions: ScheduleExceptionItem[];
  warnings?: ScheduleConflictItem[];
}

export interface SlotItem {
  startTime: string;
  endTime?: string;
  available?: boolean;
  isAvailable?: boolean;
}

export interface DoctorAppointmentSummary {
  id: string;
  appointmentCode?: string;
  patientName: string;
  scheduledStart: string;
  scheduledEnd?: string;
  status: string;
}

export const hm = (t?: string | null): string => (t ? t.slice(0, 5) : '');

export const toMinutes = (t?: string | null): number => {
  if (!t) return 0;
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

export const emptyWeeklyPlan = (): WeeklyPlan =>
  Object.fromEntries(DAYS.map((d) => [d.key, { enabled: false, ranges: [] }])) as unknown as WeeklyPlan;

export function normalizeDayKey(raw: DayKey | number): DayKey | null {
  if (typeof raw === 'number') {
    return DAYS.find((d) => d.js === raw)?.key ?? null;
  }
  return DAYS.some((d) => d.key === raw) ? raw : null;
}

/** Merge contiguous rows (legacy 30m chunks) back into clean shift ranges. */
export function mergeWeeklyConfigRows(configs: ScheduleConfigRow[]): {
  plan: WeeklyPlan;
  duration: number;
  buffer: number;
} {
  const plan = emptyWeeklyPlan();
  const durCount = new Map<number, number>();
  let detectedBuffer = 0;

  DAYS.forEach(({ key }) => {
    const rows = configs
      .filter((c) => normalizeDayKey(c.dayOfWeek) === key && (c.active ?? c.isAvailable ?? true))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const ranges: TimeRange[] = [];
    rows.forEach((r) => {
      const dur = r.slotDurationMinutes && r.slotDurationMinutes > 0 ? r.slotDurationMinutes : 30;
      durCount.set(dur, (durCount.get(dur) || 0) + 1);
      if (typeof r.bufferTimeMinutes === 'number' && r.bufferTimeMinutes >= 0) {
        detectedBuffer = r.bufferTimeMinutes;
      }
      const last = ranges[ranges.length - 1];
      if (last && toMinutes(last.end) === toMinutes(r.startTime)) {
        last.end = hm(r.endTime);
      } else {
        ranges.push({ start: hm(r.startTime), end: hm(r.endTime) });
      }
    });
    plan[key] = { enabled: ranges.length > 0, ranges };
  });

  const mostFrequentDur = [...durCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 30;
  const duration = (DURATIONS as readonly number[]).includes(mostFrequentDur) ? mostFrequentDur : 30;
  const buffer = (BUFFER_OPTIONS as readonly number[]).includes(detectedBuffer) ? detectedBuffer : 0;

  return { plan, duration, buffer };
}

export function slotsInRange(r: TimeRange, durationMinutes: number, bufferMinutes = 0): number {
  const startMin = toMinutes(r.start);
  const endMin = toMinutes(r.end);
  const dur = Math.max(5, durationMinutes);
  const buf = Math.max(0, bufferMinutes);
  if (endMin - startMin < dur) return 0;
  let count = 0;
  let cur = startMin;
  while (cur + dur <= endMin) {
    count += 1;
    cur += dur + buf;
  }
  return count;
}

export function validateRanges(ranges: TimeRange[], durationMinutes: number): string | null {
  if (!ranges || ranges.length === 0) {
    return 'Thêm ít nhất một khung giờ hoặc tắt ngày này.';
  }
  const sorted = [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (!r.start || !r.end || toMinutes(r.end) <= toMinutes(r.start)) {
      return 'Giờ kết thúc phải sau giờ bắt đầu.';
    }
    if (toMinutes(r.end) - toMinutes(r.start) < durationMinutes) {
      return `Khung ${r.start}–${r.end} ngắn hơn thời lượng một ca (${durationMinutes} phút).`;
    }
    if (i > 0 && toMinutes(r.start) < toMinutes(sorted[i - 1].end)) {
      return `Các khung giờ đang chồng chéo (${sorted[i - 1].start}–${sorted[i - 1].end} và ${r.start}–${r.end}).`;
    }
  }
  return null;
}

export function generatePreviewTimeSlots(ranges: TimeRange[], durationMinutes: number, bufferMinutes: number): string[] {
  const result = new Set<string>();
  const dur = Math.max(5, durationMinutes);
  const buf = Math.max(0, bufferMinutes);
  ranges.forEach((r) => {
    let cur = toMinutes(r.start);
    const end = toMinutes(r.end);
    while (cur + dur <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0');
      const mm = String(cur % 60).padStart(2, '0');
      result.add(`${hh}:${mm}`);
      cur += dur + buf;
    }
  });
  return [...result].sort();
}
