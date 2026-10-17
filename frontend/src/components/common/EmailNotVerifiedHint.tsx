import React from 'react';
import { MailWarning } from 'lucide-react';
import { useEmailVerification } from '../../hooks/useEmailVerification';

/**
 * Dòng gợi ý đặt cạnh nút đặt lịch/thanh toán đang bị vô hiệu hóa vì email chưa xác thực
 * (tooltip không hiện trên điện thoại nên cần thêm dòng chữ này).
 */
export const EmailNotVerifiedHint: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isUnverified } = useEmailVerification();
  if (!isUnverified) return null;
  return (
    <p className={`flex items-center gap-1.5 text-[11px] font-medium text-amber-700 ${className}`}>
      <MailWarning className="w-3.5 h-3.5 shrink-0" />
      Cần xác thực email trước khi đặt lịch hoặc thanh toán (xem thông báo đầu trang).
    </p>
  );
};
