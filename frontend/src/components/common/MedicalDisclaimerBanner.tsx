import React, { useState } from 'react';
import { X, ShieldAlert, PhoneCall } from 'lucide-react';

interface Props {
  dismissible?: boolean;
}

export const MedicalDisclaimerBanner: React.FC<Props> = ({ dismissible = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-slate-950 text-[#F6F3EC] text-xs py-2 px-4 border-b border-slate-800 relative z-40">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold bg-amber-500/15 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-md shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Khuyến Cáo Lâm Sàng</span>
          </span>
          {/* Short copy on phones so the 115 emergency number is never truncated */}
          <p className="sm:hidden text-slate-200 text-[11px] leading-snug">
            Chỉ để tham khảo, <u>không</u> thay thế bác sĩ. Khẩn cấp gọi{' '}
            <a href="tel:115" className="font-mono font-bold text-amber-300 underline">115</a>.
          </p>
          <p className="hidden sm:block text-slate-300 text-xs">
            Hệ thống <strong className="text-white font-display">MediAssist-AI</strong> chỉ hỗ trợ định hướng sơ bộ và giải thích kết quả xét nghiệm, <u>không</u> thay thế chẩn đoán từ Bác sĩ chuyên khoa. Trường hợp khẩn cấp, vui lòng đến ngay cơ sở y tế gần nhất hoặc gọi cấp cứu{' '}
            <a
              href="tel:115"
              className="inline-flex items-center gap-1 font-mono font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded hover:bg-rose-500/30 transition ml-1 underline"
            >
              <PhoneCall className="w-3 h-3" />
              115
            </a>.
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
