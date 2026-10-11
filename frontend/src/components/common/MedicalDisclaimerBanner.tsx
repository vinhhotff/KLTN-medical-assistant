import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

interface Props {
  dismissible?: boolean;
}

export const MedicalDisclaimerBanner: React.FC<Props> = ({ dismissible = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-sky-950 text-sky-100/90 text-xs py-2 px-4 border-b border-sky-800/60 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Khuyến Cáo Lâm Sàng</span>
          </span>
          {/* Short copy on phones so the 115 emergency number is never truncated */}
          <p className="sm:hidden text-slate-200 text-[11px] leading-snug">
            Chỉ để tham khảo, <u>không</u> thay thế bác sĩ. Khẩn cấp gọi{' '}
            <a href="tel:115" className="font-bold text-white underline">115</a>.
          </p>
          <p className="hidden sm:block text-slate-200 text-xs">
            Hệ thống <strong>MediAssist-AI</strong> chỉ hỗ trợ định hướng sơ bộ và giải thích kết quả xét nghiệm, <u>không</u> thay thế chẩn đoán từ Bác sĩ chuyên khoa. Trường hợp khẩn cấp, vui lòng đến ngay cơ sở y tế gần nhất hoặc gọi cấp cứu{' '}
            <a href="tel:115" className="font-bold text-white underline">115</a>.
          </p>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 transition shrink-0"
            aria-label="Đóng cảnh báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

