import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  dismissible?: boolean;
}

export const MedicalDisclaimerBanner: React.FC<Props> = ({ dismissible = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-amber-100 text-amber-700 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold uppercase tracking-wider text-amber-800 mr-1.5">
              Cảnh báo y tế:
            </span>
            <span>
              Nền tảng <strong>MediAssist-AI</strong> chỉ cung cấp hỗ trợ thông tin sơ bộ và diễn giải hồ sơ y tế. 
              Hệ thống <u>không</u> đưa ra chẩn đoán y khoa chính thức và <u>không</u> thay thế tư vấn hoặc chỉ định từ bác sĩ chuyên khoa. 
              Trong trường hợp khẩn cấp, vui lòng đến ngay cơ sở y tế gần nhất hoặc gọi cấp cứu 115.
            </span>
          </div>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-900 p-1 transition"
            aria-label="Đóng cảnh báo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
