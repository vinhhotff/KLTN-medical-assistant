import React, { useEffect, useState } from 'react';
import { ShieldCheck, Server, Database, Zap } from 'lucide-react';
import { api } from '../../services/api.js';

export const AdminDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await api.get('/health/ready');
      setHealthData(res.data?.data);
    } catch (err: any) {
      setHealthData(err.response?.data?.data || { status: 'DEGRADED' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bảng Điều Khiển Quản Trị Hệ Thống</h2>
        <p className="text-slate-500 text-sm mt-1">
          Giám sát trạng thái hoạt động thực tế, hạ tầng phân tán và các dịch vụ AI.
        </p>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
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

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
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
          <p className="text-xs text-slate-400 mt-1">L1 Memory (LRU) + L2 Redis Distributed Cache</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tiến Trình Ổn Định (No-Crash)</span>
            <Server className="w-5 h-5 text-teal-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xl font-bold text-slate-900">ACTIVE</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Graceful Shutdown & Shield Traps đã kích hoạt</p>
        </div>
      </div>

      {/* Doctor Vetting Queue placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Hàng Đợi Duyệt Hồ Sơ Bác Sĩ (Doctor Vetting Queue)
          </h3>
          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">0 chờ duyệt</span>
        </div>
        <div className="py-8 text-center text-slate-400 text-sm">
          Hiện tại không có hồ sơ bác sĩ mới nào đang chờ xác thực bằng cấp.
        </div>
      </div>
    </div>
  );
};
