import React, { useEffect, useState } from 'react';
import { ShieldCheck, Server, Database, Zap, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface HealthData {
  status: string;
  components?: {
    database?: string;
    redis?: string;
    twoLayerCache?: string;
  };
}

interface PendingDoctorSummary {
  profileId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
}

export const AdminDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [healthRes, doctorsRes] = await Promise.allSettled([
        api.get('/health/ready'),
        api.get('/admin/doctors/pending'),
      ]);

      if (healthRes.status === 'fulfilled') {
        setHealthData(healthRes.value.data?.data);
      } else {
        setHealthData({ status: 'DEGRADED' });
      }

      if (doctorsRes.status === 'fulfilled' && doctorsRes.value.data?.data) {
        setPendingDoctors(doctorsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bảng Điều Khiển Quản Trị Hệ Thống</h2>
        <p className="text-slate-500 text-sm mt-1">
          Giám sát trạng thái hoạt động thực tế, hạ tầng phân tán và các dịch vụ y tế.
        </p>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">PostgreSQL + pgvector</span>
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                healthData?.components?.database === 'UP' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-xl font-bold text-slate-900">
              {healthData?.components?.database || (loading ? 'Kiểm tra...' : 'DOWN')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Hỗ trợ Vector 1536 chiều cho AI Doctor Matching</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Redis & 2-Layer Cache</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                healthData?.components?.redis === 'UP' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-xl font-bold text-slate-900">
              {healthData?.components?.redis || (loading ? 'Kiểm tra...' : 'DOWN')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">L1 Memory (Caffeine) + L2 Redis Distributed Cache</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tiến Trình Ổn Định (No-Crash)</span>
            <Server className="w-5 h-5 text-teal-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xl font-bold text-slate-900">ACTIVE</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Graceful Shutdown & Two-Layer Cache đồng bộ</p>
        </div>
      </div>

      {/* Doctor Vetting Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-base text-slate-900">
              Hàng Đợi Duyệt Hồ Sơ Bác Sĩ (Doctor Vetting Queue)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              pendingDoctors.length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {pendingDoctors.length} bác sĩ chờ duyệt
            </span>
            <Link
              to="/admin/doctors"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {pendingDoctors.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Hiện tại không có hồ sơ bác sĩ mới nào đang chờ xác thực bằng cấp.
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {pendingDoctors.slice(0, 3).map((doc) => (
              <div
                key={doc.profileId}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{doc.fullName}</h4>
                  <p className="text-xs text-slate-500">
                    CCHN: <span className="font-mono">{doc.licenseNumber}</span> | Chuyên khoa: {doc.specialties?.join(', ') || 'Đang cập nhật'}
                  </p>
                </div>
                <Link
                  to="/admin/doctors"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Thẩm Định
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
