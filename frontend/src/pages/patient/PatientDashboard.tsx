import React, { useState, useEffect } from 'react';
import { MessageSquare, UploadCloud, Search, Calendar, Clock, AlertCircle, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

interface AppointmentItem {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feeAmount: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  consultationNotes?: string;
  cancellationReason?: string;
}

export const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data?.data) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const reason = window.prompt('Vui lòng nhập lý do hủy lịch khám:');
    if (!reason) return;

    try {
      setActionError(null);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'CANCELLED',
        notes: reason,
      });
      fetchMyAppointments();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể hủy lịch hẹn.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Chăm Sóc Sức Khỏe Thông Minh Cùng MediAssist-AI
          </h1>
          <p className="mt-3 text-indigo-100 text-base leading-relaxed">
            Mô tả triệu chứng để nhận hỗ trợ định hướng chuyên khoa tức thì, hoặc tải lên kết quả xét nghiệm/đơn thuốc để AI diễn giải sang ngôn ngữ dễ hiểu.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/patient/triage"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow-md hover:bg-indigo-50 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Bắt Đầu Chat Triệu Chứng
            </Link>
            <Link
              to="/patient/doctors"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/30 border border-white/20 text-white font-semibold text-sm hover:bg-indigo-500/40 transition"
            >
              <Calendar className="w-4 h-4" />
              Đặt Lịch Bác Sĩ
            </Link>
            <Link
              to="/patient/documents"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/30 border border-white/20 text-white font-semibold text-sm hover:bg-indigo-500/40 transition"
            >
              <UploadCloud className="w-4 h-4" />
              Tải Lên Bệnh Án
            </Link>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Appointments Management */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Lịch Hẹn Khám Của Bạn</h2>
          </div>
          <Link
            to="/patient/doctors"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            + Đặt Lịch Mới
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Đang tải lịch hẹn...</div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
            Bạn chưa có lịch hẹn khám nào. Hãy nhấn <strong>"Đặt Lịch Mới"</strong> để tìm bác sĩ chuyên khoa.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const isScheduled = apt.status === 'SCHEDULED';
              const isCompleted = apt.status === 'COMPLETED';

              return (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {apt.appointmentCode}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isScheduled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCompleted
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isScheduled ? 'Đã Xếp Lịch' : isCompleted ? 'Đã Khám Xong' : 'Đã Hủy'}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 pt-1">
                      Bác sĩ: {apt.doctorName}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(apt.scheduledStart).toLocaleString('vi-VN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>
                        Phí: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(apt.feeAmount)}
                      </span>
                    </div>

                    {apt.consultationNotes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-2">
                        <strong className="text-slate-700">Lý do/Triệu chứng:</strong> {apt.consultationNotes}
                      </p>
                    )}
                    {apt.cancellationReason && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-1">
                        <strong>Lý do hủy:</strong> {apt.cancellationReason}
                      </p>
                    )}
                  </div>

                  {isScheduled && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> Hủy Lịch
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Phân Loại Triệu Chứng AI</h3>
          <p className="text-slate-500 text-sm mt-2">
            Trò chuyện tự nhiên với Trợ lý AI có hệ thống guardrail y tế nghiêm ngặt để xác định mức độ khẩn cấp và chuyên khoa cần khám.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Diễn Giải Bệnh Án Đa Phương Thức</h3>
          <p className="text-slate-500 text-sm mt-2">
            Tải lên file ảnh hoặc PDF kết quả xét nghiệm. Vision LLM OCR sẽ tóm tắt các chỉ số phức tạp thành lời giải thích dễ hiểu.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Ghép Nối Bác Sĩ Ngữ Nghĩa</h3>
          <p className="text-slate-500 text-sm mt-2">
            Tìm kiếm bác sĩ phù hợp nhất dựa trên vector ngữ nghĩa (pgvector) khớp chính xác với tình trạng sức khỏe của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};
