import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Calendar, BadgeCheck, CheckCircle2, Building2, Star, Filter, Sparkles, Loader2, Zap, PowerOff, Wrench } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Pagination } from '../../components/common/Pagination';
import { DoctorReviewsListModal } from '../../components/common/DoctorReviewsListModal';
import { BookingModal } from '../../components/booking/BookingModal';
import { ClinicalDefenseBar, type ClinicalDefenseMeta } from '../../components/search/ClinicalDefenseBar';
import { EmptyState, ErrorState, SkeletonList, useToast } from '../../components/ui';
import { ENABLE_DEV_TOOLS } from '../../config/app';
import { formatRating, formatVnd } from '../../utils/display';
import { getApiErrorMessage } from '../../utils/apiError';
import { devLog } from '../../utils/logger';

interface AiModeStatus {
  forcedOfflineSimulation: boolean;
  onlineNeuralActive: boolean;
  activeEngineDescription: string;
  vectorDimensions: number;
  modelName: string;
  statusLabel: string;
  message?: string;
}

interface DoctorDetail extends ClinicalDefenseMeta {
  id: string;
  doctorId?: string;
  profileId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string | null;
  licenseNumber?: string | null;
  consultationFee?: number | null;
  yearsOfExperience?: number | null;
  specialties?: string[];
  verified?: boolean;
  academicTitle?: string | null;
  hospitalAffiliation?: string | null;
  department?: string | null;
  licenseIssuedBy?: string | null;
  rating?: number | null;
  totalConsultations?: number | null;
  reviewCount?: number | null;
  similarityScore?: number;
}

/** Semantic search returns DoctorMatchDto (doctorId) while /doctors returns DoctorDetailDto (id). */
const normalizeDoctor = (d: DoctorDetail): DoctorDetail => ({ ...d, id: d.id || d.doctorId || '' });

