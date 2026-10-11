/**
 * Vital signs: validation ranges, payload builder and display helpers.
 * Rule: a field the clinician left empty is NEVER replaced with a "normal" value.
 */

export type VitalKey = 'bpSystolic' | 'bpDiastolic' | 'heartRate' | 'temperature' | 'respiratoryRate' | 'spO2' | 'height' | 'weight';

export type VitalInputs = Record<VitalKey, string>;

export const EMPTY_VITALS: VitalInputs = {
  bpSystolic: '',
  bpDiastolic: '',
  heartRate: '',
  temperature: '',
  respiratoryRate: '',
  spO2: '',
  height: '',
  weight: '',
};

/** Plausible physiological ranges (inclusive) used to catch typos, not to diagnose. */
export const VITAL_RANGES: Record<VitalKey, { min: number; max: number; label: string; unit: string }> = {
  bpSystolic: { min: 50, max: 250, label: 'HA tâm thu', unit: 'mmHg' },
  bpDiastolic: { min: 30, max: 150, label: 'HA tâm trương', unit: 'mmHg' },
  heartRate: { min: 30, max: 220, label: 'Mạch', unit: 'lần/phút' },
  temperature: { min: 34, max: 43, label: 'Nhiệt độ', unit: '°C' },
  respiratoryRate: { min: 5, max: 60, label: 'Nhịp thở', unit: 'lần/phút' },
  spO2: { min: 50, max: 100, label: 'SpO2', unit: '%' },
  height: { min: 40, max: 250, label: 'Chiều cao', unit: 'cm' },
  weight: { min: 2, max: 300, label: 'Cân nặng', unit: 'kg' },
};

/** Parse a user-typed number, accepting a Vietnamese decimal comma. Empty → null. */
export function parseVitalNumber(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export type VitalErrors = Partial<Record<VitalKey, string>>;

export function validateVitals(v: VitalInputs): VitalErrors {
  const errors: VitalErrors = {};
  (Object.keys(VITAL_RANGES) as VitalKey[]).forEach((key) => {
    const n = parseVitalNumber(v[key]);
    if (n === null) return;
    const r = VITAL_RANGES[key];
    if (Number.isNaN(n)) errors[key] = `${r.label} phải là số.`;
    else if (n < r.min || n > r.max) errors[key] = `${r.label} hợp lệ trong khoảng ${r.min}–${r.max} ${r.unit}.`;
  });
  const sys = parseVitalNumber(v.bpSystolic);
  const dia = parseVitalNumber(v.bpDiastolic);
  const hasSys = sys !== null;
  const hasDia = dia !== null;
  if (hasSys !== hasDia) {
    const missing: VitalKey = hasSys ? 'bpDiastolic' : 'bpSystolic';
    errors[missing] = errors[missing] || 'Nhập đủ cả tâm thu và tâm trương, hoặc để trống cả hai.';
  } else if (hasSys && hasDia && !errors.bpSystolic && !errors.bpDiastolic && (sys as number) <= (dia as number)) {
    errors.bpDiastolic = 'Tâm trương phải nhỏ hơn tâm thu.';
  }
  return errors;
}

/** BMI (1 decimal) only when both height (cm) and weight (kg) are present and valid. */
export function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || Number.isNaN(heightCm) || Number.isNaN(weightKg) || heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(1));
}

/**
 * Build the vitalSignsJson object for ClinicalEncounterRequest.
 * Missing fields are omitted; returns null when nothing was measured.
 */
export function buildVitalSignsPayload(v: VitalInputs): Record<string, number | string> | null {
  const out: Record<string, number | string> = {};
  const sys = parseVitalNumber(v.bpSystolic);
  const dia = parseVitalNumber(v.bpDiastolic);
  if (sys !== null && dia !== null && !Number.isNaN(sys) && !Number.isNaN(dia)) out.bloodPressure = `${sys}/${dia}`;

  const put = (key: string, raw: string) => {
    const n = parseVitalNumber(raw);
    if (n !== null && !Number.isNaN(n)) out[key] = n;
  };
  put('heartRate', v.heartRate);
  put('temperature', v.temperature);
  put('respiratoryRate', v.respiratoryRate);
  put('height', v.height);
  put('weight', v.weight);
  put('spO2', v.spO2);

  const bmi = computeBmi(parseVitalNumber(v.height), parseVitalNumber(v.weight));
  if (bmi !== null) out.bmi = bmi;

  return Object.keys(out).length > 0 ? out : null;
}

/** Restore form inputs from a stored vitalSignsJson (missing keys stay empty). */
export function vitalsFromJson(json?: string | null): VitalInputs {
  const result = { ...EMPTY_VITALS };
  if (!json) return result;
  try {
    const vs = JSON.parse(json) as Record<string, unknown>;
    if (typeof vs.bloodPressure === 'string' && vs.bloodPressure.includes('/')) {
      const [s, d] = vs.bloodPressure.split('/');
      if (s && s.trim()) result.bpSystolic = s.trim();
      if (d && d.trim()) result.bpDiastolic = d.trim();
    }
    const take = (k: VitalKey, src: unknown) => {
      if (src !== null && src !== undefined && src !== '') result[k] = String(src);
    };
    take('heartRate', vs.heartRate);
    take('temperature', vs.temperature);
    take('respiratoryRate', vs.respiratoryRate);
    take('height', vs.height);
    take('weight', vs.weight);
    take('spO2', vs.spO2);
  } catch {
    // Malformed JSON → leave every field empty rather than guessing
  }
  return result;
}

export interface StoredVitals {
  bloodPressure?: string;
  heartRate?: number | string;
  temperature?: number | string;
  respiratoryRate?: number | string;
  height?: number | string;
  weight?: number | string;
  bmi?: number | string;
  spO2?: number | string;
}

export function parseStoredVitals(json?: string | null): StoredVitals | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as StoredVitals) : null;
  } catch {
    return null;
  }
}

/** True when a stored vital value is present (0, '', null, undefined and "/" count as not measured). */
export function hasVital(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return s !== '' && s !== '/' && s !== '0';
}
