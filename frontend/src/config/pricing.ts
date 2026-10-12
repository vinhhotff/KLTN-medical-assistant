/**
 * Scan-quota / VIP package catalogue shown on the document scanner.
 *
 * ⚠️ Chỉ dùng khi API lỗi; nguồn đúng là backend (GET /payments/packages, BE-6).
 * Số tiền thật sự thu là `amount` do POST /payments/checkout trả về.
 * Các con số dưới đây khớp PaymentService#createCheckoutSession tại thời điểm viết.
 */
export type PackageCode = 'BASIC_5' | 'VIP_MONTHLY' | 'VIP_ENTERPRISE';

export const PACKAGE_CODES: readonly PackageCode[] = ['BASIC_5', 'VIP_MONTHLY', 'VIP_ENTERPRISE'];

export interface ScanPackage {
  code: PackageCode;
  name: string;
  priceVnd: number;
  description: string;
  /** Scans credited (null for unlimited VIP packages) */
  scans: number | null;
  /** VIP validity in days (null when the package does not expire) */
  durationDays: number | null;
  unlimitedScans: boolean;
}

export const FALLBACK_SCAN_PACKAGES: Record<PackageCode, ScanPackage> = {
  BASIC_5: {
    code: 'BASIC_5', name: 'Gói Quét Cơ Bản', priceVnd: 29000, description: '+5 lượt quét tài liệu',
    scans: 5, durationDays: null, unlimitedScans: false,
  },
  VIP_MONTHLY: {
    code: 'VIP_MONTHLY', name: 'VIP Tháng', priceVnd: 99000, description: 'Quét không giới hạn trong 30 ngày',
    scans: null, durationDays: 30, unlimitedScans: true,
  },
  VIP_ENTERPRISE: {
    code: 'VIP_ENTERPRISE', name: 'VIP Doanh Nghiệp', priceVnd: 149000, description: 'Quét không giới hạn trong 90 ngày',
    scans: null, durationDays: 90, unlimitedScans: true,
  },
};

export const formatPackagePrice = (amountVnd: number) => `${amountVnd.toLocaleString('vi-VN')}₫`;
