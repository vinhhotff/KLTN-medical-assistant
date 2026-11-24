import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  HeartPulse, 
  Search, 
  Filter, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Stethoscope, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Pagination } from '../../components/common/Pagination';
import { devLog } from '../../utils/logger';
import { EmptyState, ErrorState, SkeletonTable, useToast } from '../../components/ui';

interface AdminTriageMetric {
  id: string;
  emergency: boolean;
  urgencyLevel: 'EMERGENCY' | 'URGENT' | 'ROUTINE';
  primarySpecialty?: string;
  createdAt: string;
}

export const TriageSupervisionPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminTriageMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchTriageSessions = useCallback(async (silent = false, notify = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/admin/triage-sessions');
      setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
      setLastUpdated(new Date());
      setLoadError(null);
      if (notify) {
        toast.success('Đã làm mới số liệu vận hành phân luồng');
      }
    } catch (err) {
      devLog.error('Failed to load triage metrics:', err);
      if (!silent) {
        setLoadError('Không thể kết nối đến máy chủ quản trị.');
      } else if (notify) {
        toast.error('Làm mới thất bại.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTriageSessions();
    const interval = setInterval(() => {
      fetchTriageSessions(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTriageSessions]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = 
        !debouncedSearchTerm ||
        s.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (s.primarySpecialty && s.primarySpecialty.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      const matchesUrgency = 
        urgencyFilter === 'ALL' ||
        (urgencyFilter === 'EMERGENCY' && (s.emergency || s.urgencyLevel === 'EMERGENCY')) ||
        (urgencyFilter === 'URGENT' && s.urgencyLevel === 'URGENT' && !s.emergency) ||
        (urgencyFilter === 'ROUTINE' && s.urgencyLevel === 'ROUTINE' && !s.emergency);

      return matchesSearch && matchesUrgency;
    });
  }, [sessions, debouncedSearchTerm, urgencyFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, urgencyFilter]);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSessions.slice(startIndex, startIndex + pageSize);
  }, [filteredSessions, currentPage, pageSize]);

  const getUrgencyBadge = (level: string, isEmergency: boolean) => {
    if (isEmergency || level === 'EMERGENCY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> CẤP CỨU (EMERGENCY)
        </span>
      );
    }
    if (level === 'URGENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" /> Cần Khám Sớm (URGENT)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Khám Thường (ROUTINE)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HeartPulse className="w-6 h-6 text-indigo-600" />
            Giám Sát Vận Hành Phân Luồng (Operational Triage Metrics)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi lưu lượng phiên khám, phân cấp khẩn cấp hạ tầng và điều hướng chuyên khoa kỹ thuật.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={() => fetchTriageSessions(true, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Làm mới danh sách phân luồng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>
          <span className="text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
            Tổng phiên: <strong className="text-indigo-600">{sessions.length}</strong>
          </span>
        </div>
      </div>

      {/* CLS Security Notice Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 text-indigo-900 text-xs leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block mb-0.5">Rào Chắn Bảo Mật Dữ Liệu Y Tế (Column-Level Security - CLS):</span>
          Quản trị viên chỉ giám sát tải hạ tầng, số lượng phiên và chuyên khoa phân bổ kỹ thuật. Toàn bộ nội dung bệnh sử, tóm tắt lâm sàng (SBAR) và dữ liệu chẩn đoán của người bệnh được bảo mật tuyệt đối, không hiển thị tại giao diện Admin.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã phiên hoặc chuyên khoa…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          <button
            onClick={() => setUrgencyFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              urgencyFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({sessions.length})
          </button>
          <button
            onClick={() => setUrgencyFilter('EMERGENCY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              urgencyFilter === 'EMERGENCY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Cấp cứu ({sessions.filter((s) => s.emergency || s.urgencyLevel === 'EMERGENCY').length})
          </button>
          <button
            onClick={() => setUrgencyFilter('URGENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              urgencyFilter === 'URGENT'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Khám sớm ({sessions.filter((s) => s.urgencyLevel === 'URGENT' && !s.emergency).length})
          </button>
          <button
            onClick={() => setUrgencyFilter('ROUTINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              urgencyFilter === 'ROUTINE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Định kỳ ({sessions.filter((s) => s.urgencyLevel === 'ROUTINE' && !s.emergency).length})
          </button>
        </div>
      </div>

      {/* Triage Metrics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} />
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => fetchTriageSessions()} className="m-4" />
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            title="Không tìm thấy phiên phân luồng"
            description="Chưa có phiên phân luồng nào phù hợp với bộ lọc hiện tại."
            className="my-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Phiên (CLS Masked)</th>
                  <th className="py-3.5 px-4">Mức Độ Khẩn Hạ Tầng</th>
                  <th className="py-3.5 px-4">Chuyên Khoa Đích</th>
                  <th className="py-3.5 px-4">Thời Gian Khởi Tạo</th>
                  <th className="py-3.5 px-4 text-right">Trạng Thái Vận Hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedSessions.map((session) => (
                  <tr 
                    key={session.id} 
                    className={`hover:bg-slate-50/70 transition ${
                      session.emergency ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                        TR-{session.id.substring(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getUrgencyBadge(session.urgencyLevel, session.emergency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Stethoscope className="w-3 h-3" />
                        {session.primarySpecialty || 'Đa Khoa'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {new Date(session.createdAt).toLocaleDateString('vi-VN')} {new Date(session.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {session.emergency ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Đã điều hướng 115 / Cấp cứu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          Đã phân luồng thành công
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredSessions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredSessions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="phiên phân luồng"
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>
    </div>
  );
};
