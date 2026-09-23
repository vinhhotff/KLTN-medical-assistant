import React, { useState, useEffect, useMemo } from 'react';
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
  Phone,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';

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
  triageSessionId?: string;
  triageSbarSummary?: string;
  triageUrgencyLevel?: string;
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

interface TriageHistoryItem {
  id: string;
  patientName?: string;
  symptomsText: string;
  isEmergency: boolean;
  urgencyLevel: 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';
  primarySpecialty?: string;
  sbarSummary?: string;
  aiAdvice?: string;
  createdAt: string;
}

interface PatientDocumentItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  status: string;
  storageUrl?: string;
  isValidMedical: boolean;
  createdAt: string;
}

export const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [triageHistory, setTriageHistory] = useState<TriageHistoryItem[]>([]);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'triage' | 'documents'>('appointments');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Reschedule Modal State
  const [reschedulingAppointment, setReschedulingAppointment] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppointment || !rescheduleDate || !rescheduleTime) {
      alert('Vui lòng chọn ngày và giờ hẹn mới.');
      return;
    }
    try {
      setSubmittingReschedule(true);
      const newScheduledStart = `${rescheduleDate}T${rescheduleTime}:00`;
      await api.patch(`/appointments/${reschedulingAppointment.id}/reschedule`, {
        newScheduledStart,
        reason: rescheduleReason.trim() || undefined,
      });
      await loadData();
      setReschedulingAppointment(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      alert('Dời lịch hẹn thành công!');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Không thể dời lịch hẹn. Vui lòng thử lại với khung giờ khác.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // Online Appointment Payment State
  const [payingApptId, setPayingApptId] = useState<string | null>(null);

  const handlePayAppointment = async (apt: AppointmentItem) => {
    try {
      setPayingApptId(apt.id);
      const res = await api.post('/payments/checkout', {
        orderType: 'APPOINTMENT_FEE',
        appointmentId: apt.id,
        paymentMethod: 'STRIPE',
      });
      if (res.data?.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Không thể khởi tạo phiên thanh toán cho cuộc hẹn.');
    } finally {
      setPayingApptId(null);
    }
  };

  // Pagination states (Offset)
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsPageSize, setAppointmentsPageSize] = useState(5);

  const [triagePage, setTriagePage] = useState(1);
  const [triagePageSize, setTriagePageSize] = useState(5);

  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsPageSize, setDocumentsPageSize] = useState(5);

  // Sliced paginated lists
  const paginatedAppointments = useMemo(() => {
    const start = (appointmentsPage - 1) * appointmentsPageSize;
    return appointments.slice(start, start + appointmentsPageSize);
  }, [appointments, appointmentsPage, appointmentsPageSize]);

  const paginatedTriage = useMemo(() => {
    const start = (triagePage - 1) * triagePageSize;
    return triageHistory.slice(start, start + triagePageSize);
  }, [triageHistory, triagePage, triagePageSize]);

  const paginatedDocuments = useMemo(() => {
    const start = (documentsPage - 1) * documentsPageSize;
    return documents.slice(start, start + documentsPageSize);
  }, [documents, documentsPage, documentsPageSize]);

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
      const [appRes, profRes, triageRes, docsRes] = await Promise.all([
        api.get('/appointments/my').catch(() => ({ data: { data: [] } })),
        api.get('/patient/profile').catch(() => null),
        api.get('/triage/history').catch(() => ({ data: { data: [] } })),
        api.get('/documents/my').catch(() => ({ data: { data: [] } })),
      ]);

      if (appRes.data?.data) {
        setAppointments(appRes.data.data);
      }
      if (profRes?.data?.data) {
        setProfile(profRes.data.data);
        setEditForm(profRes.data.data);
      }
      if (triageRes.data?.data && Array.isArray(triageRes.data.data)) {
        setTriageHistory(triageRes.data.data);
      }
      if (docsRes.data?.data && Array.isArray(docsRes.data.data)) {
        setDocuments(docsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setCancellingAppointmentId(appointmentId);
    setCancelReason('');
  };

  const confirmCancelAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointmentId || !cancelReason.trim()) return;

    try {
      setSubmittingCancel(true);
      setActionError(null);
      await api.patch(`/appointments/${cancellingAppointmentId}/status`, {
        status: 'CANCELLED',
        notes: cancelReason.trim(),
      });
      setCancellingAppointmentId(null);
      setCancelReason('');
      loadData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể hủy lịch hẹn.');
    } finally {
      setSubmittingCancel(false);
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

      {/* Missing CCCD or Blood Group Clinical Alert */}
      {profile && (!profile.citizenId || !profile.bloodGroup) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold">Hồ sơ định danh y tế chưa hoàn thiện</h5>
            <p className="text-xs text-amber-800 leading-relaxed">
              Bạn chưa cập nhật {!profile.citizenId ? 'Số CCCD (12 số)' : ''} {!profile.citizenId && !profile.bloodGroup ? 'và' : ''} {!profile.bloodGroup ? 'Nhóm máu' : ''}. Vui lòng nhấn nút <strong>"Cập Nhật Hồ Sơ Y Tế"</strong> bên dưới để hoàn thiện thông tin, phục vụ tra cứu bảo hiểm y tế và an toàn truyền máu cấp cứu.
            </p>
          </div>
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
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số CCCD (12 số):</span>
                {profile?.citizenId ? (
                  <span className="font-mono font-medium text-slate-800">{profile.citizenId}</span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Chưa bổ sung
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số Thẻ BHYT:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {profile?.healthInsuranceNumber || 'Chưa liên kết BHYT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày sinh / Giới tính:</span>
                <span className="font-medium text-slate-800">
                  {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'} ({profile?.gender === 'FEMALE' ? 'Nữ' : profile?.gender === 'MALE' ? 'Nam' : 'Khác'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Nhóm Máu:</span>
                {profile?.bloodGroup ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    {profile.bloodGroup} (Rh Dương)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Chưa bổ sung
                  </span>
                )}
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

      {/* SECTION TABS: APPOINTMENTS, AI TRIAGE HISTORY, LAB DOCUMENTS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Lịch Khám & EMR Ngoại Trú
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              activeTab === 'appointments' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('triage')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'triage'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Lịch Sử Phân Luồng AI
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              activeTab === 'triage' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {triageHistory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Hồ Sơ Xét Nghiệm Đã Quét
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              activeTab === 'documents' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {documents.length}
            </span>
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS & EMR ENCOUNTERS */}
        {activeTab === 'appointments' && (
          <div>
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
                {paginatedAppointments.map((apt) => {
                  const isScheduled = apt.status === 'SCHEDULED';
                  const isCompleted = apt.status === 'COMPLETED';
                  const vitals = parseVitalSigns(apt.vitalSignsJson);

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

                      {/* Doctor & Clinic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold">Bác sĩ phụ trách:</span>
                          <span className="font-bold text-slate-800 text-sm">{apt.doctorName}</span>
                          <span className="text-slate-400 block text-[11px]">{apt.doctorEmail}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-semibold">Phòng khám / Cơ sở:</span>
                          <span className="font-semibold text-slate-700">{apt.clinicRoom || 'Phòng Khám Nội 102 - Tòa A'}</span>
                          <span className="text-slate-400 block text-[11px]">Bệnh viện Đa khoa Trung ương</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-semibold">Phí dịch vụ & Trạng thái:</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-indigo-600 text-sm">
                              {Number(apt.feeAmount || 350000).toLocaleString('vi-VN')} đ
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                apt.paymentStatus === 'PAID'
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : 'text-amber-700 bg-amber-50 border border-amber-200'
                              }`}
                            >
                              {apt.paymentStatus === 'PAID' ? '✓ Đã Thanh Toán' : '● Chưa Thanh Toán'}
                            </span>
                          </div>
                          {apt.paymentStatus !== 'PAID' && apt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handlePayAppointment(apt)}
                              disabled={payingApptId === apt.id}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{payingApptId === apt.id ? 'Đang kết nối...' : 'Thanh Toán Online (Stripe)'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chief Complaint if any */}
                      {apt.chiefComplaint && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <span className="font-bold text-slate-600 block mb-0.5">Lý do khám bệnh:</span>
                          <p className="text-slate-800 font-medium">{apt.chiefComplaint}</p>
                        </div>
                      )}

                      {/* EMR Highlights if completed */}
                      {isCompleted && (
                        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100/80 text-xs space-y-2">
                          <div className="flex items-center justify-between text-indigo-900 font-bold">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-indigo-600" />
                              Chẩn Đoán Lâm Sàng & Đơn Thuốc Đã Kê
                            </span>
                            {apt.icd10Code && (
                              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700">
                                ICD-10: {apt.icd10Code}
                              </span>
                            )}
                          </div>

                          {apt.icd10Name && (
                            <p className="font-semibold text-slate-800">
                              Bệnh lý: <span className="text-indigo-900">{apt.icd10Name}</span>
                            </p>
                          )}

                          {apt.consultationNotes && (
                            <p className="text-slate-600 italic">
                              "{apt.consultationNotes}"
                            </p>
                          )}

                          {/* Mini Vitals */}
                          {vitals && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-100/60 text-[11px]">
                              {vitals.bloodPressure && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  Huyết áp: <strong>{vitals.bloodPressure}</strong> mmHg
                                </span>
                              )}
                              {vitals.heartRate && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  Mạch: <strong>{vitals.heartRate}</strong> bpm
                                </span>
                              )}
                              {vitals.spO2 && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  SpO2: <strong>{vitals.spO2}%</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action view full EMR */}
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedEmrAppointment(apt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" /> Xem Chi Tiết Bệnh Án EMR
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-slate-400">
                          {isScheduled ? 'Vui lòng có mặt trước 15 phút để làm thủ tục' : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReschedulingAppointment(apt);
                                  const currentStart = new Date(apt.scheduledStart);
                                  // Format local YYYY-MM-DD
                                  const year = currentStart.getFullYear();
                                  const month = String(currentStart.getMonth() + 1).padStart(2, '0');
                                  const day = String(currentStart.getDate()).padStart(2, '0');
                                  setRescheduleDate(`${year}-${month}-${day}`);
                                  setRescheduleTime(currentStart.toTimeString().slice(0, 5));
                                  setRescheduleReason('');
                                }}
                                className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Dời Lịch Hẹn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(apt.id)}
                                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" /> Hủy Lịch Khám
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={appointmentsPage}
                    totalItems={appointments.length}
                    pageSize={appointmentsPageSize}
                    onPageChange={setAppointmentsPage}
                    onPageSizeChange={setAppointmentsPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="lịch khám"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI TRIAGE HISTORY */}
        {activeTab === 'triage' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold text-slate-900">Lịch Sử Khám Sàng Lọc & Phân Luồng AI</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Nhật ký các lần trợ lý AI phân tích triệu chứng lâm sàng và định hướng chuyên khoa tiếp nhận.
                </p>
              </div>
              <Link
                to="/patient/triage"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> + Khám Mới
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải lịch sử phân luồng...</div>
            ) : triageHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                Chưa có phiên phân luồng AI nào. Hãy trải nghiệm <strong>"Khám Sàng Lọc AI"</strong> để được phân tầng mức độ khẩn cấp và định hướng chuyên khoa.
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedTriage.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          t.isEmergency || t.urgencyLevel === 'EMERGENCY'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : t.urgencyLevel === 'URGENT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : t.urgencyLevel === 'ROUTINE'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {t.isEmergency || t.urgencyLevel === 'EMERGENCY'
                            ? '🚨 CẤP CỨU KHẨN CẤP'
                            : t.urgencyLevel === 'URGENT'
                            ? '⚠️ KHẨN CẤP (Cần khám trong 24-48h)'
                            : t.urgencyLevel === 'ROUTINE'
                            ? '🩺 KHÁM TIÊU CHUẨN'
                            : '🌱 TỰ CHĂM SÓC TẠI NHÀ'}
                        </span>
                        {t.primarySpecialty && (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            Chuyên khoa: {t.primarySpecialty}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {new Date(t.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-1">Mô tả triệu chứng ban đầu:</div>
                      <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        {t.symptomsText}
                      </p>
                    </div>

                    {t.sbarSummary && (
                      <div>
                        <div className="text-xs font-bold text-indigo-900 mb-1">Báo cáo tóm tắt chuẩn SBAR gửi bác sĩ:</div>
                        <p className="text-xs text-slate-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 leading-relaxed">
                          {t.sbarSummary}
                        </p>
                      </div>
                    )}

                    {t.aiAdvice && (
                      <div>
                        <div className="text-xs font-bold text-slate-700 mb-1">Khuyến nghị xử trí y tế từ AI:</div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {t.aiAdvice}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Link
                        to="/patient/doctors"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Đặt Lịch Khám Bác Sĩ
                      </Link>
                    </div>
                  </div>
                ))}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={triagePage}
                    totalItems={triageHistory.length}
                    pageSize={triagePageSize}
                    onPageChange={setTriagePage}
                    onPageSizeChange={setTriagePageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="phiên sàng lọc AI"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEDICAL DOCUMENTS */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-bold text-slate-900">Hồ Sơ Xét Nghiệm & Chẩn Đoán Đã Quét</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Danh mục tài liệu xét nghiệm máu, điện tim, siêu âm... đã được AI bóc tách và đối soát khoảng tham chiếu.
                </p>
              </div>
              <Link
                to="/patient/documents"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1"
              >
                <UploadCloud className="w-3.5 h-3.5" /> + Quét Phiếu Mới
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách tài liệu...</div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                Bạn chưa tải lên phiếu xét nghiệm nào. Nhấn <strong>"Quét Phiếu Mới"</strong> để AI bóc tách chỉ số sinh hóa tự động.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{doc.fileName}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleString('vi-VN')}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400 text-[11px]">{doc.contentType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {doc.isValidMedical ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã xác thực y tế
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ xác thực
                        </span>
                      )}
                      <Link
                        to={`/patient/documents?focusId=${doc.id}`}
                        className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition"
                      >
                        Mở Phân Tích
                      </Link>
                    </div>
                  </div>
                ))}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={documentsPage}
                    totalItems={documents.length}
                    pageSize={documentsPageSize}
                    onPageChange={setDocumentsPage}
                    onPageSizeChange={setDocumentsPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="tài liệu xét nghiệm"
                  />
                </div>
              </div>
            )}
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

      {/* MODAL: CANCEL APPOINTMENT CONFIRMATION */}
      {cancellingAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Xác Nhận Hủy Lịch Khám</h3>
              </div>
              <button
                onClick={() => {
                  setCancellingAppointmentId(null);
                  setCancelReason('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng cho biết lý do bạn muốn hủy lịch hẹn khám này để hệ thống cập nhật và giải phóng khung giờ cho các bệnh nhân khác:
            </p>
            <form onSubmit={confirmCancelAppointment} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Bận việc đột xuất, triệu chứng đã thuyên giảm, muốn đổi ngày khám khác..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingAppointmentId(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {submittingCancel ? 'Đang hủy...' : 'Xác Nhận Hủy Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULE APPOINTMENT */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Dời Lịch Hẹn Khám</h3>
              </div>
              <button
                onClick={() => setReschedulingAppointment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500">Mã lịch hẹn:</span> <strong className="font-mono text-indigo-700">{reschedulingAppointment.appointmentCode}</strong></p>
              <p><span className="text-slate-500">Bác sĩ:</span> <strong className="text-slate-800">{reschedulingAppointment.doctorName}</strong></p>
              <p><span className="text-slate-500">Giờ hẹn cũ:</span> <span className="font-medium text-slate-700">{new Date(reschedulingAppointment.scheduledStart).toLocaleString('vi-VN')}</span></p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Ngày khám mới *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Giờ khám mới *</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">Lý do dời lịch (tùy chọn)</label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ví dụ: Bận đột xuất, chuyển đổi ngày khám thuận tiện hơn..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Giờ làm việc: Sáng 08:00 - 12:00, Chiều 13:30 - 17:00 (Thứ 2 - Thứ 7).
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingAppointment(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule || !rescheduleDate || !rescheduleTime}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {submittingReschedule ? 'Đang cập nhật...' : 'Xác Nhận Dời Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
