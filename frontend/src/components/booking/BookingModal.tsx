import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, CreditCard, Video } from 'lucide-react';
import { api, EMAIL_NOT_VERIFIED_TOOLTIP } from '../../services/api';
import { useEmailVerification } from '../../hooks/useEmailVerification';
import { EmailNotVerifiedHint } from '../common/EmailNotVerifiedHint';
import { Button, ErrorState, Field, Modal, Textarea } from '../ui';
import { SlotPicker, slotStart, type DoctorSlot } from './SlotPicker';
import { localDateOffset } from '../../utils/date';
import { formatVnd } from '../../utils/display';
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiError';

export type ConsultationType = 'IN_PERSON' | 'ONLINE';

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
  paymentStatus?: string;
  consultationType?: ConsultationType;
  meetingRoomCode?: string | null;
  meetingUrl?: string | null;
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
  /** Optional default consultation mode when opening the modal. */
  initialConsultationType?: ConsultationType;
  onBooked?: (appointment: BookedAppointment) => void;
}

const NOTES_MAX = 1000;

/** Shared booking flow: real slots → consultation mode → optional note → POST /appointments → confirmation & Stripe checkout. */
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
  initialConsultationType = 'IN_PERSON',
  onBooked,
}) => {
  const [date, setDate] = useState(() => localDateOffset(1));
  const [slot, setSlot] = useState<DoctorSlot | null>(null);
  const [consultationType, setConsultationType] = useState<ConsultationType>(initialConsultationType);
  const [notes, setNotes] = useState(initialNotes);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [booked, setBooked] = useState<BookedAppointment | null>(null);
  const { isUnverified } = useEmailVerification();

  useEffect(() => {
    if (open) {
      setSlot(null);
      setConsultationType(initialConsultationType);
      setError(null);
      setPaymentError(null);
      setBooked(null);
      setNotes(initialNotes);
      setSubmitting(false);
      setPaying(false);
    }
  }, [open, doctor?.id, initialNotes, initialConsultationType]);

  if (!doctor) return null;

  const fee = formatVnd(doctor.consultationFee);
  const blocker = isUnverified
    ? EMAIL_NOT_VERIFIED_TOOLTIP
    : !slot
    ? 'Chọn một khung giờ còn trống.'
    : notes.length > NOTES_MAX
    ? `Ghi chú tối đa ${NOTES_MAX} ký tự.`
    : null;

  const handleSubmit = async () => {
    if (!slot || blocker || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post('/appointments', {
        doctorId: doctor.id,
        scheduledStart: slotStart(slot, date),
        consultationType,
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

  const handleCheckoutNow = async () => {
    if (!booked || paying || isUnverified) return;
    try {
      setPaying(true);
      setPaymentError(null);
      const res = await api.post('/payments/checkout', {
        orderType: 'APPOINTMENT_FEE',
        appointmentId: booked.id,
        paymentMethod: 'STRIPE',
      });
      const checkoutUrl = res.data?.data?.checkoutUrl as string | undefined;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setPaymentError('Cổng thanh toán không trả về đường dẫn thanh toán. Bạn có thể thanh toán lại từ Bảng điều khiển.');
    } catch (err) {
      setPaymentError(getApiErrorMessage(err, 'Không thể khởi tạo phiên thanh toán Stripe.'));
    } finally {
      setPaying(false);
    }
  };

  const subtitle = [doctor.specialties?.filter(Boolean).join(', '), doctor.hospitalAffiliation].filter(Boolean).join(' · ');
  const bookedType: ConsultationType = booked?.consultationType || consultationType;
  const effectiveFeeAmount = booked?.feeAmount ?? doctor.consultationFee ?? 0;
  const canPayOnline = Boolean(booked && effectiveFeeAmount > 0 && booked.paymentStatus !== 'PAID' && !isUnverified);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting || paying}
      title={booked ? 'Đặt lịch thành công' : `Đặt lịch khám với ${doctor.fullName}`}
      description={booked ? undefined : subtitle || undefined}
      size="md"
      footer={
        booked ? (
          <>
            <Link to="/patient" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-teal-700 hover:underline">
              Xem lịch hẹn của tôi
            </Link>
            {canPayOnline && (
              <Button
                onClick={handleCheckoutNow}
                loading={paying}
                loadingText="Đang kết nối Stripe..."
                icon={<CreditCard className="w-4 h-4" />}
              >
                Thanh toán ngay (Stripe)
              </Button>
            )}
            <Button variant={canPayOnline ? 'secondary' : 'primary'} onClick={onClose} disabled={paying}>
              Đóng
            </Button>
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
          <dl className="text-left text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mã lịch hẹn</dt>
              <dd className="font-mono font-bold text-teal-700">{booked.appointmentCode}</dd>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <dt className="text-slate-500">Hình thức khám</dt>
              <dd>
                {bookedType === 'ONLINE' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Video className="w-3.5 h-3.5" /> Khám Online (Video Call &amp; Chat)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    <Building2 className="w-3.5 h-3.5" /> Khám Trực Tiếp Tại Phòng Khám
                  </span>
                )}
              </dd>
            </div>
            {bookedType === 'ONLINE' && booked.meetingRoomCode && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Mã phòng Video</dt>
                <dd className="font-mono font-bold text-indigo-700">{booked.meetingRoomCode}</dd>
              </div>
            )}
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
          {paymentError && <ErrorState message={paymentError} />}
          <p className="text-xs text-slate-500">
            {bookedType === 'ONLINE'
              ? 'Lịch khám Online đã sẵn sàng. Bạn có thể nhắn tin trao đổi trước hoặc vào Phòng Khám Video Call trong Bảng điều khiển Bệnh nhân.'
              : 'Vui lòng có mặt trước giờ hẹn 15 phút để làm thủ tục.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {isUnverified && <EmailNotVerifiedHint className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2" />}
          {context}

          {/* Consultation Type Selector */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700">Hình thức khám</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Hình thức khám">
              <button
                type="button"
                role="radio"
                aria-checked={consultationType === 'IN_PERSON'}
                disabled={submitting}
                onClick={() => setConsultationType('IN_PERSON')}
                className={`text-left p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                  consultationType === 'IN_PERSON'
                    ? 'border-teal-600 bg-teal-50/70 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${consultationType === 'IN_PERSON' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Khám Trực Tiếp Tại Phòng Khám</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Gặp bác sĩ tại cơ sở y tế, nhận phiếu QR &amp; STT.</p>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={consultationType === 'ONLINE'}
                disabled={submitting}
                onClick={() => setConsultationType('ONLINE')}
                className={`text-left p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                  consultationType === 'ONLINE'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${consultationType === 'ONLINE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Khám Online (Video Call &amp; Chat)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Tư vấn từ xa qua Video HD &amp; nhắn tin trực tiếp.</p>
                </div>
              </button>
            </div>
          </div>

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
