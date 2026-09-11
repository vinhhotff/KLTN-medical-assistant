import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Check, X, AlertCircle, FileBadge, Building2, User } from 'lucide-react';
import { api } from '../../services/api.js';

interface PendingDoctor {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone?: string;
  bio: string;
  licenseNumber: string;
  consultationFee: number;
  yearsOfExperience: number;
  specialties: string[];
  verified: boolean;
}

export const DoctorVettingPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  const fetchPendingDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/doctors/pending');
      if (res.data?.data) {
        setPendingDoctors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch pending doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVet = async (doctor: PendingDoctor, approve: boolean) => {
    let reason: string | null = null;
    if (!approve) {
      reason = window.prompt('Nhập lý do từ chối hồ sơ bác sĩ:');
      if (reason === null) return;
    }

    try {
      setActionLoading(doctor.profileId);
      setStatusMessage(null);

      await api.post(`/admin/doctors/${doctor.profileId}/vet`, {
        approve,
        rejectionReason: reason,
      });

      setStatusMessage({
        type: 'success',
        text: approve
          ? `Đã phê duyệt thành công hồ sơ bác sĩ ${doctor.fullName}. Bác sĩ đã được cấp quyền tiếp nhận bệnh nhân.`
          : `Đã từ chối hồ sơ bác sĩ ${doctor.fullName}.`,
      });

      fetchPendingDoctors();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusMessage({
        type: 'error',
        text: axiosError.response?.data?.error?.message || 'Thao tác phê duyệt thất bại.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quy Trình Duyệt Bác Sĩ (Doctor Vetting)</h2>
          <p className="text-slate-500 text-sm mt-1">
            Xác minh chứng chỉ hành nghề (CCHN), hồ sơ bằng cấp và chuyên khoa trước khi kích hoạt trên hệ thống tìm kiếm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Kiểm duyệt tuân thủ Bộ Y Tế
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-3 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Danh Sách Bác Sĩ Chờ Xác Thực</h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
            {pendingDoctors.length} Hồ Sơ Đang Chờ
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Đang tải danh sách chờ phê duyệt...</div>
        ) : pendingDoctors.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Tất cả hồ sơ đã được xử lý hoàn tất</p>
            <p className="text-xs text-slate-400 mt-1">
              Không có bác sĩ nào đang chờ xác minh chứng chỉ hành nghề vào lúc này.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingDoctors.map((doc) => (
              <div key={doc.profileId} className="p-6 space-y-4 hover:bg-slate-50/50 transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-bold text-slate-900">{doc.fullName}</h4>
                      {doc.specialties?.map((spec) => (
                        <span
                          key={spec}
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {spec}
                        </span>
                      ))}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Chờ Vetting
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {doc.email}
                      </span>
                      <span>SĐT: {doc.phone || 'Chưa cung cấp'}</span>
                      <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> CCHN: {doc.licenseNumber}
                      </span>
                      <span>Kinh nghiệm: {doc.yearsOfExperience} năm</span>
                      <span className="font-bold text-indigo-600">
                        Phí: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(doc.consultationFee || 300000)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      disabled={actionLoading === doc.profileId}
                      onClick={() => handleVet(doc, false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Từ Chối
                    </button>
                    <button
                      disabled={actionLoading === doc.profileId}
                      onClick={() => handleVet(doc, true)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {actionLoading === doc.profileId ? 'Đang Xử Lý...' : 'Phê Duyệt Hồ Sơ'}
                    </button>
                  </div>
                </div>

                {doc.bio && (
                  <p className="text-xs text-slate-600 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                    <strong className="text-slate-800">Tóm tắt chuyên môn:</strong> {doc.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
