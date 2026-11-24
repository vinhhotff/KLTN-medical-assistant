import React, { useMemo, useState } from 'react';
import { CalendarOff, CalendarRange, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react';
import {
  ScheduleExceptionItem,
  TimeRange,
  generatePreviewTimeSlots,
  hm,
  toMinutes,
  validateRanges,
} from '../../../types/schedule';
import { formatLocalDate, todayLocal } from '../../../utils/date';
import { Badge, Button, cn } from '../../ui';
import { TimeSelect } from './TimeSelect';

interface ScheduleExceptionsTabProps {
  exceptions: ScheduleExceptionItem[];
  slotDurationMinutes: number;
  bufferTimeMinutes: number;
  savingException: boolean;
  onSaveException: (payload: {
    exceptionDate: string;
    dayOff: boolean;
    customShifts: { startTime: string; endTime: string }[];
    reason?: string;
  }) => Promise<boolean>;
  onDeleteException: (id: string) => Promise<void>;
  onInspectDate: (dateStr: string) => void;
}

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getMonthCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const ScheduleExceptionsTab: React.FC<ScheduleExceptionsTabProps> = ({
  exceptions,
  slotDurationMinutes,
  bufferTimeMinutes,
  savingException,
  onSaveException,
  onDeleteException,
  onInspectDate,
}) => {
  const todayStr = todayLocal();
  const [cursorMonth, setCursorMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dayOff, setDayOff] = useState<boolean>(true);
  const [customShifts, setCustomShifts] = useState<TimeRange[]>([{ start: '08:00', end: '12:00' }]);
  const [reason, setReason] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const exceptionMap = useMemo(() => {
    const map = new Map<string, ScheduleExceptionItem>();
    exceptions.forEach((ex) => map.set(ex.exceptionDate.slice(0, 10), ex));
    return map;
  }, [exceptions]);

  const currentExisting = exceptionMap.get(selectedDate) ?? null;

  const selectCalendarDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    onInspectDate(dateStr);
    const ex = exceptionMap.get(dateStr);
    if (ex) {
      setDayOff(ex.dayOff);
      setCustomShifts(
        !ex.dayOff && ex.customShifts.length > 0
          ? ex.customShifts.map((s) => ({ start: hm(s.startTime), end: hm(s.endTime) }))
          : [{ start: '08:00', end: '12:00' }],
      );
      setReason(ex.reason || '');
    } else {
      setDayOff(true);
      setCustomShifts([{ start: '08:00', end: '12:00' }]);
      setReason('');
    }
  };

  const monthCells = useMemo(
    () => getMonthCells(cursorMonth.getFullYear(), cursorMonth.getMonth()),
    [cursorMonth],
  );

  const shiftValidationError = useMemo(() => {
    if (dayOff) return null;
    return validateRanges(customShifts, slotDurationMinutes);
  }, [dayOff, customShifts, slotDurationMinutes]);

  const previewSlotsCount = useMemo(() => {
    if (dayOff || shiftValidationError) return 0;
    return generatePreviewTimeSlots(customShifts, slotDurationMinutes, bufferTimeMinutes).length;
  }, [dayOff, shiftValidationError, customShifts, slotDurationMinutes, bufferTimeMinutes]);

  const handleSave = async () => {
    if (savingException || shiftValidationError) return;
    await onSaveException({
      exceptionDate: selectedDate,
      dayOff,
      customShifts: dayOff
        ? []
        : customShifts.map((s) => ({ startTime: hm(s.start), endTime: hm(s.end) })),
      reason,
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteException(id);
      if (currentExisting?.id === id) {
        setDayOff(true);
        setCustomShifts([{ start: '08:00', end: '12:00' }]);
        setReason('');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const selectedDateDisplay = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? selectedDate
      : d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
      {/* Left: Calendar Picker */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm p-5">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <h2 className="font-display text-base font-bold text-slate-900 capitalize">
            {cursorMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => setCursorMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => setCursorMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 pt-3 text-center">
          {WEEKDAY_HEADERS.map((h) => (
            <div key={h} className="py-1 text-xs font-semibold text-slate-500">
              {h}
            </div>
          ))}
          {monthCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }
            const dateStr = formatLocalDate(cell);
            const isPast = dateStr < todayStr;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const ex = exceptionMap.get(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => selectCalendarDate(dateStr)}
                aria-label={`Chọn ngày ${dateStr}`}
                className={cn(
                  'relative h-10 rounded-xl text-sm font-semibold tabular-nums transition-all cursor-pointer',
                  'flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
                  isPast && 'text-slate-300 cursor-not-allowed hover:bg-transparent',
                  !isPast && !isSelected && 'text-slate-800 hover:bg-slate-100',
                  !isPast && !isSelected && ex?.dayOff && 'bg-rose-50 text-rose-700 hover:bg-rose-100/80',
                  !isPast && !isSelected && ex && !ex.dayOff && 'bg-teal-50 text-teal-800 hover:bg-teal-100/80',
                  isSelected && 'bg-teal-600 text-white shadow-clinical-sm',
                  isToday && !isSelected && 'ring-1 ring-inset ring-teal-500/60',
                )}
              >
                <span>{cell.getDate()}</span>
                {ex && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      isSelected ? 'bg-white' : ex.dayOff ? 'bg-rose-500' : 'bg-teal-600',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Nghỉ cả ngày
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Đổi giờ riêng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full ring-1 ring-teal-500" /> Hôm nay
          </span>
        </div>
      </section>

      {/* Right: Selected Date Override Editor + List */}
      <div className="space-y-5">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                {currentExisting ? 'Đang chỉnh ngoại lệ đã lưu' : 'Thêm ngoại lệ theo ngày'}
              </p>
              <h3 className="mt-0.5 font-display text-lg font-bold text-slate-900 capitalize">{selectedDateDisplay}</h3>
            </div>
            {currentExisting && (
              <Button
                variant="secondary"
                size="sm"
                loading={deletingId === currentExisting.id}
                onClick={() => handleDelete(currentExisting.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" aria-hidden />
                Khôi phục lịch tuần
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Loại ngoại lệ ngày">
            <button
              type="button"
              role="radio"
              aria-checked={dayOff}
              onClick={() => setDayOff(true)}
              className={cn(
                'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                dayOff ? 'bg-white text-rose-700 shadow-clinical-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              <CalendarOff className="w-4 h-4" aria-hidden />
              Nghỉ cả ngày
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!dayOff}
              onClick={() => setDayOff(false)}
              className={cn(
                'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                !dayOff ? 'bg-white text-teal-700 shadow-clinical-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              <CalendarRange className="w-4 h-4" aria-hidden />
              Chỉnh giờ riêng
            </button>
          </div>

          {dayOff ? (
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80 text-sm text-rose-900">
              Bệnh nhân sẽ không thấy bất kỳ khung giờ trống nào vào ngày này. Bạn vẫn có thể giữ các lịch hẹn cũ hoặc liên hệ dời lịch nếu cần.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Khung giờ làm việc riêng trong ngày</span>
                <span className="text-xs text-slate-500 tabular-nums">{previewSlotsCount} ca khám khả dụng</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {customShifts.map((shift, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-xl border bg-white',
                      shiftValidationError ? 'border-rose-300' : 'border-slate-300',
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400 mr-0.5" aria-hidden />
                    <TimeSelect
                      value={shift.start}
                      ariaLabel={`Ngoại lệ ca ${idx + 1} bắt đầu`}
                      invalid={Boolean(shiftValidationError)}
                      onChange={(val) =>
                        setCustomShifts((prev) => prev.map((x, j) => (j === idx ? { ...x, start: val } : x)))
                      }
                    />
                    <span className="text-slate-400 text-xs">–</span>
                    <TimeSelect
                      value={shift.end}
                      ariaLabel={`Ngoại lệ ca ${idx + 1} kết thúc`}
                      invalid={Boolean(shiftValidationError)}
                      onChange={(val) =>
                        setCustomShifts((prev) => prev.map((x, j) => (j === idx ? { ...x, end: val } : x)))
                      }
                    />
                    {customShifts.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Xóa ca ngoại lệ ${idx + 1}`}
                        onClick={() => setCustomShifts((prev) => prev.filter((_, j) => j !== idx))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setCustomShifts((prev) => {
                      const last = prev[prev.length - 1];
                      const nextShift =
                        last && toMinutes(last.end) < toMinutes('13:30')
                          ? { start: '13:30', end: '17:00' }
                          : { start: '18:00', end: '20:00' };
                      return [...prev, nextShift];
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-teal-400 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />
                  Thêm ca
                </button>
              </div>

              {shiftValidationError && (
                <p className="text-xs font-medium text-rose-700">{shiftValidationError}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="exception-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú / Lý do (không bắt buộc)
            </label>
            <input
              id="exception-reason"
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={dayOff ? 'VD: Nghỉ phép năm, Hội thảo y khoa...' : 'VD: Trực bù ca tối, Khám ngoài giờ...'}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              onClick={handleSave}
              loading={savingException}
              disabled={Boolean(shiftValidationError)}
            >
              {currentExisting ? 'Cập nhật ngày ngoại lệ' : 'Lưu ngày ngoại lệ'}
            </Button>
          </div>
        </section>

        {/* Upcoming Exceptions List */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-clinical-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Danh sách ngày nghỉ & ngoại lệ sắp tới</h3>
              <p className="text-xs text-slate-500">Bấm vào từng ngày để chỉnh sửa nhanh hoặc khôi phục lại lịch tuần.</p>
            </div>
            <Badge tone="neutral">{exceptions.length} ngày</Badge>
          </div>

          {exceptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có ngày nghỉ phép hoặc ngoại lệ giờ khám nào. Chọn một ngày trên lịch bên trái để thiết lập.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {exceptions.map((ex) => {
                const dateObj = new Date(`${ex.exceptionDate.slice(0, 10)}T00:00:00`);
                const dateLabel = Number.isNaN(dateObj.getTime())
                  ? ex.exceptionDate
                  : dateObj.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                  <li
                    key={ex.id}
                    className={cn(
                      'px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                      selectedDate === ex.exceptionDate.slice(0, 10) ? 'bg-teal-50/50' : 'hover:bg-slate-50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectCalendarDate(ex.exceptionDate.slice(0, 10))}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 capitalize tabular-nums">{dateLabel}</span>
                        {ex.dayOff ? (
                          <Badge tone="danger">Nghỉ cả ngày</Badge>
                        ) : (
                          <Badge tone="teal">
                            {ex.customShifts.map((s) => `${hm(s.startTime)}–${hm(s.endTime)}`).join(', ')}
                          </Badge>
                        )}
                      </div>
                      {ex.reason && <p className="mt-1 text-xs text-slate-600 truncate">{ex.reason}</p>}
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === ex.id}
                      onClick={() => handleDelete(ex.id)}
                      aria-label={`Xóa ngoại lệ ngày ${ex.exceptionDate}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      Xóa
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
