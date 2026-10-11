import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { ErrorState, Field, Input, Skeleton, cn } from '../ui';
import { todayLocal } from '../../utils/date';
import { getApiErrorMessage } from '../../utils/apiError';

/** Mirrors backend DoctorSlotDto (Jackson exposes `isAvailable` as `available`). */
export interface DoctorSlot {
  startTime: string;
  endTime: string;
  startDateTime?: string;
  endDateTime?: string;
  scheduledStart?: string;
  available?: boolean;
  isAvailable?: boolean;
}

/** LocalDateTime string to send as scheduledStart / newScheduledStart. */
export function slotStart(slot: DoctorSlot, date: string): string {
  return slot.startDateTime || slot.scheduledStart || `${date}T${slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime}`;
}

const isSlotOpen = (slot: DoctorSlot, date: string) => {
  const available = slot.available ?? slot.isAvailable ?? false;
  if (!available) return false;
  // Slots earlier today can no longer be booked
  return new Date(slotStart(slot, date)).getTime() > Date.now();
};

interface SlotPickerProps {
  doctorId: string;
  date: string;
  onDateChange: (date: string) => void;
  selected: DoctorSlot | null;
  onSelect: (slot: DoctorSlot | null) => void;
  disabled?: boolean;
  /** Increment to force a reload (e.g. after a SLOT_CONFLICT). */
  reloadKey?: number;
  /** Slot to hide, e.g. the appointment's current time when rescheduling. */
  excludeStart?: string;
}

/** Date input + real availability from GET /doctors/{id}/slots?date=. */
export const SlotPicker: React.FC<SlotPickerProps> = ({ doctorId, date, onDateChange, selected, onSelect, disabled, reloadKey = 0, excludeStart }) => {
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const load = useCallback(async () => {
    if (!doctorId || !date) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    onSelectRef.current(null);
    try {
      const res = await api.get(`/doctors/${doctorId}/slots`, { params: { date } });
      if (id !== requestId.current) return; // a newer request superseded this one
      setSlots(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (id !== requestId.current) return;
      setSlots([]);
      setError(getApiErrorMessage(err, 'Không tải được lịch trống của bác sĩ. Vui lòng thử lại.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const visible = slots.filter((s) => !excludeStart || slotStart(s, date).slice(0, 16) !== excludeStart.slice(0, 16));
  const openCount = visible.filter((s) => isSlotOpen(s, date)).length;

  return (
    <div className="space-y-3">
      <Field label={<span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-teal-600" /> Ngày khám</span>} htmlFor="slot-date" required>
        <Input
          id="slot-date"
          type="date"
          min={todayLocal()}
          value={date}
          disabled={disabled}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
        />
      </Field>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5 inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-teal-600" /> Khung giờ còn trống
          {!loading && !error && visible.length > 0 && <span className="font-normal text-slate-500">({openCount}/{visible.length})</span>}
        </p>
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="status" aria-label="Đang tải lịch trống">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : visible.length === 0 || openCount === 0 ? (
          <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            Bác sĩ không còn khung giờ trống trong ngày này. Vui lòng chọn ngày khác.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Chọn khung giờ">
            {visible.map((s) => {
              const open = isSlotOpen(s, date);
              const isSelected = selected !== null && slotStart(selected, date) === slotStart(s, date);
              return (
                <button
                  key={slotStart(s, date)}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!open || disabled}
                  onClick={() => onSelect(s)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-semibold border transition min-h-[36px]',
                    !open
                      ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                      : isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500 hover:bg-teal-50 cursor-pointer',
                  )}
                >
                  {s.startTime.slice(0, 5)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
