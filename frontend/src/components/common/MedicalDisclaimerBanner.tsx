import React, { useState } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { EMERGENCY_NUMBER } from '../../config/app';

interface Props {
  dismissible?: boolean;
}

/** Permanent medical disclaimer shown on every patient page (AGENTS.md §2.2). */
export const MedicalDisclaimerBanner: React.FC<Props> = ({ dismissible = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 text-amber-900 text-xs border-b border-amber-200 relative z-40" role="note">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-20 py-2.5 flex items-center justify-between gap-4">
        <p className="flex items-start sm:items-center gap-2 leading-snug">
          <TriangleAlert className="w-4 h-4 text-amber-700 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold text-amber-950">Cảnh báo y tế:</strong>{' '}
            <span className="hidden sm:inline">
              MediAssist-AI chỉ hỗ trợ thông tin sơ bộ, không đưa ra chẩn đoán và không thay thế bác sĩ. Trường hợp khẩn cấp, hãy gọi{' '}
            </span>
            <span className="sm:hidden">Chỉ để tham khảo, không thay thế bác sĩ. Khẩn cấp gọi </span>
            <a href={`tel:${EMERGENCY_NUMBER}`} className="font-bold text-amber-950 underline underline-offset-2">
              {EMERGENCY_NUMBER}
            </a>
            .
          </span>
        </p>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-950 p-1 transition shrink-0 rounded-lg hover:bg-amber-100"
            aria-label="Đóng cảnh báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
