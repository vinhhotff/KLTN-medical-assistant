import React, { useState } from 'react';
import { X, ShieldAlert, PhoneCall } from 'lucide-react';

interface Props {
  dismissible?: boolean;
}

export const MedicalDisclaimerBanner: React.FC<Props> = ({ dismissible = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-rose-50/90 text-rose-950 text-xs py-2 px-4 border-b border-rose-200/80 relative z-40 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold bg-rose-100 text-rose-800 border border-rose-300/80 px-2.5 py-0.5 rounded-full shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Khuyến Cáo Lâm Sàng</span>
          </span>
          {/* Short copy on phones so the 115 emergency number is never truncated */}
          <p className="sm:hidden text-rose-900 text-[11px] leading-snug font-medium">
            Chỉ để tham khảo, <u>không</u> thay thế bác sĩ. Khẩn cấp gọi{' '}
            <a href="tel:115" className="font-mono font-bold text-rose-700 underline">115</a>.
          </p>
          <p className="hidden sm:block text-rose-900/90 text-xs font-medium">
            Hệ thống <strong className="text-rose-950 font-display">MediAssist-AI</strong> chỉ hỗ trợ định hướng sơ bộ và giải thích kết quả xét nghiệm, <u>không</u> thay thế chẩn đoán từ Bác sĩ chuyên khoa. Trường hợp khẩn cấp, vui lòng đến ngay cơ sở y tế gần nhất hoặc gọi cấp cứu{' '}
            <a
              href="tel:115"
              className="inline-flex items-center gap-1 font-mono font-bold text-rose-800 bg-rose-200/70 border border-rose-300 px-2 py-0.5 rounded-full hover:bg-rose-200 transition ml-1 underline"
            >
              <PhoneCall className="w-3 h-3" />
              115
            </a>.
          </p>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-rose-600 hover:text-rose-950 p-1 transition shrink-0 rounded-lg hover:bg-rose-100/60"
            aria-label="Đóng cảnh báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
