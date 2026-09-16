import React, { useEffect, useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  AlertCircle, 
  FileText, 
  X, 
  Ban, 
  Stethoscope, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Pill,
  Activity,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

interface AppointmentItem {
  id: string;
  appointmentCode: string;
  doctorName: string;
  doctorEmail: string;
  doctorSpecialty?: string;
  patientName: string;
  patientEmail: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feeAmount: number;
  paymentStatus: string;
  consultationNotes?: string;
  cancellationReason?: string;
  queueNumber?: string;
  clinicRoom?: string;
  chiefComplaint?: string;
  vitalSignsJson?: string;
  icd10Code?: string;
  icd10Name?: string;
  prescriptionJson?: string;
  treatmentPlan?: string;
  followUpDate?: string;
}

export const AppointmentSupervisionPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  
  // Cancel Modal state
  const [cancelModalItem, setCancelModalItem] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/admin/appointments');
      if (res.data?.data) {
        setAppointments(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminCancel = async () => {
    if (!cancelModalItem) return;
    try {
      setCancelling(true);
      await api.patch(`/admin/appointments/${cancelModalItem.id}/cancel`, {
        reason: cancelReason || 'Quản trị viên can thiệp hủy lịch hẹn vì lý do điều phối lâm sàng'
      });
      setCancelModalItem(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      alert('Không thể hủy cuộc hẹn. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredAppointments = useMemo(() => {
    const tokens = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return appointments.filter((app) => {
      // Status filter
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }
      // Search filter using tokenized multi-field matching
      if (tokens.length === 0) return true;
      const searchableContent = `${app.appointmentCode || ''} ${app.doctorName || ''} ${app.doctorEmail || ''} ${app.doctorSpecialty || ''} ${app.patientName || ''} ${app.patientEmail || ''} ${app.icd10Code || ''} ${app.icd10Name || ''} ${app.chiefComplaint || ''} ${app.clinicRoom || ''}`.toLowerCase();
      return tokens.every((token) => searchableContent.includes(token));
    });
  }, [appointments, statusFilter, debouncedSearch]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đã Khám
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" /> Chờ Khám
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            <Activity className="w-3 h-3" /> Đang Khám
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Đã Hủy
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            Giám Sát Cuộc Hẹn Lâm Sàng Toàn Viện
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi, điều phối lịch hẹn khám và thanh tra bệnh án chẩn đoán ICD-10 giữa Bác sĩ và Bệnh nhân.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={() => fetchAppointments(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Làm mới danh sách lịch khám"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>
          <span className="text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
            Tổng cộng: <strong className="text-indigo-600">{appointments.length}</strong> ca khám
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã ca, tên bác sĩ, bệnh nhân, ICD-10..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> Lọc trạng thái:
          </div>
          {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tất cả' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu cuộc hẹn toàn viện...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Không tìm thấy cuộc hẹn nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Ca Khám</th>
                  <th className="py-3.5 px-4">Bác Sĩ Phụ Trách</th>
                  <th className="py-3.5 px-4">Bệnh Nhân</th>
                  <th className="py-3.5 px-4">Thời Gian Khám</th>
                  <th className="py-3.5 px-4">Địa Điểm / STT</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 text-xs">
                      {app.appointmentCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                        {app.doctorName}
                      </div>
                      <div className="text-[11px] text-slate-500">{app.doctorSpecialty || app.doctorEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {app.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500">{app.patientEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      <div>{new Date(app.scheduledStart).toLocaleDateString('vi-VN')}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {new Date(app.scheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(app.scheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-800 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {app.clinicRoom || 'Chưa xếp phòng'}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-bold font-mono">
                        {app.queueNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedAppointment(app)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" /> Chi Tiết
                        </button>
                        {app.status !== 'CANCELLED' && app.status !== 'COMPLETED' && (
                          <button
                            onClick={() => setCancelModalItem(app)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            title="Hủy khẩn cấp"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase font-mono">
                  {selectedAppointment.appointmentCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Hồ Sơ Ca Khám & Chẩn Đoán Lâm Sàng
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor & Patient Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Bác Sĩ Phụ Trách</span>
                <p className="font-bold text-slate-900 text-sm">{selectedAppointment.doctorName}</p>
                <p className="text-slate-600">{selectedAppointment.doctorEmail}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Bệnh Nhân Đăng Ký</span>
                <p className="font-bold text-slate-900 text-sm">{selectedAppointment.patientName}</p>
                <p className="text-slate-600">{selectedAppointment.patientEmail}</p>
              </div>
            </div>

            {/* Clinical Notes / ICD-10 */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Lý Do Vào Khám (Chief Complaint)
                </h4>
                <p className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
                  {selectedAppointment.chiefComplaint || selectedAppointment.consultationNotes || 'Chưa ghi nhận lý do chi tiết.'}
                </p>
              </div>

              {selectedAppointment.icd10Code && (
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs uppercase text-indigo-700">Chẩn Đoán Bệnh Án ICD-10</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-mono mr-2 text-xs">
                      {selectedAppointment.icd10Code}
                    </span>
                    {selectedAppointment.icd10Name}
                  </p>
                  {selectedAppointment.treatmentPlan && (
                    <p className="text-xs text-slate-700 mt-2">
                      <strong>Phác đồ điều trị:</strong> {selectedAppointment.treatmentPlan}
                    </p>
                  )}
                </div>
              )}

              {selectedAppointment.prescriptionJson && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" /> Đơn Thuốc Điện Tử
                  </h4>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto font-mono">
                    {selectedAppointment.prescriptionJson}
                  </pre>
                </div>
              )}

              {selectedAppointment.cancellationReason && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                  <strong className="block font-bold mb-1">Lý do hủy lịch:</strong>
                  {selectedAppointment.cancellationReason}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cancel Modal */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Can Thiệp Hủy Cuộc Hẹn</h3>
                <p className="text-xs text-slate-500 font-mono">{cancelModalItem.appointmentCode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đang thực hiện quyền Quản trị viên để hủy lịch hẹn giữa bác sĩ <strong>{cancelModalItem.doctorName}</strong> và bệnh nhân <strong>{cancelModalItem.patientName}</strong>. Hành động này sẽ được ghi vào Nhật ký kiểm toán (Audit Log).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do can thiệp hủy lịch (bắt buộc):
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Bác sĩ xin nghỉ đột xuất vì ca cấp cứu..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalItem(null)}
                disabled={cancelling}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {cancelling ? 'Đang xử lý...' : 'Xác Nhận Hủy Lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
