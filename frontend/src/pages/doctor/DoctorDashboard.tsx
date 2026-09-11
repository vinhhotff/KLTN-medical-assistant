import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, User, Phone, Check, Ban, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../services/api.js';

interface DoctorAppointment {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feeAmount: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  consultationNotes?: string;
  cancellationReason?: string;
}

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data?.data) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: 'COMPLETED' | 'CANCELLED'
  ) => {
    let notes = '';
    if (newStatus === 'COMPLETED') {
      const input = window.prompt('Nhập kết luận khám & lời dặn bệnh nhân:');
      if (input === null) return;
      notes = input;
    } else {
      const input = window.prompt('Nhập lý do hủy ca khám:');
      if (input === null) return;
      notes = input;
    }

    try {
      setActionError(null);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: newStatus,
        notes,
      });
      fetchAppointments();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Thao tác không thành công.');
    }
  };

  const scheduledAppointments = appointments.filter((a) => a.status === 'SCHEDULED');
  const pastAppointments = appointments.filter((a) => a.status !== 'SCHEDULED');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Xin chào Bác sĩ, {user?.fullName || 'Đồng nghiệp'}!
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Khu vực quản trị ca khám lâm sàng và hồ sơ bệnh án MediAssist.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          Hồ Sơ Hợp Lệ & Đã Xác Thực
        </span>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduled Appointments (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Ca Khám Chờ Tiếp Nhận ({scheduledAppointments.length})
              </h3>
              <button
                onClick={fetchAppointments}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
              >
                Làm mới
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải lịch hẹn...</div>
            ) : scheduledAppointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                Hiện tại không có ca khám nào đang chờ tiếp nhận.
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                          {apt.appointmentCode}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
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
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(apt.feeAmount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <User className="w-4 h-4 text-slate-400" />
                        Bệnh nhân: <strong>{apt.patientName}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        SĐT: {apt.patientPhone || 'Chưa cung cấp'}
                      </div>
                    </div>

                    {apt.consultationNotes && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                        <strong className="text-slate-900">Lý do khám / Triệu chứng:</strong> {apt.consultationNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> Hủy Ca
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Hoàn Thành Khám
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Past History & Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-4">
              Lịch Sử Khám Gần Đây ({pastAppointments.length})
            </h3>

            {pastAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có lịch sử khám trước đó.</p>
            ) : (
              <div className="space-y-3">
                {pastAppointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700">{apt.appointmentCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          apt.status === 'COMPLETED'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {apt.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã hủy'}
                      </span>
                    </div>
                    <div className="text-slate-600">Bệnh nhân: {apt.patientName}</div>
                    <div className="text-slate-400 text-[11px]">
                      {new Date(apt.scheduledStart).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
