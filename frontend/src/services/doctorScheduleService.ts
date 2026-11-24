import { api } from './api';
import { getApiErrorCode, getApiErrorStatus } from '../utils/apiError';
import {
  DAYS,
  DoctorScheduleBundle,
  ScheduleConflictItem,
  ScheduleExceptionItem,
  ScheduleShiftItem,
  SlotItem,
  WeeklyPlan,
} from '../types/schedule';

interface ConflictErrorResponse {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        details?: {
          conflictCount?: number;
          conflicts?: ScheduleConflictItem[];
        };
      };
    };
  };
}

export function extractScheduleConflicts(err: unknown): ScheduleConflictItem[] | null {
  const status = getApiErrorStatus(err);
  const code = getApiErrorCode(err);
  if (status !== 409 && code !== 'SCHEDULE_CONFLICT_WARNING') {
    return null;
  }
  const details = (err as ConflictErrorResponse)?.response?.data?.error?.details;
  if (Array.isArray(details?.conflicts) && details.conflicts.length > 0) {
    return details.conflicts;
  }
  return [];
}

export interface SaveWeeklySchedulePayload {
  plan: WeeklyPlan;
  slotDurationMinutes: number;
  bufferTimeMinutes: number;
  force?: boolean;
}

export interface UpsertExceptionPayload {
  exceptionDate: string;
  dayOff: boolean;
  customShifts: ScheduleShiftItem[];
  reason?: string;
  force?: boolean;
}

export const doctorScheduleService = {
  async getScheduleBundle(): Promise<DoctorScheduleBundle> {
    try {
      const res = await api.get('/doctors/me/schedule-config');
      const d = res.data?.data;
      if (d && Array.isArray(d.weeklySlots)) {
        return {
          slotDurationMinutes: d.slotDurationMinutes ?? 30,
          bufferTimeMinutes: d.bufferTimeMinutes ?? 0,
          weeklySlots: d.weeklySlots,
          exceptions: Array.isArray(d.exceptions) ? d.exceptions : [],
          warnings: Array.isArray(d.warnings) ? d.warnings : [],
        };
      }
    } catch (err) {
      const status = getApiErrorStatus(err);
      if (status !== 404 && status !== 405) {
        throw err;
      }
    }

    // Legacy fallback if schedule-config endpoint is unavailable
    const [sRes, eRes] = await Promise.all([
      api.get('/doctors/me/schedules'),
      api.get('/doctors/me/schedules/exceptions').catch(() => null),
    ]);
    return {
      slotDurationMinutes: 30,
      bufferTimeMinutes: 0,
      weeklySlots: Array.isArray(sRes.data?.data) ? sRes.data.data : [],
      exceptions: Array.isArray(eRes?.data?.data) ? eRes!.data.data : [],
      warnings: [],
    };
  },

  async saveWeeklySchedule(payload: SaveWeeklySchedulePayload): Promise<DoctorScheduleBundle> {
    const slots = DAYS.flatMap(({ key }) =>
      payload.plan[key].enabled
        ? payload.plan[key].ranges.map((r) => ({
            dayOfWeek: key,
            startTime: `${r.start}:00`,
            endTime: `${r.end}:00`,
            slotDurationMinutes: payload.slotDurationMinutes,
            active: true,
          }))
        : [],
    );

    const body = {
      slots,
      slotDurationMinutes: payload.slotDurationMinutes,
      bufferTimeMinutes: payload.bufferTimeMinutes,
      force: Boolean(payload.force),
    };

    try {
      const res = await api.put('/doctors/me/schedule-config', body);
      const d = res.data?.data;
      if (d && Array.isArray(d.weeklySlots)) {
        return {
          slotDurationMinutes: d.slotDurationMinutes ?? payload.slotDurationMinutes,
          bufferTimeMinutes: d.bufferTimeMinutes ?? payload.bufferTimeMinutes,
          weeklySlots: d.weeklySlots,
          exceptions: Array.isArray(d.exceptions) ? d.exceptions : [],
          warnings: Array.isArray(d.warnings) ? d.warnings : [],
        };
      }
    } catch (err) {
      const status = getApiErrorStatus(err);
      if (status !== 404 && status !== 405) {
        throw err;
      }
    }

    const legacyRes = await api.put('/doctors/me/schedules', body);
    return {
      slotDurationMinutes: payload.slotDurationMinutes,
      bufferTimeMinutes: payload.bufferTimeMinutes,
      weeklySlots: Array.isArray(legacyRes.data?.data) ? legacyRes.data.data : [],
      exceptions: [],
      warnings: [],
    };
  },

  async getExceptions(includePast = false): Promise<ScheduleExceptionItem[]> {
    const res = await api.get('/doctors/me/schedules/exceptions', {
      params: { includePast },
    });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },

  async upsertException(payload: UpsertExceptionPayload): Promise<ScheduleExceptionItem> {
    const res = await api.post('/doctors/me/schedules/exceptions', {
      exceptionDate: payload.exceptionDate,
      dayOff: payload.dayOff,
      customShifts: payload.dayOff ? [] : payload.customShifts,
      reason: payload.reason?.trim() || null,
      force: Boolean(payload.force),
    });
    return res.data?.data;
  },

  async deleteException(exceptionId: string): Promise<void> {
    await api.delete(`/doctors/me/schedules/exceptions/${exceptionId}`);
  },

  async getDoctorDaySlots(doctorId: string, date: string): Promise<SlotItem[]> {
    const res = await api.get(`/doctors/${doctorId}/slots`, { params: { date } });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },
};
