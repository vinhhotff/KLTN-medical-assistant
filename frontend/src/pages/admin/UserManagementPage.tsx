import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShieldCheck, Mail, Phone, Calendar, RefreshCw, UserX, UserCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  avatarUrl?: string;
  createdAt?: string;
}

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');
  const [reason, setReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStatusChange = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(selectedUser.id);
      setStatusMessage(null);
      await api.patch(`/admin/users/${selectedUser.id}/status`, {
        status: targetStatus,
        reason: reason.trim() || undefined,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, status: targetStatus } : u))
      );
      setStatusMessage({
        type: 'success',
        text: `Đã ${targetStatus === 'SUSPENDED' ? 'tạm khóa' : 'kích hoạt lại'} tài khoản ${selectedUser.fullName} thành công!`,
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusMessage({
        type: 'error',
        text: axiosError.response?.data?.error?.message || 'Không thể cập nhật trạng thái người dùng.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      if (res.data?.data) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination state (Limit/Offset)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm));
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // Paginated users slice
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quản Lý Người Dùng & Phân Quyền</h2>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi, kiểm soát trạng thái tài khoản và phân quyền truy cập hệ thống theo mô hình RBAC.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Làm Mới
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-500">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="DOCTOR">Bác sĩ (Doctor)</option>
            <option value="PATIENT">Bệnh nhân (Patient)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Đang tải danh sách người dùng...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Không tìm thấy người dùng phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Người Dùng</th>
                  <th className="py-3.5 px-6 font-semibold">Vai Trò</th>
                  <th className="py-3.5 px-6 font-semibold">Liên Hệ</th>
                  <th className="py-3.5 px-6 font-semibold">Trạng Thái</th>
                  <th className="py-3.5 px-6 font-semibold">Ngày Đăng Ký</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.fullName}</p>
                          <p className="text-xs text-slate-400 font-mono">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'DOCTOR'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.phone || 'Chưa cung cấp'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Hệ thống'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetStatus(u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                            setReason('');
                            setIsModalOpen(true);
                          }}
                          disabled={actionLoading === u.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Tạm khóa
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Kích hoạt
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="người dùng"
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  targetStatus === 'SUSPENDED' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {targetStatus === 'SUSPENDED' ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {targetStatus === 'SUSPENDED' ? 'Tạm Khóa Tài Khoản' : 'Kích Hoạt Tài Khoản'}
                  </h3>
                  <p className="text-xs text-slate-500">Mô hình phân quyền RBAC & Kiểm soát an toàn</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="font-semibold text-slate-800">Người dùng: {selectedUser.fullName}</p>
              <p className="text-slate-500">Email: {selectedUser.email}</p>
              <p className="text-slate-500">Vai trò: {selectedUser.role}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Lý do điều chỉnh trạng thái (Lưu Audit Trail):</label>
              <input
                type="text"
                placeholder={targetStatus === 'SUSPENDED' ? 'Ví dụ: Vi phạm quy chế sử dụng...' : 'Ví dụ: Đã xác thực thông tin...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={actionLoading === selectedUser.id}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-xs flex items-center gap-2 ${
                  targetStatus === 'SUSPENDED'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading === selectedUser.id ? 'Đang cập nhật...' : 'Xác nhận thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
