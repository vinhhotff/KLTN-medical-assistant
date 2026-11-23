import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Clock, Check, X, AlertCircle, FileBadge, Building2, User, RefreshCw, Eye, ExternalLink, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { formatVnd } from '../../utils/display';
import { devLog } from '../../utils/logger';
import { ErrorState, SkeletonList, useToast } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

interface PendingDoctor {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone?: string;
  bio: string;
  licenseNumber: string;
  licenseDocumentUrl?: string;
  licenseDocumentStoragePath?: string;
  hasLicenseDocument?: boolean;
  licenseIssuedDate?: string;
  scopeOfPractice?: string;
  verificationStatus?: string;
  rejectionReason?: string;
  consultationFee: number;
  yearsOfExperience: number;
  specialties: string[];
  verified: boolean;
  academicTitle?: string;
  hospitalAffiliation?: string;
  department?: string;
  licenseIssuedBy?: string;
  rating?: number;
  totalConsultations?: number;
}

export const DoctorVettingPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [rejectingDoctor, setRejectingDoctor] = useState<PendingDoctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Xem tệp CCHN trên Supabase
  const [inspectingDoctor, setInspectingDoctor] = useState<PendingDoctor | null>(null);
  const [inspectUrl, setInspectUrl] = useState<string | null>(null);
  const [loadingDocUrl, setLoadingDocUrl] = useState(false);

  const handleInspectLicense = async (doctor: PendingDoctor) => {
    try {
      setLoadingDocUrl(true);
      setInspectingDoctor(doctor);
      setInspectUrl(null);
      const res = await api.get(`/admin/doctors/${doctor.profileId}/license-document/view`);
      const access = res.data?.data;
      if (access?.url) {
        setInspectUrl(access.url);
      } else {
        toast.error('Bác sĩ này chưa tải lên tệp scan CCHN.');
        setInspectingDoctor(null);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể lấy liên kết xem tệp CCHN từ Supabase.'));
      setInspectingDoctor(null);
    } finally {
      setLoadingDocUrl(false);
    }
  };

  useEffect(() => {
    fetchPendingDoctors();
    const interval = setInterval(() => {
      fetchPendingDoctors(true);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Background (silent) refreshes never replace a loaded list with an error
  // — a manual "Làm mới" (notify) reports the failure in a toast instead
  const fetchPendingDoctors = useCallback(async (silent = false, notify = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/admin/doctors/pending');
      setPendingDoctors(Array.isArray(res.data?.data) ? res.data.data : []);
      setLastUpdated(new Date());
      setLoadError(null);
    } catch (err) {
      devLog.error('Failed to fetch pending doctors:', err);
      const message = getApiErrorMessage(err, 'Không tải được danh sách hồ sơ chờ duyệt.');
      if (!silent) setLoadError(message);
      else if (notify) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const handleApprove = async (doctor: PendingDoctor) => {
    try {
      setActionLoading(doctor.profileId);
      setStatusMessage(null);

      await api.post(`/admin/doctors/${doctor.profileId}/vet`, {
        approve: true,
      });

      setStatusMessage({
        type: 'success',
        text: `Đã phê duyệt thành công hồ sơ bác sĩ ${doctor.fullName}. Bác sĩ đã được cấp quyền tiếp nhận bệnh nhân.`,
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

  const handleOpenRejectModal = (doctor: PendingDoctor) => {
    setRejectingDoctor(doctor);
    setRejectionReason('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoctor || !rejectionReason.trim()) return;

    try {
      setSubmittingRejection(true);
      setActionLoading(rejectingDoctor.profileId);
      setStatusMessage(null);

      await api.post(`/admin/doctors/${rejectingDoctor.profileId}/vet`, {
        approve: false,
        rejectionReason: rejectionReason.trim(),
      });

      setStatusMessage({
        type: 'success',
        text: `Đã từ chối hồ sơ bác sĩ ${rejectingDoctor.fullName}.`,
      });

      setRejectingDoctor(null);
      setRejectionReason('');
      fetchPendingDoctors();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setStatusMessage({
        type: 'error',
        text: axiosError.response?.data?.error?.message || 'Thao tác từ chối hồ sơ thất bại.',
      });
    } finally {
      setSubmittingRejection(false);
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
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={() => fetchPendingDoctors(true, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Làm mới hàng đợi duyệt bác sĩ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>
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
          <SkeletonList rows={3} className="p-4" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => fetchPendingDoctors()} className="m-4" />
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
                      {doc.academicTitle && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {doc.academicTitle}
                        </span>
                      )}
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

                    {doc.hospitalAffiliation && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-teal-50/70 border border-teal-100 px-3 py-1 rounded-xl w-fit">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span>{doc.hospitalAffiliation}</span>
                        {doc.department && <span className="text-slate-400 font-normal">| {doc.department}</span>}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {doc.email}
                      </span>
                      <span>SĐT: {doc.phone || 'Chưa cung cấp'}</span>
                      <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <FileBadge className="w-3.5 h-3.5 text-slate-400" /> CCHN: {doc.licenseNumber || 'Chưa khai báo'}
                      </span>
                      {doc.licenseIssuedBy && (
                        <span className="text-slate-500">Cơ quan cấp: <strong>{doc.licenseIssuedBy}</strong></span>
                      )}
                      {doc.licenseIssuedDate && (
                        <span className="text-slate-500">Ngày cấp: <strong>{doc.licenseIssuedDate}</strong></span>
                      )}
                      <span>Kinh nghiệm: {doc.yearsOfExperience ? `${doc.yearsOfExperience} năm` : 'chưa khai báo'}</span>
                      <span className="font-bold text-teal-700">
                        Phí: {formatVnd(doc.consultationFee) ?? 'chưa khai báo'}
                      </span>
                    </div>

                    {doc.scopeOfPractice && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <strong>Phạm vi hành nghề CCHN:</strong> {doc.scopeOfPractice}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleInspectLicense(doc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition border border-teal-200 cursor-pointer shadow-xs"
                      title="Xem bản scan CCHN lưu trên Supabase Storage"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                      <span>Xem Bản Scan CCHN</span>
                    </button>

                    <button
                      disabled={actionLoading === doc.profileId}
                      onClick={() => handleOpenRejectModal(doc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Từ Chối
                    </button>
                    <button
                      disabled={actionLoading === doc.profileId}
                      onClick={() => handleApprove(doc)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {actionLoading === doc.profileId ? 'Đang Xử Lý...' : 'Phê Duyệt & Tính Vector'}
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

      {/* DOCUMENT INSPECTION MODAL (SUPABASE CLOUD STORAGE) */}
      {inspectingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Thẩm Định Bản Scan CCHN - Bác sĩ {inspectingDoctor.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Số CCHN: <strong>{inspectingDoctor.licenseNumber}</strong> · Cơ quan cấp: {inspectingDoctor.licenseIssuedBy || 'Bộ Y Tế'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inspectUrl && (
                  <a
                    href={inspectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở tab mới</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInspectingDoctor(null);
                    setInspectUrl(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Checklist Thẩm Định Của Quản Trị Viên:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                  <li>Đối chiếu số hiệu CCHN trên Cổng thông tin Quốc gia về Khám chữa bệnh (Bộ Y Tế).</li>
                  <li>Kiểm tra con dấu đỏ, chữ ký của Người có thẩm quyền cấp chứng chỉ.</li>
                  <li>Xác nhận phạm vi chuyên môn phù hợp với các chuyên khoa bác sĩ đăng ký tiếp nhận bệnh nhân.</li>
                </ul>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto bg-slate-100/70 flex items-center justify-center min-h-[420px]">
              {loadingDocUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                  <p className="text-xs">Đang sinh signed URL bảo mật từ Supabase Storage...</p>
                </div>
              ) : inspectUrl ? (
                inspectUrl.includes('.pdf') || inspectUrl.includes('application%2Fpdf') || inspectUrl.includes('format=pdf') ? (
                  <iframe
                    src={inspectUrl}
                    title="Bản scan CCHN"
                    className="w-full h-[62vh] rounded-2xl border border-slate-300 bg-white"
                  />
                ) : (
                  <img
                    src={inspectUrl}
                    alt="Bản scan CCHN"
                    className="max-h-[62vh] max-w-full rounded-2xl object-contain shadow-xs border border-slate-200 bg-white"
                  />
                )
              ) : (
                <div className="text-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Bác sĩ chưa tải lên bản scan chứng chỉ hành nghề lên hệ thống.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Lưu trữ Supabase Private Bucket · Audit log đã ghi nhận lượt đối soát.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const doc = inspectingDoctor;
                    setInspectingDoctor(null);
                    setInspectUrl(null);
                    if (doc) handleOpenRejectModal(doc);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Từ Chối
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const doc = inspectingDoctor;
                    setInspectingDoctor(null);
                    setInspectUrl(null);
                    if (doc) handleApprove(doc);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 inline mr-1" />
                  Xác Nhận Đạt Chuẩn &amp; Phê Duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Từ Chối Hồ Sơ Bác Sĩ</h3>
              </div>
              <button
                onClick={() => {
                  setRejectingDoctor(null);
                  setRejectionReason('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đang từ chối cấp phép hành nghề cho <strong>{rejectingDoctor.fullName}</strong>. Vui lòng nêu rõ lý do để gửi phản hồi cho bác sĩ:
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ví dụ: Chứng chỉ hành nghề chưa rõ số hiệu hoặc ngày cấp, cần bổ sung văn bằng chuyên khoa 1..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingDoctor(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingRejection || !rejectionReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {submittingRejection ? 'Đang từ chối...' : 'Xác Nhận Từ Chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
