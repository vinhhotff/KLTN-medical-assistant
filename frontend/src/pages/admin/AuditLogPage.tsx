import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  User, 
  Globe, 
  Terminal, 
  Info, 
  ShieldCheck, 
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

interface AuditLogItem {
  id: string;
  userId?: string;
  userEmail: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: string;
  createdAt: string;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (action?: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const url = action && action !== 'ALL' 
        ? `/admin/audit-logs?action=${encodeURIComponent(action)}` 
        : '/admin/audit-logs';
      const res = await api.get(url);
      if (res.data?.data) {
        setLogs(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(actionFilter);
    const interval = setInterval(() => {
      fetchLogs(actionFilter, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [actionFilter]);

  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredLogs = useMemo(() => {
    const tokens = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return logs;
    return logs.filter((log) => {
      const searchableContent = `${log.action || ''} ${log.userEmail || ''} ${log.resource || ''} ${log.ipAddress || ''} ${log.userAgent || ''} ${log.metadata || ''}`.toLowerCase();
      return tokens.every((token) => searchableContent.includes(token));
    });
  }, [logs, debouncedSearch]);

  const getActionBadge = (action: string) => {
    if (action.includes('DOCTOR') || action.includes('VET')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {action}
        </span>
      );
    }
    if (action.includes('CLINICAL') || action.includes('ENCOUNTER')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {action}
        </span>
      );
    }
    if (action.includes('CANCEL') || action.includes('SUSPEND') || action.includes('DELETE')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          {action}
        </span>
      );
    }
    if (action.includes('APPOINTMENT')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Nhật Ký Kiểm Toán Hệ Thống (Enterprise Audit Trail)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Ghi nhận toàn bộ vết tương tác, xác thực, điều phối lịch khám và thẩm định bác sĩ tuân thủ bảo mật y tế HIPAA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={() => fetchLogs(actionFilter, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Làm mới nhật ký kiểm toán"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo hành động, email, IP, tài nguyên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> Hành động:
          </div>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'DOCTOR_VETTED', label: 'Duyệt Bác Sĩ' },
            { key: 'APPOINTMENT_BOOKED', label: 'Đặt Lịch' },
            { key: 'CLINICAL_ENCOUNTER_COMPLETED', label: 'Khám Lâm Sàng' },
            { key: 'ADMIN_CANCEL_APPOINTMENT', label: 'Hủy Cuộc Hẹn' },
            { key: 'UPDATE_USER_STATUS', label: 'Khóa/Mở TK' },
            { key: 'CREATE_SPECIALTY', label: 'Chuyên Khoa' },
          ].map((act) => (
            <button
              key={act.key}
              onClick={() => setActionFilter(act.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                actionFilter === act.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu vết kiểm toán...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Không tìm thấy bản ghi kiểm toán nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Thời Gian</th>
                  <th className="py-3.5 px-4">Hành Động</th>
                  <th className="py-3.5 px-4">Người Thực Hiện</th>
                  <th className="py-3.5 px-4">Tài Nguyên Tác Động</th>
                  <th className="py-3.5 px-4">Địa Chỉ IP</th>
                  <th className="py-3.5 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      <div>{new Date(log.createdAt).toLocaleDateString('vi-VN')}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.userEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {log.resource}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" />
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-500" /> Xem Vết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Vết Kiểm Toán</h3>
                  <span className="text-xs font-mono text-slate-500">{selectedLog.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Hành Động</span>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Thời Điểm</span>
                  <p className="font-mono font-bold text-slate-800 mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Người Thực Hiện</span>
                  <p className="font-bold text-slate-800 mt-1">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Địa Chỉ IP</span>
                  <p className="font-mono text-slate-800 mt-1">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px]">Tài Nguyên (Resource)</span>
                <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-indigo-700 text-xs mt-1">
                  {selectedLog.resource}
                </p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> Dữ Liệu Metadata
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto mt-1 whitespace-pre-wrap">
                    {selectedLog.metadata}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
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
