/** Shapes returned by the admin API (mirrors backend DTOs). */

export interface AdminTriageSession {
  id: string;
  userId?: string;
  patientName?: string;
  patientEmail?: string;
  symptomsText: string;
  emergency?: boolean;
  isEmergency?: boolean;
  urgencyLevel?: 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';
  primarySpecialty?: string;
  createdAt: string;
}

export interface AiDailyStat {
  date: string;
  tokens: number;
  costUsd: number;
}

export interface AiServiceStat {
  service: string;
  tokens: number;
  costUsd: number;
  requests: number;
}

export interface AiUsage {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostVnd: number;
  errorRatePercent: number;
  dailyStats: AiDailyStat[];
  serviceStats: AiServiceStat[];
}

export const AI_SERVICE_LABEL: Record<string, { label: string; code: string }> = {
  TRIAGE: { label: 'Trợ lý triệu chứng', code: 'TRIAGE' },
  DOCUMENT_ANALYSIS: { label: 'Giải nghĩa xét nghiệm', code: 'DOCUMENT_ANALYSIS' },
};

export const RANGE_OPTIONS = [7, 30, 90] as const;

/** Local YYYY-MM-DD for a Date (no UTC shift). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shortDay = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
