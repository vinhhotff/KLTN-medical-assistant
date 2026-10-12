import type { Page, Route } from '@playwright/test';

/**
 * Mock API layer for E2E tests and UX audit screenshots.
 * Response shapes mirror the backend DTOs in backend/src/main/java/com/mediassist/dto
 * wrapped in ApiResponse { success, data, message, error }.
 */

export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atToday = (hh: number, mm = 0, dayOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `${localDate(d)}T${pad(hh)}:${pad(mm)}:00`;
};

export const USERS: Record<Role, { id: string; email: string; fullName: string; role: Role; status: string }> = {
  PATIENT: { id: '11111111-1111-1111-1111-111111111111', email: 'patient@mediassist.local', fullName: 'Lê Thị Hoa', role: 'PATIENT', status: 'ACTIVE' },
  DOCTOR: { id: '22222222-2222-2222-2222-222222222222', email: 'doctor@mediassist.local', fullName: 'BS. Trần Minh Khoa', role: 'DOCTOR', status: 'ACTIVE' },
  ADMIN: { id: '33333333-3333-3333-3333-333333333333', email: 'admin@mediassist.local', fullName: 'Quản Trị Viên', role: 'ADMIN', status: 'ACTIVE' },
};

const ok = (data: unknown, message = 'OK') => ({ success: true, data, message });
const fail = (code: string, message: string) => ({ success: false, data: null, message, error: { code, message } });

export const SPECIALTIES = [
  { id: 'sp-1', name: 'Tim mạch', slug: 'tim-mach', description: 'Bệnh lý tim và mạch máu' },
  { id: 'sp-2', name: 'Tiêu hóa', slug: 'tieu-hoa', description: 'Dạ dày, ruột, gan mật' },
];

export const DOCTORS = [
  {
    id: '44444444-4444-4444-4444-444444444444', profileId: 'dp-1', fullName: 'BS. Nguyễn Văn Tâm', email: 'tam@mediassist.local',
    phone: '0900000001', bio: 'Bác sĩ tim mạch', licenseNumber: 'CCHN-001', consultationFee: 250000, yearsOfExperience: 12,
    isVerified: true, specialties: ['Tim mạch'], academicTitle: 'ThS.BS', hospitalAffiliation: 'BV Tim Tâm Đức',
    department: 'Khoa Tim mạch', licenseIssuedBy: 'Sở Y Tế', rating: 4.6, totalConsultations: 87, reviewCount: 14,
    userStatus: 'ACTIVE', createdAt: atToday(8, 0, -100),
  },
  {
    // Doctor with incomplete profile: fee/rating/consultations missing on purpose
    id: '55555555-5555-5555-5555-555555555555', profileId: 'dp-2', fullName: 'BS. Phạm Thu Hà', email: 'ha@mediassist.local',
    phone: null, bio: null, licenseNumber: 'CCHN-002', consultationFee: null, yearsOfExperience: 0,
    isVerified: true, specialties: ['Tiêu hóa'], academicTitle: null, hospitalAffiliation: null,
    department: null, licenseIssuedBy: null, rating: null, totalConsultations: 0, reviewCount: 0,
    userStatus: 'ACTIVE', createdAt: atToday(8, 0, -10),
  },
];

const baseAppointment = {
  patientEmail: USERS.PATIENT.email, patientPhone: '0912345678', doctorEmail: USERS.DOCTOR.email,
  feeAmount: 250000, paymentStatus: 'UNPAID', consultationNotes: null, cancellationReason: null, queueNumber: null,
  clinicRoom: null, clinicFloor: null, clinicBuilding: null, clinicAddress: null, clinicMapUrl: null,
  qrCodeData: null, sttNumber: null, preVisitInstructions: [], chiefComplaint: null, vitalSignsJson: null,
  icd10Code: null, icd10Name: null, prescriptionJson: null, treatmentPlan: null, followUpDate: null,
  medicalDocumentId: null, medicalDocumentFileName: null, triageSessionId: null, triageSbarSummary: null,
  triageUrgencyLevel: null, checkedInAt: null,
};

