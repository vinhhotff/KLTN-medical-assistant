import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  Printer,
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  User,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { EMERGENCY_NUMBER, SUPPORT_HOTLINE, SUPPORT_HOTLINE_TEL } from '../../config/app';
import { devLog } from '../../utils/logger';

export interface TicketData {
  id: string;
  appointmentCode: string;
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  doctorEmail?: string;
  scheduledStart: string;
  scheduledEnd?: string;
  status: string;
  feeAmount?: number | null;
  paymentStatus?: string;
  clinicRoom?: string;
  clinicFloor?: string;
  clinicBuilding?: string;
  clinicAddress?: string;
  clinicMapUrl?: string;
  qrCodeData?: string;
  sttNumber?: string;
  preVisitInstructions?: string[];
}

interface AdmissionTicketModalProps {
  appointment: TicketData;
  isOpen: boolean;
  onClose: () => void;
}

/** General preparation tips shown only when the backend sends no specific instructions. */
const GENERAL_INSTRUCTIONS = [
  'Mang theo CCCD bản gốc để đối chiếu thủ tục',
  'Mang theo thẻ BHYT (nếu có) để hưởng chế độ bảo hiểm y tế',
  'Đến trước giờ hẹn 15 phút tại quầy tiếp đón để nhận số vào phòng khám',
];

const withDoctorTitle = (name: string) => (/^(BS|ThS|TS|PGS|GS)\b/i.test(name.trim()) ? name : `BS. ${name}`);

