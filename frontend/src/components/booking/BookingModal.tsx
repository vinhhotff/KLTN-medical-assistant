import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Button, ErrorState, Field, Modal, Textarea } from '../ui';
import { SlotPicker, slotStart, type DoctorSlot } from './SlotPicker';
import { localDateOffset } from '../../utils/date';
import { formatVnd } from '../../utils/display';
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiError';

export interface BookableDoctor {
  id: string;
  fullName: string;
  specialties?: string[] | null;
  consultationFee?: number | null;
  hospitalAffiliation?: string | null;
}

interface BookedAppointment {
  id: string;
  appointmentCode: string;
  doctorName?: string;
  scheduledStart: string;
  feeAmount?: number | null;
}

interface BookingModalProps {
  open: boolean;
  doctor: BookableDoctor | null;
  onClose: () => void;
  /** Pre-filled, editable note shown to the doctor (e.g. triage summary). */
  initialNotes?: string;
  notesLabel?: string;
  notesHint?: React.ReactNode;
  /** Extra CreateAppointmentRequest fields. */
  extra?: { medicalDocumentId?: string | null; triageSessionId?: string | null };
  /** Opened from the triage assistant: tells the patient whether the AI triage record is linked. */
  fromTriage?: boolean;
  /** Context shown above the form, e.g. the attached document. */
  context?: React.ReactNode;
  onBooked?: (appointment: BookedAppointment) => void;
}

const NOTES_MAX = 1000;

/** Shared booking flow: real slots → optional note → POST /appointments → confirmation. */
export const BookingModal: React.FC<BookingModalProps> = ({
  open,
  doctor,
  onClose,
  initialNotes = '',
  notesLabel = 'Mô tả triệu chứng / lý do khám',
  notesHint,
  extra,
  fromTriage = false,
  context,
  onBooked,
}) => {
  const [date, setDate] = useState(() => localDateOffset(1));
  const [slot, setSlot] = useState<DoctorSlot | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [booked, setBooked] = useState<BookedAppointment | null>(null);

  useEffect(() => {
    if (open) {
      setSlot(null);
      setError(null);
      setBooked(null);
      setNotes(initialNotes);
      setSubmitting(false);
    }
  }, [open, doctor?.id, initialNotes]);

  if (!doctor) return null;

  const fee = formatVnd(doctor.consultationFee);
  const blocker = !slot ? 'Chọn một khung giờ còn trống.' : notes.length > NOTES_MAX ? `Ghi chú tối đa ${NOTES_MAX} ký tự.` : null;

  const handleSubmit = async () => {
    if (!slot || blocker || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post('/appointments', {
        doctorId: doctor.id,
        scheduledStart: slotStart(slot, date),
        notes: notes.trim() || undefined,
        medicalDocumentId: extra?.medicalDocumentId || undefined,
        triageSessionId: extra?.triageSessionId || undefined,
      });
      const appt = res.data?.data as BookedAppointment | undefined;
      if (!appt) throw new Error('empty response');
      setBooked(appt);
      onBooked?.(appt);
    } catch (err) {
      if (getApiErrorCode(err) === 'SLOT_CONFLICT') {
        setError('Khung giờ này vừa có người khác đặt. Danh sách giờ trống đã được cập nhật, vui lòng chọn giờ khác.');
        setReloadKey((k) => k + 1);
      } else {
        setError(getApiErrorMessage(err, 'Không thể đặt lịch khám. Vui lòng thử lại.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = [doctor.specialties?.filter(Boolean).join(', '), doctor.hospitalAffiliation].filter(Boolean).join(' · ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      title={booked ? 'Đặt lịch thành công' : `Đặt lịch khám với ${doctor.fullName}`}
      description={booked ? undefined : subtitle || undefined}
      size="md"
      footer={
        booked ? (
          <>
            <Link to="/patient" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-teal-700 hover:underline">
              Xem lịch hẹn của tôi
            </Link>
            <Button onClick={onClose}>Đóng</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} loading={submitting} loadingText="Đang đặt lịch..." disabledReason={blocker}>
              Xác nhận đặt khám
            </Button>
          </>
        )
      }
    >
      {booked ? (
        <div className="text-center space-y-3" data-testid="booking-success">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" aria-hidden />
          </div>
          <dl className="text-left text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mã lịch hẹn</dt>
              <dd className="font-mono font-bold text-teal-700">{booked.appointmentCode}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Bác sĩ</dt>
              <dd className="font-semibold text-right">{booked.doctorName || doctor.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Thời gian</dt>
              <dd className="font-semibold text-right">{new Date(booked.scheduledStart).toLocaleString('vi-VN')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Phí khám</dt>
              <dd className="font-semibold text-right">{formatVnd(booked.feeAmount) ?? fee ?? 'Thông báo tại quầy tiếp đón'}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">Vui lòng có mặt trước giờ hẹn 15 phút để làm thủ tục.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {context}
          <SlotPicker
            doctorId={doctor.id}
            date={date}
            onDateChange={setDate}
            selected={slot}
            onSelect={setSlot}
            disabled={submitting}
            reloadKey={reloadKey}
          />
          <Field
            label={notesLabel}
            htmlFor="booking-notes"
            hint={notesHint ?? `${notes.length}/${NOTES_MAX} ký tự · Bác sĩ sẽ đọc trước buổi khám.`}
            error={notes.length > NOTES_MAX ? `Tối đa ${NOTES_MAX} ký tự.` : null}
          >
            <Textarea
              id="booking-notes"
              rows={3}
              value={notes}
              disabled={submitting}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Đau ngực khi leo cầu thang 3 ngày nay, kèm khó thở nhẹ..."
            />
          </Field>
          {extra?.triageSessionId ? (
            <p className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2" data-testid="triage-link-info">
              Phiếu phân luồng AI (SBAR đầy đủ, mức độ khẩn) sẽ được đính kèm tự động cho bác sĩ.
            </p>
          ) : fromTriage ? (
            <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2" data-testid="triage-link-missing">
              Không liên kết được phiên phân luồng AI; bác sĩ sẽ chỉ thấy ghi chú của bạn.
            </p>
          ) : null}
          <p className="text-xs text-slate-600">
            Phí khám dự kiến: <strong className="text-slate-900">{fee ?? 'Bác sĩ chưa cập nhật — thông báo tại quầy'}</strong>
          </p>
          {error && <ErrorState message={error} />}
        </div>
      )}
    </Modal>
  );
};
