import React from 'react';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { ScheduleConflictItem } from '../../../types/schedule';
import { Badge, Button, Modal } from '../../ui';

interface ConflictWarningModalProps {
  open: boolean;
  busy?: boolean;
  conflicts: ScheduleConflictItem[];
  contextLabel: string;
  onCancel: () => void;
  onConfirmForce: () => void;
}

const STATUS_LABELS: Record<string, { text: string; tone: 'teal' | 'warning' | 'neutral' }> = {
  SCHEDULED: { text: 'Đã đặt lịch', tone: 'teal' },
  CHECKED_IN: { text: 'Đã check-in', tone: 'warning' },
  IN_PROGRESS: { text: 'Đang khám', tone: 'warning' },
};

export const ConflictWarningModal: React.FC<ConflictWarningModalProps> = ({
  open,
  busy,
  conflicts,
  contextLabel,
  onCancel,
  onConfirmForce,
}) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      size="lg"
      kicker="Cảnh báo xung đột lịch khám"
      title={
        <span className="inline-flex items-center gap-2 text-slate-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
          Phát hiện {conflicts.length} lịch hẹn bị ảnh hưởng
        </span>
      }
      description={
        <span>
          Thao tác <strong className="text-slate-800">{contextLabel}</strong> làm thay đổi khung giờ chứa các ca khám bệnh nhân đã đặt trước. Các lịch hẹn này sẽ{' '}
          <strong className="text-slate-800">không tự động bị hủy</strong> — bạn cần liên hệ đổi giờ hoặc xử lý trực tiếp với bệnh nhân.
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Quay lại chỉnh sửa
          </Button>
          <Button variant="danger" onClick={onConfirmForce} loading={busy}>
            Vẫn lưu thay đổi
          </Button>
        </>
      }
    >
      <div className="space-y-3" data-testid="schedule-conflict-modal">
        <ul className="divide-y divide-slate-100 rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
          {conflicts.map((c) => {
            const d = new Date(c.scheduledStart);
            const dateStr = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = d.toTimeString().slice(0, 5);
            const badgeMeta = STATUS_LABELS[c.status] ?? { text: c.status, tone: 'neutral' as const };
            return (
              <li key={c.appointmentId} className="p-3.5 bg-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{c.patientName}</span>
                    {c.appointmentCode && (
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c.appointmentCode}</span>
                    )}
                    <Badge tone={badgeMeta.tone}>{badgeMeta.text}</Badge>
                  </div>
                  {c.reason && <p className="mt-1 text-xs text-amber-800 font-medium">{c.reason}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 shrink-0 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                    {dateStr}
                  </span>
                  <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    <Clock className="w-3.5 h-3.5" aria-hidden />
                    {timeStr}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
};
