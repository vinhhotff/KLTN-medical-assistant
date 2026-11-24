/** Shapes returned by the patient-facing API (mirrors backend DTOs). */

export interface PatientProfileData {
  id: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string;
  citizenId: string;
  healthInsuranceNumber: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  allergies: string;
  medicalHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  updatedAt?: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AppointmentItem {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  feeAmount: number | null;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  consultationNotes?: string;
  cancellationReason?: string;
  queueNumber?: string;
  clinicRoom?: string;
  chiefComplaint?: string;
  treatmentPlan?: string;
  followUpDate?: string;
  triageSessionId?: string;
  triageSbarSummary?: string;
  triageUrgencyLevel?: string;
  medicalDocumentId?: string;
  medicalDocumentFileName?: string;
  clinicFloor?: string;
  clinicBuilding?: string;
  clinicAddress?: string;
  clinicMapUrl?: string;
  qrCodeData?: string;
  sttNumber?: string;
  preVisitInstructions?: string[];
  checkedInAt?: string;
  createdAt?: string;
  refundAmount?: number | null;
  refundPercentage?: number | null;
  refundedAt?: string | null;
  refundPolicyNote?: string | null;
}

export interface RefundPreview {
  eligible: boolean;
  percentage: number;
  refundAmount: number;
  tierLabel: string;
  hoursRemainingLabel: string;
}

export const computeRefundPreview = (
  scheduledStart?: string,
  feeAmount?: number | null,
  paymentStatus?: string
): RefundPreview | null => {
  if (paymentStatus !== 'PAID' || !scheduledStart) return null;
  const diffMs = new Date(scheduledStart).getTime() - Date.now();
  const hours = diffMs / 3600000;
  const percentage = hours >= 24 ? 100 : hours >= 2 ? 80 : 0;
  const refundAmount = Math.round(((feeAmount ?? 0) * percentage) / 100);
  const tierLabel =
    percentage === 100
      ? 'Hủy trước giờ khám trên 24 giờ — Hoàn tiền 100%'
      : percentage === 80
        ? 'Hủy trước giờ khám 2–24 giờ — Hoàn tiền 80% (khấu trừ 20% phí hành chính)'
        : 'Hủy sát giờ khám dưới 2 giờ — Không hoàn tiền (0%)';
  const hoursRemainingLabel =
    hours >= 24
      ? `Còn khoảng ${Math.floor(hours / 24)} ngày ${Math.floor(hours % 24)} giờ trước giờ khám`
      : hours >= 1
        ? `Còn khoảng ${Math.floor(hours)} giờ ${Math.max(0, Math.round((hours % 1) * 60))} phút trước giờ khám`
        : hours > 0
          ? `Còn ${Math.max(1, Math.round(hours * 60))} phút trước giờ khám`
          : 'Đã tới hoặc quá giờ hẹn khám';
  return { eligible: percentage > 0, percentage, refundAmount, tierLabel, hoursRemainingLabel };
};

export type UrgencyLevel = 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';

export interface TriageHistoryItem {
  id: string;
  patientName?: string;
  symptomsText: string;
  emergency?: boolean;
  isEmergency?: boolean;
  urgencyLevel: UrgencyLevel;
  primarySpecialty?: string;
  sbarSummary?: string;
  aiAdvice?: string;
  createdAt: string;
}

export interface PatientDocumentItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  status: string;
  hasFile?: boolean;
  validMedical?: boolean;
  isValidMedical?: boolean;
  createdAt: string;
}

/** Patient-facing urgency wording (Stitch: "Theo dõi tại nhà / Khám trong 1–3 ngày / Cấp cứu ngay"). */
export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  SELF_CARE: 'Theo dõi tại nhà',
  ROUTINE: 'Theo dõi tại nhà',
  URGENT: 'Khám trong 1–3 ngày',
  EMERGENCY: 'Cấp cứu ngay',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, { text: string; className: string }> = {
  SCHEDULED: { text: 'Sắp tới', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CHECKED_IN: { text: 'Đã check-in', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  IN_PROGRESS: { text: 'Đang khám', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  COMPLETED: { text: 'Đã khám xong', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_SHOW: { text: 'Vắng mặt', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const initialsOf = (name?: string | null): string => {
  const cleaned = (name || '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim();
  const parts = cleaned
    .split(/\s+/)
    .map((p) => p.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
  if (parts.length === 0) return 'BN';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