export const AdmissionTicketModal: React.FC<AdmissionTicketModalProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const [ticket, setTicket] = useState<TicketData>(appointment);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch updated ticket info from backend
  useEffect(() => {
    if (!isOpen || !appointment.id) return;
    setTicket(appointment);

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/appointments/${appointment.id}/ticket`);
        if (res.data?.data) {
          setTicket(res.data.data);
        }
      } catch (err) {
        devLog.warn('Could not fetch ticket details from API, using local appointment state:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [isOpen, appointment.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format date: "Thứ Ba, 14/10/2025 — 09:00"
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const weekdayStr = d.toLocaleDateString('vi-VN', { weekday: 'long' });
      const capWeekday = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
      const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${capWeekday}, ${datePart} — ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const roomLine = [ticket.clinicRoom, ticket.clinicFloor].filter(Boolean).join(' — ');
  const locationParts = [ticket.clinicRoom, ticket.clinicFloor, ticket.clinicBuilding, ticket.clinicAddress].filter(Boolean);
  const hasLocation = locationParts.length > 0;
  const mapUrl = ticket.clinicMapUrl || (ticket.clinicAddress ? `https://maps.google.com/?q=${encodeURIComponent(ticket.clinicAddress)}` : null);

  // Google Calendar URL — only real data, missing fields are left out
  const getGoogleCalendarUrl = () => {
    try {
      const startDate = new Date(ticket.scheduledStart);
      const endDate = ticket.scheduledEnd
        ? new Date(ticket.scheduledEnd)
        : new Date(startDate.getTime() + 30 * 60000);

      const toIsoString = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const title = `Lịch khám: ${withDoctorTitle(ticket.doctorName || 'MediAssist')}`;
      const details = [
        `Mã phiếu khám: ${ticket.appointmentCode}`,
        ticket.sttNumber ? `Số thứ tự: ${ticket.sttNumber}` : 'Số thứ tự: nhận tại quầy tiếp đón',
        `Bác sĩ: ${ticket.doctorName}`,
        ticket.clinicRoom ? `Phòng khám: ${ticket.clinicRoom}` : 'Phòng khám: sẽ được thông báo khi check-in',
        '',
        'Vui lòng có mặt trước 15 phút tại quầy tiếp đón để làm thủ tục.',
      ].join('\n');

      let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${toIsoString(startDate)}/${toIsoString(endDate)}&details=${encodeURIComponent(details)}`;
      if (hasLocation) url += `&location=${encodeURIComponent(locationParts.join(', '))}`;
      return url;
    } catch {
      return null;
    }
  };
  const calendarUrl = getGoogleCalendarUrl();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(ticket.appointmentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (http / permissions); the code stays visible on screen
    }
  };

  const qrValue =
    ticket.qrCodeData ||
    JSON.stringify({
      appointmentId: ticket.id,
      code: ticket.appointmentCode,
      patient: ticket.patientName,
      doctor: ticket.doctorName,
      datetime: ticket.scheduledStart,
    });

  const hasSpecificInstructions = Boolean(ticket.preVisitInstructions && ticket.preVisitInstructions.length > 0);
  const instructions = hasSpecificInstructions ? (ticket.preVisitInstructions as string[]) : GENERAL_INSTRUCTIONS;

  return (
    <>
      {/* Print only the ticket. (The overlay must not be display:none, or the ticket inside disappears too.) */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #e-admission-ticket, #e-admission-ticket * { visibility: visible !important; }
          #e-admission-ticket {
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important;
            margin: 0 !important; padding: 24px !important; box-shadow: none !important;
            border: 1px solid #e2e8f0 !important; border-radius: 0 !important; background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Phiếu khám bệnh điện tử"
      >
        <div className="relative w-full max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Header Controls */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phiếu khám điện tử</span>
              {loading && <span className="text-[11px] text-teal-700 font-medium animate-pulse">• Đang cập nhật...</span>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              aria-label="Đóng phiếu khám"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Ticket Area */}
          <div id="e-admission-ticket" className="p-5 sm:p-8 space-y-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-dashed border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">M+</div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">MediAssist</h2>
                    <p className="text-[11px] font-semibold text-teal-700">PHIẾU TIẾP ĐÓN BỆNH NHÂN</p>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 pt-2 tracking-tight">PHIẾU KHÁM BỆNH ĐIỆN TỬ</h1>
                <p className="text-xs text-slate-500">Xuất trình phiếu này (trên điện thoại hoặc bản in) tại quầy tiếp đón khi đến khám</p>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end justify-between bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Mã Lịch Hẹn</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-base sm:text-lg font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 tracking-wider">
                    {ticket.appointmentCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 text-slate-500 hover:text-teal-700 rounded-md transition no-print cursor-pointer"
                    aria-label="Sao chép mã lịch hẹn"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                  ✓ {ticket.paymentStatus === 'PAID' ? 'Đã thanh toán online' : 'Đã xác nhận đặt chỗ'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* QR + queue number */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-gradient-to-b from-teal-50/50 via-white to-slate-50 rounded-2xl border-2 border-teal-100 text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-teal-100">
                  <QRCodeSVG value={qrValue} size={160} level="M" includeMargin={false} className="rounded-lg" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Số thứ tự khám</span>
                  {ticket.sttNumber ? (
                    <div className="text-3xl sm:text-4xl font-black text-teal-900 tracking-tight">{ticket.sttNumber}</div>
                  ) : (
                    <div className="text-sm font-semibold text-slate-500 italic py-1" data-testid="stt-pending">
                      Đang chờ cấp số — nhận tại quầy tiếp đón
                    </div>
                  )}
                  <p className="text-[11px] text-teal-700 font-semibold">Đưa mã QR cho nhân viên tiếp đón khi đến</p>
                </div>
                <div className="w-full pt-2 border-t border-teal-100 text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Phiếu được tạo từ hệ thống MediAssist</span>
                </div>
              </div>

              {/* Details */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> Bệnh nhân
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ticket.patientName}</p>
                    {ticket.patientPhone && <p className="text-xs text-slate-600 font-medium">{ticket.patientPhone}</p>}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-teal-600" /> Bác sĩ tiếp nhận
                    </span>
                    <p className="text-sm font-bold text-teal-900 mt-0.5">{withDoctorTitle(ticket.doctorName)}</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-950">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">Thời gian khám</span>
                      <span className="font-extrabold text-sm text-slate-900">{formatDateTime(ticket.scheduledStart)}</span>
                      <span className="text-[11px] text-amber-800 block mt-0.5">*Vui lòng có mặt trước giờ hẹn 15 phút</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 text-slate-800">
                    <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-teal-800">Địa điểm khám</span>
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 underline no-print"
                          >
                            Chỉ đường <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {hasLocation ? (
                        <>
                          {roomLine && <p className="font-extrabold text-slate-900 text-xs mt-0.5">{roomLine}</p>}
                          {ticket.clinicBuilding && <p className="text-slate-700 font-medium text-[11px]">{ticket.clinicBuilding}</p>}
                          {ticket.clinicAddress && <p className="text-slate-600 text-[11px] mt-0.5">{ticket.clinicAddress}</p>}
                        </>
                      ) : (
                        <p className="text-slate-600 italic mt-0.5" data-testid="room-pending">
                          Đang chờ xếp phòng — nhân viên tiếp đón sẽ hướng dẫn khi bạn check-in.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {hasSpecificInstructions ? 'Hướng dẫn chuẩn bị trước khi đến khám' : 'Lưu ý chung khi đến khám'}
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {instructions.map((inst, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold text-xs mt-0.5">✓</span>
                    <span className="font-medium">{inst}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100">
              Tổng đài hỗ trợ:{' '}
              <a href={`tel:${SUPPORT_HOTLINE_TEL}`} className="font-bold text-slate-700">{SUPPORT_HOTLINE}</a>
              {' • '}Cấp cứu: <a href={`tel:${EMERGENCY_NUMBER}`} className="font-bold text-rose-600">{EMERGENCY_NUMBER}</a>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 bg-slate-50 border-t border-slate-200 no-print">
            <span className="text-xs text-slate-500 font-medium">Lưu vào lịch hoặc in phiếu để mang theo.</span>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {calendarUrl && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition"
                >
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Thêm vào Google Calendar</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In phiếu khám</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
