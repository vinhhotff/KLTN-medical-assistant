import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Zap, 
  ArrowRight, 
  UserCheck, 
  Users, 
  CalendarCheck, 
  FileText, 
  HeartPulse, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface AdminSystemStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  pendingDoctorsCount: number;
  suspendedUsersCount: number;
  totalAppointments: number;
  scheduledAppointmentsCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  totalDocumentsAnalyzed: number;
  redFlagDocumentsCount: number;
  totalTriageSessions: number;
  emergencyTriageCount: number;
  routineTriageCount: number;
  infrastructureHealth?: Record<string, string>;
  recentActivities?: Array<{
    id: string;
    userEmail: string;
    action: string;
    resource: string;
    createdAt: string;
    metadata?: string;
  }>;
}

interface PendingDoctorSummary {
  profileId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, doctorsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/doctors/pending'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.data) {
        setStats(statsRes.value.data.data);
      }

      if (doctorsRes.status === 'fulfilled' && doctorsRes.value.data?.data) {
        setPendingDoctors(doctorsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Trung Tâm Chỉ Huy & Giám Sát Toàn Viện
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Tổng hợp dữ liệu vận hành theo thời gian thực: Bác sĩ, Lịch hẹn Telehealth, Cận lâm sàng EMR và Phân luồng AI.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Users & Doctors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân Lực Y Tế</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalDoctors ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Bác sĩ chuyên khoa chính thức</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Bệnh nhân: <strong className="text-slate-800">{stats?.totalPatients ?? 0}</strong></span>
            {stats?.pendingDoctorsCount ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {stats.pendingDoctorsCount} chờ duyệt
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">100% đã duyệt</span>
            )}
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch Khám Telehealth</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalAppointments ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Tổng cuộc hẹn đã đặt</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.completedAppointmentsCount ?? 0} hoàn thành
            </span>
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {stats?.scheduledAppointmentsCount ?? 0} chờ khám
            </span>
          </div>
        </div>

        {/* Card 3: EMR Document Scanner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hồ Sơ Cận Lâm Sàng</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalDocumentsAnalyzed ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Hồ sơ đã phân tích (OCR & Vision)</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {stats?.redFlagDocumentsCount ?? 0} ca bất thường
            </span>
            <span className="text-slate-400">Khấu trừ 1 Quota/đợt</span>
          </div>
        </div>

        {/* Card 4: AI Triage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phân Luồng AI Triage</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalTriageSessions ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Phiên đánh giá triệu chứng</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {stats?.emergencyTriageCount ? (
              <span className="text-rose-600 font-black flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.emergencyTriageCount} ca cấp cứu khẩn!
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">0 ca cấp cứu mới</span>
            )}
            <span className="text-slate-500 font-medium">{stats?.routineTriageCount ?? 0} định kỳ</span>
          </div>
        </div>
      </div>

      {/* Infrastructure & Fast Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">PostgreSQL + pgvector</span>
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">UP (Vector 1536d)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">HNSW Indexing cho AI Doctor Semantic Match</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Redis & 2-Layer Cache</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">UP (&lt;1ms Latency)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">L1 Caffeine in-memory + L2 Distributed Redis</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Rào Chắn An Toàn Lâm Sàng</span>
            <ShieldCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">ENFORCED</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Red-flag cứng + Off-topic Guard bảo vệ</p>
        </div>
      </div>

      {/* Two Column Layout: Vetting Queue & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Doctor Vetting Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Hàng Đợi Duyệt Hồ Sơ Bác Sĩ
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                pendingDoctors.length > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {pendingDoctors.length} bác sĩ chờ duyệt
              </span>
            </div>

            {pendingDoctors.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Hiện tại không có hồ sơ bác sĩ mới nào đang chờ xác thực bằng cấp.
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {pendingDoctors.slice(0, 4).map((doc) => (
                  <div
                    key={doc.profileId}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{doc.fullName}</h4>
                      <p className="text-xs text-slate-500">
                        CCHN: <span className="font-mono text-slate-700">{doc.licenseNumber}</span> | Chuyên khoa: {doc.specialties?.join(', ') || 'Chưa phân khoa'}
                      </p>
                    </div>
                    <Link
                      to="/admin/doctors"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Thẩm Định
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <Link
              to="/admin/doctors"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Xem toàn bộ danh bạ bác sĩ <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Live Activity Feed (Audit Logs) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Dòng Hoạt Động Gần Nhất (Live Audit Trail)
                </h3>
              </div>
              <Link
                to="/admin/audit-logs"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Chưa có hoạt động kiểm toán nào được ghi nhận gần đây.
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {stats.recentActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                          {act.action}
                        </span>
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                          {act.userEmail}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 truncate max-w-[280px]">
                        {act.metadata || act.resource}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tuân thủ lưu vết chuẩn Y Tế</span>
            <Link to="/admin/audit-logs" className="font-bold text-indigo-600 hover:underline">
              Tra cứu đầy đủ log &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
