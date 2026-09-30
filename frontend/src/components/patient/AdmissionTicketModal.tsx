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
  feeAmount?: number;
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
        console.warn('Could not fetch ticket details from API, using local appointment state:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [isOpen, appointment.id]);

  if (!isOpen) return null;

  // Format date: "Thứ Ba, 14/10/2025 — 09:00"
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const weekdayStr = d.toLocaleDateString('vi-VN', { weekday: 'long' });
      // Capitalize first letter of weekday
      const capWeekday = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
      const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${capWeekday}, ${datePart} — ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    try {
      const startDate = new Date(ticket.scheduledStart);
      const endDate = ticket.scheduledEnd
        ? new Date(ticket.scheduledEnd)
        : new Date(startDate.getTime() + 30 * 60000);

      const toIsoString = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
      const startUtc = toIsoString(startDate);
      const endUtc = toIsoString(endDate);

      const title = `Lịch khám tại viện: BS. ${ticket.doctorName || 'MediAssist'}`;
      const location = `${ticket.clinicRoom || 'Phòng khám'}, ${ticket.clinicFloor || 'Tầng 2'}, ${ticket.clinicBuilding || 'Tòa A'}, ${ticket.clinicAddress || 'Lô E2a-7, Khu CNC, TP.HCM'}`;
      const details = `Mã phiếu khám: ${ticket.appointmentCode}\nSố thứ tự (STT): ${ticket.sttNumber || 'STT-01'}\nBác sĩ: ${ticket.doctorName}\nPhòng khám: ${ticket.clinicRoom || 'Phòng 205'}\n\n*Lưu ý: Bệnh nhân vui lòng có mặt trước 15 phút tại bàn đón tiếp để làm thủ tục tiếp nhận lâm sàng.*`;

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    } catch {
      return '#';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticket.appointmentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrValue =
    ticket.qrCodeData ||
    JSON.stringify({
      appointmentId: ticket.id,
      code: ticket.appointmentCode,
      stt: ticket.sttNumber || 'STT-01',
      patient: ticket.patientName,
      doctor: ticket.doctorName,
      datetime: ticket.scheduledStart,
      room: ticket.clinicRoom || 'Phòng 205',
    });

  const instructions = ticket.preVisitInstructions && ticket.preVisitInstructions.length > 0
    ? ticket.preVisitInstructions
    : [
        'Mang theo CCCD / Căn cước công dân bản gốc để đối chiếu thủ tục',
        'Mang theo thẻ BHYT (nếu có) để hưởng chế độ bảo hiểm y tế',
        'Nhịn ăn ít nhất 4 tiếng nếu có chỉ định xét nghiệm máu hoặc nội soi',
        'Đến trước giờ hẹn 15 phút tại quầy lễ tân để nhận số vào phòng khám',
      ];

  const mapUrl =
    ticket.clinicMapUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(
      ticket.clinicAddress || 'Lô E2a-7, Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh'
    )}`;

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #e-admission-ticket, #e-admission-ticket * {
            visibility: visible !important;
          }
          #e-admission-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Controls (no-print) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 no-print">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Xác Nhận Đặt Lịch Khám Trực Tiếp (O2O)
              </span>
              {loading && (
                <span className="text-[11px] text-indigo-600 font-medium animate-pulse ml-1.5">
                  • Đang đồng bộ dữ liệu...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Ticket Area */}
          <div id="e-admission-ticket" className="p-6 sm:p-8 space-y-6 bg-white">
            
            {/* Ticket Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-dashed border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                    M+
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">MediAssist AI Clinic</h2>
                    <p className="text-[11px] font-semibold text-indigo-600">HỆ THỐNG TIẾP ĐÓN BỆNH NHÂN THÔNG MINH</p>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 pt-2 tracking-tight">
                  PHIẾU KHÁM BỆNH ĐIỆN TỬ
                </h1>
                <p className="text-xs text-slate-500">
                  Xuất trình phiếu này (trên điện thoại hoặc bản in) tại quầy tiếp đón khi đến khám
                </p>
              </div>

              {/* Appointment Code Badge */}
              <div className="flex sm:flex-col items-start sm:items-end justify-between bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Mã Lịch Hẹn</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-base sm:text-lg font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 tracking-wider">
                    {ticket.appointmentCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition no-print"
                    title="Sao chép mã"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                  ✓ {ticket.paymentStatus === 'PAID' ? 'Đã Thanh Toán Online' : 'Đã Xác Nhận Đặt Chỗ'}
                </span>
              </div>
            </div>

            {/* Main Ticket Grid: QR Code + STT vs Clinical Details */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: QR Code + Big STT Number */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 rounded-2xl border-2 border-indigo-100 shadow-xs text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-indigo-100">
                  <QRCodeSVG
                    value={qrValue}
                    size={160}
                    level="M"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    SỐ THỨ TỰ KHÁM
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-indigo-900 tracking-tight">
                    {ticket.sttNumber || 'STT-01'}
                  </div>
                  <p className="text-[11px] text-indigo-600 font-semibold">
                    Quét QR tại máy Check-in tự động
                  </p>
                </div>

                <div className="w-full pt-2 border-t border-indigo-100 text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xác thực bởi MediAssist EMR</span>
                </div>
              </div>

              {/* Right Column: Appointment Details */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                
                {/* Doctor & Patient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> Bệnh Nhân
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ticket.patientName}</p>
                    {ticket.patientPhone && (
                      <p className="text-xs text-slate-500 font-medium">{ticket.patientPhone}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-indigo-600" /> Bác Sĩ Tiếp Nhận
                    </span>
                    <p className="text-sm font-bold text-indigo-900 mt-0.5">BS. {ticket.doctorName}</p>
                    <p className="text-xs text-slate-500 font-medium">Bác sĩ chuyên khoa</p>
                  </div>
                </div>

                {/* Time & Location */}
                <div className="space-y-2.5 text-xs">
                  {/* Date Time */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-950">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">
                        Thời Gian Khám Lâm Sàng
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        {formatDateTime(ticket.scheduledStart)}
                      </span>
                      <span className="text-[11px] text-amber-800 block mt-0.5">
                        *Vui lòng có mặt trước giờ hẹn 15 phút
                      </span>
                    </div>
                  </div>

                  {/* Clinic Location */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-slate-800">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-800">
                          Địa Điểm Khám Trực Tiếp
                        </span>
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline no-print cursor-pointer"
                        >
                          Chỉ Đường Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="font-extrabold text-slate-900 text-xs mt-0.5">
                        {ticket.clinicRoom || 'Phòng Khám 205'} — {ticket.clinicFloor || 'Tầng 2'}
                      </p>
                      <p className="text-slate-700 font-medium text-[11px]">
                        {ticket.clinicBuilding || 'Tòa A - Bệnh viện Đa Khoa MediAssist FPT'}
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {ticket.clinicAddress || 'Lô E2a-7, Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Pre-visit Instructions Checklist */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hướng Dẫn Chuẩn Bị Trước Khi Đến Khám
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

            {/* Ticket Footer Note */}
            <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
              Tổng đài hỗ trợ người bệnh: <strong className="text-slate-600">1900 6868</strong> • Cấp cứu y tế: <strong className="text-rose-600">115</strong>
            </div>

          </div>

          {/* Action Bar (no-print) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 no-print">
            <span className="text-xs text-slate-500 font-medium">
              Bạn có thể lưu phiếu này vào Google Calendar hoặc in trực tiếp.
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Thêm vào Google Calendar</span>
              </a>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Khám</span>
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
