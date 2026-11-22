import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, RefreshCw, Download, Lock, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Pagination } from '../../components/common/Pagination';
import { devLog } from '../../utils/logger';
import { EmptyState, ErrorState, SkeletonTable, useToast, cn } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { downloadCsv } from '../../utils/csv';

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

/** Human labels for the audit actions the backend actually writes. Unknown codes fall back to the raw code. */
const ACTION_LABEL: Record<string, string> = {
  PATIENT_REGISTERED: 'Bệnh nhân đăng ký',
  DOCTOR_SELF_REGISTERED: 'Bác sĩ tự đăng ký',
  EMAIL_VERIFIED: 'Xác thực email',
  PASSWORD_RESET_REQUESTED: 'Yêu cầu đặt lại mật khẩu',
  PASSWORD_RESET_COMPLETED: 'Đặt lại mật khẩu',
  ACCOUNT_GOOGLE_LINKED_PASSWORD_CLEARED: 'Liên kết Google, xóa mật khẩu cũ',
  ACCOUNT_LOCKED: 'Khóa tài khoản tạm thời',
  UPDATE_USER_STATUS: 'Đổi trạng thái tài khoản',
  ADMIN_CREATE_DOCTOR: 'Tạo hồ sơ bác sĩ',
  ADMIN_UPDATE_DOCTOR: 'Sửa hồ sơ bác sĩ',
  DOCTOR_VETTED: 'Duyệt hồ sơ bác sĩ',
  VET_DOCTOR_APPROVED: 'Phê duyệt hồ sơ bác sĩ',
  VET_DOCTOR_REJECTED: 'Từ chối hồ sơ bác sĩ',
  SYSTEM_INITIALIZATION: 'Khởi tạo hệ thống',
  TOGGLE_DOCTOR_STATUS: 'Bật/tắt bác sĩ',
  CREATE_SPECIALTY: 'Thêm chuyên khoa',
  SYNC_DOCTOR_VECTOR: 'Đồng bộ vector bác sĩ',
  SYNC_ALL_DOCTOR_VECTORS: 'Đồng bộ toàn bộ vector bác sĩ',
  ADMIN_CANCEL_APPOINTMENT: 'Quản trị viên hủy lịch hẹn',
  APPOINTMENT_BOOKED: 'Đặt lịch khám',
  APPOINTMENT_RESCHEDULED: 'Đổi giờ lịch khám',
  PATIENT_CHECKED_IN: 'Check-in bệnh nhân',
  CLINICAL_ENCOUNTER_COMPLETED: 'Hoàn tất ca khám',
  FOLLOW_UP_APPOINTMENT_CREATED: 'Hẹn tái khám',
  SUBMIT_DOCTOR_REVIEW: 'Đánh giá bác sĩ',
  PAYMENT_COMPLETED: 'Thanh toán thành công',
  PAYMENT_REFUNDED: 'Hoàn tiền',
  PAYMENT_ORPHAN: 'Thanh toán không khớp đơn',
  DOCUMENT_SIGNED_URL_ISSUED: 'Mở tệp y tế (liên kết 15 phút)',
  VIEW_PATIENT_RECORD: 'Xem hồ sơ bệnh nhân',
};

const QUICK = [
  {
    key: 'attention',
    label: 'Cần chú ý',
    match: (a: string) => ['ACCOUNT_LOCKED', 'UPDATE_USER_STATUS', 'ADMIN_CANCEL_APPOINTMENT', 'PAYMENT_ORPHAN', 'PAYMENT_REFUNDED', 'ACCOUNT_GOOGLE_LINKED_PASSWORD_CLEARED'].includes(a) || /SUSPEND|FORBIDDEN|FAILED/.test(a),
  },
  {
    key: 'admin',
    label: 'Thao tác của quản trị viên',
    match: (a: string) => a.startsWith('ADMIN_') || a.startsWith('VET_DOCTOR_') || ['DOCTOR_VETTED', 'TOGGLE_DOCTOR_STATUS', 'UPDATE_USER_STATUS', 'CREATE_SPECIALTY', 'SYNC_DOCTOR_VECTOR', 'SYNC_ALL_DOCTOR_VECTORS'].includes(a),
  },
  { key: 'phi', label: 'Truy cập hồ sơ y tế', match: (a: string) => ['DOCUMENT_SIGNED_URL_ISSUED', 'VIEW_PATIENT_RECORD'].includes(a) },
] as const;
type QuickKey = (typeof QUICK)[number]['key'];
const isAttention = QUICK[0].match;

