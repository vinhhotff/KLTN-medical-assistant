import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Phone,
  Check,
  Ban,
  AlertCircle,
  Stethoscope,
  Activity,
  FileText,
  Plus,
  Trash2,
  X,
  Printer,
  RefreshCw,
  Search,
  DollarSign,
  PlayCircle,
  Settings,
  Bell,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Sparkles,
  History,
  ExternalLink,
  Sun,
  Sunset,
  Copy
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

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

interface TriageHistoryItem {
  id: string;
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
  extractedIndicators?: string;
  createdAt: string;
}

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
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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

interface PrescriptionItem {
  drugName: string;
  activeIngredient: string;
  dosage: string;
  quantity: number;
  unit: string;
  days: number;
}

interface DoctorStats {
  todayAppointmentsCount: number;
  todayWaitingCount: number;
  todayInProgressCount: number;
  todayCompletedCount: number;
  totalCompletedCount: number;
  totalAppointmentsCount: number;
  todayRevenue: number;
  lifetimeRevenue: number;
  doctorRating: number;
  totalConsultations: number;
}

interface DoctorScheduleSlot {
  id: string;
  dayOfWeek: string;
  dayOfWeekLabel: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
}

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_NO_SHOW'>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<DoctorScheduleSlot[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<string>('MONDAY');

  // Active Clinical Encounter Modal State
  const [activeEncounterAppointment, setActiveEncounterAppointment] = useState<DoctorAppointment | null>(null);
  const [submittingEncounter, setSubmittingEncounter] = useState(false);

  // Clinical Form Fields
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [spO2, setSpO2] = useState('');

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [icd10Code, setIcd10Code] = useState('');
  const [icd10Name, setIcd10Name] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [clinicRoom, setClinicRoom] = useState('');

  // Multi-drug prescription items
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  // Selected EMR view modal for completed appointments
  const [selectedViewEmr, setSelectedViewEmr] = useState<DoctorAppointment | null>(null);

  // Supercharged Clinical Encounter States (Patient 360 Integration)
  const [patientPassport, setPatientPassport] = useState<PatientProfileData | null>(null);
  const [patientTriageHistory, setPatientTriageHistory] = useState<TriageHistoryItem[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocumentItem[]>([]);
  const [patientPastAppointments, setPatientPastAppointments] = useState<DoctorAppointment[]>([]);
  const [activeEncounterTab, setActiveEncounterTab] = useState<'EMR' | 'TRIAGE' | 'DOCUMENTS' | 'HISTORY'>('EMR');
  const [encounterLoading, setEncounterLoading] = useState(false);
  const [callingNext, setCallingNext] = useState(false);
  const [bookingFollowUp, setBookingFollowUp] = useState(false);

  // Pagination states
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledPageSize, setScheduledPageSize] = useState(5);

  const [pastPage, setPastPage] = useState(1);
  const [pastPageSize, setPastPageSize] = useState(5);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [resAppt, resStats] = await Promise.allSettled([
        api.get('/appointments/my'),
        api.get('/doctors/me/stats')
      ]);

      if (resAppt.status === 'fulfilled' && resAppt.value.data?.data) {
        const fresh: DoctorAppointment[] = resAppt.value.data.data;
        setAppointments((prev) => {
          if (silent && prev.length > 0) {
            const prevWaiting = prev.filter((a) => a.status === 'SCHEDULED').length;
            const newWaiting = fresh.filter((a) => a.status === 'SCHEDULED').length;
            if (newWaiting > prevWaiting) {
              setNotificationToast(`🔔 Có ${newWaiting - prevWaiting} bệnh nhân mới vừa đăng ký vào hàng đợi khám!`);
              setTimeout(() => setNotificationToast(null), 6000);
            }
          }
          return fresh;
        });
      }

      if (resStats.status === 'fulfilled' && resStats.value.data?.data) {
        setStats(resStats.value.data.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load doctor workstation data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Silent background polling every 12 seconds for realtime clinical supervision
    const interval = setInterval(() => {
      fetchData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Open Examination Modal - Reset form or load existing clinical state
  const openEncounterModal = (apt: DoctorAppointment) => {
    setActiveEncounterAppointment(apt);
    setChiefComplaint(apt.chiefComplaint || apt.consultationNotes || '');
    setClinicRoom(apt.clinicRoom || 'Phòng Khám P.102');
    setConsultationNotes(apt.consultationNotes || '');
    setTreatmentPlan(apt.treatmentPlan || '');
    setFollowUpDate(apt.followUpDate ? apt.followUpDate.slice(0, 10) : '');
    setIcd10Code(apt.icd10Code || '');
    setIcd10Name(apt.icd10Name || '');

    // Parse existing vital signs if available
    if (apt.vitalSignsJson) {
      try {
        const vs = JSON.parse(apt.vitalSignsJson);
        if (vs.bloodPressure && vs.bloodPressure.includes('/')) {
          const parts = vs.bloodPressure.split('/');
          setBpSystolic(parts[0]);
          setBpDiastolic(parts[1]);
        }
        if (vs.heartRate) setHeartRate(String(vs.heartRate));
        if (vs.temperature) setTemperature(String(vs.temperature));
        if (vs.respiratoryRate) setRespiratoryRate(String(vs.respiratoryRate));
        if (vs.height) setHeight(String(vs.height));
        if (vs.weight) setWeight(String(vs.weight));
        if (vs.spO2) setSpO2(String(vs.spO2));
      } catch {
        // Ignored
      }
    } else {
      setBpSystolic('120');
      setBpDiastolic('80');
      setHeartRate('75');
      setTemperature('36.8');
      setRespiratoryRate('18');
      setHeight('165');
      setWeight('60');
      setSpO2('98');
    }

    // Parse existing prescriptions if available
    if (apt.prescriptionJson) {
      try {
        const parsed = JSON.parse(apt.prescriptionJson);
        if (Array.isArray(parsed)) {
          setPrescriptionItems(parsed);
        }
      } catch {
        setPrescriptionItems([]);
      }
    } else {
      setPrescriptionItems([]);
    }

    // 360-Degree Clinical Synergy: Fetch Patient Medical Passport, Triage & Lab Documents
    setActiveEncounterTab('EMR');
    setEncounterLoading(true);
    Promise.allSettled([
      api.get(`/patient/profile/by-user/${apt.patientId}`),
      api.get(`/triage/patient/${apt.patientId}`),
      api.get(`/documents/patient/${apt.patientId}`),
      api.get(`/appointments/patient/${apt.patientId}`)
    ]).then(([resProfile, resTriage, resDocs, resPast]) => {
      if (resProfile.status === 'fulfilled' && resProfile.value.data?.data) {
        setPatientPassport(resProfile.value.data.data);
      } else {
        setPatientPassport(null);
      }
      if (resTriage.status === 'fulfilled' && Array.isArray(resTriage.value.data?.data)) {
        setPatientTriageHistory(resTriage.value.data.data);
      } else {
        setPatientTriageHistory([]);
      }
      if (resDocs.status === 'fulfilled' && Array.isArray(resDocs.value.data?.data)) {
        setPatientDocuments(resDocs.value.data.data);
      } else {
        setPatientDocuments([]);
      }
      if (resPast.status === 'fulfilled' && Array.isArray(resPast.value.data?.data)) {
        setPatientPastAppointments(resPast.value.data.data.filter((a: DoctorAppointment) => a.id !== apt.id));
      } else {
        setPatientPastAppointments([]);
      }
    }).finally(() => {
      setEncounterLoading(false);
    });
  };

  // Helper to check drug-allergy conflict against patient's known allergies
  const checkDrugAllergyConflict = (drugName: string, allergies?: string): string | null => {
    if (!allergies || !drugName || allergies.toLowerCase().includes('chưa ghi nhận')) return null;
    const cleanDrug = drugName.toLowerCase();
    const allergyKeywords = allergies.toLowerCase().split(/[,;.\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const kw of allergyKeywords) {
      if (kw.length >= 3 && (cleanDrug.includes(kw) || kw.includes(cleanDrug))) {
        return kw;
      }
    }
    return null;
  };

  // 1-Click Import AI Triage Symptoms & SBAR Assessment into EMR Encounter
  const handleImportTriage = (triage: TriageHistoryItem) => {
    if (triage.symptomsText) {
      setChiefComplaint(triage.symptomsText);
    }
    if (triage.sbarSummary) {
      setConsultationNotes((prev) => {
        const header = `[TÓM TẮT TRIAGE SBAR]:\n${triage.sbarSummary}\n\n[DIỄN TIẾN KHÁM LÂM SÀNG]:\n`;
        return prev ? `${header}${prev}` : header;
      });
    }
    setActiveEncounterTab('EMR');
    setNotificationToast('✅ Đã nạp thành công dữ liệu phân luồng Triage AI vào phiếu khám!');
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Call next patient in queue (Automatic advancement)
  const handleCallNextPatient = async () => {
    try {
      setCallingNext(true);
      const res = await api.post('/doctors/me/call-next');
      if (res.data?.data) {
        const apt: DoctorAppointment = res.data.data;
        openEncounterModal(apt);
        setNotificationToast(`🔔 Đã gọi bệnh nhân: ${apt.patientName} (Mã: ${apt.appointmentCode}) vào phòng khám!`);
        setTimeout(() => setNotificationToast(null), 5000);
        fetchData(true);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Không có bệnh nhân nào đang chờ hoặc hàng đợi hôm nay đã phục vụ hết.');
    } finally {
      setCallingNext(false);
    }
  };

  // Follow-up appointment direct booking from clinical workstation
  const handleCreateFollowUp = async () => {
    if (!activeEncounterAppointment || !followUpDate) {
      alert('Vui lòng chọn ngày hẹn tái khám trước.');
      return;
    }
    try {
      setBookingFollowUp(true);
      const scheduledStart = `${followUpDate}T09:00:00`;
      const res = await api.post('/appointments/follow-up', {
        patientId: activeEncounterAppointment.patientId,
        scheduledStart,
        notes: `Tái khám theo hẹn: ${icd10Name || 'Theo dõi điều trị'}`,
        clinicRoom: clinicRoom || 'Phòng Khám P.102'
      });
      if (res.data?.data) {
        setNotificationToast(`✅ Đã đặt lịch tái khám thành công cho bệnh nhân (Mã: ${res.data.data.appointmentCode})!`);
        setTimeout(() => setNotificationToast(null), 5000);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Không thể tạo lịch tái khám.');
    } finally {
      setBookingFollowUp(false);
    }
  };

  // State Machine: Transition appointment to IN_PROGRESS when doctor begins examination
  const handleStartExam = async (apt: DoctorAppointment) => {
    try {
      if (apt.status === 'SCHEDULED') {
        await api.patch(`/appointments/${apt.id}/status`, {
          status: 'IN_PROGRESS'
        });
        setAppointments((prev) =>
          prev.map((a) => (a.id === apt.id ? { ...a, status: 'IN_PROGRESS' as const } : a))
        );
      }
      openEncounterModal(apt);
      fetchData(true);
    } catch (err) {
      console.error('Failed to transition appointment to IN_PROGRESS:', err);
      openEncounterModal(apt);
    }
  };

  // Quick select common ICD-10 templates
  const selectIcd10Template = (code: string, name: string) => {
    setIcd10Code(code);
    setIcd10Name(name);
  };

  // Preset prescriptions
  const loadPrescriptionPreset = (preset: 'cardio' | 'gastro') => {
    if (preset === 'cardio') {
      setPrescriptionItems([
        {
          drugName: 'Lipitor 20mg',
          activeIngredient: 'Atorvastatin',
          dosage: 'Uống 1 viên vào buổi tối sau ăn',
          quantity: 30,
          unit: 'viên',
          days: 30
        },
        {
          drugName: 'Aspirin 81mg',
          activeIngredient: 'Aspirin',
          dosage: 'Uống 1 viên vào buổi sáng sau ăn no',
          quantity: 30,
          unit: 'viên',
          days: 30
        },
        {
          drugName: 'Betaloc ZOK 25mg',
          activeIngredient: 'Metoprolol succinate',
          dosage: 'Uống 1 viên vào buổi sáng',
          quantity: 30,
          unit: 'viên',
          days: 30
        }
      ]);
      setIcd10Code('I20.9');
      setIcd10Name('Cơn đau thắt ngực, không xác định (Angina pectoris)');
    } else {
      setPrescriptionItems([
        {
          drugName: 'Nexium 40mg',
          activeIngredient: 'Esomeprazole',
          dosage: 'Uống 1 viên trước bữa ăn sáng 30 phút',
          quantity: 28,
          unit: 'viên',
          days: 28
        },
        {
          drugName: 'Gaviscon Dual Action',
          activeIngredient: 'Sodium alginate',
          dosage: 'Uống 1 gói sau mỗi bữa ăn và trước khi ngủ',
          quantity: 20,
          unit: 'gói',
          days: 10
        }
      ]);
      setIcd10Code('K21.0');
      setIcd10Name('Trào ngược dạ dày - thực quản có viêm thực quản');
    }
  };

  const addPrescriptionRow = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      {
        drugName: '',
        activeIngredient: '',
        dosage: 'Uống 1 viên sau ăn',
        quantity: 10,
        unit: 'viên',
        days: 10
      }
    ]);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updatePrescriptionRow = (index: number, field: keyof PrescriptionItem, value: string | number) => {
    const updated = [...prescriptionItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionItems(updated);
  };

  // Submit complete clinical encounter
  const handleSubmitEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounterAppointment) return;

    try {
      setSubmittingEncounter(true);
      setActionError(null);

      const calculatedBmi = Number(weight) && Number(height)
        ? (Number(weight) / ((Number(height) / 100) * (Number(height) / 100))).toFixed(1)
        : '22.0';

      const vitalSigns = {
        bloodPressure: `${bpSystolic}/${bpDiastolic}`,
        heartRate: Number(heartRate) || 75,
        temperature: Number(temperature) || 36.8,
        respiratoryRate: Number(respiratoryRate) || 18,
        height: Number(height) || 170,
        weight: Number(weight) || 65,
        bmi: Number(calculatedBmi),
        spO2: Number(spO2) || 98
      };

      await api.post(`/appointments/${activeEncounterAppointment.id}/complete-clinical`, {
        chiefComplaint,
        vitalSignsJson: JSON.stringify(vitalSigns),
        icd10Code,
        icd10Name,
        prescriptionJson: JSON.stringify(prescriptionItems),
        treatmentPlan,
        consultationNotes,
        followUpDate: followUpDate || null,
        clinicRoom
      });

      setActiveEncounterAppointment(null);
      setNotificationToast(`Đã ký duyệt và hoàn tất ca khám cho bệnh nhân ${activeEncounterAppointment.patientName}!`);
      setTimeout(() => setNotificationToast(null), 5000);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể hoàn tất ca khám.');
    } finally {
      setSubmittingEncounter(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId: string) => {
    const reason = window.prompt('Nhập lý do hủy ca khám:');
    if (!reason) return;

    try {
      setActionError(null);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'CANCELLED',
        notes: reason
      });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Thao tác không thành công.');
    }
  };

  // Mark patient as No-Show
  const handleMarkNoShow = async (appointmentId: string) => {
    const confirm = window.confirm('Xác nhận bệnh nhân vắng mặt khi gọi số khám? Cuộc hẹn sẽ chuyển sang trạng thái Vắng Mặt (NO_SHOW).');
    if (!confirm) return;

    try {
      setActionError(null);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'NO_SHOW',
        notes: 'Bệnh nhân không có mặt tại bàn khám khi gọi số thứ tự'
      });
      setNotificationToast('Đã ghi nhận bệnh nhân vắng mặt (NO_SHOW).');
      setTimeout(() => setNotificationToast(null), 4000);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể cập nhật trạng thái vắng mặt.');
    }
  };

  // Schedule Modal Constants & Helpers
  const DAYS_OF_WEEK = useMemo(() => [
    { key: 'MONDAY', label: 'Thứ Hai', short: 'T2' },
    { key: 'TUESDAY', label: 'Thứ Ba', short: 'T3' },
    { key: 'WEDNESDAY', label: 'Thứ Tư', short: 'T4' },
    { key: 'THURSDAY', label: 'Thứ Năm', short: 'T5' },
    { key: 'FRIDAY', label: 'Thứ Sáu', short: 'T6' },
    { key: 'SATURDAY', label: 'Thứ Bảy', short: 'T7' },
    { key: 'SUNDAY', label: 'Chủ Nhật', short: 'CN' },
  ], []);

  const STANDARD_SLOT_TIMES = useMemo(() => [
    // Ca Sáng
    { startTime: '08:00:00', endTime: '08:30:00' },
    { startTime: '08:30:00', endTime: '09:00:00' },
    { startTime: '09:00:00', endTime: '09:30:00' },
    { startTime: '09:30:00', endTime: '10:00:00' },
    { startTime: '10:00:00', endTime: '10:30:00' },
    { startTime: '10:30:00', endTime: '11:00:00' },
    { startTime: '11:00:00', endTime: '11:30:00' },
    // Ca Chiều
    { startTime: '13:30:00', endTime: '14:00:00' },
    { startTime: '14:00:00', endTime: '14:30:00' },
    { startTime: '14:30:00', endTime: '15:00:00' },
    { startTime: '15:00:00', endTime: '15:30:00' },
    { startTime: '15:30:00', endTime: '16:00:00' },
    { startTime: '16:00:00', endTime: '16:30:00' },
    { startTime: '16:30:00', endTime: '17:00:00' },
  ], []);

  const formatTimeClean = (t: string) => {
    if (!t) return '';
    return t.split(':').slice(0, 2).join(':');
  };

  const normalizeSchedules = (rawSlots: DoctorScheduleSlot[]): DoctorScheduleSlot[] => {
    const result: DoctorScheduleSlot[] = [];
    DAYS_OF_WEEK.forEach((day) => {
      STANDARD_SLOT_TIMES.forEach((timeDef) => {
        const existing = rawSlots.find(
          (s) =>
            s.dayOfWeek === day.key &&
            formatTimeClean(s.startTime) === formatTimeClean(timeDef.startTime)
        );
        if (existing) {
          result.push({
            ...existing,
            dayOfWeek: day.key,
            dayOfWeekLabel: day.label,
            slotDurationMinutes: existing.slotDurationMinutes || 30,
            active: Boolean(existing.active),
          });
        } else {
          result.push({
            id: `${day.key}-${timeDef.startTime}`,
            dayOfWeek: day.key,
            dayOfWeekLabel: day.label,
            startTime: timeDef.startTime,
            endTime: timeDef.endTime,
            slotDurationMinutes: 30,
            active: false,
          });
        }
      });
    });
    return result;
  };

  // Doctor Schedule Management Modal
  const openScheduleModal = async () => {
    setScheduleModalOpen(true);
    setLoadingSchedule(true);
    try {
      const res = await api.get('/doctors/me/schedules');
      if (res.data?.data) {
        setSchedules(normalizeSchedules(res.data.data));
      } else {
        setSchedules(normalizeSchedules([]));
      }
    } catch (err) {
      console.error('Failed to load doctor schedules:', err);
      setSchedules(normalizeSchedules([]));
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSaveSchedules = async () => {
    try {
      setSavingSchedule(true);
      const res = await api.put('/doctors/me/schedules', {
        slots: schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes || 30,
          active: s.active,
        })),
      });
      if (res.data?.data) {
        setSchedules(normalizeSchedules(res.data.data));
      }
      setScheduleModalOpen(false);
      setNotificationToast('Lịch làm việc và khung giờ tiếp đón đã được lưu thành công!');
      setTimeout(() => setNotificationToast(null), 4000);
    } catch (err) {
      console.error('Failed to update schedules:', err);
      alert('Không thể lưu lịch làm việc. Vui lòng thử lại.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleSlotByKey = (dayOfWeek: string, startTime: string) => {
    setSchedules((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek && formatTimeClean(slot.startTime) === formatTimeClean(startTime)
          ? { ...slot, active: !slot.active }
          : slot
      )
    );
  };

  const toggleDayAll = (dayOfWeek: string, active: boolean) => {
    setSchedules((prev) =>
      prev.map((slot) => (slot.dayOfWeek === dayOfWeek ? { ...slot, active } : slot))
    );
  };

  const toggleShiftAll = (dayOfWeek: string, isMorning: boolean, active: boolean) => {
    setSchedules((prev) =>
      prev.map((slot) => {
        if (slot.dayOfWeek === dayOfWeek) {
          const hour = parseInt(slot.startTime.split(':')[0], 10);
          if ((hour < 12) === isMorning) {
            return { ...slot, active };
          }
        }
        return slot;
      })
    );
  };

  const copyDayToWeekdays = (sourceDay: string) => {
    const dayLabel = DAYS_OF_WEEK.find((d) => d.key === sourceDay)?.label || sourceDay;
    setSchedules((prev) => {
      const sourceSlots = prev.filter((s) => s.dayOfWeek === sourceDay);
      const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      return prev.map((slot) => {
        if (weekdays.includes(slot.dayOfWeek)) {
          const matching = sourceSlots.find(
            (s) => formatTimeClean(s.startTime) === formatTimeClean(slot.startTime)
          );
          if (matching) {
            return { ...slot, active: matching.active };
          }
        }
        return slot;
      });
    });
    setNotificationToast(`Đã sao chép cấu hình lịch từ ${dayLabel} sang Thứ 2 - Thứ 6!`);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const applyStandardHours = () => {
    setSchedules((prev) =>
      prev.map((slot) => {
        const isWeekday = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(
          slot.dayOfWeek
        );
        return { ...slot, active: isWeekday };
      })
    );
    setNotificationToast('Đã áp dụng khung giờ hành chính (Thứ 2 - Thứ 6)!');
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const toggleAllWeek = (active: boolean) => {
    setSchedules((prev) => prev.map((s) => ({ ...s, active })));
    setNotificationToast(active ? 'Đã kích hoạt toàn bộ khung giờ trong tuần!' : 'Đã tắt toàn bộ khung giờ trong tuần!');
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const scheduleStats = useMemo(() => {
    const totalSlots = schedules.length;
    const activeSlots = schedules.filter((s) => s.active).length;
    const activeDaysCount = new Set(schedules.filter((s) => s.active).map((s) => s.dayOfWeek)).size;
    return { totalSlots, activeSlots, activeDaysCount };
  }, [schedules]);

  const selectedDayInfo = useMemo(() => {
    return DAYS_OF_WEEK.find((d) => d.key === selectedScheduleDay);
  }, [DAYS_OF_WEEK, selectedScheduleDay]);

  const selectedDaySlots = useMemo(() => {
    return schedules.filter((s) => s.dayOfWeek === selectedScheduleDay);
  }, [schedules, selectedScheduleDay]);

  const morningSlots = useMemo(() => {
    return selectedDaySlots
      .filter((s) => parseInt(s.startTime.split(':')[0], 10) < 12)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDaySlots]);

  const afternoonSlots = useMemo(() => {
    return selectedDaySlots
      .filter((s) => parseInt(s.startTime.split(':')[0], 10) >= 12)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDaySlots]);

  const getDaySummary = (dayKey: string) => {
    const daySlots = schedules.filter((s) => s.dayOfWeek === dayKey);
    const total = daySlots.length;
    const active = daySlots.filter((s) => s.active).length;
    let status: 'FULL' | 'PARTIAL' | 'OFF' = 'OFF';
    if (total > 0 && active === total) status = 'FULL';
    else if (active > 0) status = 'PARTIAL';
    return { total, active, status };
  };

  // Active In-Progress Appointments (Prominent top callout)
  const inProgressAppointments = useMemo(() => {
    return appointments.filter((a) => a.status === 'IN_PROGRESS');
  }, [appointments]);

  // Tokenized Search & Filtered Lists
  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tokens = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return appointments.filter((app) => {
      // Date Filter
      if (dateFilter === 'TODAY') {
        const appDate = app.scheduledStart ? app.scheduledStart.slice(0, 10) : '';
        if (appDate !== todayStr) return false;
      }

      // Status Filter
      if (statusFilter === 'WAITING' && app.status !== 'SCHEDULED') return false;
      if (statusFilter === 'IN_PROGRESS' && app.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'COMPLETED' && app.status !== 'COMPLETED') return false;
      if (statusFilter === 'CANCELLED_NO_SHOW' && app.status !== 'CANCELLED' && app.status !== 'NO_SHOW') return false;

      // Tokenized Matching
      if (tokens.length === 0) return true;
      const searchable = `${app.appointmentCode || ''} ${app.patientName || ''} ${app.patientEmail || ''} ${app.patientPhone || ''} ${app.clinicRoom || ''} ${app.icd10Code || ''} ${app.icd10Name || ''} ${app.consultationNotes || ''} ${app.chiefComplaint || ''}`.toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    });
  }, [appointments, debouncedSearch, statusFilter, dateFilter]);

  // Categorize for 2-column layout
  const scheduledAppointments = useMemo(() => {
    return filteredAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS');
  }, [filteredAppointments]);

  const pastAppointments = useMemo(() => {
    return filteredAppointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW');
  }, [filteredAppointments]);

  const paginatedScheduled = useMemo(() => {
    const start = (scheduledPage - 1) * scheduledPageSize;
    return scheduledAppointments.slice(start, start + scheduledPageSize);
  }, [scheduledAppointments, scheduledPage, scheduledPageSize]);

  const paginatedPast = useMemo(() => {
    const start = (pastPage - 1) * pastPageSize;
    return pastAppointments.slice(start, start + pastPageSize);
  }, [pastAppointments, pastPage, pastPageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast notification */}
      {notificationToast && (
        <div className="p-4 bg-teal-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-slideDown border border-teal-700">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Bell className="w-5 h-5 text-teal-300 animate-bounce" />
            <span>{notificationToast}</span>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className="text-teal-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-black text-teal-400 tracking-wider flex items-center gap-2">
            <span>Bàn Khám Bệnh Điện Tử & Giám Sát Ca Lâm Sàng (HIS / EMR)</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Live Realtime
            </span>
          </div>
          <h2 className="text-2xl font-black mt-1">
            Chào Bác sĩ, {user?.fullName || 'Đồng nghiệp'}!
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Quản lý hàng đợi tiếp đón, chẩn đoán ICD-10, kê đơn thuốc điện tử và đồng bộ lịch trực khám bệnh viện.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Realtime Live Pulse Badge */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu tức thì"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleCallNextPatient}
            disabled={callingNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            title="Tự động tiếp nhận và gọi ca chờ sớm nhất hôm nay vào bàn khám"
          >
            <UserCheck className={`w-3.5 h-3.5 ${callingNext ? 'animate-bounce' : ''}`} />
            <span>{callingNext ? 'Đang gọi...' : 'Gọi Số Tiếp Theo'}</span>
          </button>

          <button
            onClick={openScheduleModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu Hình Lịch Trực</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 4 REAL-TIME KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Hàng Đợi Chờ Khám</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.todayWaitingCount ?? 0}</span>
            <span className="text-xs text-slate-500">ca hôm nay</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">Bệnh nhân đang chờ gọi số</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Ca Đang Khám Tại Bàn</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <PlayCircle className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-700">{stats?.todayInProgressCount ?? inProgressAppointments.length}</span>
            <span className="text-xs text-slate-500">trong phòng</span>
          </div>
          <p className="text-[11px] text-teal-700 mt-1 font-medium">Đang thao tác lâm sàng</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Đã Khám Xong Hôm Nay</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{stats?.todayCompletedCount ?? 0}</span>
            <span className="text-xs text-slate-500">ca hoàn tất</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tổng tích lũy: {stats?.totalCompletedCount ?? 0} ca</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Doanh Thu Trong Ngày</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-700">
              {Number(stats?.todayRevenue ?? 0).toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-bold text-slate-500">VNĐ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đánh giá: ⭐ {stats?.doctorRating ?? 4.9}/5.0</p>
        </div>
      </div>

      {/* PROMINENT ACTIVE IN-PROGRESS CALLOUT (CA ĐANG KHÁM TẠI PHÒNG) */}
      {inProgressAppointments.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl shadow-md border border-teal-700/50 space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-bold text-base text-teal-200 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-400" />
                Ca Khám Đang Diễn Ra Trong Phòng ({inProgressAppointments.length})
              </h3>
            </div>
            <span className="text-xs text-teal-300 font-medium">Bệnh nhân đang ở trong phòng khám</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white/10 p-4 rounded-2xl border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-teal-400/20 text-teal-200 border border-teal-400/30">
                      {apt.appointmentCode}
                    </span>
                    {apt.queueNumber && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-200">
                        {apt.queueNumber}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300">
                      Đang Khám
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">{apt.patientName}</h4>
                  <p className="text-xs text-teal-200 mt-0.5">
                    Phòng khám: <strong>{apt.clinicRoom || 'P.102'}</strong>
                  </p>
                  {apt.chiefComplaint && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic">
                      "{apt.chiefComplaint}"
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => openEncounterModal(apt)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl transition cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" /> Tiếp Tục Nhập Bệnh Án
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(apt.id)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-100 hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Hủy Ca
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tokenized Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, mã ca, ICD-10..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                dateFilter === 'TODAY' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm Nay
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                dateFilter === 'ALL' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả Ngày
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="WAITING">Chờ tiếp đón (SCHEDULED)</option>
            <option value="IN_PROGRESS">Đang khám (IN_PROGRESS)</option>
            <option value="COMPLETED">Đã khám xong (COMPLETED)</option>
            <option value="CANCELLED_NO_SHOW">Đã hủy / Vắng mặt</option>
          </select>

          <span className="text-xs text-slate-500 font-semibold ml-1">
            Tổng: <strong className="text-teal-700">{filteredAppointments.length}</strong> ca
          </span>
        </div>
      </div>

      {/* MAIN WORKSTATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduled Appointments (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Hàng Đợi Ca Khám Tiếp Nhận ({scheduledAppointments.length})
              </h3>
              <span className="text-xs text-slate-500">
                Sắp xếp theo giờ hẹn
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang đồng bộ dữ liệu ca khám...</div>
            ) : scheduledAppointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl space-y-1">
                <p className="font-semibold text-slate-600">Không có ca khám nào phù hợp bộ lọc.</p>
                <p className="text-xs text-slate-400">Hàng đợi khám sẽ tự động cập nhật ngầm khi có bệnh nhân mới đặt lịch.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedScheduled.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-5 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      apt.status === 'IN_PROGRESS'
                        ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                        : 'border-slate-200 bg-white hover:border-teal-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                          {apt.appointmentCode}
                        </span>
                        {apt.queueNumber && (
                          <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            STT: {apt.queueNumber}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            apt.status === 'IN_PROGRESS'
                              ? 'bg-teal-100 text-teal-800 border-teal-300 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {apt.status === 'IN_PROGRESS' ? 'Đang Khám' : 'Chờ Khám'}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 pt-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {apt.patientName}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(apt.scheduledStart).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {apt.patientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {apt.patientPhone}
                          </span>
                        )}
                        {apt.clinicRoom && (
                          <span className="font-medium text-slate-700">
                            Phòng: {apt.clinicRoom}
                          </span>
                        )}
                      </div>

                      {apt.consultationNotes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                          <strong className="text-slate-700">Lý do/Triệu chứng:</strong> {apt.consultationNotes}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStartExam(apt)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        {apt.status === 'IN_PROGRESS' ? 'Tiếp Tục Khám' : 'Bắt Đầu Khám Bệnh'}
                      </button>

                      <button
                        onClick={() => handleMarkNoShow(apt.id)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition border border-amber-200 cursor-pointer"
                        title="Đánh dấu bệnh nhân vắng mặt khi gọi tên"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Vắng Mặt
                      </button>

                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> Hủy Ca
                      </button>
                    </div>
                  </div>
                ))}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={scheduledPage}
                    totalItems={scheduledAppointments.length}
                    pageSize={scheduledPageSize}
                    onPageChange={setScheduledPage}
                    onPageSizeChange={setScheduledPageSize}
                    pageSizeOptions={[3, 5, 10]}
                    itemLabel="ca khám chờ"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Completed and Past Appointments */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Lịch Sử Khám & Hồ Sơ Bệnh Án ({pastAppointments.length})
            </h3>

            {pastAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                Chưa có ca khám nào hoàn thành hoặc bị hủy.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPast.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1.5 hover:border-slate-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700">{apt.appointmentCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'NO_SHOW'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {apt.status === 'COMPLETED'
                          ? 'Đã Khám'
                          : apt.status === 'NO_SHOW'
                          ? 'Vắng Mặt'
                          : 'Đã Hủy'}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900">{apt.patientName}</div>

                    {apt.icd10Code && (
                      <div className="text-[11px] text-indigo-700 font-medium">
                        ICD-10: <strong>{apt.icd10Code}</strong> - {apt.icd10Name}
                      </div>
                    )}

                    {apt.cancellationReason && (
                      <div className="text-[11px] text-rose-600 font-medium italic">
                        Lý do: {apt.cancellationReason}
                      </div>
                    )}

                    {apt.status === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedViewEmr(apt)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-800 underline block pt-1 cursor-pointer"
                      >
                        Xem chi tiết hồ sơ bệnh án & đơn thuốc →
                      </button>
                    )}
                  </div>
                ))}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mt-3">
                  <Pagination
                    currentPage={pastPage}
                    totalItems={pastAppointments.length}
                    pageSize={pastPageSize}
                    onPageChange={setPastPage}
                    onPageSizeChange={setPastPageSize}
                    pageSizeOptions={[5, 10, 15]}
                    itemLabel="bệnh án"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: DOCTOR SCHEDULE CONFIGURATION WORKSTATION */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-teal-800/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                      Lịch Trực Lâm Sàng
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">Khung Giờ Tiếp Đón Bệnh Nhân</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-0.5">
                    Cấu Hình Lịch Làm Việc Tuần
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/40">
              {loadingSchedule ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                  <div className="font-semibold text-sm text-slate-700">Đang tải cấu hình thời gian biểu bác sĩ...</div>
                  <div className="text-xs text-slate-400">Vui lòng đợi trong giây lát</div>
                </div>
              ) : (
                <>
                  {/* Overview KPI & Quick Action Bar */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    {/* Left: KPI Counters */}
                    <div className="lg:col-span-5 flex items-center gap-3">
                      <div className="flex-1 bg-teal-50/70 p-3 rounded-xl border border-teal-100">
                        <div className="text-[11px] text-teal-700 font-semibold">Khung giờ mở khám</div>
                        <div className="text-xl font-black text-teal-900 flex items-baseline gap-1 mt-0.5">
                          {scheduleStats.activeSlots}
                          <span className="text-xs font-medium text-teal-600">/ {scheduleStats.totalSlots} slot</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-semibold">Ngày nhận bệnh</div>
                        <div className="text-xl font-black text-slate-800 flex items-baseline gap-1 mt-0.5">
                          {scheduleStats.activeDaysCount}
                          <span className="text-xs font-medium text-slate-500">/ 7 ngày</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: 1-Click Presets */}
                    <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Thiết lập mẫu:</span>
                      <button
                        type="button"
                        onClick={applyStandardHours}
                        className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 text-xs font-bold rounded-xl border border-teal-200 hover:border-teal-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Bật toàn bộ ca sáng và chiều từ Thứ 2 đến Thứ 6, nghỉ Thứ 7 và Chủ Nhật"
                      >
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        Giờ Hành Chính (T2-T6)
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllWeek(true)}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 hover:border-emerald-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Kích hoạt nhận bệnh nhân cho tất cả các ngày trong tuần"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Bật Cả Tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllWeek(false)}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 hover:border-rose-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Tắt toàn bộ các khung giờ (Dành cho kỳ nghỉ phép / công tác đột xuất)"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        Nghỉ Toàn Bộ
                      </button>
                    </div>
                  </div>

                  {/* Level 1: 7-Day Selector Strip */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 font-black text-xs flex items-center justify-center">
                          1
                        </span>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                          Chọn Ngày Trong Tuần
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Chọn một ngày để điều chỉnh chi tiết theo từng ca trực và khung giờ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const summary = getDaySummary(day.key);
                        const isSelected = selectedScheduleDay === day.key;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => setSelectedScheduleDay(day.key)}
                            className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50/90 border-teal-500 shadow-md ring-2 ring-teal-500/30'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-black ${isSelected ? 'text-teal-950' : 'text-slate-800'}`}>
                                {day.label}
                              </span>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                  summary.status === 'FULL'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : summary.status === 'PARTIAL'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                {summary.status === 'FULL' ? 'Đủ ca' : summary.status === 'PARTIAL' ? '1 phần' : 'Nghỉ'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                              <span className="text-slate-400">Khung giờ:</span>
                              <span className={`font-mono font-bold ${summary.active > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                                {summary.active}/{summary.total}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-teal-600 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level 2: Selected Day Workspace */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
                    {/* Day Header & Fast Batch Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {selectedDayInfo?.short}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 font-black text-xs flex items-center justify-center">
                              2
                            </span>
                            <h4 className="font-black text-slate-900 text-base">
                              Khung Giờ Nhận Lịch — {selectedDayInfo?.label}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Đang mở {selectedDaySlots.filter((s) => s.active).length} / {selectedDaySlots.length} slot tiếp nhận bệnh nhân. Nhấp vào khung giờ bất kỳ để Bật / Tắt.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDayAll(selectedScheduleDay, true)}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Mở Cả Ngày
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDayAll(selectedScheduleDay, false)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-rose-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-500" />
                          Tắt Cả Ngày
                        </button>
                        <button
                          type="button"
                          onClick={() => copyDayToWeekdays(selectedScheduleDay)}
                          className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl border border-teal-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Sao chép toàn bộ thiết lập ngày này sang tất cả các ngày Thứ 2 đến Thứ 6"
                        >
                          <Copy className="w-3.5 h-3.5 text-teal-600" />
                          Sao Chép Sang T2 - T6
                        </button>
                      </div>
                    </div>

                    {/* Shift 1: Ca Sáng (08:00 - 12:00) */}
                    <div className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/40 via-white to-white p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-amber-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                            <Sun className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                Ca Sáng (08:00 - 12:00)
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                7 khung giờ tiếp đón
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Đang kích hoạt: <strong className="text-amber-700">{morningSlots.filter((s) => s.active).length}</strong> / {morningSlots.length} slot
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleShiftAll(selectedScheduleDay, true, true)}
                            className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 shadow-2xs transition cursor-pointer"
                          >
                            Mở hết ca sáng
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleShiftAll(selectedScheduleDay, true, false)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                          >
                            Nghỉ ca sáng
                          </button>
                        </div>
                      </div>

                      {/* Morning Slots Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
                        {morningSlots.map((slot) => {
                          const isActive = slot.active;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => toggleSlotByKey(slot.dayOfWeek, slot.startTime)}
                              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                isActive
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/30 hover:bg-teal-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                                  <span className="font-mono text-xs font-black">
                                    {formatTimeClean(slot.startTime)} - {formatTimeClean(slot.endTime)}
                                  </span>
                                </div>
                                <div className={`text-[10px] ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                                  Thời lượng: {slot.slotDurationMinutes || 30} phút
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  isActive ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isActive ? 'Mở' : 'Tắt'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Shift 2: Ca Chiều (13:30 - 17:00) */}
                    <div className="rounded-2xl border border-indigo-200/80 bg-linear-to-br from-indigo-50/40 via-white to-white p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-indigo-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
                            <Sunset className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                Ca Chiều (13:30 - 17:00)
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                7 khung giờ tiếp đón
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Đang kích hoạt: <strong className="text-indigo-700">{afternoonSlots.filter((s) => s.active).length}</strong> / {afternoonSlots.length} slot
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleShiftAll(selectedScheduleDay, false, true)}
                            className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 shadow-2xs transition cursor-pointer"
                          >
                            Mở hết ca chiều
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleShiftAll(selectedScheduleDay, false, false)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                          >
                            Nghỉ ca chiều
                          </button>
                        </div>
                      </div>

                      {/* Afternoon Slots Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
                        {afternoonSlots.map((slot) => {
                          const isActive = slot.active;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => toggleSlotByKey(slot.dayOfWeek, slot.startTime)}
                              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                isActive
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/30 hover:bg-teal-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                                  <span className="font-mono text-xs font-black">
                                    {formatTimeClean(slot.startTime)} - {formatTimeClean(slot.endTime)}
                                  </span>
                                </div>
                                <div className={`text-[10px] ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                                  Thời lượng: {slot.slotDurationMinutes || 30} phút
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  isActive ? 'bg-white/20 text-white border border-white/30' : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isActive ? 'Mở' : 'Tắt'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Cấu hình được đồng bộ tức thì với cổng đặt lịch khám trực tuyến của bệnh nhân.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleSaveSchedules}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSchedule ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Lưu Lịch Trực...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu Lịch Trực ({scheduleStats.activeSlots} slot khả dụng)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLINICAL ENCOUNTER WORKSTATION (EMR FORM) */}
      {activeEncounterAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="bg-teal-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-teal-300 tracking-widest">
                  PHIẾU KHÁM BỆNH & CHỈ ĐỊNH ĐIỀU TRỊ NGOẠI TRÚ (HIS / EMR)
                </div>
                <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-300" />
                  Thăm Khám Người Bệnh: {activeEncounterAppointment.patientName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-teal-200 mt-1">
                  <span>Mã ca khám: <strong className="font-mono text-white">{activeEncounterAppointment.appointmentCode}</strong></span>
                  <span>Phòng khám: <strong className="text-white">{clinicRoom}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setActiveEncounterAppointment(null)}
                className="text-teal-300 hover:text-white p-2 rounded-xl bg-teal-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ALLERGY RED-FLAG ALERT BANNER (IF PRESENT) */}
            {patientPassport?.allergies && !patientPassport.allergies.toLowerCase().includes('chưa ghi nhận') && (
              <div className="bg-rose-50 border-b-2 border-rose-300 px-6 py-3 flex items-center justify-between gap-3 text-rose-900 shadow-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs uppercase tracking-wider">CẢNH BÁO TIỀN SỬ DỊ ỨNG: </span>
                    <span className="font-bold text-xs text-rose-950">{patientPassport.allergies}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-rose-200 text-rose-800 font-black text-[10px] rounded-lg uppercase tracking-wider">
                  Nguy Cơ Phản Vệ
                </span>
              </div>
            )}

            {/* MEDICAL PASSPORT QUICK BAR */}
            <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-700">
                <span>Mã BN: <strong className="font-mono text-teal-800">{patientPassport?.patientCode || 'BN-2026-N/A'}</strong></span>
                <span>•</span>
                <span>Giới tính: <strong>{patientPassport?.gender === 'MALE' ? 'Nam' : patientPassport?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</strong></span>
                {patientPassport?.dateOfBirth && (
                  <>
                    <span>•</span>
                    <span>Tuổi: <strong>{new Date().getFullYear() - new Date(patientPassport.dateOfBirth).getFullYear()} tuổi</strong></span>
                  </>
                )}
                <span>•</span>
                <span>Nhóm máu: <strong className="text-rose-700 font-mono font-black">{patientPassport?.bloodGroup || 'O+'}</strong></span>
                <span>•</span>
                <span>BHYT: <strong className="font-mono text-slate-900">{patientPassport?.healthInsuranceNumber || 'Chưa cập nhật'}</strong></span>
              </div>
              {patientPassport?.medicalHistory && !patientPassport.medicalHistory.toLowerCase().includes('chưa ghi nhận') && (
                <div className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                  <strong className="text-slate-800">Bệnh nền:</strong> {patientPassport.medicalHistory}
                </div>
              )}
            </div>

            {/* 4 CLINICAL WORKSTATION TABS */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveEncounterTab('EMR')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeEncounterTab === 'EMR'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>Bàn Khám & Kê Đơn (EMR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEncounterTab('TRIAGE')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeEncounterTab === 'TRIAGE'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Triage AI & SBAR ({patientTriageHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEncounterTab('DOCUMENTS')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeEncounterTab === 'DOCUMENTS'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Xét Nghiệm & Cận Lâm Sàng ({patientDocuments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEncounterTab('HISTORY')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeEncounterTab === 'HISTORY'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4 text-amber-600" />
                <span>Bệnh Sử Các Lần Khám Cũ ({patientPastAppointments.length})</span>
              </button>

              {encounterLoading && (
                <div className="ml-auto flex items-center gap-1.5 text-teal-600 font-medium pb-2 text-[11px]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang đồng bộ hồ sơ 360°...</span>
                </div>
              )}
            </div>

            {/* TAB 1: EMR FORM */}
            {activeEncounterTab === 'EMR' && (
              <form onSubmit={handleSubmitEncounter} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Section 1: Vital Signs Triage */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-600" /> Dấu Hiệu Sinh Tồn Tiếp Đón (Vital Signs)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">HA Tâm thu / Tâm trương (mmHg)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={bpSystolic}
                          onChange={(e) => setBpSystolic(e.target.value)}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center font-mono font-bold"
                          placeholder="120"
                        />
                        <span>/</span>
                        <input
                          type="text"
                          value={bpDiastolic}
                          onChange={(e) => setBpDiastolic(e.target.value)}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center font-mono font-bold"
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Tần số mạch (l/phút)</label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Thân nhiệt (°C)</label>
                      <input
                        type="text"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
                        placeholder="36.8"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={spO2}
                        onChange={(e) => setSpO2(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                        placeholder="98"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Chiều cao (cm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                        placeholder="170"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Cân nặng (kg)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                        placeholder="65"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Tần số thở (l/phút)</label>
                      <input
                        type="number"
                        value={respiratoryRate}
                        onChange={(e) => setRespiratoryRate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                        placeholder="18"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Chỉ số BMI (Tự tính)</label>
                      <div className="py-1.5 px-2 bg-slate-200 rounded-lg font-mono font-bold text-slate-800 text-center">
                        {Number(weight) && Number(height)
                          ? (Number(weight) / ((Number(height) / 100) * (Number(height) / 100))).toFixed(1)
                          : '22.0'}{' '}
                        kg/m²
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Chief Complaint & Exam Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Lý Do Vào Khám (Chief Complaint)</label>
                    <textarea
                      rows={2}
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                      placeholder="Triệu chứng chính người bệnh khai báo..."
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Khám Thực Thể & Kết Luận Lâm Sàng</label>
                    <textarea
                      rows={2}
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                      placeholder="Tình trạng tri giác, tim phổi, bụng..."
                    />
                  </div>
                </div>

                {/* Section 3: ICD-10 Coding */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="font-bold text-indigo-900 text-sm flex items-center justify-between">
                    <span>Chẩn Đoán Chuẩn Quốc Tế WHO (ICD-10)</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectIcd10Template('I10', 'Tăng huyết áp vô căn (nguyên phát)')}
                        className="px-2 py-0.5 rounded bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                      >
                        I10 (THA)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectIcd10Template('I20.9', 'Cơn đau thắt ngực, không xác định')}
                        className="px-2 py-0.5 rounded bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                      >
                        I20.9 (Đau ngực)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectIcd10Template('K21.0', 'Trào ngược dạ dày thực quản')}
                        className="px-2 py-0.5 rounded bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                      >
                        K21.0 (GERD)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Mã Bệnh (ICD-10 Code)</label>
                      <input
                        type="text"
                        value={icd10Code}
                        onChange={(e) => setIcd10Code(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase bg-white"
                        placeholder="I10"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-slate-500 font-semibold block mb-1">Tên Chẩn Đoán Y Khoa</label>
                      <input
                        type="text"
                        value={icd10Name}
                        onChange={(e) => setIcd10Name(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
                        placeholder="Tên bệnh..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Multi-item Prescription Writer with Allergy Conflict Guard */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" /> Kê Đơn Thuốc Ngoại Trú Điện Tử
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => loadPrescriptionPreset('cardio')}
                        className="px-2 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-[11px] hover:bg-teal-100 cursor-pointer border border-teal-200"
                      >
                        + Nạp Mẫu Tim Mạch & Mỡ Máu
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPrescriptionPreset('gastro')}
                        className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer border border-indigo-200"
                      >
                        + Nạp Mẫu Dạ Dày
                      </button>
                      <button
                        type="button"
                        onClick={addPrescriptionRow}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-[11px] hover:bg-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Thêm Thuốc
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-8">#</th>
                          <th className="p-2 min-w-[160px]">Tên Thuốc (Biệt Dược)</th>
                          <th className="p-2 min-w-[140px]">Hoạt Chất</th>
                          <th className="p-2 min-w-[200px]">Liều Dùng & Hướng Dẫn</th>
                          <th className="p-2 w-20 text-center">SL</th>
                          <th className="p-2 w-20 text-center">Đơn Vị</th>
                          <th className="p-2 w-20 text-center">Ngày</th>
                          <th className="p-2 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prescriptionItems.map((item, index) => {
                          const conflict = checkDrugAllergyConflict(item.drugName, patientPassport?.allergies) ||
                                           checkDrugAllergyConflict(item.activeIngredient, patientPassport?.allergies);
                          return (
                            <tr key={index} className={conflict ? "bg-rose-50/80 border-l-4 border-rose-500" : "hover:bg-slate-50"}>
                              <td className="p-2 text-slate-400 font-mono">{index + 1}</td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.drugName}
                                  onChange={(e) => updatePrescriptionRow(index, 'drugName', e.target.value)}
                                  className={`w-full px-2 py-1 border rounded text-xs font-bold ${
                                    conflict ? 'border-rose-400 bg-white text-rose-950 focus:ring-rose-500' : 'border-slate-200'
                                  }`}
                                  placeholder="Lipitor 20mg"
                                />
                                {conflict && (
                                  <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 mt-0.5">
                                    <ShieldAlert className="w-3 h-3 text-rose-600 flex-shrink-0" />
                                    <span>Trùng dị ứng: "{conflict}"</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.activeIngredient}
                                  onChange={(e) => updatePrescriptionRow(index, 'activeIngredient', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  placeholder="Atorvastatin"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.dosage}
                                  onChange={(e) => updatePrescriptionRow(index, 'dosage', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  placeholder="Uống 1 viên vào buổi tối sau ăn"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updatePrescriptionRow(index, 'quantity', Number(e.target.value))}
                                  className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs text-center font-bold"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => updatePrescriptionRow(index, 'unit', e.target.value)}
                                  className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs text-center"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  value={item.days}
                                  onChange={(e) => updatePrescriptionRow(index, 'days', Number(e.target.value))}
                                  className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs text-center"
                                />
                              </td>
                              <td className="p-2 text-center">
                                {prescriptionItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removePrescriptionRow(index)}
                                    className="text-rose-500 hover:text-rose-700 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 5: Treatment Plan & Follow Up */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Hướng Xử Trí & Lời Dặn Của Bác Sĩ</label>
                    <textarea
                      rows={2}
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                      placeholder="Chế độ ăn, nghỉ ngơi, theo dõi huyết áp..."
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày Hẹn Tái Khám</label>
                    <div className="space-y-1.5">
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                      />
                      {followUpDate && (
                        <button
                          type="button"
                          onClick={handleCreateFollowUp}
                          disabled={bookingFollowUp}
                          className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition disabled:opacity-50"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{bookingFollowUp ? 'Đang tạo...' : 'Tạo Lịch Tái Khám Trực Tiếp'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveEncounterAppointment(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEncounter}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {submittingEncounter ? 'Đang Ký Duyệt Bệnh Án...' : 'Ký Duyệt & Hoàn Tất Ca Khám'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: TRIAGE AI */}
            {activeEncounterTab === 'TRIAGE' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Lịch Sử Tư Vấn Phân Luồng Triệu Chứng Bệnh Nhân (AI Triage)
                    </h4>
                    <p className="text-slate-500 text-[11px]">Bác sĩ có thể bấm "Nạp Vào Phiếu Khám" để tự động điền triệu chứng và kết luận SBAR.</p>
                  </div>
                </div>
                {patientTriageHistory.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-12">Bệnh nhân chưa từng thực hiện phân luồng Triage AI.</p>
                ) : (
                  patientTriageHistory.map((tr) => (
                    <div key={tr.id} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2">
                        <span className="font-bold text-purple-900">
                          Phiên Triage: {new Date(tr.createdAt).toLocaleString('vi-VN')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tr.urgencyLevel === 'EMERGENCY'
                              ? 'bg-rose-100 text-rose-800'
                              : tr.urgencyLevel === 'URGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {tr.urgencyLevel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleImportTriage(tr)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Nạp Vào Phiếu Khám</span>
                          </button>
                        </div>
                      </div>
                      <div><strong>Triệu chứng khai báo:</strong> {tr.symptomsText}</div>
                      {tr.primarySpecialty && <div><strong>Chuyên khoa khuyến nghị:</strong> {tr.primarySpecialty}</div>}
                      {tr.sbarSummary && (
                        <div className="p-3 bg-white rounded-xl border border-purple-100 font-mono text-[11px] whitespace-pre-wrap text-slate-700">
                          {tr.sbarSummary}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: LAB DOCUMENTS */}
            {activeEncounterTab === 'DOCUMENTS' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-sm text-sky-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      Hồ Sơ Xét Nghiệm & Kết Quả Cận Lâm Sàng Của Người Bệnh
                    </h4>
                    <p className="text-slate-500 text-[11px]">Các tài liệu y tế (PDF, phiếu xét nghiệm hình ảnh) người bệnh đã tải lên hệ thống.</p>
                  </div>
                </div>
                {patientDocuments.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-12">Bệnh nhân chưa tải lên hồ sơ xét nghiệm nào.</p>
                ) : (
                  patientDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{doc.fileName}</div>
                          <div className="text-[11px] text-slate-400">
                            {(doc.fileSizeBytes / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      {doc.storageUrl ? (
                        <a
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                        >
                          <span>Xem Tài Liệu</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Lưu trữ nội bộ</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: LONGITUDINAL HISTORY */}
            {activeEncounterTab === 'HISTORY' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-600" />
                      Lịch Sử Các Ca Khám Lâm Sàng Trước Đây ({patientPastAppointments.length})
                    </h4>
                    <p className="text-slate-500 text-[11px]">Theo dõi diễn tiến huyết áp, đơn thuốc cũ và chẩn đoán ICD-10 qua các lần khám.</p>
                  </div>
                </div>
                {patientPastAppointments.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-12">Chưa có lịch sử các ca khám trước đây.</p>
                ) : (
                  patientPastAppointments.map((past) => (
                    <div key={past.id} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                        <div>
                          <span className="font-mono font-bold text-amber-900">{past.appointmentCode}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-slate-600">{new Date(past.scheduledStart).toLocaleString('vi-VN')}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {past.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div><strong>Bác sĩ:</strong> {past.doctorName}</div>
                        <div><strong>Lý do khám:</strong> {past.chiefComplaint || 'Không có'}</div>
                        {past.icd10Code && (
                          <div className="sm:col-span-2 text-indigo-900 font-semibold">
                            <strong>Chẩn đoán ICD-10:</strong> [{past.icd10Code}] {past.icd10Name}
                          </div>
                        )}
                        {past.prescriptionJson && (
                          <div className="sm:col-span-2 font-mono text-[11px] bg-white p-2.5 rounded-xl border border-amber-100">
                            <strong>Đơn thuốc cũ:</strong> {past.prescriptionJson}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DOCTOR VIEW COMPLETED EMR RECORD */}
      {selectedViewEmr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700">{selectedViewEmr.appointmentCode}</span>
                <h3 className="font-bold text-lg text-slate-900">Hồ Sơ Ca Khám Đã Hoàn Thành</h3>
              </div>
              <button
                onClick={() => setSelectedViewEmr(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong>Bệnh nhân:</strong> {selectedViewEmr.patientName} ({selectedViewEmr.patientEmail})
              </div>
              {selectedViewEmr.icd10Code && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <strong className="text-indigo-900">Mã ICD-10:</strong> {selectedViewEmr.icd10Code} - {selectedViewEmr.icd10Name}
                </div>
              )}
              {selectedViewEmr.consultationNotes && (
                <div>
                  <strong>Kết luận lâm sàng:</strong>
                  <p className="mt-1 text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    {selectedViewEmr.consultationNotes}
                  </p>
                </div>
              )}
              {selectedViewEmr.treatmentPlan && (
                <div>
                  <strong>Hướng xử trí:</strong>
                  <p className="mt-1 text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    {selectedViewEmr.treatmentPlan}
                  </p>
                </div>
              )}
              {selectedViewEmr.followUpDate && (
                <div className="text-amber-800 font-semibold">
                  📅 Hẹn tái khám: {new Date(selectedViewEmr.followUpDate).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> In Bệnh Án
              </button>
              <button
                onClick={() => setSelectedViewEmr(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
