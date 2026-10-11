/**
 * Scan-quota / VIP package catalogue shown on the document scanner.
 *
 * ⚠️ PHẢI KHỚP BACKEND: giá và mã gói được kiểm tra lại ở
 * backend/src/main/java/com/mediassist/service/PaymentService.java.
 * Backend chưa có API danh sách gói (đã ghi vào "Yêu cầu gửi backend"),
 * nên đây là nguồn duy nhất phía frontend — không viết cứng giá ở nơi khác.
 */
export type PackageCode = 'BASIC_5' | 'VIP_MONTHLY' | 'VIP_ENTERPRISE';

export interface ScanPackage {
  code: PackageCode;
  name: string;
  priceVnd: number;
  description: string;
}

export const SCAN_PACKAGES: Record<PackageCode, ScanPackage> = {
  BASIC_5: { code: 'BASIC_5', name: 'Gói Quét Cơ Bản', priceVnd: 29000, description: '+5 lượt quét tài liệu' },
  VIP_MONTHLY: { code: 'VIP_MONTHLY', name: 'VIP Tháng', priceVnd: 99000, description: 'Quét không giới hạn trong 30 ngày' },
  VIP_ENTERPRISE: { code: 'VIP_ENTERPRISE', name: 'VIP Doanh Nghiệp', priceVnd: 149000, description: 'Quét không giới hạn trong 90 ngày' },
};

export const formatPackagePrice = (code: PackageCode) => `${SCAN_PACKAGES[code].priceVnd.toLocaleString('vi-VN')}₫`;
