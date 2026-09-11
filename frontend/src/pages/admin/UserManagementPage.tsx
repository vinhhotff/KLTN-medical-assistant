import React, { useState } from 'react';
import { Search, UserPlus, MoreVertical, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react';

interface MockUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: 'ACTIVE' | 'PENDING' | 'LOCKED';
  createdAt: string;
}

const INITIAL_USERS: MockUser[] = [
  {
    id: 'u-1',
    fullName: 'Quản Trị Viên Hệ Thống',
    email: 'admin@mediassist.ai',
    phone: '+84 901 234 567',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '10/01/2026',
  },
  {
    id: 'u-2',
    fullName: 'TS. BS. Nguyễn Văn An',
    email: 'doctor@mediassist.ai',
    phone: '+84 912 345 678',
    role: 'DOCTOR',
    status: 'ACTIVE',
    createdAt: '15/01/2026',
  },
  {
    id: 'u-3',
    fullName: 'Trần Thị Bình',
    email: 'patient@mediassist.ai',
    phone: '+84 987 654 321',
    role: 'PATIENT',
    status: 'ACTIVE',
    createdAt: '02/02/2026',
  },
  {
    id: 'u-4',
    fullName: 'Lê Hoàng Nam (Bác sĩ ứng tuyển)',
    email: 'nam.le@hospital.vn',
    phone: '+84 933 111 222',
    role: 'DOCTOR',
    status: 'PENDING',
    createdAt: '05/03/2026',
  },
];

export const UserManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredUsers = INITIAL_USERS.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quản Lý Người Dùng & Phân Quyền</h2>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi, kiểm soát trạng thái tài khoản và phân quyền truy cập hệ thống theo mô hình RBAC.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition">
          <UserPlus className="w-4 h-4" />
          Thêm Tài Khoản Mới
        </button>
      </div>

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
            className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="DOCTOR">Bác sĩ (Doctor)</option>
            <option value="PATIENT">Bệnh nhân (Patient)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Người Dùng</th>
                <th className="py-3.5 px-6 font-semibold">Vai Trò</th>
                <th className="py-3.5 px-6 font-semibold">Liên Hệ</th>
                <th className="py-3.5 px-6 font-semibold">Trạng Thái</th>
                <th className="py-3.5 px-6 font-semibold">Ngày Đăng Ký</th>
                <th className="py-3.5 px-6 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {u.fullName.charAt(0)}
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
                      <span>{u.phone}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : u.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'PENDING' ? 'Chờ duyệt' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.createdAt}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
