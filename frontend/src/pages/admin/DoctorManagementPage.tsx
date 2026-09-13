import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit3,
  Lock,
  Unlock,
  Cpu,
  Building2,
  Check,
  X,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';

export interface Doctor {
  id: string; // User ID
  profileId: string; // DoctorProfile ID
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  licenseNumber: string;
  consultationFee: number;
  yearsOfExperience: number;
  isVerified: boolean;
  specialties: string[];
  academicTitle?: string;
  hospitalAffiliation?: string;
  department?: string;
  licenseIssuedBy?: string;
  rating?: number;
  totalConsultations?: number;
  userStatus?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt?: string;
}

export interface SpecialtyItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export const DoctorManagementPage: React.FC = () => {
  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'vetting'>('roster');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination states (Limit/Offset)
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(10);
  const [vettingPage, setVettingPage] = useState(1);
  const [vettingPageSize, setVettingPageSize] = useState(6);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncingAllVectors, setSyncingAllVectors] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [selectedDoctorView, setSelectedDoctorView] = useState<Doctor | null>(null);
  const [selectedDoctorEdit, setSelectedDoctorEdit] = useState<Doctor | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rejectingDoctor, setRejectingDoctor] = useState<Doctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, specRes] = await Promise.allSettled([
        api.get('/admin/doctors'),
        api.get('/specialties'),
      ]);

      if (docRes.status === 'fulfilled' && docRes.value.data?.data) {
        setDoctors(docRes.value.data.data);
      }
      if (specRes.status === 'fulfilled' && specRes.value.data?.data) {
        setSpecialties(specRes.value.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bác sĩ:', err);
      showNotification('error', 'Không thể kết nối đến máy chủ để tải danh sách bác sĩ.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = doctors.length;
    const verified = doctors.filter((d) => d.isVerified).length;
    const pending = doctors.filter((d) => !d.isVerified).length;
    const suspended = doctors.filter((d) => d.userStatus === 'SUSPENDED').length;
    const active = doctors.filter((d) => d.isVerified && d.userStatus !== 'SUSPENDED').length;
    return { total, verified, pending, suspended, active };
  }, [doctors]);

  // Filtered doctors for Tab 1 (Roster)
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        doc.fullName?.toLowerCase().includes(query) ||
        doc.email?.toLowerCase().includes(query) ||
        doc.licenseNumber?.toLowerCase().includes(query) ||
        doc.hospitalAffiliation?.toLowerCase().includes(query) ||
        doc.department?.toLowerCase().includes(query) ||
        doc.specialties?.some((s) => s.toLowerCase().includes(query));

      // Specialty
      const matchSpecialty =
        selectedSpecialty === 'ALL' ||
        doc.specialties?.some(
          (s) => s.toLowerCase() === selectedSpecialty.toLowerCase() || s === selectedSpecialty
        );

      // Status
      let matchStatus = true;
      if (selectedStatus === 'ACTIVE') {
        matchStatus = doc.isVerified && doc.userStatus !== 'SUSPENDED';
      } else if (selectedStatus === 'PENDING') {
        matchStatus = !doc.isVerified;
      } else if (selectedStatus === 'SUSPENDED') {
        matchStatus = doc.userStatus === 'SUSPENDED';
      }

      return matchQuery && matchSpecialty && matchStatus;
    });
  }, [doctors, searchQuery, selectedSpecialty, selectedStatus]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setRosterPage(1);
  }, [searchQuery, selectedSpecialty, selectedStatus]);

  // Paginated Doctors (Tab 1)
  const paginatedDoctors = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredDoctors.slice(start, start + rosterPageSize);
  }, [filteredDoctors, rosterPage, rosterPageSize]);

  // Pending doctors for Tab 2 (Vetting)
  const pendingDoctors = useMemo(() => {
    return doctors.filter((d) => !d.isVerified);
  }, [doctors]);

  // Paginated Pending Doctors (Tab 2)
  const paginatedPending = useMemo(() => {
    const start = (vettingPage - 1) * vettingPageSize;
    return pendingDoctors.slice(start, start + vettingPageSize);
  }, [pendingDoctors, vettingPage, vettingPageSize]);

  // Actions
  const handleToggleStatus = async (doctor: Doctor) => {
    try {
      setActionLoading(doctor.profileId);
      const res = await api.patch(`/admin/doctors/${doctor.profileId}/toggle-status`);
      if (res.data?.data) {
        showNotification(
          'success',
          `Đã chuyển trạng thái tài khoản của BS ${doctor.fullName} sang: ${
            res.data.data.userStatus === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'
          }`
        );
        fetchData();
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      showNotification('error', axErr.response?.data?.error?.message || 'Không thể đổi trạng thái tài khoản.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncVector = async (doctor: Doctor) => {
    try {
      setActionLoading(doctor.profileId);
      await api.post(`/admin/doctors/${doctor.profileId}/sync-vector`);
      showNotification(
        'success',
        `Đã tính toán và cập nhật lại AI Vector 1536 chiều (pgvector) cho BS ${doctor.fullName}.`
      );
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      showNotification('error', axErr.response?.data?.error?.message || 'Đồng bộ AI Vector thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncAllVectors = async () => {
    try {
      setSyncingAllVectors(true);
      const res = await api.post('/admin/doctors/sync-vectors');
      showNotification(
        'success',
        `Đã đồng bộ thành công AI Vector embedding cho toàn bộ ${res.data?.data || doctors.length} bác sĩ trên hệ thống!`
      );
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      showNotification('error', axErr.response?.data?.error?.message || 'Đồng bộ hàng loạt AI Vector thất bại.');
    } finally {
      setSyncingAllVectors(false);
    }
  };

  const handleApproveVetting = async (doctor: Doctor) => {
    try {
      setActionLoading(doctor.profileId);
      await api.post(`/admin/doctors/${doctor.profileId}/vet`, { approve: true });
      showNotification(
        'success',
        `Đã phê duyệt CCHN cho BS ${doctor.fullName}. Hệ thống đã tự động kích hoạt và tính toán AI Vector embedding.`
      );
      fetchData();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      showNotification('error', axErr.response?.data?.error?.message || 'Phê duyệt hồ sơ thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectVetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoctor || !rejectionReason.trim()) return;

    try {
      setActionLoading(rejectingDoctor.profileId);
      await api.post(`/admin/doctors/${rejectingDoctor.profileId}/vet`, {
        approve: false,
        rejectionReason: rejectionReason.trim(),
      });
      showNotification('success', `Đã từ chối hồ sơ của BS ${rejectingDoctor.fullName}.`);
      setRejectingDoctor(null);
      setRejectionReason('');
      fetchData();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      showNotification('error', axErr.response?.data?.error?.message || 'Thao tác từ chối thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản Lý Đội Ngũ Bác Sĩ</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Giám sát hồ sơ lâm sàng, duyệt chứng chỉ CCHN, quản lý trạng thái tài khoản và đồng bộ AI Vector Matching.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAllVectors}
            disabled={syncingAllVectors}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-xs transition disabled:opacity-60"
            title="Đồng bộ lại toàn bộ Vector Embedding 1536 chiều vào pgvector"
          >
            <Cpu className={`w-4 h-4 text-indigo-600 ${syncingAllVectors ? 'animate-spin' : ''}`} />
            {syncingAllVectors ? 'Đang đồng bộ...' : 'Đồng bộ AI Vector Toàn Bộ'}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Thêm Bác Sĩ Mới
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số bác sĩ</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-medium text-slate-500">chuyên gia</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Đang hoạt động</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.active}</span>
            <span className="text-xs font-medium text-emerald-600">sẵn sàng khám</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Chờ xét duyệt CCHN</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{stats.pending}</span>
            {stats.pending > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold animate-pulse">
                Cần duyệt gấp
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Tạm khóa / Tạm dừng</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{stats.suspended}</span>
            <span className="text-xs font-medium text-slate-500">tài khoản</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'roster'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Danh Sách Toàn Bộ Bác Sĩ ({doctors.length})
        </button>

        <button
          onClick={() => setActiveTab('vetting')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'vetting'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Duyệt Hồ Sơ Chứng Chỉ
          {pendingDoctors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white">
              {pendingDoctors.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL DOCTORS ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, CCHN, bệnh viện, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Chuyên khoa:</span>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả chuyên khoa</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Hoạt động (Active)</option>
                  <option value="PENDING">Chờ duyệt (Pending)</option>
                  <option value="SUSPENDED">Tạm khóa (Suspended)</option>
                </select>
              </div>

              {(searchQuery || selectedSpecialty !== 'ALL' || selectedStatus !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('ALL');
                    setSelectedStatus('ALL');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Đang tải danh sách bác sĩ...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-12 text-center">
                <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Không tìm thấy bác sĩ phù hợp</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc chuyên khoa/trạng thái.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Bác Sĩ</th>
                      <th className="py-3.5 px-4">Đơn Vị & Chuyên Khoa</th>
                      <th className="py-3.5 px-4">Chứng Chỉ (CCHN)</th>
                      <th className="py-3.5 px-4">Kinh Nghiệm & Đánh Giá</th>
                      <th className="py-3.5 px-4">Giá Khám</th>
                      <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDoctors.map((doc) => (
                      <tr key={doc.profileId} className="hover:bg-slate-50/70 transition">
                        {/* Doctor Name & Avatar */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-emerald-200">
                              {doc.fullName?.charAt(0) || 'B'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {doc.academicTitle && (
                                  <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                    {doc.academicTitle}
                                  </span>
                                )}
                                <span className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer" onClick={() => setSelectedDoctorView(doc)}>
                                  {doc.fullName}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{doc.email}</p>
                              {doc.phone && <p className="text-xs text-slate-400">{doc.phone}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Hospital & Specialties */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{doc.hospitalAffiliation || 'Chưa cập nhật'}</span>
                            </div>
                            {doc.department && (
                              <p className="text-xs text-slate-400 pl-5">{doc.department}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.specialties?.slice(0, 2).map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                              {(doc.specialties?.length || 0) > 2 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  +{doc.specialties.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* License (CCHN) */}
                        <td className="py-4 px-4">
                          <div className="text-xs">
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {doc.licenseNumber || 'N/A'}
                            </span>
                            <p className="text-slate-400 text-[11px] mt-1">
                              Cấp bởi: {doc.licenseIssuedBy || 'Bộ Y Tế'}
                            </p>
                          </div>
                        </td>

                        {/* Experience & Rating */}
                        <td className="py-4 px-4">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <span>★ {doc.rating ? doc.rating.toFixed(1) : '4.9'}</span>
                              <span className="text-slate-400 font-normal">
                                ({doc.totalConsultations || 120} lượt khám)
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium">
                              {doc.yearsOfExperience} năm kinh nghiệm
                            </p>
                          </div>
                        </td>

                        {/* Consultation Fee */}
                        <td className="py-4 px-4">
                          <span className="text-xs font-bold text-slate-900">
                            {Number(doc.consultationFee || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </td>

                        {/* Status Badges */}
                        <td className="py-4 px-4 text-center">
                          {doc.userStatus === 'SUSPENDED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" /> Tạm khóa
                            </span>
                          ) : doc.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Chờ duyệt
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDoctorView(doc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Xem chi tiết hồ sơ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setSelectedDoctorEdit(doc)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleSyncVector(doc)}
                              disabled={actionLoading === doc.profileId}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Đồng bộ lại AI Vector pgvector"
                            >
                              <Cpu className={`w-4 h-4 ${actionLoading === doc.profileId ? 'animate-spin' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(doc)}
                              disabled={actionLoading === doc.profileId}
                              className={`p-1.5 rounded-lg transition ${
                                doc.userStatus === 'SUSPENDED'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                              }`}
                              title={doc.userStatus === 'SUSPENDED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            >
                              {doc.userStatus === 'SUSPENDED' ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={rosterPage}
                  totalItems={filteredDoctors.length}
                  pageSize={rosterPageSize}
                  onPageChange={setRosterPage}
                  onPageSizeChange={setRosterPageSize}
                  itemLabel="bác sĩ"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VETTING QUEUE */}
      {activeTab === 'vetting' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Quy chuẩn kiểm duyệt Bộ Y Tế:</strong> Bác sĩ bắt buộc phải có chứng chỉ hành nghề (CCHN) hợp lệ, có thông tin cơ sở khám chữa bệnh trước khi kích hoạt trên hệ thống tìm kiếm AI.
            </p>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Không có hồ sơ nào đang chờ duyệt</h3>
              <p className="text-slate-500 text-sm mt-1">
                Tất cả các bác sĩ trong hệ thống đã được xác minh chứng chỉ hành nghề đầy đủ.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedPending.map((doc) => (
                  <div key={doc.profileId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-base border border-amber-200">
                            {doc.fullName?.charAt(0) || 'B'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {doc.academicTitle && (
                                <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                  {doc.academicTitle}
                                </span>
                              )}
                              <h4 className="font-bold text-slate-900 text-base">{doc.fullName}</h4>
                            </div>
                            <p className="text-xs text-slate-500">{doc.email} • {doc.phone || 'Chưa có SĐT'}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Chờ thẩm định
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                        <div>
                          <span className="text-slate-400 block">Số CCHN:</span>
                          <span className="font-mono font-bold text-slate-800">{doc.licenseNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Nơi cấp:</span>
                          <span className="font-semibold text-slate-800">{doc.licenseIssuedBy || 'Bộ Y Tế'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Bệnh viện:</span>
                          <span className="font-semibold text-slate-800">{doc.hospitalAffiliation || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Kinh nghiệm:</span>
                          <span className="font-semibold text-slate-800">{doc.yearsOfExperience} năm</span>
                        </div>
                      </div>

                      {doc.bio && (
                        <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                          "{doc.bio}"
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {doc.specialties?.map((s, idx) => (
                          <span key={idx} className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setRejectingDoctor(doc);
                          setRejectionReason('');
                        }}
                        disabled={actionLoading === doc.profileId}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Từ Chối
                      </button>

                      <button
                        onClick={() => handleApproveVetting(doc)}
                        disabled={actionLoading === doc.profileId}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Phê Duyệt & Tính Vector AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <Pagination
                  currentPage={vettingPage}
                  totalItems={pendingDoctors.length}
                  pageSize={vettingPageSize}
                  onPageChange={setVettingPage}
                  onPageSizeChange={setVettingPageSize}
                  pageSizeOptions={[4, 6, 12, 20]}
                  itemLabel="hồ sơ chờ duyệt"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW DOCTOR DETAILS */}
      {selectedDoctorView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden animate-scaleIn border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Hồ Sơ Chi Tiết Bác Sĩ</h3>
              </div>
              <button
                onClick={() => setSelectedDoctorView(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-2xl border border-emerald-200">
                  {selectedDoctorView.fullName?.charAt(0) || 'B'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {selectedDoctorView.academicTitle && (
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        {selectedDoctorView.academicTitle}
                      </span>
                    )}
                    <h2 className="text-xl font-extrabold text-slate-900">{selectedDoctorView.fullName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>{selectedDoctorView.email}</span>
                    {selectedDoctorView.phone && <span>• {selectedDoctorView.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Bệnh viện & Khoa công tác:</span>
                  <p className="text-slate-800 font-bold text-sm">{selectedDoctorView.hospitalAffiliation || 'N/A'}</p>
                  <p className="text-slate-500">{selectedDoctorView.department || 'Chưa cập nhật khoa'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Chứng chỉ hành nghề (CCHN):</span>
                  <p className="font-mono font-bold text-sm text-slate-800">{selectedDoctorView.licenseNumber}</p>
                  <p className="text-slate-500">Cơ quan cấp: {selectedDoctorView.licenseIssuedBy || 'Bộ Y Tế'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Phí tư vấn lâm sàng:</span>
                  <p className="text-emerald-700 font-black text-base">
                    {Number(selectedDoctorView.consultationFee || 0).toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Kinh nghiệm & Đánh giá:</span>
                  <p className="text-slate-800 font-bold text-sm">
                    {selectedDoctorView.yearsOfExperience} năm • ★ {selectedDoctorView.rating || 4.9}
                  </p>
                  <p className="text-slate-500">{selectedDoctorView.totalConsultations || 120} lượt khám hoàn thành</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chuyên khoa</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoctorView.specialties?.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tiểu sử & Quá trình đào tạo</h4>
                <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-200/60">
                  {selectedDoctorView.bio || 'Chưa có thông tin tiểu sử.'}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Mã hồ sơ: <code className="font-mono text-slate-600">{selectedDoctorView.profileId}</code>
              </span>
              <button
                onClick={() => setSelectedDoctorView(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE DOCTOR MODAL */}
      {isCreateModalOpen && (
        <CreateDoctorModal
          specialties={specialties}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            showNotification('success', 'Đã thêm mới bác sĩ thành công và đồng bộ vector AI.');
            fetchData();
          }}
        />
      )}

      {/* MODAL 3: EDIT DOCTOR MODAL */}
      {selectedDoctorEdit && (
        <EditDoctorModal
          doctor={selectedDoctorEdit}
          specialties={specialties}
          onClose={() => setSelectedDoctorEdit(null)}
          onSuccess={() => {
            setSelectedDoctorEdit(null);
            showNotification('success', `Đã cập nhật hồ sơ bác sĩ ${selectedDoctorEdit.fullName} thành công.`);
            fetchData();
          }}
        />
      )}

      {/* MODAL 4: REJECT MODAL */}
      {rejectingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Từ Chối Hồ Sơ Bác Sĩ</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rejectingDoctor.fullName}</p>
              </div>
            </div>

            <form onSubmit={handleRejectVetting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do từ chối (Bắt buộc):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Số CCHN không tra cứu được trên cổng Bộ Y Tế, ảnh chứng chỉ mờ..."
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingDoctor(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: CREATE DOCTOR MODAL
// ==========================================
interface CreateDoctorModalProps {
  specialties: SpecialtyItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateDoctorModal: React.FC<CreateDoctorModalProps> = ({ specialties, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Đại học Y Dược TP.HCM',
    department: 'Khoa Nội Tổng Hợp',
    licenseNumber: '',
    licenseIssuedBy: 'Bộ Y Tế',
    consultationFee: 350000,
    yearsOfExperience: 8,
    bio: '',
    autoVerify: true,
  });
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSpecialty = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
    } else {
      setSelectedSlugs([...selectedSlugs, slug]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName || !formData.licenseNumber) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.post('/admin/doctors', {
        ...formData,
        specialtySlugs: selectedSlugs,
      });
      onSuccess();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axErr.response?.data?.error?.message || 'Tạo bác sĩ thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden animate-scaleIn border border-slate-200 max-h-[90vh] flex flex-col font-sans">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Thêm Mới Bác Sĩ Vào Hệ Thống</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Account info */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-1">1. Thông tin tài khoản</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="bacsi.nguyen@mediassist.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu ban đầu *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên bác sĩ *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Credentials */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-1">2. Hồ sơ chuyên môn & CCHN</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Học hàm / Học vị</label>
                <select
                  value={formData.academicTitle}
                  onChange={(e) => setFormData({ ...formData, academicTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                >
                  <option value="BS">BS (Bác sĩ)</option>
                  <option value="BS.CKI">BS.CKI (Bác sĩ Chuyên khoa I)</option>
                  <option value="BS.CKII">BS.CKII (Bác sĩ Chuyên khoa II)</option>
                  <option value="ThS.BS">ThS.BS (Thạc sĩ Bác sĩ)</option>
                  <option value="TS.BS">TS.BS (Tiến sĩ Bác sĩ)</option>
                  <option value="PGS.TS">PGS.TS (Phó Giáo sư)</option>
                  <option value="GS.TS">GS.TS (Giáo sư)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Chứng chỉ hành nghề (CCHN) *</label>
                <input
                  type="text"
                  required
                  placeholder="001234/BYT-CCHN"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bệnh viện công tác</label>
                <input
                  type="text"
                  placeholder="BV Đại học Y Dược, BV Chợ Rẫy..."
                  value={formData.hospitalAffiliation}
                  onChange={(e) => setFormData({ ...formData, hospitalAffiliation: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khoa phòng</label>
                <input
                  type="text"
                  placeholder="Khoa Nội Tim Mạch..."
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nơi cấp CCHN</label>
                <input
                  type="text"
                  value={formData.licenseIssuedBy}
                  onChange={(e) => setFormData({ ...formData, licenseIssuedBy: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số năm kinh nghiệm</label>
                <input
                  type="number"
                  min={0}
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giá khám (VNĐ / lượt tư vấn)</label>
                <input
                  type="number"
                  step={50000}
                  min={0}
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="autoVerifyCheck"
                  checked={formData.autoVerify}
                  onChange={(e) => setFormData({ ...formData, autoVerify: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="autoVerifyCheck" className="font-semibold text-slate-800 cursor-pointer">
                  Tự động duyệt CCHN & Tính AI Vector ngay
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Specialties & Bio */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">Chuyên khoa khám bệnh:</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {specialties.map((s) => {
                const isSelected = selectedSlugs.includes(s.slug);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpecialty(s.slug)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tiểu sử & Chuyên môn sâu:</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Mô tả quá trình đào tạo, chuyên khoa thế mạnh và các kỹ thuật điều trị chuyên sâu..."
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Đang khởi tạo...' : 'Tạo Bác Sĩ & Đồng Bộ AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: EDIT DOCTOR MODAL
// ==========================================
interface EditDoctorModalProps {
  doctor: Doctor;
  specialties: SpecialtyItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditDoctorModal: React.FC<EditDoctorModalProps> = ({ doctor, specialties, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: doctor.fullName || '',
    phone: doctor.phone || '',
    academicTitle: doctor.academicTitle || 'BS.CKI',
    hospitalAffiliation: doctor.hospitalAffiliation || '',
    department: doctor.department || '',
    licenseNumber: doctor.licenseNumber || '',
    licenseIssuedBy: doctor.licenseIssuedBy || 'Bộ Y Tế',
    consultationFee: doctor.consultationFee || 350000,
    yearsOfExperience: doctor.yearsOfExperience || 5,
    bio: doctor.bio || '',
    isVerified: doctor.isVerified ?? true,
  });

  // Find slugs for initial specialties
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => {
    return specialties
      .filter((s) => doctor.specialties?.includes(s.name) || doctor.specialties?.includes(s.slug))
      .map((s) => s.slug);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSpecialty = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
    } else {
      setSelectedSlugs([...selectedSlugs, slug]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.put(`/admin/doctors/${doctor.profileId}`, {
        ...formData,
        specialtySlugs: selectedSlugs,
      });
      onSuccess();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axErr.response?.data?.error?.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden animate-scaleIn border border-slate-200 max-h-[90vh] flex flex-col font-sans">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Chỉnh Sửa Hồ Sơ Bác Sĩ</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Họ và tên bác sĩ *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Học hàm / Học vị</label>
              <select
                value={formData.academicTitle}
                onChange={(e) => setFormData({ ...formData, academicTitle: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              >
                <option value="BS">BS (Bác sĩ)</option>
                <option value="BS.CKI">BS.CKI (Bác sĩ Chuyên khoa I)</option>
                <option value="BS.CKII">BS.CKII (Bác sĩ Chuyên khoa II)</option>
                <option value="ThS.BS">ThS.BS (Thạc sĩ Bác sĩ)</option>
                <option value="TS.BS">TS.BS (Tiến sĩ Bác sĩ)</option>
                <option value="PGS.TS">PGS.TS (Phó Giáo sư)</option>
                <option value="GS.TS">GS.TS (Giáo sư)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số Chứng chỉ hành nghề (CCHN)</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bệnh viện công tác</label>
              <input
                type="text"
                value={formData.hospitalAffiliation}
                onChange={(e) => setFormData({ ...formData, hospitalAffiliation: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Khoa phòng</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giá khám (VNĐ)</label>
              <input
                type="number"
                step={50000}
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số năm kinh nghiệm</label>
              <input
                type="number"
                min={0}
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isVerifiedCheck"
              checked={formData.isVerified}
              onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isVerifiedCheck" className="font-semibold text-slate-800 cursor-pointer">
              Đã xác thực chứng chỉ hành nghề (Verified & Ready for AI Match)
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700">Chuyên khoa khám bệnh:</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {specialties.map((s) => {
                const isSelected = selectedSlugs.includes(s.slug);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpecialty(s.slug)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tiểu sử & Chuyên môn:</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi & Cập Nhật Vector AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