export const APPOINTMENTS = [
  {
    ...baseAppointment, id: 'ap-1', appointmentCode: 'APT-0001', patientId: USERS.PATIENT.id, patientName: USERS.PATIENT.fullName,
    doctorId: USERS.DOCTOR.id, doctorName: USERS.DOCTOR.fullName, scheduledStart: atToday(9), scheduledEnd: atToday(9, 30),
    status: 'SCHEDULED', consultationNotes: 'Đau ngực khi gắng sức 3 ngày nay', createdAt: atToday(7, 0, -2),
  },
  {
    ...baseAppointment, id: 'ap-2', appointmentCode: 'APT-0002', patientId: USERS.PATIENT.id, patientName: 'Võ Văn Bình',
    doctorId: USERS.DOCTOR.id, doctorName: USERS.DOCTOR.fullName, scheduledStart: atToday(10), scheduledEnd: atToday(10, 30),
    status: 'CHECKED_IN', checkedInAt: atToday(9, 50), paymentStatus: 'PAID', createdAt: atToday(7, 0, -1),
    triageSessionId: 'tr-1', triageSbarSummary: 'S: Đau thượng vị. B: Tiền sử viêm dạ dày. A: Nghi GERD. R: Khám tiêu hóa.', triageUrgencyLevel: 'ROUTINE',
  },
  {
    ...baseAppointment, id: 'ap-3', appointmentCode: 'APT-0003', patientId: USERS.PATIENT.id, patientName: USERS.PATIENT.fullName,
    doctorId: USERS.DOCTOR.id, doctorName: USERS.DOCTOR.fullName, scheduledStart: atToday(8, 0, -7), scheduledEnd: atToday(8, 30, -7),
    status: 'COMPLETED', paymentStatus: 'PAID', chiefComplaint: 'Hồi hộp, mệt',
    // Partial vitals: only blood pressure measured — everything else must render as "Chưa đo"
    vitalSignsJson: '{"bloodPressure":"135/85"}', icd10Code: 'I10', icd10Name: 'Tăng huyết áp vô căn',
    prescriptionJson: '[{"drugName":"Amlodipin 5mg","activeIngredient":"Amlodipine","dosage":"1 viên sáng","quantity":30,"unit":"viên","days":30}]',
    createdAt: atToday(7, 0, -9),
  },
  {
    ...baseAppointment, id: 'ap-4', appointmentCode: 'APT-0004', patientId: USERS.PATIENT.id, patientName: USERS.PATIENT.fullName,
    doctorId: DOCTORS[0].id, doctorName: DOCTORS[0].fullName, scheduledStart: atToday(14, 0, 3), scheduledEnd: atToday(14, 30, 3),
    status: 'SCHEDULED', feeAmount: null, createdAt: atToday(7, 0, -1),
  },
];

export const PATIENT_PROFILE = {
  id: 'pp-1', userId: USERS.PATIENT.id, patientCode: null, fullName: USERS.PATIENT.fullName, email: USERS.PATIENT.email,
  phone: '0912345678', citizenId: null, healthInsuranceNumber: null, dateOfBirth: '1990-04-12', gender: 'FEMALE',
  bloodGroup: null, address: null, allergies: 'Penicillin', medicalHistory: null, emergencyContactName: null,
  emergencyContactPhone: null, emergencyContactRelationship: null, createdAt: atToday(8, 0, -30), updatedAt: atToday(8, 0, -2),
};

export const TRIAGE_HISTORY = [
  {
    id: 'tr-1', patientName: USERS.PATIENT.fullName, symptomsText: 'Đau thượng vị sau ăn, ợ chua', isEmergency: false,
    urgencyLevel: 'ROUTINE', primarySpecialty: 'Tiêu hóa', sbarSummary: 'S: Đau thượng vị. B: Tiền sử viêm dạ dày.',
    aiAdvice: 'Nên khám chuyên khoa tiêu hóa.', createdAt: atToday(8, 0, -1),
  },
];

