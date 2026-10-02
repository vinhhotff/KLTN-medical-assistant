import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Hash,
  Copy,
  PlusCircle,
  Eye,
  Activity,
  Layers,
  RefreshCw,
  Lock,
  ShieldAlert,
  FileX
} from 'lucide-react';
import { api, isPatientAccessDenied } from '../../services/api';
import { PatientAccessDeniedNotice } from './PatientAccessDeniedNotice';
import {
  DocumentFileAccess,
  DocumentFileAccessError,
  SIGNED_URL_NOTE,
  downloadDocumentFile,
  getDocumentFileAccess,
  isFileAccessExpired,
  openDocumentFile
} from '../../services/documentFileService';

export interface AbnormalIndicator {
  indicatorName: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'HIGH' | 'LOW';
  clinicalMeaning: string;
}

export interface DocumentAnalysisDetail {
  documentId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  hasFile?: boolean;
  clinicalSummary: string;
  plainLanguageExplanation?: string;
  indicators: AbnormalIndicator[];
  recommendedSpecialtySlug?: string;
  recommendedSpecialtyName?: string;
  suggestedQuestions?: string[];
  hospitalName?: string;
  departmentName?: string;
  orderingDoctor?: string;
  testDate?: string;
  sidCode?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  deviceModel?: string;
}

export interface DocumentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  initialFileName?: string;
  onInsertToEncounter?: (data: {
    clinicalSummary: string;
    abnormalIndicatorsText: string;
  }) => void;
}

