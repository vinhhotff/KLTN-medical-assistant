import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Heart,
  Calendar,
  FileText,
  Activity,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  Phone,
  Mail,
  User,
  Plus,
  RefreshCw,
  Sparkles,
  Printer,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

interface DoctorPatientItem {
  patientId: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  bloodGroup: string;
  dateOfBirth?: string;
  allergies?: string;
  medicalHistory?: string;
  totalVisits: number;
  lastVisitDate?: string;
  lastStatus?: string;
  lastIcd10Code?: string;
  lastIcd10Name?: string;
  lastChiefComplaint?: string;
}

interface PatientAppointmentHistory {
  id: string;
  appointmentCode: string;
  doctorName: string;
  scheduledStart: string;
  status: string;
  chiefComplaint?: string;
  icd10Code?: string;
  icd10Name?: string;
  vitalSignsJson?: string;
  prescriptionJson?: string;
  treatmentPlan?: string;
  consultationNotes?: string;
  clinicRoom?: string;
  queueNumber?: string;
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

const parseVitalSigns = (jsonStr?: string): VitalSigns | null => {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

const parsePrescriptions = (jsonStr?: string): PrescriptionItem[] => {
  if (!jsonStr) return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
};

interface PatientTriageItem {
  id: string;
  symptomsText: string;
  isEmergency: boolean;
  urgencyLevel: string;
  primarySpecialty?: string;
  sbarSummary?: string;
  createdAt: string;
}

interface PatientDocItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  storageUrl?: string;
  createdAt: string;
}

export const DoctorPatientRecordsPage: React.FC = () => {
  const [patients, setPatients] = useState<DoctorPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [allergyFilter, setAllergyFilter] = useState<'ALL' | 'HAS_ALLERGIES' | 'NO_ALLERGIES'>('ALL');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('ALL');

  // Selected Patient Drawer/Modal State
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientItem | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientAppointmentHistory[]>([]);
  const [patientTriage, setPatientTriage] = useState<PatientTriageItem[]>([]);
  const [patientDocs, setPatientDocs] = useState<PatientDocItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState<'VISITS' | 'TRIAGE' | 'DOCS' | 'PASSPORT'>('VISITS');
  const [selectedEmrAppointment, setSelectedEmrAppointment] = useState<PatientAppointmentHistory | null>(null);

  // Follow-up Booking Modal State
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const fetchPatients = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/doctors/me/patients');
      if (res.data?.data) {
        setPatients(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doctor patients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const openPatientDetail = async (p: DoctorPatientItem) => {
    setSelectedPatient(p);
    setDetailTab('VISITS');
    setLoadingDetails(true);
    try {
      const [resAppt, resTriage, resDocs] = await Promise.allSettled([
        api.get(`/appointments/patient/${p.patientId}`),
        api.get(`/triage/patient/${p.patientId}`),
        api.get(`/documents/patient/${p.patientId}`),
      ]);
      if (resAppt.status === 'fulfilled' && resAppt.value.data?.data) {
        setPatientHistory(resAppt.value.data.data);
      } else {
        setPatientHistory([]);
      }
      if (resTriage.status === 'fulfilled' && resTriage.value.data?.data) {
        setPatientTriage(resTriage.value.data.data);
      } else {
        setPatientTriage([]);
      }
      if (resDocs.status === 'fulfilled' && resDocs.value.data?.data) {
        setPatientDocs(resDocs.value.data.data);
      } else {
        setPatientDocs([]);
      }
    } catch (err) {
      console.error('Failed to fetch patient details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !followUpDate) {
      alert('Vui lòng chọn ngày hẹn tái khám.');
      return;
    }
    try {
      setSubmittingFollowUp(true);
      const scheduledStart = `${followUpDate}T${followUpTime}:00`;
      const res = await api.post('/appointments/follow-up', {
        patientId: selectedPatient.patientId,
        scheduledStart,
        notes: followUpNotes || 'Tái khám theo lịch hẹn bác sĩ',
        clinicRoom: 'Phòng Khám Chuyên Khoa P.102',
      });
      if (res.data?.data) {
        setToastMessage(`✅ Đã đặt lịch tái khám thành công cho bệnh nhân ${selectedPatient.fullName} (Mã: ${res.data.data.appointmentCode})!`);
        setTimeout(() => setToastMessage(null), 5000);
        setFollowUpModalOpen(false);
        setFollowUpNotes('');
        // Refresh details
        openPatientDetail(selectedPatient);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Không thể tạo lịch hẹn tái khám.');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Search
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const searchable = `${p.fullName || ''} ${p.patientCode || ''} ${p.email || ''} ${p.phone || ''} ${p.lastIcd10Code || ''} ${p.lastIcd10Name || ''}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      // Allergy filter
      if (allergyFilter === 'HAS_ALLERGIES') {
        if (!p.allergies || p.allergies.toLowerCase().includes('chưa ghi nhận')) return false;
      } else if (allergyFilter === 'NO_ALLERGIES') {
        if (p.allergies && !p.allergies.toLowerCase().includes('chưa ghi nhận')) return false;
      }
      // Blood Group filter
      if (bloodGroupFilter !== 'ALL') {
        if (p.bloodGroup !== bloodGroupFilter) return false;
      }
      return true;
    });
  }, [patients, debouncedSearch, allergyFilter, bloodGroupFilter]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  // Statistics
  const totalCount = patients.length;
  const allergyCount = patients.filter(
    (p) => p.allergies && !p.allergies.toLowerCase().includes('chưa ghi nhận')
  ).length;
  const totalVisitsCount = patients.reduce((acc, p) => acc + (p.totalVisits || 0), 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Danh Bạ Bệnh Nhân & Hồ Sơ Bệnh Án 360°
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Quản lý hồ sơ y tế dài hạn, tiền sử dị ứng, cận lâm sàng và lịch sử phân luồng Triage AI của bệnh nhân.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPatients(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Tổng Số Người Bệnh Phụ Trách</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{totalCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Bệnh nhân từng khám hoặc đang có hẹn</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Bệnh Nhân Có Cảnh Báo Dị Ứng</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-700 mt-2">{allergyCount}</div>
          <p className="text-[11px] text-rose-600 mt-1 font-semibold">Cần chú ý đặc biệt khi kê đơn</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Tổng Lượt Thăm Khám Tích Lũy</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-700 mt-2">{totalVisitsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Lượt khám ngoại trú hoàn tất</p>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên, Mã BN, SĐT, ICD-10..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Allergy Filter */}
          <select
            value={allergyFilter}
            onChange={(e) => setAllergyFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
          >
            <option value="ALL">Tất cả dị ứng</option>
            <option value="HAS_ALLERGIES">⚠️ Có cảnh báo dị ứng</option>
            <option value="NO_ALLERGIES">Không ghi nhận dị ứng</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
          >
            <option value="ALL">Tất cả nhóm máu</option>
            <option value="A+">Nhóm A+</option>
            <option value="B+">Nhóm B+</option>
            <option value="O+">Nhóm O+</option>
            <option value="AB+">Nhóm AB+</option>
          </select>
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Bệnh Nhân</th>
                <th className="py-3.5 px-4">Căn Cước Y Tế</th>
                <th className="py-3.5 px-4">Nhóm Máu</th>
                <th className="py-3.5 px-4">Cảnh Báo Dị Ứng</th>
                <th className="py-3.5 px-4">Lượt Khám</th>
                <th className="py-3.5 px-4">Lần Khám Gần Nhất</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải danh bạ người bệnh...
                  </td>
                </tr>
              ) : paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Không tìm thấy bệnh nhân nào phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => {
                  const hasAllergy = p.allergies && !p.allergies.toLowerCase().includes('chưa ghi nhận');
                  return (
                    <tr key={p.patientId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.fullName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {p.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {p.phone}</span>}
                          {p.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" /> {p.email}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {p.patientCode}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {p.gender === 'MALE' ? 'Nam' : p.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                          {p.dateOfBirth && ` • ${new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()} tuổi`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200 font-mono">
                          {p.bloodGroup || 'O+'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {hasAllergy ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-bold text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{p.allergies}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Không ghi nhận</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-full">{p.totalVisits} ca</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.lastVisitDate ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {new Date(p.lastVisitDate).toLocaleDateString('vi-VN')}
                            </div>
                            {p.lastIcd10Code && (
                              <div className="text-[11px] text-indigo-600 font-mono">
                                [{p.lastIcd10Code}] {p.lastIcd10Name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Chưa có dữ liệu</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openPatientDetail(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                          <span>Hồ Sơ 360°</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPatients.length > 0 && (
          <div className="p-4 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredPatients.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* PATIENT 360° CLINICAL DRAWER / MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="bg-teal-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-teal-300 tracking-widest">
                  HỒ SƠ BỆNH ÁN ĐIỆN TỬ DÀI HẠN (LONGITUDINAL EMR)
                </div>
                <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-300" />
                  {selectedPatient.fullName}
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-teal-800 text-teal-200 border border-teal-700">
                    {selectedPatient.patientCode}
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-teal-200 mt-1">
                  <span>SĐT: <strong className="text-white">{selectedPatient.phone || 'Chưa có'}</strong></span>
                  <span>Email: <strong className="text-white">{selectedPatient.email}</strong></span>
                  <span>Nhóm máu: <strong className="text-rose-300 font-black">{selectedPatient.bloodGroup || 'O+'}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFollowUpModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Hẹn Tái Khám</span>
                </button>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-teal-300 hover:text-white p-2 rounded-xl bg-teal-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Allergy Banner if present */}
            {selectedPatient.allergies && !selectedPatient.allergies.toLowerCase().includes('chưa ghi nhận') && (
              <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center justify-between gap-3 text-rose-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs uppercase">Cảnh Báo Tiền Sử Dị Ứng: </span>
                    <span className="font-bold text-xs text-rose-900">{selectedPatient.allergies}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-black rounded-lg uppercase">
                  Nguy Cơ Phản Vệ
                </span>
              </div>
            )}

            {/* TABS NAVIGATION */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                onClick={() => setDetailTab('VISITS')}
                className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'VISITS'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Lịch Sử Ca Khám ({patientHistory.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('TRIAGE')}
                className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'TRIAGE'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Tư Vấn Triage AI ({patientTriage.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('DOCS')}
                className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'DOCS'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Xét Nghiệm & Cận Lâm Sàng ({patientDocs.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('PASSPORT')}
                className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'PASSPORT'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Căn Cước Y Tế Chi Tiết</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-700">
              {loadingDetails ? (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                  Đang tải dữ liệu hồ sơ lâm sàng...
                </div>
              ) : (
                <>
                  {/* TAB 1: VISITS */}
                  {detailTab === 'VISITS' && (
                    <div className="space-y-4">
                      {patientHistory.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-8">Chưa có ca khám nào được ghi nhận.</p>
                      ) : (
                        patientHistory.map((apt) => {
                          const isCompleted = apt.status === 'COMPLETED';
                          const isScheduled = apt.status === 'SCHEDULED';
                          const vitals = parseVitalSigns(apt.vitalSignsJson);
                          const drugs = parsePrescriptions(apt.prescriptionJson);

                          return (
                            <div
                              key={apt.id}
                              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 transition shadow-2xs space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                                    {apt.appointmentCode}
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600 font-medium text-xs">
                                    {new Date(apt.scheduledStart).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isScheduled
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : apt.status === 'NO_SHOW'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {isCompleted
                                    ? '✓ Đã Hoàn Tất Khám'
                                    : isScheduled
                                    ? '● Đã Tiếp Nhận Xếp Lịch'
                                    : apt.status === 'NO_SHOW'
                                    ? '▲ Vắng Mặt'
                                    : '✕ Đã Hủy'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px] font-semibold">Bác sĩ phụ trách:</span>
                                  <span className="font-bold text-slate-900">{apt.doctorName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px] font-semibold">Lý do khám bệnh:</span>
                                  <span className="font-medium text-slate-700">{apt.chiefComplaint || 'Không có'}</span>
                                </div>

                                {apt.icd10Code && (
                                  <div className="sm:col-span-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-0.5">
                                    <span className="text-indigo-900 font-bold block text-[11px]">Chẩn đoán xác định (ICD-10):</span>
                                    <span className="font-mono text-indigo-700 font-black">[{apt.icd10Code}]</span> <span className="font-semibold text-slate-800">{apt.icd10Name}</span>
                                  </div>
                                )}

                                {apt.treatmentPlan && (
                                  <div className="sm:col-span-2 text-slate-700">
                                    <span className="text-slate-400 block text-[11px] font-semibold">Hướng xử trí & Lời dặn:</span>
                                    <span className="text-slate-700 italic">{apt.treatmentPlan}</span>
                                  </div>
                                )}
                              </div>

                              {/* Mini Quick Badges for Vitals & Prescription */}
                              {isCompleted && (vitals || drugs.length > 0) && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px]">
                                  {vitals?.bloodPressure && (
                                    <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-100 font-medium">
                                      HA: <strong>{vitals.bloodPressure}</strong> mmHg
                                    </span>
                                  )}
                                  {vitals?.heartRate && (
                                    <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-lg border border-sky-100 font-medium">
                                      Mạch: <strong>{vitals.heartRate}</strong> bpm
                                    </span>
                                  )}
                                  {drugs.length > 0 && (
                                    <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg border border-teal-100 font-medium">
                                      Toa thuốc: <strong>{drugs.length}</strong> loại
                                    </span>
                                  )}
                                  {apt.followUpDate && (
                                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 font-medium">
                                      Tái khám: <strong>{new Date(apt.followUpDate).toLocaleDateString('vi-VN')}</strong>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Action: Open EMR Details */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                  {isCompleted ? 'Hồ sơ bệnh án điện tử đã hoàn tất lưu trữ' : 'Ca khám trong quy trình theo dõi'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedEmrAppointment(apt)}
                                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Xem Chi Tiết Bệnh Án & Toa Thuốc</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: TRIAGE */}
                  {detailTab === 'TRIAGE' && (
                    <div className="space-y-4">
                      {patientTriage.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-8">Bệnh nhân chưa thực hiện phân luồng Triage AI.</p>
                      ) : (
                        patientTriage.map((tr) => (
                          <div key={tr.id} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                Phân Luồng AI Lúc: {new Date(tr.createdAt).toLocaleString('vi-VN')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                tr.urgencyLevel === 'EMERGENCY'
                                  ? 'bg-rose-100 text-rose-800'
                                  : tr.urgencyLevel === 'URGENT'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}>
                                {tr.urgencyLevel}
                              </span>
                            </div>
                            <div><strong>Triệu chứng khai báo:</strong> {tr.symptomsText}</div>
                            {tr.primarySpecialty && <div><strong>Chuyên khoa khuyến nghị:</strong> {tr.primarySpecialty}</div>}
                            {tr.sbarSummary && (
                              <div className="p-3 bg-white rounded-xl border border-purple-100 mt-2 font-mono text-[11px] whitespace-pre-wrap text-slate-700">
                                {tr.sbarSummary}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: DOCS */}
                  {detailTab === 'DOCS' && (
                    <div className="space-y-3">
                      {patientDocs.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-8">Bệnh nhân chưa tải lên tài liệu xét nghiệm nào.</p>
                      ) : (
                        patientDocs.map((doc) => (
                          <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-sky-600" />
                              <div>
                                <div className="font-bold text-slate-900">{doc.fileName}</div>
                                <div className="text-[10px] text-slate-400">
                                  {(doc.fileSizeBytes / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            </div>
                            {doc.storageUrl ? (
                              <a
                                href={doc.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-bold transition"
                              >
                                <span>Xem Tệp</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">Tệp nội bộ</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: PASSPORT */}
                  {detailTab === 'PASSPORT' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div><strong>Họ và tên:</strong> {selectedPatient.fullName}</div>
                        <div><strong>Mã bệnh nhân:</strong> <span className="font-mono font-bold text-teal-700">{selectedPatient.patientCode}</span></div>
                        <div><strong>Ngày sinh:</strong> {selectedPatient.dateOfBirth || 'Chưa cập nhật'}</div>
                        <div><strong>Giới tính:</strong> {selectedPatient.gender === 'MALE' ? 'Nam' : selectedPatient.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</div>
                        <div><strong>Nhóm máu:</strong> <span className="font-bold text-rose-700 font-mono">{selectedPatient.bloodGroup || 'O+'}</span></div>
                        <div><strong>Điện thoại:</strong> {selectedPatient.phone || 'Chưa cập nhật'}</div>
                        <div><strong>Email:</strong> {selectedPatient.email}</div>
                      </div>

                      <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-1">
                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          Tiền Sử Dị Ứng Thuốc & Thực Phẩm:
                        </div>
                        <p className="text-rose-900 font-semibold">{selectedPatient.allergies || 'Chưa ghi nhận tiền sử dị ứng thuốc'}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-800">Tiền Sử Bệnh Lý Bản Thân & Gia Đình:</div>
                        <p className="text-slate-600">{selectedPatient.medicalHistory || 'Chưa ghi nhận bệnh lý mạn tính'}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL BOOK FOLLOW-UP */}
      {followUpModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-300" />
                  Lên Lịch Tái Khám
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">Bệnh nhân: {selectedPatient.fullName}</p>
              </div>
              <button onClick={() => setFollowUpModalOpen(false)} className="text-emerald-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookFollowUp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ngày Hẹn Tái Khám</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Giờ Khám Dự Kiến</label>
                <select
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                >
                  <option value="08:00">08:00 Sáng</option>
                  <option value="08:30">08:30 Sáng</option>
                  <option value="09:00">09:00 Sáng</option>
                  <option value="09:30">09:30 Sáng</option>
                  <option value="10:00">10:00 Sáng</option>
                  <option value="14:00">14:00 Chiều</option>
                  <option value="14:30">14:30 Chiều</option>
                  <option value="15:00">15:00 Chiều</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi Chú Chỉ Định Tái Khám</label>
                <textarea
                  rows={2}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Ví dụ: Tái khám kiểm tra huyết áp và điều chỉnh liều thuốc..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFollowUpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submittingFollowUp ? 'Đang tạo lịch...' : 'Xác Nhận Đặt Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW COMPREHENSIVE EMR RECORD & PRESCRIPTION (Layered on top of Patient Drawer with Z-60) */}
      {selectedEmrAppointment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Header with Hospital Banner */}
            <div className="bg-linear-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-teal-800/40 shrink-0">
              <div>
                <div className="text-[10px] uppercase font-bold text-teal-300 tracking-widest">
                  BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDIASSIST
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-0.5 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-300" />
                  PHIẾU KHÁM BỆNH & TOA THUỐC NGOẠI TRÚ
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  <span>Mã Hồ Sơ: <strong className="font-mono text-emerald-300">{selectedEmrAppointment.appointmentCode}</strong></span>
                  {selectedEmrAppointment.clinicRoom && <span>Phòng: <strong className="text-white">{selectedEmrAppointment.clinicRoom}</strong></span>}
                  <span>Thời gian khám: <strong className="text-white">{new Date(selectedEmrAppointment.scheduledStart).toLocaleString('vi-VN')}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmrAppointment(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable EMR Details */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thông Tin Bệnh Nhân</div>
                  <div className="font-black text-sm text-slate-900">{selectedPatient?.fullName}</div>
                  <div className="text-slate-600">Mã BN: <span className="font-mono font-bold text-teal-700">{selectedPatient?.patientCode}</span></div>
                  <div className="text-slate-600">SĐT: <span>{selectedPatient?.phone || 'Chưa cập nhật'}</span></div>
                  <div className="text-slate-600">Nhóm máu: <span className="font-bold text-rose-700">{selectedPatient?.bloodGroup || 'O+'}</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bác Sĩ Điều Trị</div>
                  <div className="font-black text-sm text-teal-900">{selectedEmrAppointment.doctorName}</div>
                  <div className="text-slate-600">Chuyên khoa: <span className="font-semibold text-slate-800">Nội Tổng Quát / Chuyên Sâu</span></div>
                  <div className="text-emerald-700 font-bold flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hồ sơ đã hoàn tất & ký duyệt điện tử</span>
                  </div>
                </div>
              </div>

              {/* Vital Signs Cards */}
              {(() => {
                const vs = parseVitalSigns(selectedEmrAppointment.vitalSignsJson);
                if (!vs) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" /> Dấu Hiệu Sinh Tồn Tiếp Đón (Vital Signs)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500">Huyết Áp</div>
                        <div className="text-sm font-black text-rose-700 font-mono mt-0.5">
                          {vs.bloodPressure || '120/80'} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                        </div>
                      </div>
                      <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500">Tần Số Mạch</div>
                        <div className="text-sm font-black text-sky-700 font-mono mt-0.5">
                          {vs.heartRate || 72} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500">Thân Nhiệt</div>
                        <div className="text-sm font-black text-amber-700 font-mono mt-0.5">
                          {vs.temperature || 36.6} <span className="text-[10px] font-normal text-slate-400">°C</span>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500">SpO2 / BMI</div>
                        <div className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                          {vs.spO2 || 99}% <span className="text-[10px] font-normal text-slate-400">({vs.bmi || 21.0})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chief Complaint */}
              {selectedEmrAppointment.chiefComplaint && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lý Do Khám & Triệu Chứng Cơ Năng</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                    {selectedEmrAppointment.chiefComplaint}
                  </div>
                </div>
              )}

              {/* ICD-10 Diagnosis */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-1.5">
                <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Chẩn Đoán Lâm Sàng Chuẩn Quốc Tế (ICD-10)</div>
                <div className="text-sm font-black text-indigo-950 flex items-center gap-2">
                  <span className="font-mono bg-indigo-700 text-white px-2 py-0.5 rounded text-xs">
                    {selectedEmrAppointment.icd10Code || 'Chưa ghi nhận'}
                  </span>
                  <span>{selectedEmrAppointment.icd10Name || 'Chẩn đoán xác định'}</span>
                </div>
                {selectedEmrAppointment.consultationNotes && (
                  <div className="pt-1 text-slate-700 leading-relaxed border-t border-indigo-100/60 mt-2">
                    <span className="font-bold text-slate-800 block text-[11px] mb-0.5">Ghi chú & Đánh giá lâm sàng của Bác sĩ:</span>
                    <p className="italic bg-white p-2.5 rounded-xl border border-indigo-100">
                      "{selectedEmrAppointment.consultationNotes}"
                    </p>
                  </div>
                )}
              </div>

              {/* E-Prescription Table */}
              {(() => {
                const drugs = parsePrescriptions(selectedEmrAppointment.prescriptionJson);
                if (drugs.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      Toa Thuốc Điều Trị Ngoại Trú ({drugs.length} Loại Thuốc)
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
                                  <div className="text-[10px] font-normal text-slate-500">({d.activeIngredient})</div>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-700 font-medium">{d.dosage}</td>
                              <td className="p-2.5 text-center font-bold text-teal-700">{d.quantity} {d.unit}</td>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedEmrAppointment.treatmentPlan && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Hướng Xử Trí & Lời Dặn Bác Sĩ</div>
                    <p className="text-slate-700 leading-relaxed">{selectedEmrAppointment.treatmentPlan}</p>
                  </div>
                )}
                {selectedEmrAppointment.followUpDate && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                    <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">Lịch Hẹn Tái Khám</div>
                    <div className="text-sm font-black text-amber-900">
                      📅 {new Date(selectedEmrAppointment.followUpDate).toLocaleDateString('vi-VN')}
                    </div>
                    <p className="text-[11px] text-amber-700">Người bệnh cần mang theo đơn thuốc và kết quả cận lâm sàng khi tái khám.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 italic">
                Bản ghi bệnh án điện tử có giá trị lưu trữ pháp lý và đối soát bảo hiểm.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Bệnh Án</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmrAppointment(null)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl hover:bg-white cursor-pointer transition"
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