const today = new Date();
const slotsFor = (date: string) =>
  [8, 9, 10, 14, 15].map((h, i) => ({
    startTime: `${pad(h)}:00:00`, endTime: `${pad(h)}:30:00`,
    startDateTime: `${date}T${pad(h)}:00:00`, endDateTime: `${date}T${pad(h)}:30:00`,
    isAvailable: i !== 1, available: i !== 1,
  }));

/** Mirrors SystemConfigController#buildStatusPayload */
export const AI_MODE_ONLINE = {
  forcedOfflineSimulation: false, onlineNeuralActive: true,
  activeEngineDescription: 'Mạng Nơ-ron Transformer Trực Tuyến (openai/text-embedding-3-small 1536-d)',
  vectorDimensions: 1536, modelName: 'openai/text-embedding-3-small', statusLabel: 'Neural AI Trực Tuyến (Online Mode)',
};
export const AI_MODE_OFFLINE = {
  forcedOfflineSimulation: true, onlineNeuralActive: false,
  activeEngineDescription: 'Giả Lập Tắt API Key (Unsupervised Character N-gram Hashing 1536-d)',
  vectorDimensions: 1536, modelName: 'unsupervised-feature-hashing', statusLabel: 'Chế Độ Test Offline (Tắt API Key)',
  message: 'Đã giả lập TẮT API Key thành công! Hệ thống chuyển sang Unsupervised Feature Hashing (Không phụ thuộc mạng).',
};

export const DEFAULT_DATA: Record<string, unknown> = {
  'GET /doctors/me/stats': {
    todayAppointmentsCount: 2, todayWaitingCount: 1, todayInProgressCount: 0, todayCompletedCount: 0,
    totalCompletedCount: 1, totalAppointmentsCount: 4, todayRevenue: 0, lifetimeRevenue: 250000,
    doctorRating: 0, totalConsultations: 1, reviewCount: 0,
  },
  'GET /documents/quota': { scanQuota: 0, subscriptionTier: 'FREE', vipValidUntil: null, isVip: false, vip: false, hasQuota: false },
  'GET /admin/stats': {
    totalUsers: 12, totalPatients: 8, totalDoctors: 3, pendingDoctorsCount: 1, suspendedUsersCount: 0, totalAppointments: 4,
    scheduledAppointmentsCount: 2, completedAppointmentsCount: 1, cancelledAppointmentsCount: 1, totalDocumentsAnalyzed: 5,
    redFlagDocumentsCount: 1, totalTriageSessions: 6, emergencyTriageCount: 1, routineTriageCount: 5,
    infrastructureHealth: { postgres: 'UP', redis: 'UP' }, recentActivities: [],
  },
  'GET /admin/ai-usage': {
    totalRequests: 40, totalTokens: 52000, totalCostUsd: 0.42, totalCostVnd: 10689, errorRatePercent: 2.5,
    exchangeRate: 25450, dailyStats: [], serviceStats: [],
  },
  'GET /system/ai-mode': AI_MODE_ONLINE,
  'POST /system/ai-mode/toggle': AI_MODE_OFFLINE,
  'GET /notifications/unread-count': { count: 0 },
};

export interface MockOverride {
  status?: number;
  body?: unknown;
  /** Delay in ms before fulfilling, to observe loading states */
  delay?: number;
  /** Build the `data` payload per request (wrapped in ApiResponse); takes precedence over `body` */
  respond?: (query: URLSearchParams, body: unknown) => unknown;
}

export interface MockOptions {
  role?: Role | null;
  /** Keyed by "METHOD /path" (path without /api/v1 and without query string) */
  overrides?: Record<string, MockOverride>;
  /** Collects every request body sent to the mock for assertions */
  calls?: Array<{ method: string; path: string; body: unknown }>;
}

