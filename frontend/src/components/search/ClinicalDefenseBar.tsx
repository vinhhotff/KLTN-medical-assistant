import React from 'react';
import { AlertOctagon, CheckCircle2, Info, MinusCircle, Phone } from 'lucide-react';
import { Badge } from '../ui';
import { EMERGENCY_NUMBER } from '../../config/app';

/**
 * Defensive metadata the backend attaches to EVERY DoctorMatchDto returned by
 * GET /triage/search/semantic (identical on each element; absent when the list is empty).
 */
export interface ClinicalDefenseMeta {
  emergencyRedFlag?: boolean | null;
  emergencyWarning?: string | null;
  outOfDomain?: boolean | null;
  outOfDomainGuidance?: string | null;
  normalizedClinicalQuery?: string | null;
  affirmedSymptoms?: string[] | null;
  negatedSymptoms?: string[] | null;
}

const NEGEX_TITLE = 'NegEx: triệu chứng phủ định, đã loại khỏi truy vấn tìm kiếm';

/**
 * "Smart Defense Bar": shows what the clinical NLP engine understood from the query
 * (affirmed vs. NegEx-negated clauses), the red-flag emergency banner and the
 * out-of-domain guidance. Strings are rendered exactly as the backend returns them.
 */
export const ClinicalDefenseBar: React.FC<{ defense: ClinicalDefenseMeta | null }> = ({ defense }) => {
  if (!defense) return null;
  const affirmed = (defense.affirmedSymptoms ?? []).filter(Boolean);
  const negated = (defense.negatedSymptoms ?? []).filter(Boolean);
  const emergency = !!defense.emergencyRedFlag;
  const outOfDomain = !!defense.outOfDomain;
  // OOD is only flagged when the query has no clinical substance, so its clauses are not
  // symptoms (e.g. "khám hết bao nhiêu tiền" is "negated" because "hết" is a NegEx trigger).
  const hasChips = !outOfDomain && (affirmed.length > 0 || negated.length > 0);
  if (!hasChips && !emergency && !outOfDomain) return null;

  return (
    <div className="space-y-3" aria-live="polite" data-testid="clinical-defense-bar">
      {emergency && (
        <div role="alert" className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 text-sm text-rose-900">
            <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">Dấu hiệu cấp cứu</p>
              {defense.emergencyWarning && <p className="mt-0.5">{defense.emergencyWarning}</p>}
            </div>
          </div>
          <a
            href={`tel:${EMERGENCY_NUMBER}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold whitespace-nowrap"
          >
            <Phone className="w-4 h-4" aria-hidden /> Gọi cấp cứu {EMERGENCY_NUMBER}
          </a>
        </div>
      )}

      {outOfDomain && (
        <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50 flex items-start gap-3 text-sm text-sky-900" data-testid="out-of-domain-banner">
          <Info className="w-5 h-5 text-sky-600 shrink-0" aria-hidden />
          <p>{defense.outOfDomainGuidance || 'Câu hỏi này nằm ngoài phạm vi tìm bác sĩ theo triệu chứng.'}</p>
        </div>
      )}

      {hasChips && (
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">AI đã hiểu triệu chứng của bạn:</span>
            {affirmed.map((s) => (
              <Badge key={`a-${s}`} tone="success" className="text-xs">
                <CheckCircle2 className="w-3 h-3" aria-hidden /> {s}
              </Badge>
            ))}
            {negated.map((s) => (
              <span key={`n-${s}`} title={NEGEX_TITLE} aria-label={`Đã loại trừ: ${s}`}>
                <Badge tone="neutral" className="text-xs text-slate-500 line-through">
                  <MinusCircle className="w-3 h-3" aria-hidden /> {s}
                </Badge>
              </span>
            ))}
          </div>
          {defense.normalizedClinicalQuery && (
            <details className="mt-2">
              <summary className="text-[11px] text-slate-500 cursor-pointer">Chi tiết kỹ thuật</summary>
              <p className="text-xs text-slate-600 mt-1">
                Truy vấn lâm sàng đã chuẩn hoá: <code className="font-mono bg-slate-50 px-1 rounded">{defense.normalizedClinicalQuery}</code>
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
