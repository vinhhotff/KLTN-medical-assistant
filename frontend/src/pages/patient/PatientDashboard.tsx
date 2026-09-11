import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  UploadCloud,
  Calendar,
  AlertCircle,
  Ban,
  ShieldAlert,
  FileText,
  Printer,
  Heart,
  Activity,
  Edit3,
  CheckCircle2,
  X,
  Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

interface PatientProfileData {
  id: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string;
  citizenId: string;
  healthInsuranceNumber: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  allergies: string;
  medicalHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

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

interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  spO2?: number;
}

interface PrescriptionItem {
  drugName: string;
  activeIngredient?: string;
  dosage: string;
  quantity: number;
  unit: string;
  days: number;
}

export const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientProfileData>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // EMR Details Modal State
  const [selectedEmrAppointment, setSelectedEmrAppointment] = useState<AppointmentItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appRes, profRes] = await Promise.all([
        api.get('/appointments/my'),
        api.get('/patient/profile').catch(() => null)
      ]);

      if (appRes.data?.data) {
        setAppointments(appRes.data.data);
      }
      if (profRes?.data?.data) {
        setProfile(profRes.data.data);
        setEditForm(profRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient dashboard data:', err);
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
      loadData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể hủy lịch hẹn.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setActionError(null);
      const res = await api.put('/patient/profile', editForm);
      if (res.data?.data) {
        setProfile(res.data.data);
        setProfileSuccessMsg('Cập nhật hồ sơ bệnh án thành công!');
        setTimeout(() => setProfileSuccessMsg(null), 3000);
        setIsEditProfileOpen(false);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể cập nhật hồ sơ y tế.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Parse Vital Signs helper
  const parseVitalSigns = (jsonStr?: string): VitalSigns | null => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  // Parse Prescriptions helper
  const parsePrescriptions = (jsonStr?: string): PrescriptionItem[] => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-300/30 text-xs font-semibold mb-3">
            <Activity className="w-3.5 h-3.5 text-indigo-300" />
            Cổng Thông Tin Bệnh Nhân Điện Tử (Hospital Patient Portal)
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Quản Lý Hồ Sơ Bệnh Án & Chăm Sóc Sức Khỏe Toàn Diện
          </h1>
          <p className="mt-2 text-indigo-100 text-sm md:text-base leading-relaxed">
            Hệ thống Bệnh án Điện tử (EMR) chuẩn hóa Bộ Y Tế. Theo dõi kết quả xét nghiệm, lịch sử thăm khám, dấu hiệu sinh tồn và đơn thuốc ngoại trú minh bạch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/patient/triage"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-800 font-bold text-sm shadow-md hover:bg-indigo-50 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Khám Sàng Lọc AI
            </Link>
            <Link
              to="/patient/doctors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/40 border border-white/20 text-white font-semibold text-sm hover:bg-indigo-600/60 transition"
            >
              <Calendar className="w-4 h-4" />
              Đặt Lịch Bác Sĩ
            </Link>
            <Link
              to="/patient/documents"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/40 border border-white/20 text-white font-semibold text-sm hover:bg-indigo-600/60 transition"
            >
              <UploadCloud className="w-4 h-4" />
              Quét Phiếu Xét Nghiệm
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

      {profileSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {/* PATIENT MEDICAL PASSPORT & EMR IDENTITY CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 flex items-center justify-center font-bold text-white shadow-inner">
              <Heart className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
                Thẻ Bệnh Án Điện Tử & Căn Cước Y Tế (EMR Medical Passport)
              </div>
              <div className="text-lg font-bold">
                Mã Bệnh Nhân: <span className="font-mono text-emerald-400">{profile?.patientCode || 'BN-2026-CHƯA CẤP'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditForm(profile || {});
              setIsEditProfileOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-xs font-semibold text-white transition cursor-pointer self-start sm:self-auto border border-indigo-500"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Cập Nhật Hồ Sơ Y Tế
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Identity */}
          <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông Tin Định Danh Y Tế</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và Tên:</span>
                <span className="font-bold text-slate-900">{profile?.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số CCCD (12 số):</span>
                <span className="font-mono font-medium text-slate-800">{profile?.citizenId || '079188002931'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số Thẻ BHYT:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {profile?.healthInsuranceNumber || 'DN4791234567890'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày sinh / Giới tính:</span>
                <span className="font-medium text-slate-800">
                  {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : '15/10/1988'} ({profile?.gender === 'FEMALE' ? 'Nữ' : profile?.gender === 'MALE' ? 'Nam' : 'Khác'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Nhóm Máu:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                  {profile?.bloodGroup || 'O+'} (Rh Dương)
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Allergies & History */}
          <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cảnh Báo Lâm Sàng & Tiền Sử</h4>
            {/* Red Alert Allergies Guard */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold uppercase">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Cảnh Báo Dị Ứng Thuốc & Thức Ăn
              </div>
              <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                {profile?.allergies || 'Dị ứng nhóm kháng sinh Beta-lactam (Penicillin, Amoxicillin), Tôm cua biển'}
              </p>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <span className="text-slate-400 font-semibold">Tiền Sử Bệnh Lý:</span>
              <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                {profile?.medicalHistory || 'Tăng huyết áp nguyên phát 3 năm (đang kiểm soát thuốc), Tiền sử gia đình có bố bị đột quỵ não.'}
              </p>
            </div>
          </div>

          {/* Col 3: Address & Emergency Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Địa Chỉ & Liên Hệ Khẩn Cấp</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Địa Chỉ Thường Trú:</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {profile?.address || 'Số 128 Nguyễn Tri Phương, Phường 9, Quận 5, TP. Hồ Chí Minh'}
                </p>
              </div>
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  Người Thân Cấp Cứu 24/7:
                </div>
                <div className="font-semibold text-slate-900">
                  {profile?.emergencyContactName || 'Trần Văn Hùng'} ({profile?.emergencyContactRelationship || 'Chồng'})
                </div>
                <div className="font-mono text-indigo-700 font-bold">
                  {profile?.emergencyContactPhone || '0909 123 888'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS & EMR ENCOUNTERS MANAGEMENT */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Lịch Khám & Bệnh Án Ngoại Trú (HIS/EMR)</h2>
          </div>
          <Link
            to="/patient/doctors"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            + Đặt Lịch Mới
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Đang tải lịch sử khám bệnh...</div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
            Bạn chưa có lịch hẹn khám nào. Hãy nhấn <strong>"Đặt Lịch Mới"</strong> để tìm bác sĩ chuyên khoa.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const isScheduled = apt.status === 'SCHEDULED';
              const isCompleted = apt.status === 'COMPLETED';
              const vitals = parseVitalSigns(apt.vitalSignsJson);
              const prescriptions = parsePrescriptions(apt.prescriptionJson);

              return (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {apt.appointmentCode}
                      </span>
                      {apt.queueNumber && (
                        <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          {apt.queueNumber}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          isScheduled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCompleted
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isScheduled ? '● Đã Tiếp Nhận Xếp Lịch' : isCompleted ? '✓ Đã Hoàn Tất Khám Lâm Sàng' : '✕ Đã Hủy'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      {new Date(apt.scheduledStart).toLocaleString('vi-VN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Bác sĩ phụ trách:</div>
                      <h4 className="font-bold text-base text-slate-900">{apt.doctorName}</h4>
                      {apt.clinicRoom && (
                        <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                          📍 {apt.clinicRoom}
                        </div>
                      )}
                      {apt.chiefComplaint && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                          <strong className="text-slate-700">Lý do vào viện:</strong> {apt.chiefComplaint}
                        </p>
                      )}
                    </div>

                    <div>
                      {/* If Completed, show ICD-10 and Action to View Full EMR */}
                      {isCompleted && (
                        <div className="space-y-2">
                          {apt.icd10Code && (
                            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-0.5">
                              <span className="font-bold text-emerald-800">
                                Chẩn đoán ICD-10: <span className="font-mono underline">{apt.icd10Code}</span>
                              </span>
                              <div className="text-slate-700 font-medium">{apt.icd10Name}</div>
                            </div>
                          )}
                          {vitals && (vitals.bloodPressure || vitals.heartRate) && (
                            <div className="text-xs text-slate-500 font-mono">
                              🫀 Sinh hiệu: {vitals.bloodPressure && <span>HA: <strong>{vitals.bloodPressure}</strong> mmHg </span>}{vitals.heartRate && <span>| Mạch: <strong>{vitals.heartRate}</strong> bpm</span>}
                            </div>
                          )}
                          {prescriptions.length > 0 && (
                            <div className="text-xs text-slate-500">
                              💊 Đơn thuốc đã cấp: <strong>{prescriptions.length} loại thuốc</strong>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedEmrAppointment(apt)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Xem Bệnh Án Điện Tử & Toa Thuốc (EMR)
                          </button>
                        </div>
                      )}

                      {isScheduled && (
                        <div className="flex items-center justify-end h-full">
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" /> Hủy Lịch Khám
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: EDIT PATIENT PROFILE / MEDICAL PASSPORT */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-lg">Cập Nhật Hồ Sơ Y Tế & Thẻ Căn Cước EMR</h3>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số CCCD (Định danh 12 số)</label>
                  <input
                    type="text"
                    value={editForm.citizenId || ''}
                    onChange={(e) => setEditForm({ ...editForm, citizenId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="079188002931"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Thẻ Bảo Hiểm Y Tế (BHYT)</label>
                  <input
                    type="text"
                    value={editForm.healthInsuranceNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, healthInsuranceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="DN4791234567890"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày Tháng Năm Sinh</label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth ? String(editForm.dateOfBirth) : ''}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nhóm Máu & Hệ Rh</label>
                  <select
                    value={editForm.bloodGroup || 'O+'}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="O+">O+ (Rh Dương)</option>
                    <option value="O-">O- (Rh Âm - Máu hiếm)</option>
                    <option value="A+">A+ (Rh Dương)</option>
                    <option value="A-">A- (Rh Âm)</option>
                    <option value="B+">B+ (Rh Dương)</option>
                    <option value="B-">B- (Rh Âm)</option>
                    <option value="AB+">AB+ (Rh Dương)</option>
                    <option value="AB-">AB- (Rh Âm - Máu hiếm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Cảnh Báo Dị Ứng Thuốc / Thực Phẩm (Rất quan trọng)
                </label>
                <textarea
                  rows={2}
                  value={editForm.allergies || ''}
                  onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                  className="w-full px-3 py-2 border border-rose-200 bg-rose-50/50 rounded-xl text-xs text-rose-900 focus:ring-2 focus:ring-rose-500"
                  placeholder="Ghi rõ các loại kháng sinh hoặc thực phẩm gây sốc/dị ứng..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Tiền Sử Bệnh Lý Bản Thân & Gia Đình
                </label>
                <textarea
                  rows={2}
                  value={editForm.medicalHistory || ''}
                  onChange={(e) => setEditForm({ ...editForm, medicalHistory: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bệnh mạn tính: Huyết áp, tiểu đường, hen phế quản, tiền sử đột quỵ..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">Địa Chỉ Thường Trú</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  placeholder="Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> Người Thân Liên Hệ Cấp Cứu 24/7
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">Họ và Tên</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactName || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Người thân..."
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Quan Hệ</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactRelationship || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Vợ, Chồng, Bố, Mẹ..."
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Số Điện Thoại</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                      placeholder="0909..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW COMPREHENSIVE EMR MEDICAL RECORD & PRESCRIPTION */}
      {selectedEmrAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Header with Hospital Banner */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-indigo-400 tracking-widest">
                  BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDIASSIST
                </div>
                <h3 className="text-xl font-black mt-1">
                  PHIẾU KHÁM BỆNH & TOA THUỐC NGOẠI TRÚ
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Mã Hồ Sơ: <strong className="font-mono text-emerald-400">{selectedEmrAppointment.appointmentCode}</strong></span>
                  {selectedEmrAppointment.queueNumber && <span>STT: <strong className="text-amber-400">{selectedEmrAppointment.queueNumber}</strong></span>}
                  {selectedEmrAppointment.clinicRoom && <span>Phòng: <strong className="text-white">{selectedEmrAppointment.clinicRoom}</strong></span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedEmrAppointment(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable EMR Details */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase">Thông Tin Người Bệnh</div>
                  <div className="font-bold text-base text-slate-900">{profile?.fullName || selectedEmrAppointment.patientName}</div>
                  <div className="text-xs text-slate-600">Mã BN: <span className="font-mono font-bold text-indigo-700">{profile?.patientCode || 'BN-2026-08492'}</span></div>
                  <div className="text-xs text-slate-600">BHYT: <span className="font-mono">{profile?.healthInsuranceNumber || 'DN4791234567890'}</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase">Bác Sĩ Phụ Trách</div>
                  <div className="font-bold text-base text-indigo-900">{selectedEmrAppointment.doctorName}</div>
                  <div className="text-xs text-slate-600">Thời gian khám: {new Date(selectedEmrAppointment.scheduledStart).toLocaleString('vi-VN')}</div>
                  <div className="text-xs text-emerald-700 font-semibold">Trạng thái: Đã hoàn tất & ký duyệt điện tử</div>
                </div>
              </div>

              {/* Vital Signs Cards */}
              {(() => {
                const vs = parseVitalSigns(selectedEmrAppointment.vitalSignsJson);
                if (!vs) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" /> Dấu Hiệu Sinh Tồn Tiếp Đón (Vital Signs)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Huyết Áp</div>
                        <div className="text-base font-black text-rose-700 font-mono">{vs.bloodPressure || '120/80'} <span className="text-xs font-normal">mmHg</span></div>
                      </div>
                      <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Tần Số Mạch</div>
                        <div className="text-base font-black text-sky-700 font-mono">{vs.heartRate || 78} <span className="text-xs font-normal">bpm</span></div>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Thân Nhiệt</div>
                        <div className="text-base font-black text-amber-700 font-mono">{vs.temperature || 36.8} <span className="text-xs font-normal">°C</span></div>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">SpO2 / BMI</div>
                        <div className="text-base font-black text-emerald-700 font-mono">{vs.spO2 || 98}% <span className="text-xs font-normal">({vs.bmi || 21.3})</span></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chief Complaint */}
              {selectedEmrAppointment.chiefComplaint && (
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-slate-400">Lý Do Vào Viện & Triệu Chứng Cơ Năng</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs">
                    {selectedEmrAppointment.chiefComplaint}
                  </div>
                </div>
              )}

              {/* ICD-10 Diagnosis */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-1">
                <div className="text-xs font-bold text-indigo-900 uppercase">Chẩn Đoán Lâm Sàng Chuẩn Quốc Tế (ICD-10)</div>
                <div className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
                  <span className="font-mono bg-indigo-700 text-white px-2 py-0.5 rounded text-xs">
                    {selectedEmrAppointment.icd10Code || 'I20.9'}
                  </span>
                  <span>{selectedEmrAppointment.icd10Name || 'Cơn đau thắt ngực, không xác định (Angina pectoris)'}</span>
                </div>
                {selectedEmrAppointment.consultationNotes && (
                  <p className="text-xs text-slate-700 pt-1 leading-relaxed">
                    {selectedEmrAppointment.consultationNotes}
                  </p>
                )}
              </div>

              {/* E-Prescription Table */}
              {(() => {
                const drugs = parsePrescriptions(selectedEmrAppointment.prescriptionJson);
                if (drugs.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Toa Thuốc Điều Trị Ngoại Trú ({drugs.length} Loại)
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">STT</th>
                            <th className="p-2.5">Tên Biệt Dược & Hoạt Chất</th>
                            <th className="p-2.5">Liều Lượng & Cách Dùng</th>
                            <th className="p-2.5 text-center">Số Lượng</th>
                            <th className="p-2.5 text-center">Ngày Dùng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {drugs.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {d.drugName}
                                {d.activeIngredient && (
                                  <div className="text-[11px] font-normal text-slate-500">({d.activeIngredient})</div>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-700 font-medium">{d.dosage}</td>
                              <td className="p-2.5 text-center font-bold text-indigo-700">{d.quantity} {d.unit}</td>
                              <td className="p-2.5 text-center font-mono text-slate-600">{d.days} ngày</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Treatment Plan & Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {selectedEmrAppointment.treatmentPlan && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-bold text-slate-700 uppercase">Kế Hoạch Điều Trị & Lời Dặn</div>
                    <p className="text-slate-600 leading-relaxed">{selectedEmrAppointment.treatmentPlan}</p>
                  </div>
                )}
                {selectedEmrAppointment.followUpDate && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                    <div className="font-bold text-amber-900 uppercase">Lịch Hẹn Tái Khám</div>
                    <div className="text-sm font-extrabold text-amber-900">
                      📅 {new Date(selectedEmrAppointment.followUpDate).toLocaleDateString('vi-VN')}
                    </div>
                    <p className="text-[11px] text-amber-700">Vui lòng mang theo toa thuốc này khi đến tái khám.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Print Action */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-400 italic">
                * Phiếu khám bệnh & đơn thuốc điện tử được bảo chứng bởi hệ thống y tế MediAssist.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> In Toa Thuốc
                </button>
                <button
                  onClick={() => setSelectedEmrAppointment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