function resolveDefault(method: string, path: string, role: Role | null, query: URLSearchParams): unknown {
  const key = `${method} ${path}`;
  if (key in DEFAULT_DATA) return DEFAULT_DATA[key];

  if (method === 'GET') {
    if (path === '/auth/me') return role ? { user: USERS[role] } : null;
    if (path === '/specialties') return SPECIALTIES;
    if (path === '/doctors' || path === '/admin/doctors') return DOCTORS;
    if (path === '/admin/doctors/pending') return [];
    if (/^\/doctors\/[^/]+\/slots$/.test(path)) return slotsFor(query.get('date') || localDate(today));
    if (/^\/doctors\/[^/]+\/reviews$/.test(path)) return [];
    if (/^\/doctors\/[^/]+$/.test(path) && path !== '/doctors/me') return { ...DOCTORS[0], id: USERS.DOCTOR.id, fullName: USERS.DOCTOR.fullName };
    if (path === '/appointments/my') {
      return role === 'DOCTOR' ? APPOINTMENTS : APPOINTMENTS.filter((a) => a.patientId === USERS.PATIENT.id);
    }
    if (/^\/appointments\/patient\//.test(path)) return APPOINTMENTS.filter((a) => a.status === 'COMPLETED');
    if (/^\/appointments\/[^/]+\/ticket$/.test(path)) return APPOINTMENTS[0];
    if (/^\/appointments\/[^/]+\/review$/.test(path)) return null;
    if (path === '/patient/profile' || /^\/patient\/profile\/by-user\//.test(path)) return PATIENT_PROFILE;
    if (path === '/triage/history' || /^\/triage\/patient\//.test(path)) return TRIAGE_HISTORY;
    if (path === '/admin/appointments') return APPOINTMENTS;
    if (path === '/admin/users') return Object.values(USERS).map((u) => ({ ...u, phone: null, avatarUrl: null, createdAt: atToday(8, 0, -20) }));
    if (path === '/admin/triage-sessions') return TRIAGE_HISTORY.map((t) => ({ ...t, userId: USERS.PATIENT.id, patientEmail: USERS.PATIENT.email }));
    if (path === '/doctors/me/schedules') return [];
    if (path === '/doctors/me/patients') return [];
    return [];
  }

  if (method === 'POST' && path === '/auth/login') return null; // handled in route (needs body)
  if (method === 'POST' && path === '/auth/forgot-password') return null;
  return {};
}

/** Install the mock API on a page. Must be called before page.goto(). */
export async function installMockApi(page: Page, opts: MockOptions = {}) {
  const role = opts.role ?? null;

  if (role) {
    const user = USERS[role];
    await page.addInitScript(([u]) => {
      window.localStorage.setItem('mediassist_user', JSON.stringify(u));
      window.localStorage.setItem('mediassist_token', 'mock-jwt-token');
    }, [user] as const);
  }

  await page.route('**/api/v1/**', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = req.method();
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    opts.calls?.push({ method, path, body });

    const override = opts.overrides?.[`${method} ${path}`];
    if (override) {
      if (override.delay) await new Promise((r) => setTimeout(r, override.delay));
      const status = override.status ?? 200;
      const payload = override.respond
        ? ok(override.respond(url.searchParams, body))
        : override.body !== undefined
        ? override.body
        : status >= 400 ? fail('MOCK_ERROR', 'Lỗi giả lập từ máy chủ') : ok({});
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    }

    if (method === 'POST' && path === '/auth/login') {
      const email = (body as { email?: string } | null)?.email || '';
      const found = Object.values(USERS).find((u) => u.email === email);
      if (!found) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify(fail('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng')) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok({ user: found, token: 'mock-jwt-token' })) });
    }
    if (method === 'POST' && path === '/auth/forgot-password') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(ok(null, 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được xử lý.')),
      });
    }

    const data = resolveDefault(method, path, role, url.searchParams);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok(data)) });
  });
}