export const DocumentAnalysisModal: React.FC<DocumentAnalysisModalProps> = ({
  isOpen,
  onClose,
  documentId,
  initialFileName,
  onInsertToEncounter
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'FILE'>('ANALYSIS');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<DocumentAnalysisDetail | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [fileAccess, setFileAccess] = useState<DocumentFileAccess | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<DocumentFileAccessError | null>(null);
  const [fileExpired, setFileExpired] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'OPEN' | 'DOWNLOAD' | null>(null);

  const loadFileAccess = useCallback(async () => {
    if (!documentId) return;
    setFileLoading(true);
    setFileError(null);
    setFileExpired(false);
    try {
      setFileAccess(await getDocumentFileAccess(documentId, false));
    } catch (err) {
      setFileAccess(null);
      setFileError(err as DocumentFileAccessError);
    } finally {
      setFileLoading(false);
    }
  }, [documentId]);

  // Lấy signed URL mới khi mở tab tệp gốc (chưa có liên kết hoặc liên kết cũ đã hết hạn)
  useEffect(() => {
    if (isOpen && activeTab === 'FILE' && !fileLoading && !fileError && (!fileAccess || isFileAccessExpired(fileAccess))) {
      void loadFileAccess();
    }
    // Cố ý chỉ chạy lại khi đổi tab / tài liệu: lỗi hoặc hết hạn được người dùng chủ động "Tải lại liên kết"
  }, [isOpen, activeTab, documentId]);

  // Đánh dấu hết hạn đúng thời điểm expiresAt để hiện nút "Tải lại liên kết"
  useEffect(() => {
    if (!fileAccess?.expiresAt) return;
    const remaining = new Date(fileAccess.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setFileExpired(true);
      return;
    }
    const timer = window.setTimeout(() => setFileExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [fileAccess]);

  useEffect(() => {
    if (isOpen && documentId) {
      setActiveTab('ANALYSIS');
      setLoading(true);
      setData(null);
      setCopied(false);
      setAccessDenied(false);
      setFileAccess(null);
      setFileError(null);
      setFileExpired(false);
      setActionError(null);

      api.get(`/documents/${documentId}/analysis`)
        .then((res: { data?: { data?: DocumentAnalysisDetail } }) => {
          if (res.data?.data) {
            setData(res.data.data);
          }
        })
        .catch((err: unknown) => {
          if (isPatientAccessDenied(err)) {
            setAccessDenied(true);
            return;
          }
          // Fallback baseline data if analysis record not found
          setData({
            documentId,
            fileName: initialFileName || 'Phiếu Xét Nghiệm / Hồ Sơ Cận Lâm Sàng',
            fileSizeBytes: 0,
            contentType: 'application/pdf',
            clinicalSummary: 'Tài liệu cận lâm sàng được lưu trữ an toàn trên hệ thống MediAssist-AI.',
            indicators: []
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, documentId, initialFileName]);

  if (!isOpen || !documentId) return null;

  const handleOpenInNewWindow = () => {
    // Gọi đồng bộ trong click handler: helper mở cửa sổ trống ngay để tránh popup blocker
    setActionError(null);
    setActionBusy('OPEN');
    openDocumentFile(documentId)
      .catch((err: DocumentFileAccessError) => setActionError(err.message))
      .finally(() => setActionBusy(null));
  };

  const handleDownload = () => {
    setActionError(null);
    setActionBusy('DOWNLOAD');
    downloadDocumentFile(documentId)
      .catch((err: DocumentFileAccessError) => setActionError(err.message))
      .finally(() => setActionBusy(null));
  };

  const abnormalIndicators = data?.indicators?.filter(
    (ind) => ind.status === 'HIGH' || ind.status === 'LOW'
  ) || [];

  const handleCopySummary = () => {
    if (!data?.clinicalSummary) return;
    navigator.clipboard.writeText(data.clinicalSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertClick = () => {
    if (!onInsertToEncounter || !data) return;

    const abnormalText = abnormalIndicators.length > 0
      ? abnormalIndicators
          .map((i) => `${i.indicatorName}: ${i.value} ${i.unit} (${i.status === 'HIGH' ? 'TĂNG CAO' : 'GIẢM THẤP'}) [Chuẩn: ${i.referenceRange}]`)
          .join('\n• ')
      : 'Không có chỉ số vượt ngưỡng';

    onInsertToEncounter({
      clinicalSummary: data.clinicalSummary,
      abnormalIndicatorsText: abnormalText
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-sky-900 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-sky-500/20 text-sky-300 rounded-2xl border border-sky-400/30">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate">
                  {data?.fileName || initialFileName || 'Chi Tiết Tài Liệu Y Tế & Kết Quả Bóc Tách'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 shrink-0">
                  AI Scribe OCR
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                {data?.fileSizeBytes ? `${(data.fileSizeBytes / 1024).toFixed(1)} KB • ` : ''}
                Mã hồ sơ: <span className="font-mono text-sky-200">{documentId.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUB-HEADER / TAB NAVIGATION & ACTIONS */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ANALYSIS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ANALYSIS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bóc Tách Chỉ Số & AI Scribe ({data?.indicators?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FILE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'FILE'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Trình Xem Tệp Gốc (PDF / Ảnh)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onInsertToEncounter && (
              <button
                type="button"
                onClick={handleInsertClick}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Chèn kết luận và các chỉ số bất thường vào ca khám đang mở"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Chèn Vào Bệnh Án</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenInNewWindow}
              disabled={actionBusy !== null || accessDenied}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Mở tệp trong tab trình duyệt mới (${SIGNED_URL_NOTE.toLowerCase()})`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{actionBusy === 'OPEN' ? 'Đang mở...' : 'Mở Cửa Sổ Mới'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={actionBusy !== null || accessDenied}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tải tệp xét nghiệm về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{actionBusy === 'DOWNLOAD' ? 'Đang tải...' : 'Tải Về'}</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-start gap-2 flex-shrink-0" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
              title="Ẩn thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-600">Đang đồng bộ và nạp kết quả phân tích AI...</p>
            </div>
          ) : accessDenied ? (
            <PatientAccessDeniedNotice />
          ) : activeTab === 'ANALYSIS' ? (
            <div className="space-y-6">
              {/* ADMINISTRATIVE METADATA CARDS */}
              {(data?.hospitalName || data?.departmentName || data?.orderingDoctor || data?.testDate || data?.sidCode) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sky-50/50 p-4 rounded-2xl border border-sky-100 text-xs">
                  {data.hospitalName && (
                    <div>
                      <span className="text-slate-400 block flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-sky-600" /> Bệnh viện / Cơ sở
                      </span>
                      <strong className="text-slate-800 font-semibold">{data.hospitalName}</strong>
                    </div>
                  )}
                  {data.departmentName && (
                    <div>
                      <span className="text-slate-400 block flex items-center gap-1">
                        <Layers className="w-3 h-3 text-sky-600" /> Khoa / Phòng xét nghiệm
                      </span>
                      <strong className="text-slate-800 font-semibold">{data.departmentName}</strong>
                    </div>
                  )}
                  {data.orderingDoctor && (
                    <div>
                      <span className="text-slate-400 block flex items-center gap-1">
                        <User className="w-3 h-3 text-sky-600" /> Bác sĩ chỉ định
                      </span>
                      <strong className="text-slate-800 font-semibold">{data.orderingDoctor}</strong>
                    </div>
                  )}
                  {data.testDate && (
                    <div>
                      <span className="text-slate-400 block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-600" /> Ngày xét nghiệm
                      </span>
                      <strong className="text-slate-800 font-semibold">{data.testDate}</strong>
                    </div>
                  )}
                  {data.sidCode && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block flex items-center gap-1">
                        <Hash className="w-3 h-3 text-sky-600" /> Mã SID / Barcode
                      </span>
                      <strong className="font-mono text-slate-800">{data.sidCode}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* CLINICAL SBAR SUMMARY */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/30 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    Tóm Tắt Nhận Định Lâm Sàng AI Scribe
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-xl border border-slate-100">
                  {data?.clinicalSummary || 'Không có tóm tắt lâm sàng cho tài liệu này.'}
                </p>
                {data?.recommendedSpecialtyName && (
                  <div className="text-[11px] text-sky-800 font-medium pt-1">
                    🎯 Chuyên khoa khuyến nghị theo dõi: <strong>{data.recommendedSpecialtyName}</strong>
                  </div>
                )}
              </div>

              {/* EXTRACTED LAB INDICATORS TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-600" />
                    Bảng Chỉ Số Xét Nghiệm Bóc Tách ({data?.indicators?.length || 0})
                  </h4>
                  {abnormalIndicators.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {abnormalIndicators.length} chỉ số ngoài ngưỡng tham chiếu
                    </span>
                  )}
                </div>

                {!data?.indicators || data.indicators.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                    Tài liệu này không chứa chỉ số xét nghiệm dạng số liệu đo lường hoặc là phiếu chỉ định trắng.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-bold">Tên Xét Nghiệm</th>
                          <th className="py-2.5 px-3 font-bold">Kết Quả Đo</th>
                          <th className="py-2.5 px-3 font-bold">Khoảng Tham Chiếu</th>
                          <th className="py-2.5 px-3 font-bold text-center">Đánh Giá</th>
                          <th className="py-2.5 px-3 font-bold">Ý Nghĩa Lâm Sàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.indicators.map((ind, idx) => {
                          const isHigh = ind.status === 'HIGH';
                          const isLow = ind.status === 'LOW';
                          const isAbnormal = isHigh || isLow;

                          return (
                            <tr
                              key={idx}
                              className={`transition ${
                                isHigh
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                  : isLow
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {ind.indicatorName}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                <span className={isAbnormal ? (isHigh ? 'text-rose-700 text-sm' : 'text-amber-700 text-sm') : 'text-slate-800'}>
                                  {ind.value}
                                </span>{' '}
                                <span className="text-[10px] text-slate-400 font-normal">{ind.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {ind.referenceRange || 'Chưa định chuẩn'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isHigh && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                                    ↑ TĂNG CAO
                                  </span>
                                )}
                                {isLow && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-300">
                                    ↓ GIẢM THẤP
                                  </span>
                                )}
                                {!isAbnormal && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ BÌNH THƯỜNG
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs">
                                {ind.clinicalMeaning || 'Trong giới hạn sinh lý an toàn.'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PLAIN EXPLANATION & SUGGESTED QUESTIONS */}
              {data?.plainLanguageExplanation && (
                <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200 space-y-1.5 text-xs">
                  <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    Giải Thích Người Bệnh (Plain Language)
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {data.plainLanguageExplanation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: ORIGINAL FILE VIEWER (signed URL ngắn hạn) */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-3 rounded-2xl text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-4 h-4 text-sky-600" />
                  {SIGNED_URL_NOTE}
                  {fileAccess?.expiresAt && !fileExpired && (
                    <span className="text-slate-400">
                      (hết hạn lúc {new Date(fileAccess.expiresAt).toLocaleTimeString('vi-VN')})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Content-Type: {fileAccess?.contentType || data?.contentType || 'application/pdf'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadFileAccess()}
                    disabled={fileLoading}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      fileExpired
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                    title="Tạo liên kết xem tệp mới"
                  >
                    <RefreshCw className={`w-3 h-3 ${fileLoading ? 'animate-spin' : ''}`} />
                    Tải lại liên kết
                  </button>
                </div>
              </div>

              <div className="w-full h-[62vh] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-inner flex flex-col">
                {fileLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
                    <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold">Đang tạo liên kết bảo mật để xem tệp gốc...</p>
                  </div>
                ) : fileError?.kind === 'FORBIDDEN' ? (
                  <div className="flex-1 overflow-y-auto p-4">
                    <PatientAccessDeniedNotice />
                  </div>
                ) : fileError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    {fileError.kind === 'NOT_FOUND' ? (
                      <FileX className="w-10 h-10 text-slate-400" />
                    ) : (
                      <ShieldAlert className="w-10 h-10 text-amber-500" />
                    )}
                    <p className="text-sm font-bold text-slate-800">
                      {fileError.kind === 'NOT_FOUND'
                        ? 'Không tìm thấy tệp gốc'
                        : fileError.kind === 'STORAGE_UNAVAILABLE'
                          ? 'Kho lưu trữ tạm thời gián đoạn'
                          : 'Không thể mở tệp gốc'}
                    </p>
                    <p className="text-xs text-slate-600 max-w-md">{fileError.message}</p>
                    {fileError.kind !== 'NOT_FOUND' && (
                      <button
                        type="button"
                        onClick={() => void loadFileAccess()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Thử lại
                      </button>
                    )}
                  </div>
                ) : fileExpired ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Lock className="w-10 h-10 text-amber-500" />
                    <p className="text-sm font-bold text-slate-800">Liên kết xem tệp đã hết hạn</p>
                    <p className="text-xs text-slate-600">
                      Vì lý do bảo mật, liên kết chỉ có hiệu lực 15 phút. Nhấn "Tải lại liên kết" để xem tiếp.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadFileAccess()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Tải lại liên kết
                    </button>
                  </div>
                ) : fileAccess ? (
                  <iframe
                    key={fileAccess.url}
                    src={fileAccess.url}
                    className="w-full h-full border-0 bg-white"
                    title={data?.fileName || 'Tệp xét nghiệm gốc'}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Eye className="w-4 h-4" />
                    Nhấn "Tải lại liên kết" để xem tệp gốc.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>MediAssist-AI Clinical Engine • Bảo đảm an toàn thông tin y tế</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
