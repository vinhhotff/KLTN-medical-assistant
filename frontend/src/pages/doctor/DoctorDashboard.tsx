import React, { useState, useEffect } from 'react';
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
  Printer
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';

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

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active Clinical Encounter Modal State
  const [activeEncounterAppointment, setActiveEncounterAppointment] = useState<DoctorAppointment | null>(null);
  const [submittingEncounter, setSubmittingEncounter] = useState(false);

  // Clinical Form Fields (Initialized empty for genuine doctor entry)
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

  // Multi-drug prescription items (Empty by default)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  // Selected EMR view modal for completed appointments
  const [selectedViewEmr, setSelectedViewEmr] = useState<DoctorAppointment | null>(null);

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

  // Open Examination Modal - Reset form to clean clinical state
  const openEncounterModal = (apt: DoctorAppointment) => {
    setActiveEncounterAppointment(apt);
    setChiefComplaint(apt.consultationNotes || '');
    setClinicRoom(apt.clinicRoom || '');
    setConsultationNotes('');
    setTreatmentPlan('');
    setFollowUpDate('');
    setBpSystolic('');
    setBpDiastolic('');
    setHeartRate('');
    setTemperature('');
    setRespiratoryRate('');
    setHeight('');
    setWeight('');
    setSpO2('');
    setIcd10Code('');
    setIcd10Name('');
    setPrescriptionItems([]);
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
      fetchAppointments();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(axiosError.response?.data?.error?.message || 'Không thể hoàn tất ca khám.');
    } finally {
      setSubmittingEncounter(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const reason = window.prompt('Nhập lý do hủy ca khám:');
    if (!reason) return;

    try {
      setActionError(null);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: 'CANCELLED',
        notes: reason,
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
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold text-teal-400 tracking-wider">
            Cổng Bác Sĩ Lâm Sàng (Hospital Clinical Workstation)
          </div>
          <h2 className="text-2xl font-black mt-1">
            Chào Bác sĩ, {user?.fullName || 'Đồng nghiệp'}!
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Bàn khám bệnh điện tử, chẩn đoán theo mã quốc tế WHO ICD-10 và kê đơn thuốc ngoại trú.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          Chứng Chỉ Hành Nghề Đã Thẩm Định
        </span>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Layout Grid */}
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
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                          {apt.appointmentCode}
                        </span>
                        {apt.queueNumber && (
                          <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            {apt.queueNumber}
                          </span>
                        )}
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Chờ Khám
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
                            year: 'numeric',
                          })}
                        </span>
                        {apt.patientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {apt.patientPhone}
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
                        onClick={() => openEncounterModal(apt)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" /> Bắt Đầu Khám Bệnh
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> Hủy Ca
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Past & Completed Appointments (1 col) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Lịch Sử Khám Lâm Sàng ({pastAppointments.length})
            </h3>

            {pastAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                Chưa có ca khám nào hoàn thành.
              </div>
            ) : (
              <div className="space-y-3">
                {pastAppointments.slice(0, 10).map((apt) => (
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
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {apt.status === 'COMPLETED' ? 'Đã Khám' : 'Đã Hủy'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{apt.patientName}</div>
                    {apt.icd10Code && (
                      <div className="text-[11px] text-indigo-700 font-medium">
                        ICD-10: <strong>{apt.icd10Code}</strong> - {apt.icd10Name}
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CLINICAL ENCOUNTER WORKSTATION (HỒ SƠ KHÁM LÂM SÀNG BỆNH VIỆN) */}
      {activeEncounterAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="bg-teal-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-teal-300 tracking-widest">
                  PHIẾU KHÁM BỆNH & CHỈ ĐỊNH ĐIỀU TRỊ NGOẠI TRÚ (HIS/EMR)
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

            {/* Form */}
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
                      I20.9 (Đau thắt ngực)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectIcd10Template('E78.0', 'Tăng cholesterol máu thuần túy')}
                      className="px-2 py-0.5 rounded bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                    >
                      E78.0 (Mỡ máu)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectIcd10Template('K21.0', 'Trào ngược dạ dày - thực quản có viêm thực quản')}
                      className="px-2 py-0.5 rounded bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                    >
                      K21.0 (Trào ngược)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">Mã ICD-10</label>
                    <input
                      type="text"
                      value={icd10Code}
                      onChange={(e) => setIcd10Code(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-sm bg-white uppercase text-indigo-700"
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

              {/* Section 4: Multi-item Prescription Writer */}
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
                      {prescriptionItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400 font-mono">{index + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.drugName}
                              onChange={(e) => updatePrescriptionRow(index, 'drugName', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-bold"
                              placeholder="Lipitor 20mg"
                            />
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
                      ))}
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
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
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
                className="text-slate-400 hover:text-slate-600 p-1"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" /> In Bệnh Án
              </button>
              <button
                onClick={() => setSelectedViewEmr(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
