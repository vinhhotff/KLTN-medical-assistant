import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, MapPin, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';

interface DoctorDetail {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio: string;
  licenseNumber: string;
  consultationFee: number;
  yearsOfExperience: number;
  specialties: string[];
  verified: boolean;
}

interface DoctorSlot {
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  available: boolean;
}

interface AppointmentConfirmation {
  appointmentCode: string;
  doctorName: string;
  scheduledStart: string;
  feeAmount: number;
}

export const DoctorSearchPage: React.FC = () => {
  const { user } = useAuthStore();
  const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetail | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentConfirmation | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors');
      if (res.data?.data) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (doc: DoctorDetail) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setBookingError(null);
    setConfirmedAppointment(null);
    setNotes('');
    loadSlots(doc.id, selectedDate);
  };

  const loadSlots = async (doctorId: string, date: string) => {
    try {
      setSlotsLoading(true);
      setSelectedSlot(null);
      const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.data?.data) {
        setSlots(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedDoctor) {
      loadSlots(selectedDoctor.id, date);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    if (!user) {
      setBookingError('Vui lòng đăng nhập tài khoản bệnh nhân để đặt lịch khám.');
      return;
    }

    try {
      setBookingSubmitting(true);
      setBookingError(null);

      const res = await api.post('/appointments', {
        doctorId: selectedDoctor.id,
        scheduledStart: selectedSlot.startDateTime,
        notes: notes.trim() || 'Khám tổng quát và tư vấn theo triệu chứng',
      });

      if (res.data?.data) {
        setConfirmedAppointment({
          appointmentCode: res.data.data.appointmentCode,
          doctorName: res.data.data.doctorName,
          scheduledStart: res.data.data.scheduledStart,
          feeAmount: res.data.data.feeAmount,
        });
        // Refresh slots
        loadSlots(selectedDoctor.id, selectedDate);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Không thể đặt lịch. Vui lòng thử lại.';
      setBookingError(message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const term = searchTerm.toLowerCase();
    const matchName = d.fullName.toLowerCase().includes(term);
    const matchBio = d.bio?.toLowerCase().includes(term);
    const matchSpec = d.specialties?.some((s) => s.toLowerCase().includes(term));
    return matchName || matchBio || matchSpec;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tìm Kiếm & Đặt Lịch Khám Bác Sĩ</h2>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống danh bạ bác sĩ chính quy đã được xác minh chứng chỉ hành nghề y tế (Doctor Vetting).
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo tên bác sĩ, chuyên khoa (Tim mạch, Da liễu, Thần kinh), hoặc từ khóa lâm sàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Đang tải danh bạ bác sĩ...</div>
      ) : filteredDoctors.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Không tìm thấy bác sĩ phù hợp với tiêu chí tìm kiếm.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {doc.fullName.charAt(doc.fullName.length - 1)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{doc.fullName}</h3>
                    {doc.specialties?.map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200"
                      >
                        {spec}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{doc.bio}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> CCHN: {doc.licenseNumber}
                    </span>
                    <span>Kinh nghiệm: {doc.yearsOfExperience} năm</span>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 flex-shrink-0">
                <span className="text-base font-bold text-indigo-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(doc.consultationFee || 300000)}
                </span>
                <button
                  onClick={() => handleOpenBooking(doc)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <Calendar className="w-4 h-4" /> Đặt Khám Ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Đặt Lịch Khám Bác Sĩ</h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {selectedDoctor.fullName} - {selectedDoctor.specialties?.join(', ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {confirmedAppointment ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-900">Đặt Lịch Thành Công!</h4>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1.5 text-left font-mono">
                    <div>Mã lịch hẹn: <strong className="text-indigo-600">{confirmedAppointment.appointmentCode}</strong></div>
                    <div>Bác sĩ: <strong>{confirmedAppointment.doctorName}</strong></div>
                    <div>Thời gian: <strong>{new Date(confirmedAppointment.scheduledStart).toLocaleString('vi-VN')}</strong></div>
                    <div>Phí khám: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(confirmedAppointment.feeAmount)}</strong></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Vui lòng có mặt trước giờ hẹn 10 phút để chuẩn bị tiếp đón chu đáo nhất.
                  </p>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
                  >
                    Hoàn Tất & Đóng
                  </button>
                </div>
              ) : (
                <>
                  {bookingError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* Date Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Chọn Ngày Khám:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Slots Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> Khung Giờ Khám (30 phút / ca):
                    </label>

                    {slotsLoading ? (
                      <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch trống...</div>
                    ) : slots.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        Không có ca khám nào trong ngày này.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((s) => {
                          const isSelected = selectedSlot?.startTime === s.startTime;
                          return (
                            <button
                              key={s.startTime}
                              type="button"
                              disabled={!s.available}
                              onClick={() => setSelectedSlot(s)}
                              className={`py-2 px-1 rounded-xl text-xs font-medium transition text-center cursor-pointer border ${
                                !s.available
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                  : isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white hover:bg-indigo-50 text-slate-800 border-slate-200'
                              }`}
                            >
                              {s.startTime.substring(0, 5)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notes input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mô Tả Triệu Chứng / Lý Do Khám:
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Mô tả tóm tắt vấn đề sức khỏe của bạn để bác sĩ nắm trước hồ sơ..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Summary & Submit */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-500">Phí khám dự kiến: </span>
                      <span className="font-bold text-indigo-600 text-sm">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDoctor.consultationFee || 300000)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDoctor(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!selectedSlot || bookingSubmitting}
                        onClick={handleConfirmBooking}
                        className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition ${
                          !selectedSlot || bookingSubmitting
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                        }`}
                      >
                        {bookingSubmitting ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Khám'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
