import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, CalendarPlus, MapPin, QrCode, Hospital, Check, Stethoscope, FileText, MessageSquare, ExternalLink, RotateCcw } from 'lucide-react';
import { api, EMAIL_NOT_VERIFIED_MESSAGE, isEmailNotVerified } from '../../services/api';
import { Button, ErrorState, Modal, Skeleton, useToast, cn } from '../../components/ui';
import { SlotPicker, slotStart, type DoctorSlot } from '../../components/booking/SlotPicker';
import { AdmissionTicketModal } from '../../components/patient/AdmissionTicketModal';
import { getApiErrorMessage } from '../../utils/apiError';
import { datePart, todayLocal } from '../../utils/date';
import { formatVnd } from '../../utils/display';
import { APPOINTMENT_STATUS_LABEL, URGENCY_LABEL, computeRefundPreview, initialsOf, type AppointmentItem, type UrgencyLevel } from '../../types/patient';

const fmtDate = (iso: string) => {
  const s = new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Builds an .ics file client-side so the patient can add the visit to any calendar app. */
const downloadIcs = (apt: AppointmentItem) => {
  const toIcs = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`;
  };
  const end = apt.scheduledEnd || new Date(new Date(apt.scheduledStart).getTime() + 30 * 60000).toISOString();
  const location = [apt.clinicRoom && `Phòng ${apt.clinicRoom}`, apt.clinicFloor, apt.clinicBuilding, apt.clinicAddress].filter(Boolean).join(', ');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MediAssist-AI//VI',
    'BEGIN:VEVENT',
    `UID:${apt.id}@mediassist`,
    `DTSTART:${toIcs(apt.scheduledStart)}`,
    `DTEND:${toIcs(end)}`,
    `SUMMARY:Khám với ${apt.doctorName} (${apt.appointmentCode})`,
    location ? `LOCATION:${location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${apt.appointmentCode || 'lich-kham'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [apt, setApt] = useState<AppointmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showTicket, setShowTicket] = useState(false);
  const [paying, setPaying] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(todayLocal());
  const [rescheduleSlot, setRescheduleSlot] = useState<DoctorSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get('/appointments/my');
      const list: AppointmentItem[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const found = list.find((a) => a.id === id) || null;
      setApt(found);
      if (!found) setLoadError('Không tìm thấy lịch hẹn này trong tài khoản của bạn.');
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được lịch hẹn.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const daysLeft = useMemo(() => {
    if (!apt) return null;
    const start = new Date(apt.scheduledStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    return Math.round((day.getTime() - today.getTime()) / 86400000);
  }, [apt]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!apt) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={loadError || 'Không tìm thấy lịch hẹn.'} onRetry={load} retrying={loading} />
      </div>
    );
  }

  const status = APPOINTMENT_STATUS_LABEL[apt.status];
  const active = apt.status === 'SCHEDULED' || apt.status === 'CHECKED_IN';
  const canChange = apt.status === 'SCHEDULED' && (daysLeft ?? 0) >= 0;
  const done = apt.status === 'COMPLETED';
  const location = [apt.clinicRoom && `Phòng ${apt.clinicRoom}`, apt.clinicFloor, apt.clinicBuilding].filter(Boolean).join(' · ');
  const urgency = apt.triageUrgencyLevel as UrgencyLevel | undefined;
  const refundPreview = computeRefundPreview(apt.scheduledStart, apt.feeAmount, apt.paymentStatus);

  const handlePay = async () => {
    if (paying) return;
    try {
      setPaying(true);
      const res = await api.post('/payments/checkout', { orderType: 'APPOINTMENT_FEE', appointmentId: apt.id, paymentMethod: 'STRIPE' });
      const url = res.data?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error('Cổng thanh toán không trả về đường dẫn. Vui lòng thử lại sau hoặc thanh toán tại quầy.');
    } catch (err) {
      toast.error(isEmailNotVerified(err) ? EMAIL_NOT_VERIFIED_MESSAGE : getApiErrorMessage(err, 'Không thể khởi tạo thanh toán.'));
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelling) return;
    try {
      setCancelling(true);
      const res = await api.patch(`/appointments/${apt.id}/status`, { status: 'CANCELLED', notes: cancelReason.trim() });
      const updated = res.data?.data as AppointmentItem | undefined;
      if (updated?.paymentStatus === 'REFUNDED') {
        const amtText = formatVnd(updated.refundAmount) ?? '';
        toast.success(`Đã hủy lịch khám & hoàn tiền ${amtText} (${updated.refundPercentage ?? 100}%) về tài khoản thanh toán.`);
      } else if (updated?.refundPolicyNote) {
        toast.success(`Đã hủy lịch khám. ${updated.refundPolicyNote}.`);
      } else {
        toast.success('Đã hủy lịch khám.');
      }
      setCancelOpen(false);
      setCancelReason('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể hủy lịch hẹn.'));
    } finally {
      setCancelling(false);
    }
  };

  const openReschedule = () => {
    const current = datePart(apt.scheduledStart);
    setRescheduleDate(current && current >= todayLocal() ? current : todayLocal());
    setRescheduleSlot(null);
    setRescheduleReason('');
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleSlot || rescheduling) return;
    try {
      setRescheduling(true);
      await api.patch(`/appointments/${apt.id}/reschedule`, {
        newScheduledStart: slotStart(rescheduleSlot, rescheduleDate),
        reason: rescheduleReason.trim() || undefined,
      });
      toast.success('Đã đổi giờ khám.');
      setRescheduleOpen(false);
      await load();
    } catch (err) {
      toast.error(isEmailNotVerified(err) ? EMAIL_NOT_VERIFIED_MESSAGE : getApiErrorMessage(err, 'Không thể đổi giờ. Vui lòng chọn khung giờ khác.'));
    } finally {
      setRescheduling(false);
    }
  };

  const events = [
    apt.createdAt && { label: 'Đặt lịch khám', at: apt.createdAt, note: apt.triageSessionId ? 'từ kết quả trợ lý AI' : undefined },
    apt.checkedInAt && { label: 'Đã check-in tại bệnh viện', at: apt.checkedInAt },
    done && { label: 'Khám xong', at: apt.scheduledEnd || apt.scheduledStart },
    apt.status === 'CANCELLED' && { label: 'Đã hủy', at: undefined, note: apt.cancellationReason || undefined },
    apt.paymentStatus === 'REFUNDED' && {
      label: `Đã hoàn tiền${apt.refundAmount != null ? ` ${formatVnd(apt.refundAmount) ?? ''}` : ''} (${apt.refundPercentage ?? 100}%)`,
      at: apt.refundedAt || undefined,
      note: apt.refundPolicyNote || undefined,
    },
  ].filter(Boolean) as { label: string; at?: string; note?: string }[];

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Header */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-code text-indigo-800">{apt.appointmentCode}</span>
            {status && <span className={cn('px-2 py-0.5 rounded-full border text-xs font-semibold', status.className)}>{status.text}</span>}
          </div>
          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-slate-900">{fmtDate(apt.scheduledStart)}</h1>
          <p className="mt-1 text-lg">
            <span className="font-semibold text-slate-900">
              {fmtTime(apt.scheduledStart)}
              {apt.scheduledEnd && ` – ${fmtTime(apt.scheduledEnd)}`}
            </span>
            {active && daysLeft !== null && daysLeft >= 0 && (
              <span className="text-slate-600"> · {daysLeft === 0 ? 'hôm nay' : `còn ${daysLeft} ngày`}</span>
            )}
          </p>

          <div className="mt-5 flex items-center gap-3 p-4 rounded-xl bg-slate-50">
            <span className="w-11 h-11 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0">{initialsOf(apt.doctorName)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{apt.doctorName}</p>
              {apt.doctorEmail && <p className="text-sm text-slate-500 truncate">{apt.doctorEmail}</p>}
            </div>
            <Link to={`/patient/doctors?doctorId=${encodeURIComponent(apt.doctorId)}`} className="text-sm font-medium text-indigo-700 underline underline-offset-2 shrink-0">
              Xem hồ sơ bác sĩ
            </Link>
          </div>

          {active && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadIcs(apt)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" /> Thêm vào lịch
              </button>
              {canChange && (
                <>
                  <button
                    type="button"
                    onClick={openReschedule}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Đổi giờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="px-4 py-2.5 rounded-lg border border-rose-200 text-sm font-medium text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                  >
                    Hủy lịch
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* In-person visit card (O2O) */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Hospital className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Khám trực tiếp tại bệnh viện</p>
              <p className="text-sm text-slate-500">{location || 'Phòng khám sẽ hiện trên phiếu khám'}</p>
            </div>
          </div>
          {(apt.sttNumber || apt.queueNumber) && (
            <p className="text-sm text-slate-700">
              Số thứ tự: <strong className="text-slate-900">{apt.sttNumber || apt.queueNumber}</strong>
            </p>
          )}
          {active && (
            <button
              type="button"
              onClick={() => setShowTicket(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Xem phiếu khám (QR check-in)
            </button>
          )}
          {apt.clinicMapUrl && (
            <a
              href={apt.clinicMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
            >
              <MapPin className="w-4 h-4" /> Chỉ đường <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Phí khám</span>
              <span className="text-right">
                <strong className="text-slate-900">{formatVnd(apt.feeAmount) ?? 'Liên hệ'}</strong>
                {' · '}
                {apt.paymentStatus === 'PAID' ? (
                  <span className="text-emerald-700">Đã thanh toán</span>
                ) : apt.paymentStatus === 'REFUNDED' ? (
                  <span className="text-indigo-700 font-medium">
                    Đã hoàn tiền{apt.refundPercentage != null ? ` (${apt.refundPercentage}%)` : ''}
                  </span>
                ) : (
                  <span className="text-orange-700">Chưa thanh toán</span>
                )}
              </span>
            </div>
            {apt.paymentStatus === 'REFUNDED' && (apt.refundAmount != null || apt.refundPolicyNote) && (
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5">
                {apt.refundAmount != null ? `Số tiền hoàn: ${formatVnd(apt.refundAmount) ?? apt.refundAmount}. ` : ''}
                {apt.refundPolicyNote || ''}
              </p>
            )}
            {apt.paymentStatus === 'PAID' && apt.status === 'CANCELLED' && apt.refundPolicyNote && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                {apt.refundPolicyNote}
              </p>
            )}
          </div>
          {active && apt.paymentStatus === 'UNPAID' && apt.feeAmount ? (
            <Button onClick={handlePay} loading={paying} variant="secondary" className="w-full !rounded-lg">
              Thanh toán trực tuyến
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {done && (apt.consultationNotes || apt.treatmentPlan || apt.followUpDate) ? (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900">Lời dặn của bác sĩ</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <Stethoscope className="w-3.5 h-3.5" /> Bác sĩ viết, không phải AI
                </span>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-slate-50 space-y-3 text-sm text-slate-800 leading-relaxed">
                {apt.consultationNotes && <p className="whitespace-pre-line">{apt.consultationNotes}</p>}
                {apt.treatmentPlan && (
                  <div>
                    <p className="font-semibold text-slate-900">Hướng điều trị</p>
                    <p className="whitespace-pre-line">{apt.treatmentPlan}</p>
                  </div>
                )}
                {apt.followUpDate && (
                  <p>
                    <strong>Hẹn tái khám:</strong> {new Date(apt.followUpDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">— {apt.doctorName}</p>
            </section>
          ) : null}

          {active && apt.preVisitInstructions && apt.preVisitInstructions.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-slate-900">Chuẩn bị cho buổi khám</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {apt.preVisitInstructions.map((s) => (
                  <li key={s} className="flex items-start gap-3 py-3 text-sm text-slate-800">
                    <Check className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {apt.chiefComplaint && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-slate-900">Lý do khám</h2>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{apt.chiefComplaint}</p>
            </section>
          )}

          {!done && !apt.preVisitInstructions?.length && !apt.chiefComplaint && (
            <p className="p-5 rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-600">
              Lời dặn của bác sĩ sẽ hiện ở đây sau buổi khám.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Đã gửi kèm cho bác sĩ</h2>
            {apt.triageSessionId || apt.medicalDocumentId ? (
              <ul className="mt-3 space-y-2">
                {apt.triageSessionId && (
                  <li className="flex items-start gap-3 p-3 rounded-xl border border-slate-200">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">Phiên trợ lý AI</span>
                      {urgency && <span className="block text-xs text-slate-500">Mức độ: {URGENCY_LABEL[urgency] ?? urgency}</span>}
                    </span>
                  </li>
                )}
                {apt.medicalDocumentId && (
                  <li>
                    <Link
                      to={`/patient/documents?focusId=${apt.medicalDocumentId}`}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                      <FileText className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">{apt.medicalDocumentFileName || 'Tài liệu xét nghiệm'}</span>
                        <span className="block text-xs text-slate-500">Xem kết quả AI đọc</span>
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Không có tài liệu hay phiên AI nào được gửi kèm lịch hẹn này.</p>
            )}
          </div>

          {events.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">Diễn biến lịch hẹn</h2>
              <ol className="mt-3 space-y-3">
                {events.map((e, i) => (
                  <li key={e.label} className="flex gap-3">
                    <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', i === events.length - 1 ? 'bg-indigo-600' : 'bg-slate-400')} />
                    <span className="text-sm">
                      <span className="block font-medium text-slate-900">{e.label}</span>
                      <span className="block text-xs text-slate-500">
                        {[e.at && fmtDateTime(e.at), e.note].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>

      {showTicket && <AdmissionTicketModal appointment={apt} isOpen={showTicket} onClose={() => setShowTicket(false)} />}

      <Modal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        title="Hủy lịch khám"
        description={`${fmtDate(apt.scheduledStart)}, ${fmtTime(apt.scheduledStart)} với ${apt.doctorName}`}
        busy={cancelling}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Giữ lịch
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling} disabled={!cancelReason.trim()}>
              Xác nhận hủy
            </Button>
          </>
        }
      >
        {refundPreview ? (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs space-y-1.5 ${
              refundPreview.percentage === 100
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : refundPreview.percentage === 80
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Chính sách hoàn tiền tự động
              </span>
              <span>{refundPreview.percentage}%</span>
            </div>
            <p className="text-[11px] opacity-90">{refundPreview.hoursRemainingLabel}</p>
            <p className="font-medium">{refundPreview.tierLabel}</p>
            <div className="pt-1.5 border-t border-current/15 flex items-center justify-between">
              <span>Số tiền dự kiến hoàn trả:</span>
              <strong className="text-sm tabular-nums">{formatVnd(refundPreview.refundAmount) ?? '0 đ'}</strong>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Lịch hẹn này chưa thanh toán trực tuyến — bạn có thể hủy lịch hoàn toàn miễn phí.
          </div>
        )}
        <label htmlFor="cancel-reason" className="block text-sm font-medium text-slate-800 mb-1.5">
          Lý do hủy
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          placeholder="Ví dụ: tôi có việc đột xuất"
        />
      </Modal>

      <Modal
        open={rescheduleOpen}
        onClose={() => !rescheduling && setRescheduleOpen(false)}
        title="Đổi giờ khám"
        description={`Chọn khung giờ mới với ${apt.doctorName}`}
        size="lg"
        busy={rescheduling}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={rescheduling}>
              Đóng
            </Button>
            <Button onClick={handleReschedule} loading={rescheduling} disabled={!rescheduleSlot}>
              Xác nhận đổi giờ
            </Button>
          </>
        }
      >
        <SlotPicker
          doctorId={apt.doctorId}
          date={rescheduleDate}
          onDateChange={setRescheduleDate}
          selected={rescheduleSlot}
          onSelect={setRescheduleSlot}
          disabled={rescheduling}
          excludeStart={apt.scheduledStart}
        />
        <label htmlFor="reschedule-reason" className="block mt-4 text-sm font-medium text-slate-800 mb-1.5">
          Lý do (không bắt buộc)
        </label>
        <input
          id="reschedule-reason"
          value={rescheduleReason}
          onChange={(e) => setRescheduleReason(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Modal>
    </div>
  );
};

const BackLink: React.FC = () => (
  <Link to="/patient" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900">
    <ChevronLeft className="w-4 h-4" /> Lịch hẹn của tôi
  </Link>
);
