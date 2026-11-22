import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Clock, Play, ShieldCheck, Sparkles, TriangleAlert, ArrowUp, ArrowDown, CircleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { Button, ErrorState, Modal, Skeleton, useToast, cn } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { ageFromBirthDate } from '../../utils/date';
import { devLog } from '../../utils/logger';
import { APPOINTMENT_STATUS_LABEL, URGENCY_LABEL, initialsOf, type AppointmentItem, type PatientProfileData, type UrgencyLevel } from '../../types/patient';

interface Indicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: string;
}
interface DocAnalysis {
  fileName: string;
  testDate?: string;
  indicators?: Indicator[];
}
interface TriageItem {
  id: string;
  symptomsText: string;
  primarySpecialty?: string;
  createdAt: string;
}
interface DocItem {
  id: string;
  fileName: string;
  createdAt: string;
}

const SBAR_LABEL: Record<string, string> = { S: 'Tình trạng', B: 'Bối cảnh', A: 'Nhận định', R: 'Đề xuất' };
const GENDER_LABEL: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/** Splits "S: … B: … A: … R: …" into rows; returns null when the summary is not in that shape. */
const parseSbar = (text?: string): { key: string; text: string }[] | null => {
  if (!text) return null;
  const parts = text.split(/(?:^|\n|\s)(?=[SBAR]:\s)/).map((p) => p.trim()).filter(Boolean);
  const rows = parts
    .map((p) => {
      const m = p.match(/^([SBAR]):\s*([\s\S]*)$/);
      return m ? { key: m[1], text: m[2].trim() } : null;
    })
    .filter(Boolean) as { key: string; text: string }[];
  return rows.length >= 2 ? rows : null;
};

const isHigh = (s: string) => s === 'ELEVATED' || s === 'HIGH';
const isLow = (s: string) => s === 'LOW';

