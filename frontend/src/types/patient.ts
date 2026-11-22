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
}

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
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BN';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
