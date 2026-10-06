import React from 'react';
import { Lock } from 'lucide-react';
import { PATIENT_ACCESS_DENIED_MESSAGE } from '../../services/api';

interface PatientAccessDeniedNoticeProps {
  className?: string;
}

/** Thông báo thân thiện khi backend trả 403 FORBIDDEN_PATIENT_ACCESS (không có quan hệ điều trị với bệnh nhân). */
export const PatientAccessDeniedNotice: React.FC<PatientAccessDeniedNoticeProps> = ({ className = '' }) => (
  <div
    role="alert"
    className={`p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 ${className}`}
  >
    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-200 flex-shrink-0">
      <Lock className="w-4 h-4" />
    </div>
    <div className="space-y-1">
      <p className="font-bold text-sm">Không thể mở hồ sơ bệnh nhân này</p>
      <p className="leading-relaxed">{PATIENT_ACCESS_DENIED_MESSAGE}</p>
    </div>
  </div>
);