const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const DoctorAppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [apt, setApt] = useState<AppointmentItem | null>(null);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
  const [history, setHistory] = useState<{ appointments: AppointmentItem[]; triage: TriageItem[]; docs: DocItem[] }>({ appointments: [], triage: [], docs: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNormal, setShowNormal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get('/appointments/my');
      const found: AppointmentItem | undefined = (Array.isArray(res.data?.data) ? res.data.data : []).find((a: AppointmentItem) => a.id === id);
      if (!found) {
        setApt(null);
        setLoadError('Không tìm thấy ca khám này trong lịch của bạn.');
        return;
      }
      setApt(found);
      const soft = <T,>(p: Promise<T>) =>
        p.catch((err) => {
          devLog.warn('Case detail request failed', err);
          return null;
        });
      const [prof, apts, tri, docs, ana] = await Promise.all([
        soft(api.get(`/patient/profile/by-user/${found.patientId}`)),
        soft(api.get(`/appointments/patient/${found.patientId}`)),
        soft(api.get(`/triage/patient/${found.patientId}`)),
        soft(api.get(`/documents/patient/${found.patientId}`)),
        found.medicalDocumentId ? soft(api.get(`/documents/${found.medicalDocumentId}/analysis`)) : Promise.resolve(null),
      ]);
      setProfile(prof?.data?.data ?? null);
      setAnalysis(ana?.data?.data ?? null);
      setHistory({
        appointments: Array.isArray(apts?.data?.data) ? apts!.data.data : [],
        triage: Array.isArray(tri?.data?.data) ? tri!.data.data : [],
        docs: Array.isArray(docs?.data?.data) ? docs!.data.data : [],
      });
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được ca khám.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const timeline = useMemo(() => {
    const items = [
      ...history.appointments.map((a) => ({ at: a.createdAt || a.scheduledStart, label: a.id === id ? 'Đặt lịch khám (ca này)' : `Lịch khám ${APPOINTMENT_STATUS_LABEL[a.status]?.text.toLowerCase() ?? ''}` })),
      ...history.triage.map((t) => ({ at: t.createdAt, label: `Phân luồng: ${t.symptomsText.slice(0, 40)}${t.symptomsText.length > 40 ? '…' : ''}` })),
      ...history.docs.map((d) => ({ at: d.createdAt, label: `Tải lên ${d.fileName}` })),
    ].filter((x) => x.at);
    return items.sort((a, b) => (a.at! < b.at! ? 1 : -1)).slice(0, 6);
  }, [history, id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!apt) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={loadError || 'Không tìm thấy ca khám.'} onRetry={load} retrying={loading} />
      </div>
    );
  }

  const status = APPOINTMENT_STATUS_LABEL[apt.status];
  const open = apt.status === 'SCHEDULED' || apt.status === 'CHECKED_IN' || apt.status === 'IN_PROGRESS';
  const sbar = parseSbar(apt.triageSbarSummary);
  const urgency = apt.triageUrgencyLevel as UrgencyLevel | undefined;
  const triageSession = history.triage.find((t) => t.id === apt.triageSessionId);
  const age = ageFromBirthDate(profile?.dateOfBirth);
  const indicators = analysis?.indicators ?? [];
  const abnormal = indicators.filter((i) => isHigh(i.status) || isLow(i.status));
  const normal = indicators.filter((i) => !isHigh(i.status) && !isLow(i.status));
  const priorVisits = history.appointments.filter((a) => a.id !== apt.id && a.status === 'COMPLETED').length;

  const checkIn = async () => {
    try {
      setBusy(true);
      await api.patch(`/appointments/${apt.id}/check-in`);
      toast.success('Đã check-in bệnh nhân.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể check-in.'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (cancelReason.trim().length < 10) return;
    try {
      setBusy(true);
      await api.patch(`/appointments/${apt.id}/status`, { status: 'CANCELLED', notes: cancelReason.trim() });
      toast.success(`Đã hủy ca khám ${apt.appointmentCode}.`);
      setCancelOpen(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể hủy ca khám.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Patient header */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5">
        <span className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 text-lg font-bold flex items-center justify-center shrink-0">{initialsOf(apt.patientName)}</span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-slate-900">{apt.patientName}</h1>
          <p className="text-sm text-slate-500">
            {[profile?.gender && GENDER_LABEL[profile.gender], age !== null && `${age} tuổi`, priorVisits === 0 ? 'Lần đầu khám tại MediAssist' : `${priorVisits} lần khám trước`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-code text-indigo-800">{apt.appointmentCode}</span>
            {status && <span className={cn('px-2 py-0.5 rounded-full border text-xs font-semibold', status.className)}>{status.text}</span>}
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Clock className="w-4 h-4" /> {fmtTime(apt.scheduledStart)}
              {apt.scheduledEnd && ` – ${fmtTime(apt.scheduledEnd)}`} · {fmtDate(apt.scheduledStart)}
            </span>
          </div>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {apt.status === 'SCHEDULED' && (
              <Button variant="secondary" className="!rounded-lg" loading={busy} onClick={checkIn}>
                Check-in
              </Button>
            )}
            {apt.status !== 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="px-4 py-2 rounded-lg border border-rose-200 text-sm font-medium text-rose-700 hover:bg-rose-50 transition cursor-pointer"
              >
                Hủy lịch
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/doctor?encounter=${apt.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition cursor-pointer"
            >
              <Play className="w-4 h-4" /> {apt.status === 'IN_PROGRESS' ? 'Tiếp tục khám' : 'Bắt đầu khám'}
            </button>
          </div>
        )}
      </section>

      {(apt.triageSessionId || apt.medicalDocumentId) && (
        <p className="flex items-start gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <span>
            Bệnh nhân gửi kèm{' '}
            <strong>{[apt.triageSessionId && '1 phiên phân luồng AI', apt.medicalDocumentId && '1 kết quả xét nghiệm'].filter(Boolean).join(' và ')}</strong>. Nội dung do AI tạo, chỉ dùng để tham khảo — bác sĩ xác nhận hoặc sửa khi ghi vào hồ sơ.
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Reason for visit / SBAR */}
          <section className="bg-white rounded-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">Lý do khám{apt.triageSbarSummary ? ' · tóm tắt từ AI' : ''}</h2>
              {triageSession && <p className="text-xs text-slate-500">Phiên phân luồng {fmtDateTime(triageSession.createdAt)} · định dạng SBAR</p>}
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {(urgency || triageSession?.primarySpecialty) && (
                <div className="flex flex-wrap gap-2">
                  {urgency && (
                    <span className={cn('px-3 py-1 rounded-lg border text-sm', urgency === 'EMERGENCY' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-orange-50 border-orange-200 text-orange-800')}>
                      Mức khẩn cấp: {URGENCY_LABEL[urgency]?.toLowerCase() ?? urgency}
                    </span>
                  )}
                  {triageSession?.primarySpecialty && (
                    <span className="px-3 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sm text-sky-800">Chuyên khoa gợi ý: {triageSession.primarySpecialty}</span>
                  )}
                </div>
              )}

              {sbar ? (
                <dl className="divide-y divide-slate-100">
                  {sbar.map((row) => (
                    <div key={row.key} className="grid grid-cols-[28px_96px_1fr] gap-3 py-3 text-sm">
                      <dt className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{row.key}</dt>
                      <dt className="font-medium text-slate-900">{SBAR_LABEL[row.key]}</dt>
                      <dd className="text-slate-700">{row.text}</dd>
                    </div>
                  ))}
                </dl>
              ) : apt.triageSbarSummary ? (
                <p className="text-sm text-slate-700 whitespace-pre-line">{apt.triageSbarSummary}</p>
              ) : apt.chiefComplaint ? (
                <p className="text-sm text-slate-700 whitespace-pre-line">{apt.chiefComplaint}</p>
              ) : (
                <p className="text-sm text-slate-500">Bệnh nhân không gửi kèm phiên phân luồng AI hay lý do khám.</p>
              )}

              {apt.triageSessionId && urgency !== 'EMERGENCY' && (
                <p className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-sm text-emerald-800">
                  <ShieldCheck className="w-4 h-4 shrink-0" /> Sàng lọc dấu hiệu nguy hiểm: không phát hiện trong phiên phân luồng.
                </p>
              )}
            </div>
          </section>

          {/* Attached lab result */}
          {apt.medicalDocumentId && (
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-lg font-bold text-slate-900">Xét nghiệm đính kèm</h2>
                <p className="text-xs text-slate-500">
                  {[analysis?.fileName || apt.medicalDocumentFileName, analysis?.testDate && `lấy mẫu ${analysis.testDate}`, indicators.length && `AI đọc ${indicators.length} chỉ số`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {indicators.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">{analysis ? 'AI chưa đọc được chỉ số nào trên tài liệu này.' : 'Không tải được kết quả đọc của tài liệu.'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 text-left">
                        <th className="py-2.5 px-5 font-semibold">Chỉ số</th>
                        <th className="py-2.5 px-3 font-semibold">Kết quả</th>
                        <th className="py-2.5 px-3 font-semibold">Tham chiếu</th>
                        <th className="py-2.5 px-5 font-semibold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...abnormal, ...(showNormal ? normal : [])].map((ind, i) => (
                        <tr key={`${ind.name}-${i}`}>
                          <td className="py-3 px-5 font-medium text-slate-900">{ind.name}</td>
                          <td className={cn('py-3 px-3 font-semibold', isHigh(ind.status) ? 'text-rose-700' : isLow(ind.status) ? 'text-blue-700' : 'text-slate-900')}>
                            {ind.value} {ind.unit}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{ind.referenceRange}</td>
                          <td className="py-3 px-5">
                            {isHigh(ind.status) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700">
                                <ArrowUp className="w-3 h-3" /> Cao
                              </span>
                            ) : isLow(ind.status) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">
                                <ArrowDown className="w-3 h-3" /> Thấp
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Bình thường</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {normal.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNormal((v) => !v)}
                      className="w-full flex items-center justify-center gap-1 py-3 border-t border-slate-200 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {showNormal ? 'Ẩn chỉ số bình thường' : `Hiện ${normal.length} chỉ số bình thường còn lại`}
                      {showNormal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Completed visit record */}
          {apt.status === 'COMPLETED' && (apt.consultationNotes || apt.treatmentPlan) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3 text-sm">
              <h2 className="font-display text-lg font-bold text-slate-900">Ghi chú khám đã lưu</h2>
              {apt.consultationNotes && <p className="text-slate-700 whitespace-pre-line">{apt.consultationNotes}</p>}
              {apt.treatmentPlan && (
                <p className="text-slate-700 whitespace-pre-line">
                  <strong className="text-slate-900">Hướng xử trí:</strong> {apt.treatmentPlan}
                </p>
              )}
            </section>
          )}

          {open && (
            <p className="p-5 rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-600">
              Ghi chú khám, sinh hiệu, chẩn đoán ICD-10 và đơn thuốc được nhập trong bàn khám — bấm <strong>{apt.status === 'IN_PROGRESS' ? 'Tiếp tục khám' : 'Bắt đầu khám'}</strong> ở trên.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Thông tin bệnh nhân</h2>
            {profile ? (
              <dl className="mt-3 space-y-2.5 text-sm">
                <InfoRow label="Giới tính" value={profile.gender ? GENDER_LABEL[profile.gender] : undefined} />
                <InfoRow label="Năm sinh" value={profile.dateOfBirth ? profile.dateOfBirth.slice(0, 4) : undefined} />
                <InfoRow label="Điện thoại" value={profile.phone || apt.patientPhone} />
                <InfoRow label="Nhóm máu" value={profile.bloodGroup} />
                <InfoRow label="Dị ứng" value={profile.allergies} warnEmpty />
                <InfoRow label="Tiền sử bệnh" value={profile.medicalHistory} warnEmpty />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Không tải được hồ sơ bệnh nhân.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Lịch sử tại MediAssist</h2>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có hoạt động nào khác.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', i === 0 ? 'bg-teal-600' : 'bg-slate-400')} />
                    <span>
                      <span className="block font-medium text-slate-900">{t.label}</span>
                      <span className="block text-xs text-slate-500">{fmtDateTime(t.at!)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => !busy && setCancelOpen(false)}
        title="Hủy ca khám"
        description={`${apt.patientName} · ${fmtTime(apt.scheduledStart)} ${fmtDate(apt.scheduledStart)}`}
        busy={busy}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy}>
              Giữ lịch
            </Button>
            <Button variant="danger" onClick={cancel} loading={busy} disabled={cancelReason.trim().length < 10}>
              Hủy ca khám
            </Button>
          </>
        }
      >
        <label htmlFor="doctor-cancel-reason" className="block text-sm font-medium text-slate-800 mb-1.5">
          Lý do hủy (bệnh nhân sẽ nhận được qua email)
        </label>
        <textarea
          id="doctor-cancel-reason"
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        {cancelReason.trim().length > 0 && cancelReason.trim().length < 10 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-700">
            <TriangleAlert className="w-3.5 h-3.5" /> Lý do cần ít nhất 10 ký tự.
          </p>
        )}
      </Modal>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | null; warnEmpty?: boolean }> = ({ label, value, warnEmpty }) => (
  <div className="grid grid-cols-[100px_1fr] gap-3">
    <dt className="text-slate-500">{label}</dt>
    <dd className={cn(value ? 'text-slate-900' : warnEmpty ? 'text-orange-700' : 'text-slate-400')}>
      {value || (warnEmpty ? (
        <span className="inline-flex items-center gap-1">
          <CircleAlert className="w-3.5 h-3.5" /> Chưa khai báo
        </span>
      ) : (
        '—'
      ))}
    </dd>
  </div>
);

const BackLink: React.FC = () => (
  <Link to="/doctor" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
    <ChevronLeft className="w-4 h-4" /> Lịch hẹn hôm nay
  </Link>
);