const dayHeader = (iso: string) => {
  const s = new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [quick, setQuick] = useState<QuickKey | null>(null);
  const [knownActions, setKnownActions] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Background (silent) refreshes never replace a loaded table with an error
  // — a manual "Làm mới" (notify) reports the failure in a toast instead
  const fetchLogs = useCallback(
    async (action?: string, silent = false, notify = false) => {
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        const url = action && action !== 'ALL' ? `/admin/audit-logs?action=${encodeURIComponent(action)}` : '/admin/audit-logs';
        const res = await api.get(url);
        const data: AuditLogItem[] = Array.isArray(res.data?.data) ? res.data.data : [];
        setLogs(data);
        setKnownActions((prev) => Array.from(new Set([...prev, ...data.map((l) => l.action)])).sort());
        setLastUpdated(new Date());
        setLoadError(null);
      } catch (err) {
        devLog.error('Failed to load audit logs:', err);
        const message = getApiErrorMessage(err, 'Không tải được nhật ký kiểm toán.');
        if (!silent) setLoadError(message);
        else if (notify) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchLogs(actionFilter);
    const interval = setInterval(() => fetchLogs(actionFilter, true), 30000);
    return () => clearInterval(interval);
  }, [actionFilter]);

  const debouncedSearch = useDebounce(searchTerm, 250);
  useEffect(() => setCurrentPage(1), [debouncedSearch, actionFilter, quick]);

  const filteredLogs = useMemo(() => {
    const tokens = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const q = QUICK.find((x) => x.key === quick);
    return logs
      .filter((log) => !q || q.match(log.action))
      .filter((log) => {
        if (tokens.length === 0) return true;
        const text = `${log.action} ${ACTION_LABEL[log.action] || ''} ${log.userEmail || ''} ${log.resource || ''} ${log.ipAddress || ''} ${log.userAgent || ''} ${log.metadata || ''}`.toLowerCase();
        return tokens.every((t) => text.includes(t));
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [logs, debouncedSearch, quick]);

  const quickCounts = useMemo(() => Object.fromEntries(QUICK.map((q) => [q.key, logs.filter((l) => q.match(l.action)).length])) as Record<QuickKey, number>, [logs]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const exportCsv = () =>
    downloadCsv(
      `nhat-ky-kiem-toan-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Địa chỉ IP', 'Trình duyệt', 'Metadata', 'Mã bản ghi'],
      filteredLogs.map((l) => [l.createdAt, l.userEmail, l.action, l.resource, l.ipAddress, l.userAgent, l.metadata, l.id]),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Nhật ký kiểm toán
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-300 text-xs font-medium text-slate-600">
              <Lock className="w-3 h-3" /> Chỉ ghi thêm
            </span>
          </h1>
          <p className="mt-1.5 text-slate-600">Mọi thao tác nhạy cảm trên hệ thống. Không có API nào để sửa hoặc xóa bản ghi, kể cả quản trị viên.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchLogs(actionFilter, true, true)}
            disabled={loading || refreshing}
            title={`Làm mới nhật ký kiểm toán (cập nhật lúc ${lastUpdated.toLocaleTimeString('vi-VN')})`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <label className="flex-1 flex items-center gap-2 px-3.5 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Email người thực hiện, mã lịch hẹn, địa chỉ IP…"
            aria-label="Tìm trong nhật ký"
            className="w-full py-2.5 text-sm bg-transparent focus:outline-none"
          />
        </label>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Lọc theo hành động"
          className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 lg:w-72"
        >
          <option value="ALL">Hành động: Tất cả</option>
          {knownActions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] || a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Lọc nhanh</span>
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            aria-pressed={quick === q.key}
            onClick={() => setQuick((v) => (v === q.key ? null : q.key))}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm transition cursor-pointer',
              quick === q.key
                ? q.key === 'attention'
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
                  : 'bg-indigo-50 border-indigo-400 text-indigo-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
            )}
          >
            {q.key === 'attention' && <TriangleAlert className="w-3.5 h-3.5" />}
            {q.label} · {quickCounts[q.key]}
          </button>
        ))}
      </div>

      {loadError && !loading ? (
        <ErrorState message={loadError} onRetry={() => fetchLogs(actionFilter)} retrying={loading} />
      ) : loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : logs.length === 0 ? (
        <EmptyState title="Chưa có bản ghi kiểm toán" description="Thao tác của người dùng và quản trị viên sẽ được ghi lại tại đây." />
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-5 font-semibold w-28">Giờ</th>
                  <th className="py-3 px-3 font-semibold">Người thực hiện</th>
                  <th className="py-3 px-3 font-semibold">Hành động</th>
                  <th className="py-3 px-3 font-semibold">Đối tượng</th>
                  <th className="py-3 px-3 font-semibold">Địa chỉ IP</th>
                  <th className="py-3 px-5 w-14">
                    <span className="sr-only">Chi tiết</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 px-5 text-center text-slate-500">
                      Không có bản ghi nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, i) => {
                    const newDay = i === 0 || paginatedLogs[i - 1].createdAt.slice(0, 10) !== log.createdAt.slice(0, 10);
                    const warn = isAttention(log.action);
                    const open = expanded === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        {newDay && (
                          <tr className="bg-slate-50 border-y border-slate-200">
                            <td colSpan={6} className="py-2 px-5 text-sm font-semibold text-slate-800">
                              {dayHeader(log.createdAt)}
                            </td>
                          </tr>
                        )}
                        <tr className={cn('border-b border-slate-100 align-top', warn && 'bg-amber-50/60')}>
                          <td className="py-3.5 px-5 tabular-nums text-slate-700">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</td>
                          <td className="py-3.5 px-3 font-medium text-slate-900 break-all">{log.userEmail || 'Hệ thống'}</td>
                          <td className="py-3.5 px-3">
                            <p className="flex items-start gap-1.5 font-medium text-slate-900">
                              {warn && <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-label="Cần chú ý" />}
                              {ACTION_LABEL[log.action] || log.action}
                            </p>
                            <p className="text-xs font-code text-slate-500">{log.action}</p>
                          </td>
                          <td className="py-3.5 px-3 text-slate-700 break-all">{log.resource || '—'}</td>
                          <td className="py-3.5 px-3 font-code text-xs text-slate-700">{log.ipAddress || '—'}</td>
                          <td className="py-3.5 px-5">
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : log.id)}
                              aria-expanded={open}
                              aria-label={open ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-slate-100 bg-white">
                            <td />
                            <td colSpan={5} className="pb-4 pr-5">
                              <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
                                <dt className="text-slate-500">Mã bản ghi</dt>
                                <dd className="font-code text-xs text-slate-800 break-all">{log.id}</dd>
                                <dt className="text-slate-500">Metadata</dt>
                                <dd>
                                  {log.metadata ? (
                                    <pre className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-code text-xs text-slate-800 whitespace-pre-wrap break-all">
                                      {log.metadata}
                                    </pre>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </dd>
                                <dt className="text-slate-500">Trình duyệt</dt>
                                <dd className="font-code text-xs text-slate-700 break-all">{log.userAgent || '—'}</dd>
                              </dl>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="bản ghi"
            />
          </div>
        </section>
      )}
    </div>
  );
};