export const DoctorSearchPage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const queryDoctorId = searchParams.get('doctorId');
  const querySpecialty = searchParams.get('specialty');

  const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
  const [specialtiesList, setSpecialtiesList] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [semanticResults, setSemanticResults] = useState<DoctorDetail[] | null>(null);
  /** Query that `semanticResults` answers — defense metadata is only shown for the current query */
  const [semanticQuery, setSemanticQuery] = useState<string | null>(null);
  const [searchingSemantic, setSearchingSemantic] = useState(false);

  // System-wide AI mode switch: admin or explicit dev-tools flag only (it affects every user)
  const canToggleAiMode = user?.role === 'ADMIN' || ENABLE_DEV_TOOLS;
  const [aiModeStatus, setAiModeStatus] = useState<AiModeStatus | null>(null);
  const [togglingAiMode, setTogglingAiMode] = useState(false);

  const [bookingDoctor, setBookingDoctor] = useState<DoctorDetail | null>(null);
  const [viewingReviewsDoctor, setViewingReviewsDoctor] = useState<DoctorDetail | null>(null);

  const executeSemanticSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || !user) {
      setSemanticResults(null);
      return;
    }
    try {
      setSearchingSemantic(true);
      const res = await api.get('/triage/search/semantic', {
        params: { query: trimmed, limit: 12 }
      });
      setSemanticResults(Array.isArray(res.data?.data) ? res.data.data.map(normalizeDoctor) : null);
      setSemanticQuery(trimmed);
    } catch (err) {
      devLog.warn('Semantic search fallback to keyword filter:', err);
      setSemanticResults(null);
      setSemanticQuery(null);
    } finally {
      setSearchingSemantic(false);
    }
  }, [user]);

  const loadAiModeStatus = useCallback(async () => {
    try {
      const res = await api.get('/system/ai-mode');
      if (res.data?.data) setAiModeStatus(res.data.data);
    } catch (err) {
      devLog.warn('Failed to load AI mode status:', err);
    }
  }, []);

  const handleToggleAiMode = async () => {
    if (togglingAiMode) return;
    try {
      setTogglingAiMode(true);
      const res = await api.post('/system/ai-mode/toggle');
      if (res.data?.data) {
        setAiModeStatus(res.data.data);
        toast.info(res.data.data.forcedOfflineSimulation ? 'Đã chuyển AI sang chế độ ngoại tuyến cho toàn hệ thống.' : 'Đã bật lại AI trực tuyến.');
        if (searchTerm.trim().length >= 3) executeSemanticSearch(searchTerm);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không đổi được chế độ AI.'));
    } finally {
      setTogglingAiMode(false);
    }
  };

  // Semantic search when query >= 3 chars and user authenticated
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 3 || !user) {
      setSemanticResults(null);
      return;
    }
    const timer = setTimeout(() => executeSemanticSearch(trimmed), 350);
    return () => clearTimeout(timer);
  }, [searchTerm, user, executeSemanticSearch]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [docsRes, specsRes] = await Promise.allSettled([api.get('/doctors'), api.get('/specialties')]);
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value.data?.data)) {
        setDoctors(docsRes.value.data.data.map(normalizeDoctor));
      } else if (docsRes.status === 'rejected') {
        setLoadError(getApiErrorMessage(docsRes.reason, 'Không tải được danh sách bác sĩ.'));
      }
      if (specsRes.status === 'fulfilled' && Array.isArray(specsRes.value.data?.data)) {
        setSpecialtiesList(specsRes.value.data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (canToggleAiMode) loadAiModeStatus();
  }, [canToggleAiMode, loadAiModeStatus]);

  // ?specialty=<slug|name> coming from the triage assistant
  useEffect(() => {
    if (!querySpecialty || specialtiesList.length === 0) return;
    const q = querySpecialty.toLowerCase();
    const match = specialtiesList.find((s) => s.slug.toLowerCase() === q || s.name.toLowerCase() === q);
    if (match) setSelectedSpecialty(match.name);
  }, [querySpecialty, specialtiesList]);

  // Auto-open booking modal if navigated with ?doctorId=...
  useEffect(() => {
    if (queryDoctorId && doctors.length > 0 && !bookingDoctor) {
      const targetDoc = doctors.find((d) => d.id === queryDoctorId || d.profileId === queryDoctorId);
      if (targetDoc) setBookingDoctor(targetDoc);
    }
  }, [queryDoctorId, doctors]);

  // Defense metadata comes from the raw API list (not filteredDoctors) so the specialty
  // filter never hides it; it is dropped as soon as the query changes or falls under 3 chars.
  const defense = useMemo<ClinicalDefenseMeta | null>(() => {
    if (semanticQuery === null || semanticQuery !== searchTerm.trim()) return null;
    return semanticResults?.[0] ?? null;
  }, [semanticResults, semanticQuery, searchTerm]);

  const displaySource = semanticResults !== null ? semanticResults : doctors;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const filteredDoctors = useMemo(() => {
    return displaySource.filter((d) => {
      const matchesSpecialty =
        selectedSpecialty === 'ALL' ||
        d.specialties?.some((s) => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));
      if (semanticResults !== null) return matchesSpecialty;

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        d.fullName?.toLowerCase().includes(term) ||
        d.bio?.toLowerCase().includes(term) ||
        d.hospitalAffiliation?.toLowerCase().includes(term) ||
        d.department?.toLowerCase().includes(term) ||
        d.specialties?.some((s) => s.toLowerCase().includes(term));
      return matchesSearch && matchesSpecialty;
    });
  }, [displaySource, selectedSpecialty, semanticResults, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedSpecialty, semanticResults]);

  const paginatedDoctors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [filteredDoctors, page, pageSize]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tìm & Đặt Lịch Bác Sĩ</h1>
        <p className="text-slate-600 text-sm mt-1">
          Tìm bác sĩ theo tên, chuyên khoa hoặc mô tả triệu chứng — hệ thống sẽ gợi ý bác sĩ phù hợp nhất.
        </p>
      </div>

      {/* AI mode switch: affects the WHOLE system → admin / dev-tools only */}
      {canToggleAiMode && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${aiModeStatus?.forcedOfflineSimulation ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Công cụ quản trị · Chế độ AI toàn hệ thống</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10">{aiModeStatus?.statusLabel || 'Đang tải...'}</span>
              </div>
              <details className="mt-1">
                <summary className="text-[11px] text-slate-400 cursor-pointer">Chi tiết kỹ thuật</summary>
                <p className="text-xs text-slate-300 mt-1 font-mono">{aiModeStatus?.activeEngineDescription || '—'}</p>
              </details>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAiMode}
            disabled={togglingAiMode || !aiModeStatus}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
              aiModeStatus?.forcedOfflineSimulation ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
            }`}
            title="Ảnh hưởng tới mọi người dùng"
          >
            {togglingAiMode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : aiModeStatus?.forcedOfflineSimulation ? <Zap className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
            {aiModeStatus?.forcedOfflineSimulation ? 'Bật lại AI trực tuyến' : 'Chuyển AI sang ngoại tuyến'}
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="md:col-span-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 focus-within:ring-2 focus-within:ring-teal-500">
          {searchingSemantic ? (
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" aria-hidden />
          ) : semanticResults !== null ? (
            <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0" aria-hidden />
          ) : (
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" aria-hidden />
          )}
          <span className="sr-only">Tìm bác sĩ</span>
          <input
            type="search"
            placeholder="VD: đau thắt ngực, Tim mạch, tên bác sĩ, bệnh viện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          {semanticResults !== null && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
              <Sparkles className="w-3 h-3" /> Gợi ý theo triệu chứng
            </span>
          )}
        </label>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-600 ml-2 flex-shrink-0" aria-hidden />
          <select
            aria-label="Lọc theo chuyên khoa"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full text-sm font-semibold text-slate-700 bg-transparent outline-none py-1.5 pr-2 cursor-pointer"
          >
            <option value="ALL">Tất cả chuyên khoa ({specialtiesList.length})</option>
            {specialtiesList.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ClinicalDefenseBar defense={defense} />

      {loading ? (
        <SkeletonList rows={3} />
      ) : loadError && doctors.length === 0 ? (
        <ErrorState message={loadError} onRetry={fetchInitialData} />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          title={doctors.length === 0 ? 'Chưa có bác sĩ nào trong hệ thống' : 'Không tìm thấy bác sĩ phù hợp'}
          description={doctors.length === 0 ? undefined : 'Thử bỏ bộ lọc chuyên khoa hoặc mô tả triệu chứng theo cách khác.'}
        />
      ) : (
        <div className="space-y-4">
          {paginatedDoctors.map((doc) => {
            const fee = formatVnd(doc.consultationFee);
            const rating = formatRating(doc.rating, doc.reviewCount);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-teal-300 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xl flex-shrink-0" aria-hidden>
                    {doc.fullName.trim().split(' ').pop()?.charAt(0)}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.academicTitle && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{doc.academicTitle}</span>
                      )}
                      <h2 className="text-base font-bold text-slate-900">{doc.fullName}</h2>
                      {doc.similarityScore != null && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Phù hợp {(doc.similarityScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {doc.specialties?.map((spec) => (
                        <span key={spec} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                          {spec}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã thẩm định chứng chỉ hành nghề
                      </span>
                    </div>

                    {doc.hospitalAffiliation && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1 text-teal-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                          {doc.hospitalAffiliation}
                        </span>
                        {doc.department && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{doc.department}</span>
                          </>
                        )}
                      </div>
                    )}

                    {doc.bio && <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{doc.bio}</p>}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100 mt-2">
                      {doc.licenseNumber && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <BadgeCheck className="w-3.5 h-3.5 text-slate-400" /> CCHN: {doc.licenseNumber}
                        </span>
                      )}
                      {doc.yearsOfExperience ? <span>Kinh nghiệm: <strong className="text-slate-800">{doc.yearsOfExperience} năm</strong></span> : null}
                      {rating ? (
                        <button
                          type="button"
                          onClick={() => setViewingReviewsDoctor(doc)}
                          className="inline-flex items-center gap-1 text-amber-700 font-bold hover:underline cursor-pointer"
                          title="Xem nhận xét từ bệnh nhân"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
                          <span>{rating}</span>
                          <span className="text-slate-500 font-normal">({doc.reviewCount} đánh giá)</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 italic">Chưa có đánh giá</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 flex-shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-500 block font-medium">Phí khám:</span>
                    {fee ? (
                      <span className="text-lg font-bold text-teal-700">{fee}</span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-600">Liên hệ</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingDoctor(doc)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" /> Đặt khám
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Pagination
              currentPage={page}
              totalItems={filteredDoctors.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[4, 6, 12, 20]}
              itemLabel="bác sĩ"
            />
          </div>
        </div>
      )}

      <BookingModal open={bookingDoctor !== null} doctor={bookingDoctor} onClose={() => setBookingDoctor(null)} />

      {viewingReviewsDoctor && (
        <DoctorReviewsListModal
          isOpen={!!viewingReviewsDoctor}
          onClose={() => setViewingReviewsDoctor(null)}
          doctorId={viewingReviewsDoctor.id}
          doctorName={viewingReviewsDoctor.fullName}
          doctorHospital={viewingReviewsDoctor.hospitalAffiliation || undefined}
          doctorSpecialty={viewingReviewsDoctor.specialties?.join(', ')}
          doctorRating={viewingReviewsDoctor.rating || undefined}
          reviewCount={viewingReviewsDoctor.reviewCount || undefined}
        />
      )}
    </div>
  );
};
