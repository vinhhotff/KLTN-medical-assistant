import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CreditCard,
  Star,
  QrCode,
  Camera,
  Loader2,
  Video,
  Building2,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { api, DoctorReviewDto, EMAIL_NOT_VERIFIED_MESSAGE, EMAIL_NOT_VERIFIED_TOOLTIP, isEmailNotVerified } from '../../services/api';

gsap.registerPlugin(useGSAP);
import { useAuthStore } from '../../store/useAuthStore';
import { useEmailVerification } from '../../hooks/useEmailVerification';
import { Pagination } from '../../components/common/Pagination';
import { DoctorReviewModal } from '../../components/common/DoctorReviewModal';
import { AdmissionTicketModal } from '../../components/patient/AdmissionTicketModal';
import { TelehealthRoomModal } from '../../components/telehealth/TelehealthRoomModal';
import { ConsultationChatModal } from '../../components/telehealth/ConsultationChatModal';
import { SlotPicker, slotStart, type DoctorSlot } from '../../components/booking/SlotPicker';
import { Button, ErrorState, Missing, Modal, useToast } from '../../components/ui';
import { VitalValue } from '../../components/clinical/VitalValue';
import { hasVital, parseStoredVitals } from '../../utils/vitals';
import { datePart, todayLocal } from '../../utils/date';
import { formatVnd } from '../../utils/display';
import { getApiErrorMessage } from '../../utils/apiError';
import { devLog } from '../../utils/logger';

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
  avatarUrl?: string;
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
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feeAmount: number | null;
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
  clinicFloor?: string;
  clinicBuilding?: string;
  clinicAddress?: string;
  clinicMapUrl?: string;
  qrCodeData?: string;
  sttNumber?: string;
  preVisitInstructions?: string[];
  consultationType?: 'IN_PERSON' | 'ONLINE';
  meetingRoomCode?: string | null;
  meetingUrl?: string | null;
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
  hasFile?: boolean;
  isValidMedical: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<AppointmentItem['status'], { text: string; className: string }> = {
  SCHEDULED: { text: '● Đã xếp lịch', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  CHECKED_IN: { text: '● Đã check-in', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  IN_PROGRESS: { text: '● Đang khám', className: 'bg-amber-50 text-amber-800 border border-amber-200' },
  COMPLETED: { text: '✓ Đã khám xong', className: 'bg-sky-50 text-sky-700 border border-sky-200' },
  CANCELLED: { text: '✕ Đã hủy', className: 'bg-rose-50 text-rose-700 border border-rose-200' },
  NO_SHOW: { text: '✕ Vắng mặt', className: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

export const PatientDashboard: React.FC = () => {
  const toast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.gsap-patient-block', {
          y: 22,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 0.5,
          ease: 'power3.out',
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef }
  );
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
  const [rescheduleSlot, setRescheduleSlot] = useState<DoctorSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const { user, refreshCurrentUser } = useAuthStore();
  const { isUnverified } = useEmailVerification();

  // Admission Ticket Modal State
  const [selectedTicketAppointment, setSelectedTicketAppointment] = useState<AppointmentItem | null>(null);
  // Telehealth Video Room & Chat Drawer State
  const [videoRoomAppointment, setVideoRoomAppointment] = useState<AppointmentItem | null>(null);
  const [chatAppointment, setChatAppointment] = useState<AppointmentItem | null>(null);

  const openReschedule = (apt: AppointmentItem) => {
    setReschedulingAppointment(apt);
    const current = datePart(apt.scheduledStart);
    setRescheduleDate(current && current >= todayLocal() ? current : todayLocal());
    setRescheduleSlot(null);
    setRescheduleReason('');
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingAppointment || !rescheduleSlot || submittingReschedule) return;
    try {
      setSubmittingReschedule(true);
      await api.patch(`/appointments/${reschedulingAppointment.id}/reschedule`, {
        newScheduledStart: slotStart(rescheduleSlot, rescheduleDate),
        reason: rescheduleReason.trim() || undefined,
      });
      await loadData();
      setReschedulingAppointment(null);
      setRescheduleSlot(null);
      setRescheduleReason('');
      toast.success('Đã dời lịch hẹn thành công.');
    } catch (err: unknown) {
      if (isEmailNotVerified(err)) {
        toast.error(EMAIL_NOT_VERIFIED_MESSAGE);
        return;
      }
      toast.error(getApiErrorMessage(err, 'Không thể dời lịch hẹn. Vui lòng chọn khung giờ khác.'));
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // Online Appointment Payment State
  const [payingApptId, setPayingApptId] = useState<string | null>(null);

  const handlePayAppointment = async (apt: AppointmentItem) => {
    if (payingApptId) return;
    try {
      setPayingApptId(apt.id);
      const res = await api.post('/payments/checkout', {
        orderType: 'APPOINTMENT_FEE',
        appointmentId: apt.id,
        paymentMethod: 'STRIPE',
      });
      const checkoutUrl = res.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      toast.error('Cổng thanh toán không trả về đường dẫn thanh toán. Vui lòng thử lại sau hoặc thanh toán tại quầy.');
    } catch (err: unknown) {
      if (isEmailNotVerified(err)) {
        toast.error(EMAIL_NOT_VERIFIED_MESSAGE);
        return;
      }
      toast.error(getApiErrorMessage(err, 'Không thể khởi tạo phiên thanh toán cho cuộc hẹn.'));
    } finally {
      setPayingApptId(null);
    }
  };

  // Appointment Filters & Sorting (default UPCOMING so active appointments are never mixed with cancelled ones)
  const [aptStatusFilter, setAptStatusFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');
  const [aptTypeFilter, setAptTypeFilter] = useState<'ALL' | 'ONLINE' | 'IN_PERSON'>('ALL');
  const [aptSort, setAptSort] = useState<'SMART' | 'NEWEST' | 'OLDEST'>('SMART');
  const [aptSearch, setAptSearch] = useState('');
  const initializedAptTabRef = React.useRef(false);

  // Pagination states (Offset)
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsPageSize, setAppointmentsPageSize] = useState(5);

  const [triagePage, setTriagePage] = useState(1);
  const [triagePageSize, setTriagePageSize] = useState(5);

  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsPageSize, setDocumentsPageSize] = useState(5);

  const appointmentCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;
    for (const a of appointments) {
      if (a.status === 'SCHEDULED' || a.status === 'CHECKED_IN' || a.status === 'IN_PROGRESS') upcoming++;
      else if (a.status === 'COMPLETED') completed++;
      else if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') cancelled++;
    }
    return { all: appointments.length, upcoming, completed, cancelled };
  }, [appointments]);

  const filteredSortedAppointments = useMemo(() => {
    const query = aptSearch.trim().toLowerCase();
    const filtered = appointments.filter((a) => {
      if (aptStatusFilter === 'UPCOMING') {
        if (a.status !== 'SCHEDULED' && a.status !== 'CHECKED_IN' && a.status !== 'IN_PROGRESS') return false;
      } else if (aptStatusFilter === 'COMPLETED') {
        if (a.status !== 'COMPLETED') return false;
      } else if (aptStatusFilter === 'CANCELLED') {
        if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') return false;
      }

      if (aptTypeFilter !== 'ALL') {
        const type = a.consultationType === 'ONLINE' ? 'ONLINE' : 'IN_PERSON';
        if (type !== aptTypeFilter) return false;
      }

      if (query) {
        const hay = `${a.appointmentCode || ''} ${a.doctorName || ''} ${a.clinicRoom || ''} ${a.clinicAddress || ''} ${a.chiefComplaint || ''} ${a.icd10Name || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const nowCutoff = Date.now() - 2 * 60 * 60 * 1000;
    const statusRank = (a: AppointmentItem): number => {
      switch (a.status) {
        case 'IN_PROGRESS': return 0;
        case 'CHECKED_IN': return 1;
        case 'SCHEDULED': {
          const t = new Date(a.scheduledStart).getTime() || 0;
          return t >= nowCutoff ? 2 : 3; // Future/upcoming first, overdue scheduled after
        }
        case 'COMPLETED': return 4;
        case 'CANCELLED':
        case 'NO_SHOW':
        default:
          return 5;
      }
    };

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.scheduledStart).getTime() || 0;
      const timeB = new Date(b.scheduledStart).getTime() || 0;
      if (aptSort === 'NEWEST') return timeB - timeA;
      if (aptSort === 'OLDEST') return timeA - timeB;

      // SMART sort: active/upcoming soonest-first, then overdue/completed/cancelled newest-first
      const rankA = statusRank(a);
      const rankB = statusRank(b);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA <= 2) return timeA - timeB;
      return timeB - timeA;
    });
  }, [appointments, aptStatusFilter, aptTypeFilter, aptSort, aptSearch]);

  useEffect(() => {
    if (!loading && !initializedAptTabRef.current && appointments.length > 0) {
      initializedAptTabRef.current = true;
      if (appointmentCounts.upcoming === 0) {
        setAptStatusFilter('ALL');
      }
    }
  }, [loading, appointments.length, appointmentCounts.upcoming]);

  useEffect(() => {
    setAppointmentsPage(1);
  }, [aptStatusFilter, aptTypeFilter, aptSort, aptSearch]);

  // Sliced paginated lists
  const paginatedAppointments = useMemo(() => {
    const start = (appointmentsPage - 1) * appointmentsPageSize;
    return filteredSortedAppointments.slice(start, start + appointmentsPageSize);
  }, [filteredSortedAppointments, appointmentsPage, appointmentsPageSize]);

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
  const [uploadingPatientAvatar, setUploadingPatientAvatar] = useState(false);
  const patientAvatarRef = useRef<HTMLInputElement>(null);

  const handlePatientAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 10MB.');
      return;
    }
    try {
      setUploadingPatientAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/storage/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.data?.url;
      if (uploadedUrl) {
        setEditForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        await refreshCurrentUser();
        toast.success('Đã tải ảnh đại diện lên Supabase thành công!');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể tải ảnh đại diện lên Supabase.'));
    } finally {
      setUploadingPatientAvatar(false);
      if (patientAvatarRef.current) patientAvatarRef.current.value = '';
    }
  };

  // EMR Details Modal State
  const [selectedEmrAppointment, setSelectedEmrAppointment] = useState<AppointmentItem | null>(null);

  // Doctor Review & Rating States
  const [reviewsMap, setReviewsMap] = useState<Record<string, DoctorReviewDto>>({});
  const [reviewingAppointment, setReviewingAppointment] = useState<AppointmentItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      let failed = 0;
      const soft = <T,>(p: Promise<T>): Promise<T | null> =>
        p.catch((err) => {
          failed += 1;
          devLog.warn('Patient dashboard request failed', err);
          return null;
        });
      const [appRes, profRes, triageRes, docsRes, reviewsRes] = await Promise.all([
        soft(api.get('/appointments/my')),
        soft(api.get('/patient/profile')),
        soft(api.get('/triage/history')),
        soft(api.get('/documents/my')),
        soft(api.get('/reviews/my')),
      ]);
      setLoadError(failed > 0 ? 'Một phần dữ liệu chưa tải được. Thông tin bên dưới có thể chưa đầy đủ.' : null);

      if (appRes?.data?.data) {
        setAppointments(appRes.data.data);
      }
      if (profRes?.data?.data) {
        setProfile(profRes.data.data);
        setEditForm(profRes.data.data);
      }
      if (Array.isArray(triageRes?.data?.data)) {
        setTriageHistory(triageRes.data.data);
      }
      if (Array.isArray(docsRes?.data?.data)) {
        setDocuments(docsRes.data.data);
      }
      if (Array.isArray(reviewsRes?.data?.data)) {
        const map: Record<string, DoctorReviewDto> = {};
        reviewsRes.data.data.forEach((r: DoctorReviewDto) => {
          if (r.appointmentId) {
            map[r.appointmentId] = r;
          }
        });
        setReviewsMap(map);
      }
    } catch (err) {
      devLog.error('Failed to load patient dashboard data:', err);
      setLoadError('Không tải được dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = (newReview: DoctorReviewDto) => {
    if (newReview.appointmentId) {
      setReviewsMap((prev) => ({
        ...prev,
        [newReview.appointmentId]: newReview,
      }));
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
      toast.success('Đã hủy lịch khám.');
      loadData();
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, 'Không thể hủy lịch hẹn. Vui lòng kiểm tra lại trạng thái ca khám.'));
    } finally {
      setSubmittingCancel(false);
    }
  };

  const profileErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (editForm.fullName !== undefined && !editForm.fullName.trim()) {
      errs.fullName = 'Họ và tên không được để trống.';
    }
    const contactPhone = (editForm.phone || '').replace(/[\s\-.]/g, '');
    if (contactPhone && !/^(0|\+84)(3[2-9]|5[6-9]|7[0-9]|8[1-9]|9[0-9])\d{7}$/.test(contactPhone)) {
      errs.phone = 'Số điện thoại không đúng định dạng Việt Nam (VD: 0901234567).';
    }
    const bhyt = (editForm.healthInsuranceNumber || '').trim().toUpperCase();
    if (bhyt && !/^[A-Z]{2}[A-Z0-9]{10,14}$/.test(bhyt)) {
      errs.healthInsuranceNumber = 'Số thẻ BHYT gồm 2 chữ cái đầu + 10–14 ký tự (VD: GD4791234567890).';
    }
    const cid = (editForm.citizenId || '').trim();
    if (cid && !/^\d{12}$/.test(cid)) errs.citizenId = 'Số CCCD gồm đúng 12 chữ số.';
    if (editForm.dateOfBirth && String(editForm.dateOfBirth) > todayLocal()) errs.dateOfBirth = 'Ngày sinh không được ở tương lai.';
    const emergencyPhone = (editForm.emergencyContactPhone || '').replace(/\s/g, '');
    if (emergencyPhone && !/^(\+?84|0)\d{9,10}$/.test(emergencyPhone)) errs.emergencyContactPhone = 'Số điện thoại không hợp lệ.';
    return errs;
  }, [editForm]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile || Object.keys(profileErrors).length > 0) return;
    try {
      setSavingProfile(true);
      setActionError(null);
      const res = await api.put('/patient/profile', editForm);
      if (res.data?.data) {
        setProfile(res.data.data);
        void refreshCurrentUser();
        toast.success('Đã cập nhật hồ sơ y tế.');
        setIsEditProfileOpen(false);
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Không thể cập nhật hồ sơ y tế.'));
    } finally {
      setSavingProfile(false);
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
    <div ref={rootRef} className="space-y-8">
      {loadError && <ErrorState message={loadError} onRetry={loadData} retrying={loading} />}

      {/* Aether Bio-Atelier Hero Observatory — Light Clinical Palette */}
      <div className="gsap-patient-block bg-white rounded-3xl p-6 sm:p-8 text-slate-900 border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 font-mono text-[11px] uppercase tracking-widest text-teal-800 font-bold mb-3">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>BIO-CARE OBSERVATORY // HOSPITAL PATIENT PORTAL</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Quản Lý Hồ Sơ Bệnh Án &amp;{' '}
            <span className="font-bold text-teal-600">Chăm Sóc Sức Khỏe Toàn Diện</span>
          </h1>
          <p className="mt-2.5 text-slate-600 text-sm md:text-base leading-relaxed">
            Hệ thống Bệnh án Điện tử (EMR) chuẩn hóa Bộ Y Tế. Theo dõi kết quả xét nghiệm, lịch sử thăm khám, dấu hiệu sinh tồn và đơn thuốc ngoại trú minh bạch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/patient/triage"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 text-white font-display font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 hover:bg-teal-700 transition"
            >
              <MessageSquare className="w-4 h-4 text-teal-100" />
              Khám Sàng Lọc AI
            </Link>
            <Link
              to="/patient/doctors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FCFBF8] border border-slate-200/90 text-slate-800 font-display font-bold text-xs sm:text-sm hover:bg-slate-100/80 transition shadow-2xs"
            >
              <Calendar className="w-4 h-4 text-teal-600" />
              Đặt Lịch Bác Sĩ
            </Link>
            <Link
              to="/patient/documents"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FCFBF8] border border-slate-200/90 text-slate-800 font-display font-bold text-xs sm:text-sm hover:bg-slate-100/80 transition shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-teal-600" />
              Quét Phiếu Xét Nghiệm
            </Link>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}


      {/* Missing CCCD or Blood Group Clinical Alert */}
      {profile && (!profile.citizenId || !profile.bloodGroup) && (
        <div className="gsap-patient-block p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-display font-bold">Hồ sơ định danh y tế chưa hoàn thiện</h5>
            <p className="text-xs text-amber-800 leading-relaxed">
              Bạn chưa cập nhật {!profile.citizenId ? 'Số CCCD (12 số)' : ''} {!profile.citizenId && !profile.bloodGroup ? 'và' : ''} {!profile.bloodGroup ? 'Nhóm máu' : ''}. Vui lòng nhấn nút <strong>"Cập Nhật Hồ Sơ Y Tế"</strong> bên dưới để hoàn thiện thông tin, phục vụ tra cứu bảo hiểm y tế và an toàn truyền máu cấp cứu.
            </p>
          </div>
        </div>
      )}

      {/* PATIENT MEDICAL PASSPORT & EMR IDENTITY CARD */}
      <div className="gsap-patient-block bg-[#FCFBF8] rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900 border-b border-slate-200/90">
          <div className="flex items-center gap-3">
            {user?.avatarUrl || profile?.avatarUrl ? (
              <img
                src={user?.avatarUrl || profile?.avatarUrl}
                alt={profile?.fullName || user?.fullName || 'Bệnh nhân'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-teal-500 shadow-md shadow-teal-600/20 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center font-bold text-white shadow-md shadow-teal-600/20">
                <Heart className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-teal-700 font-bold">
                Thẻ Bệnh Án Điện Tử &amp; Căn Cước Y Tế (EMR Medical Passport)
              </div>
              <div className="font-display text-lg font-bold">
                Mã Bệnh Nhân: {profile?.patientCode ? <span className="font-mono text-emerald-700 font-bold">{profile.patientCode}</span> : <span className="text-sm font-normal text-slate-400 italic">Chưa được cấp</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditForm({ fullName: user?.fullName || '', phone: user?.phone || '', ...(profile || {}) });
              setIsEditProfileOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100/80 font-display text-xs font-bold text-teal-800 border border-teal-200/80 transition cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
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
                <span className="font-bold text-slate-900">{profile?.fullName || user?.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số Điện Thoại:</span>
                {profile?.phone || user?.phone ? (
                  <span className="font-mono font-medium text-slate-800">{profile?.phone || user?.phone}</span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Chưa bổ sung
                  </span>
                )}
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
                {profile?.healthInsuranceNumber ? (
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {profile.healthInsuranceNumber}
                  </span>
                ) : (
                  <Missing label="Chưa liên kết BHYT" />
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày sinh / Giới tính:</span>
                <span className="font-medium text-slate-800">
                  {profile?.dateOfBirth ? new Date(`${profile.dateOfBirth}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                  {' · '}
                  {profile?.gender === 'FEMALE' ? 'Nữ' : profile?.gender === 'MALE' ? 'Nam' : profile?.gender === 'OTHER' ? 'Khác' : 'Chưa cập nhật'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Nhóm Máu:</span>
                {profile?.bloodGroup ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    {profile.bloodGroup}
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
                {profile?.allergies || <span className="font-normal italic text-slate-500">Chưa khai báo dị ứng. Hãy cập nhật nếu bạn từng dị ứng thuốc hoặc thực phẩm.</span>}
              </p>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <span className="text-slate-400 font-semibold">Tiền Sử Bệnh Lý:</span>
              <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                {profile?.medicalHistory || <span className="font-normal italic text-slate-500">Chưa cập nhật</span>}
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
                  {profile?.address || <Missing />}
                </p>
              </div>
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  Người Thân Cấp Cứu 24/7:
                </div>
                {profile?.emergencyContactName || profile?.emergencyContactPhone ? (
                  <>
                    <div className="font-semibold text-slate-900">
                      {profile.emergencyContactName || 'Chưa có tên'}
                      {profile.emergencyContactRelationship && ` (${profile.emergencyContactRelationship})`}
                    </div>
                    {profile.emergencyContactPhone ? (
                      <a href={`tel:${profile.emergencyContactPhone.replace(/\s/g, '')}`} className="font-mono text-indigo-700 font-bold hover:underline">
                        {profile.emergencyContactPhone}
                      </a>
                    ) : (
                      <Missing label="Chưa có số điện thoại" />
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-slate-500 italic">Chưa cập nhật người liên hệ khẩn cấp.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm({ fullName: user?.fullName || '', phone: user?.phone || '', ...(profile || {}) });
                        setIsEditProfileOpen(true);
                      }}
                      className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                    >
                      Cập nhật hồ sơ
                    </button>
                  </div>
                )}
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
            <div className="flex items-center justify-between mb-4">
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

            {appointments.length > 0 && (
              <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo trạng thái lịch khám">
                    {([
                      { key: 'ALL', label: 'Tất cả', count: appointmentCounts.all },
                      { key: 'UPCOMING', label: 'Đang đặt / Sắp khám', count: appointmentCounts.upcoming },
                      { key: 'COMPLETED', label: 'Đã hoàn thành', count: appointmentCounts.completed },
                      { key: 'CANCELLED', label: 'Đã hủy / Vắng', count: appointmentCounts.cancelled },
                    ] as const).map((tab) => {
                      const active = aptStatusFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setAptStatusFilter(tab.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                              active ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Type & Sort Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Lọc theo hình thức khám"
                      value={aptTypeFilter}
                      onChange={(e) => setAptTypeFilter(e.target.value as 'ALL' | 'ONLINE' | 'IN_PERSON')}
                      className="h-8 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">Mọi hình thức</option>
                      <option value="ONLINE">Khám Online</option>
                      <option value="IN_PERSON">Khám Trực Tiếp</option>
                    </select>
                    <select
                      aria-label="Sắp xếp lịch khám"
                      value={aptSort}
                      onChange={(e) => setAptSort(e.target.value as 'SMART' | 'NEWEST' | 'OLDEST')}
                      className="h-8 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SMART">Ưu tiên lịch sắp khám</option>
                      <option value="NEWEST">Mới nhất trước</option>
                      <option value="OLDEST">Cũ nhất trước</option>
                    </select>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={aptSearch}
                    onChange={(e) => setAptSearch(e.target.value)}
                    placeholder="Tìm theo mã lịch hẹn (APT-...), tên bác sĩ, chuyên khoa hoặc bệnh viện..."
                    className="w-full h-9 pl-8 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  {aptSearch && (
                    <button
                      type="button"
                      onClick={() => setAptSearch('')}
                      aria-label="Xóa tìm kiếm"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải lịch sử khám bệnh...</div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                Bạn chưa có lịch hẹn khám nào. Hãy nhấn <strong>"Đặt Lịch Mới"</strong> để tìm bác sĩ chuyên khoa.
              </div>
            ) : filteredSortedAppointments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-2xl space-y-2">
                <p>Không tìm thấy lịch hẹn nào khớp với bộ lọc hiện tại.</p>
                <button
                  type="button"
                  onClick={() => {
                    setAptStatusFilter('ALL');
                    setAptTypeFilter('ALL');
                    setAptSearch('');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAppointments.map((apt) => {
                  const isScheduled = apt.status === 'SCHEDULED';
                  const isCompleted = apt.status === 'COMPLETED';
                  const isCancelled = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
                  const statusInfo = STATUS_LABEL[apt.status] ?? STATUS_LABEL.SCHEDULED;
                  const fee = formatVnd(apt.feeAmount);
                  const vitals = parseStoredVitals(apt.vitalSignsJson);
                  const formattedTime = new Date(apt.scheduledStart).toLocaleString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-2xl border transition shadow-xs flex flex-col gap-3 ${
                        isCancelled
                          ? 'bg-slate-50/80 border-slate-200/80 opacity-85'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {/* Compact Top Header: Time + Code + Mode on left, Status on right */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            {formattedTime}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {apt.appointmentCode}
                          </span>
                          {apt.queueNumber && !isCancelled && (
                            <span className="font-mono text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              STT {apt.queueNumber}
                            </span>
                          )}
                          {apt.consultationType === 'ONLINE' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Video className="w-3 h-3" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Building2 className="w-3 h-3" /> Trực tiếp
                            </span>
                          )}
                        </div>

                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${statusInfo.className}`}>
                          {statusInfo.text}
                        </span>
                      </div>

                      {/* Balanced 2-Column Body */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-start">
                        <div className="md:col-span-7 space-y-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-bold text-slate-900 text-sm">{apt.doctorName}</span>
                            {apt.consultationType === 'ONLINE' ? (
                              <span className="text-indigo-700 font-semibold">
                                • {apt.clinicRoom || 'Phòng Video Call & Chat'}
                                {apt.meetingRoomCode ? ` (${apt.meetingRoomCode})` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">
                                • {apt.clinicRoom || 'Chờ xếp phòng'}
                                {apt.clinicAddress ? ` — ${apt.clinicAddress}` : ''}
                              </span>
                            )}
                          </div>
                          {apt.chiefComplaint && (
                            <p className="text-slate-600 line-clamp-1">
                              <span className="font-semibold text-slate-500">Lý do:</span> {apt.chiefComplaint}
                            </p>
                          )}
                        </div>

                        <div className="md:col-span-5 flex flex-wrap md:flex-col md:items-end justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            {fee ? (
                              <span className="font-bold text-indigo-700 text-sm tabular-nums">{fee}</span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa có phí</span>
                            )}
                            {!isCancelled && (
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  apt.paymentStatus === 'PAID'
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                                }`}
                              >
                                {apt.paymentStatus === 'PAID' ? '✓ Đã thanh toán' : '● Chưa thanh toán'}
                              </span>
                            )}
                          </div>
                          {apt.paymentStatus !== 'PAID' && !isCancelled && fee && (
                            <button
                              type="button"
                              onClick={() => handlePayAppointment(apt)}
                              disabled={payingApptId !== null || isUnverified}
                              title={isUnverified ? EMAIL_NOT_VERIFIED_TOOLTIP : undefined}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{payingApptId === apt.id ? 'Đang kết nối...' : 'Thanh Toán Online'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* EMR Highlights (only for COMPLETED) */}
                      {isCompleted && (
                        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100/80 text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-indigo-900 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-indigo-600" />
                              {apt.icd10Name ? `Chẩn đoán: ${apt.icd10Name}` : 'Kết quả khám & Đơn thuốc'}
                            </span>
                            {apt.icd10Code && (
                              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                                ICD-10: {apt.icd10Code}
                              </span>
                            )}
                          </div>

                          {apt.consultationNotes && (
                            <p className="text-slate-600 italic line-clamp-2">"{apt.consultationNotes}"</p>
                          )}

                          {vitals && (hasVital(vitals.bloodPressure) || hasVital(vitals.heartRate) || hasVital(vitals.spO2)) && (
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {hasVital(vitals.bloodPressure) && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  HA: <strong>{vitals.bloodPressure}</strong> mmHg
                                </span>
                              )}
                              {hasVital(vitals.heartRate) && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  Mạch: <strong>{vitals.heartRate}</strong> bpm
                                </span>
                              )}
                              {hasVital(vitals.spO2) && (
                                <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">
                                  SpO2: <strong>{vitals.spO2}%</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unified Compact Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400">
                          {isScheduled
                            ? apt.consultationType === 'ONLINE'
                              ? 'Vào phòng Online trước 5–10 phút để kiểm tra mic & camera'
                              : 'Vui lòng có mặt trước 15 phút để làm thủ tục'
                            : isCancelled
                              ? 'Lịch hẹn đã kết thúc — bạn vẫn có thể xem lại lịch sử trao đổi'
                              : ''}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {apt.consultationType === 'ONLINE' &&
                            (apt.status === 'SCHEDULED' || apt.status === 'CHECKED_IN' || apt.status === 'IN_PROGRESS') && (
                              <button
                                type="button"
                                onClick={() => setVideoRoomAppointment(apt)}
                                className="h-8 px-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Vào Phòng Video</span>
                              </button>
                            )}

                          {isCompleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedEmrAppointment(apt)}
                                className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Xem Bệnh Án</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingAppointment(apt);
                                  setReviewModalOpen(true);
                                }}
                                className={`h-8 px-2.5 rounded-xl font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                                  reviewsMap[apt.id]
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${reviewsMap[apt.id] ? 'fill-amber-400 text-amber-400' : 'fill-white text-white'}`} />
                                <span>{reviewsMap[apt.id] ? `${reviewsMap[apt.id].rating}★` : 'Đánh giá'}</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setChatAppointment(apt)}
                            className="h-8 px-2.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isCompleted || isCancelled ? 'Lịch Sử Chat' : 'Nhắn Tin'}</span>
                          </button>

                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => setSelectedTicketAppointment(apt)}
                              className="h-8 px-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              title={apt.consultationType === 'ONLINE' ? 'Xem vé khám trực tuyến' : 'Xem phiếu khám QR & số thứ tự'}
                            >
                              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{apt.consultationType === 'ONLINE' ? 'Vé Online' : 'Phiếu Khám'}</span>
                            </button>
                          )}

                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReschedule(apt)}
                                disabled={isUnverified}
                                title={isUnverified ? EMAIL_NOT_VERIFIED_TOOLTIP : undefined}
                                className="h-8 px-2.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl font-bold transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Dời Lịch
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(apt.id)}
                                className="h-8 px-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" /> Hủy
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
                    totalItems={filteredSortedAppointments.length}
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
                        to={
                          t.primarySpecialty
                            ? `/patient/doctors?specialty=${encodeURIComponent(t.primarySpecialty)}`
                            : '/patient/doctors'
                        }
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
              {/* Avatar Upload for Patient */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="relative shrink-0">
                  {editForm.avatarUrl || user?.avatarUrl ? (
                    <img
                      src={editForm.avatarUrl || user?.avatarUrl}
                      alt={editForm.fullName || 'Bệnh nhân'}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 bg-white shadow-2xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xl flex items-center justify-center border-2 border-indigo-200">
                      {(editForm.fullName || user?.fullName || 'B').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {uploadingPatientAvatar && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-xs">Ảnh Đại Diện Bệnh Nhân</span>
                    <button
                      type="button"
                      disabled={uploadingPatientAvatar}
                      onClick={() => patientAvatarRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingPatientAvatar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Đang tải lên Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tải ảnh từ máy lên Supabase</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={patientAvatarRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePatientAvatarUpload}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ảnh chân dung định dạng JPG/PNG/WEBP (tối đa 10MB), tự động lưu trữ trên Supabase Cloud Storage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Họ và Tên Bệnh Nhân <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName || ''}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    aria-invalid={Boolean(profileErrors.fullName) || undefined}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 ${profileErrors.fullName ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="Nguyễn Văn A"
                  />
                  {profileErrors.fullName && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.fullName}</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Điện Thoại Di Động</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    aria-invalid={Boolean(profileErrors.phone) || undefined}
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 ${profileErrors.phone ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="0901234567"
                  />
                  {profileErrors.phone && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.phone}</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giới Tính</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Chưa xác định</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày Tháng Năm Sinh</label>
                  <input
                    type="date"
                    max={todayLocal()}
                    value={editForm.dateOfBirth ? String(editForm.dateOfBirth) : ''}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    aria-invalid={Boolean(profileErrors.dateOfBirth) || undefined}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 ${profileErrors.dateOfBirth ? 'border-rose-400' : 'border-slate-200'}`}
                  />
                  {profileErrors.dateOfBirth && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.dateOfBirth}</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số CCCD (Định danh 12 số)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={editForm.citizenId || ''}
                    onChange={(e) => setEditForm({ ...editForm, citizenId: e.target.value.replace(/\D/g, '') })}
                    aria-invalid={Boolean(profileErrors.citizenId) || undefined}
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 ${profileErrors.citizenId ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="12 chữ số"
                  />
                  {profileErrors.citizenId && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.citizenId}</p>}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Thẻ Bảo Hiểm Y Tế (BHYT)</label>
                  <input
                    type="text"
                    value={editForm.healthInsuranceNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, healthInsuranceNumber: e.target.value.toUpperCase() })}
                    aria-invalid={Boolean(profileErrors.healthInsuranceNumber) || undefined}
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 uppercase ${profileErrors.healthInsuranceNumber ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="VD: GD4791234567890"
                  />
                  {profileErrors.healthInsuranceNumber && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.healthInsuranceNumber}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nhóm Máu & Hệ Rh</label>
                  <select
                    value={editForm.bloodGroup || ''}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Chưa xác định</option>
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
                      type="tel"
                      value={editForm.emergencyContactPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      aria-invalid={Boolean(profileErrors.emergencyContactPhone) || undefined}
                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white font-mono ${profileErrors.emergencyContactPhone ? 'border-rose-400' : 'border-slate-200'}`}
                      placeholder="0909..."
                    />
                    {profileErrors.emergencyContactPhone && <p role="alert" className="text-[11px] text-rose-600 mt-1">{profileErrors.emergencyContactPhone}</p>}
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
                  disabled={savingProfile || Object.keys(profileErrors).length > 0}
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
                  MEDIASSIST · BỆNH ÁN ĐIỆN TỬ
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
                  <div className="text-xs text-slate-600">Mã BN: {profile?.patientCode ? <span className="font-mono font-bold text-indigo-700">{profile.patientCode}</span> : <Missing label="Chưa được cấp" />}</div>
                  <div className="text-xs text-slate-600">BHYT: {profile?.healthInsuranceNumber ? <span className="font-mono">{profile.healthInsuranceNumber}</span> : <Missing />}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase">Bác Sĩ Phụ Trách</div>
                  <div className="font-bold text-base text-indigo-900">{selectedEmrAppointment.doctorName}</div>
                  <div className="text-xs text-slate-600">Thời gian khám: {new Date(selectedEmrAppointment.scheduledStart).toLocaleString('vi-VN')}</div>
                  <div className="text-xs text-emerald-700 font-semibold">Trạng thái: Đã khám xong</div>
                </div>
              </div>

              {/* Vital Signs Cards */}
              {(() => {
                const vs = parseStoredVitals(selectedEmrAppointment.vitalSignsJson);
                if (!vs) {
                  return <p className="text-xs text-slate-500 italic">Lần khám này không ghi nhận dấu hiệu sinh tồn.</p>;
                }
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" /> Dấu Hiệu Sinh Tồn Tiếp Đón (Vital Signs)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Huyết Áp</div>
                        <div className="text-base font-black text-rose-700 font-mono"><VitalValue value={vs.bloodPressure} unit="mmHg" /></div>
                      </div>
                      <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Tần Số Mạch</div>
                        <div className="text-base font-black text-sky-700 font-mono"><VitalValue value={vs.heartRate} unit="bpm" /></div>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">Thân Nhiệt</div>
                        <div className="text-base font-black text-amber-700 font-mono"><VitalValue value={vs.temperature} unit="°C" /></div>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <div className="text-xs text-slate-500">SpO2 / BMI</div>
                        <div className="text-base font-black text-emerald-700 font-mono"><VitalValue value={vs.spO2} unit="%" />
                          <span className="block text-[11px] font-normal text-slate-500">BMI: {hasVital(vs.bmi) ? vs.bmi : 'chưa tính'}</span></div>
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
                  {selectedEmrAppointment.icd10Code && (
                    <span className="font-mono bg-indigo-700 text-white px-2 py-0.5 rounded text-xs">{selectedEmrAppointment.icd10Code}</span>
                  )}
                  {selectedEmrAppointment.icd10Name ? (
                    <span>{selectedEmrAppointment.icd10Name}</span>
                  ) : !selectedEmrAppointment.icd10Code ? (
                    <span className="text-sm font-normal text-slate-500 italic">Bác sĩ chưa ghi chẩn đoán</span>
                  ) : null}
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
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
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

      {/* MODAL: RESCHEDULE APPOINTMENT — real availability from /doctors/{id}/slots */}
      <Modal
        open={reschedulingAppointment !== null}
        onClose={() => setReschedulingAppointment(null)}
        busy={submittingReschedule}
        title="Dời lịch hẹn khám"
        description={reschedulingAppointment ? `${reschedulingAppointment.appointmentCode} · ${reschedulingAppointment.doctorName}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReschedulingAppointment(null)} disabled={submittingReschedule}>
              Hủy bỏ
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              loading={submittingReschedule}
              loadingText="Đang dời lịch..."
              disabledReason={!rescheduleSlot ? 'Chọn một khung giờ còn trống.' : isUnverified ? EMAIL_NOT_VERIFIED_TOOLTIP : null}
            >
              Xác nhận dời lịch
            </Button>
          </>
        }
      >
        {reschedulingAppointment && (
          <div className="space-y-4 text-sm">
            <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              Giờ hẹn hiện tại: <strong className="text-slate-800">{new Date(reschedulingAppointment.scheduledStart).toLocaleString('vi-VN')}</strong>
            </p>
            <SlotPicker
              doctorId={reschedulingAppointment.doctorId}
              date={rescheduleDate}
              onDateChange={setRescheduleDate}
              selected={rescheduleSlot}
              onSelect={setRescheduleSlot}
              disabled={submittingReschedule}
              excludeStart={reschedulingAppointment.scheduledStart}
            />
            <div>
              <label htmlFor="reschedule-reason" className="font-semibold text-slate-700 block mb-1 text-xs">Lý do dời lịch (không bắt buộc)</label>
              <textarea
                id="reschedule-reason"
                rows={2}
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ví dụ: Bận đột xuất, muốn đổi sang ngày thuận tiện hơn..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Doctor Review & Rating Modal */}
      <DoctorReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewingAppointment(null);
        }}
        appointment={
          reviewingAppointment
            ? {
                id: reviewingAppointment.id,
                appointmentCode: reviewingAppointment.appointmentCode,
                doctorId: reviewingAppointment.doctorId,
                doctorName: reviewingAppointment.doctorName,
                doctorHospital: reviewingAppointment.clinicAddress || reviewingAppointment.clinicRoom || undefined,
                doctorSpecialty: reviewingAppointment.icd10Name || undefined,
                scheduledStart: reviewingAppointment.scheduledStart,
              }
            : null
        }
        existingReview={reviewingAppointment ? reviewsMap[reviewingAppointment.id] : null}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Admission Ticket Modal */}
      {selectedTicketAppointment && (
        <AdmissionTicketModal
          appointment={selectedTicketAppointment}
          isOpen={!!selectedTicketAppointment}
          onClose={() => setSelectedTicketAppointment(null)}
          onJoinOnlineRoom={(ticket) => {
            const matched = appointments.find((a) => a.id === ticket.id);
            if (matched) setVideoRoomAppointment(matched);
          }}
        />
      )}

      {/* Telehealth Video Call & Chat Room Modal */}
      {videoRoomAppointment && (
        <TelehealthRoomModal
          open={!!videoRoomAppointment}
          appointmentId={videoRoomAppointment.id}
          initialAppointment={videoRoomAppointment}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          onClose={() => setVideoRoomAppointment(null)}
          onStatusUpdated={(apptId, newStatus) => {
            setAppointments((prev) =>
              prev.map((a) => (a.id === apptId ? { ...a, status: newStatus as AppointmentItem['status'] } : a))
            );
          }}
        />
      )}

      {/* Standalone Consultation Chat Drawer/Modal */}
      <ConsultationChatModal
        open={!!chatAppointment}
        appointment={chatAppointment}
        currentUserId={user?.id}
        currentUserRole={user?.role}
        onClose={() => setChatAppointment(null)}
        onOpenVideoRoom={(apt) => {
          const matched = appointments.find((a) => a.id === apt.id);
          if (matched) setVideoRoomAppointment(matched);
        }}
      />
    </div>
  );
};
