import React, { useEffect } from 'react';
import { Video, X, MessageSquare } from 'lucide-react';
import { ConsultationChatPanel } from './ConsultationChatPanel';
import type { TelehealthAppointmentRef } from './telehealthTypes';

interface ConsultationChatModalProps {
  open: boolean;
  appointment: TelehealthAppointmentRef | null;
  currentUserId?: string;
  currentUserRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN' | string;
  onClose: () => void;
  onOpenVideoRoom?: (appointment: TelehealthAppointmentRef) => void;
}

export const ConsultationChatModal: React.FC<ConsultationChatModalProps> = ({
  open,
  appointment,
  currentUserId,
  currentUserRole,
  onClose,
  onOpenVideoRoom,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !appointment) return null;

  const isDoctor = currentUserRole === 'DOCTOR';
  const partnerName = isDoctor
    ? appointment.patientName || 'Bệnh nhân'
    : appointment.doctorName
    ? `BS. ${appointment.doctorName}`
    : 'Bác sĩ';
  const canStartVideo =
    appointment.consultationType === 'ONLINE' &&
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'NO_SHOW';

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Trao đổi trực tuyến với bác sĩ"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md h-[85vh] sm:h-[620px] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-teal-300">
                  {appointment.appointmentCode}
                </span>
                {appointment.meetingRoomCode && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                    {appointment.meetingRoomCode}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold truncate">{partnerName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canStartVideo && onOpenVideoRoom && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoRoom(appointment);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Call</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              aria-label="Đóng khung chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 min-h-0 p-3 bg-slate-100/70 flex flex-col">
          <ConsultationChatPanel
            appointmentId={appointment.id}
            currentUserId={currentUserId}
            partnerName={partnerName}
            disabled={appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW'}
            showHeader={false}
            theme="light"
            className="flex-1 min-h-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
