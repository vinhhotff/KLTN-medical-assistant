import React, { useEffect, useState } from 'react';
import { 
  HeartPulse, 
  Search, 
  Filter, 
  AlertTriangle, 
  FileText, 
  X, 
  User, 
  Clock, 
  ShieldAlert, 
  Stethoscope, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminTriageSession {
  id: string;
  userId?: string;
  patientName: string;
  patientEmail?: string;
  symptomsText: string;
  emergency: boolean;
  urgencyLevel: 'EMERGENCY' | 'URGENT' | 'ROUTINE';
  primarySpecialty?: string;
  sbarSummary?: string;
  aiAdvice?: string;
  createdAt: string;
}

export const TriageSupervisionPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminTriageSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState<AdminTriageSession | null>(null);

  const fetchTriageSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/admin/triage-sessions');
      if (res.data?.data) {
        setSessions(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load triage sessions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTriageSessions();
    const interval = setInterval(() => {
      fetchTriageSessions(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (urgencyFilter !== 'ALL' && s.urgencyLevel !== urgencyFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const symMatch = s.symptomsText?.toLowerCase().includes(q);
      const patMatch = s.patientName?.toLowerCase().includes(q) || s.patientEmail?.toLowerCase().includes(q);
      const specMatch = s.primarySpecialty?.toLowerCase().includes(q);
      return symMatch || patMatch || specMatch;
    }
    return true;
  });

  const getUrgencyBadge = (level: string, isEmergency: boolean) => {
    if (isEmergency || level === 'EMERGENCY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> CẤP CỨU (EMERGENCY)
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
            <HeartPulse className="w-6 h-6 text-rose-600" />
            Giám Sát Phân Luồng Lâm Sàng AI & Rào Chắn Khẩn Cấp
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Thanh tra chất lượng gợi ý lâm sàng, phân cấp khẩn cấp và rào chắn Red-flag đối với mọi triệu chứng bệnh nhân nhập vào.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={() => fetchTriageSessions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Làm mới danh sách phân luồng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
            <span>Làm mới</span>
          </button>
          <span className="text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
            Tổng phiên Triage: <strong className="text-rose-600">{sessions.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo triệu chứng, tên bệnh nhân, chuyên khoa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> Mức độ khẩn cấp:
          </div>
          {['ALL', 'EMERGENCY', 'URGENT', 'ROUTINE'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setUrgencyFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                urgencyFilter === lvl
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Triage Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu phiên phân luồng triệu chứng...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Không tìm thấy phiên phân luồng nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Bệnh Nhân</th>
                  <th className="py-3.5 px-4">Mô Tả Triệu Chứng</th>
                  <th className="py-3.5 px-4">Mức Độ Phân Luồng</th>
                  <th className="py-3.5 px-4">Chuyên Khoa Đề Xuất</th>
                  <th className="py-3.5 px-4">Thời Gian</th>
                  <th className="py-3.5 px-4 text-right">Chi Tiết SBAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSessions.map((session) => (
                  <tr 
                    key={session.id} 
                    className={`hover:bg-slate-50/70 transition ${
                      session.emergency ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {session.patientName}
                      </div>
                      {session.patientEmail && (
                        <div className="text-[11px] text-slate-500">{session.patientEmail}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-xs text-slate-800 font-medium line-clamp-2" title={session.symptomsText}>
                        {session.symptomsText}
                      </p>
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
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Xem SBAR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SBAR Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Báo Cáo Phân Luồng Lâm Sàng Chuẩn SBAR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bệnh nhân: <strong>{selectedSession.patientName}</strong> | {new Date(selectedSession.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Urgency Alert */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase">Mức độ khẩn cấp</span>
              <div>{getUrgencyBadge(selectedSession.urgencyLevel, selectedSession.emergency)}</div>
            </div>

            {/* Symptoms */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Triệu Chứng Người Bệnh Mô Tả
              </h4>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {selectedSession.symptomsText}
              </p>
            </div>

            {/* SBAR Breakdown */}
            {selectedSession.sbarSummary && (
              <div>
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Báo Cáo Lâm Sàng SBAR
                </h4>
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                  {selectedSession.sbarSummary}
                </div>
              </div>
            )}

            {/* AI Advice */}
            {selectedSession.aiAdvice && (
              <div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Lời Khuyên & Hướng Dẫn Của AI
                </h4>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                  {selectedSession.aiAdvice}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
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
