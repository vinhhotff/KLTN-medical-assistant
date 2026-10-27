import {
  MOCK_USERS,
  MOCK_SPECIALTIES,
  MOCK_DOCTORS,
  MOCK_PATIENT_PROFILE,
  MOCK_APPOINTMENTS,
  type MockAppointment,
  MOCK_TRIAGE_HISTORY,
  MOCK_DOCUMENTS,
  MOCK_ADMIN_STATS,
  MOCK_AI_USAGE,
  localDate,
  atToday,
} from './mockData';

export interface MockResponse {
  status: number;
  body: {
    success: boolean;
    data?: any;
    message?: string;
    error?: {
      code: string;
      message: string;
    };
  };
}

const ok = (data: any = null, message = 'Thành công'): MockResponse => ({
  status: 200,
  body: { success: true, data, message },
});

const fail = (status: number, code: string, message: string): MockResponse => ({
  status,
  body: { success: false, data: null, message, error: { code, message } },
});

// In-memory state mutable during the dev session
let appointments: MockAppointment[] = [...MOCK_APPOINTMENTS];
let patientProfile = { ...MOCK_PATIENT_PROFILE };
let doctors = [...MOCK_DOCTORS];
let triageHistory = [...MOCK_TRIAGE_HISTORY];
let documents = [...MOCK_DOCUMENTS];
let isOfflineAiMode = false;

export async function handleMockRequest(
  method: string,
  rawPath: string,
  query: URLSearchParams,
  body: any,
  headers: Record<string, string | string[] | undefined>
): Promise<MockResponse> {
  const path = rawPath.replace(/^\/api\/v1/, '').split('?')[0];

  // Helper: detect role from authorization token if present
  const authHeader = (headers['authorization'] || headers['Authorization']) as string | undefined;
  let currentRole = 'PATIENT';
  if (authHeader?.includes('doctor')) currentRole = 'DOCTOR';
  if (authHeader?.includes('admin')) currentRole = 'ADMIN';

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION
  // -------------------------------------------------------------------------
  if (method === 'POST' && path === '/auth/login') {
    const email = body?.email?.trim()?.toLowerCase() || '';
    const user = MOCK_USERS[email] || {
      id: '11111111-1111-1111-1111-111111111111',
      email,
      fullName: email.split('@')[0].toUpperCase(),
      role: 'PATIENT',
      status: 'ACTIVE',
      createdAt: atToday(8, 0, -10),
    };
    return ok({
      user,
      token: `mock-jwt-token-${user.role.toLowerCase()}-${Date.now()}`,
    }, 'Đăng nhập thành công');
  }

  if (method === 'GET' && path === '/auth/me') {
    const user = currentRole === 'DOCTOR'
      ? MOCK_USERS['doctor@mediassist.local']
      : currentRole === 'ADMIN'
      ? MOCK_USERS['admin@mediassist.local']
      : MOCK_USERS['patient@mediassist.local'];
    return ok({ user });
  }

  if (method === 'POST' && path === '/auth/logout') {
    return ok(null, 'Đăng xuất thành công');
  }

  if (method === 'POST' && path === '/auth/register') {
    const newUser = {
      id: `usr-${Date.now()}`,
      email: body?.email || 'patient@mediassist.local',
      fullName: body?.fullName || 'Bệnh Nhân Mới',
      role: body?.role || 'PATIENT',
      status: 'ACTIVE',
      createdAt: atToday(8, 0, 0),
    };
    return ok({ user: newUser, token: `mock-jwt-token-patient-${Date.now()}` }, 'Đăng ký tài khoản thành công');
  }

  if (method === 'POST' && path === '/auth/forgot-password') {
    return ok(null, 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được xử lý.');
  }

  if (method === 'POST' && path === '/auth/resend-verification') {
    return ok(null, 'Email xác thực đã được gửi lại vào hòm thư.');
  }

  // -------------------------------------------------------------------------
  // 2. SPECIALTIES & DOCTORS
  // -------------------------------------------------------------------------
  if (method === 'GET' && path === '/specialties') {
    return ok(MOCK_SPECIALTIES);
  }

  if (method === 'GET' && path === '/doctors') {
    return ok(doctors);
  }

  if (method === 'GET' && path === '/doctors/me/stats') {
    const waiting = appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CHECKED_IN').length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    return ok({
      todayAppointmentsCount: waiting + completed,
      todayWaitingCount: waiting,
      todayInProgressCount: 0,
      todayCompletedCount: completed,
      totalCompletedCount: 142,
      totalAppointmentsCount: 156,
      todayRevenue: completed * 450000,
      lifetimeRevenue: 63900000,
      doctorRating: 4.98,
      totalConsultations: 3420,
      reviewCount: 48,
    });
  }

  if (method === 'GET' && path === '/doctors/me/schedules') {
    return ok([
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isAvailable: true },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 5, startTime: '08:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', isAvailable: true },
      { dayOfWeek: 0, startTime: '08:00', endTime: '12:00', isAvailable: false },
    ]);
  }

  if (method === 'PUT' && path === '/doctors/me/schedules') {
    return ok(body, 'Cập nhật lịch trực thành công');
  }

  if (method === 'GET' && path === '/doctors/me/patients') {
    return ok([
      {
        id: 'pat-1',
        patientId: '11111111-1111-1111-1111-111111111111',
        fullName: 'Lê Thị Hoa',
        phone: '0912345678',
        email: 'patient@mediassist.local',
        lastVisit: atToday(8, 0, -7),
        diagnosis: 'Tăng huyết áp vô căn (I10)',
        appointmentCount: 3,
      },
      {
        id: 'pat-2',
        patientId: 'usr-binh',
        fullName: 'Võ Văn Bình',
        phone: '0933445566',
        email: 'binh.vo@mediassist.local',
        lastVisit: atToday(10, 0, -1),
        diagnosis: 'Trào ngược dạ dày thực quản (K21.0)',
        appointmentCount: 1,
      },
    ]);
  }

  if (method === 'POST' && path === '/doctors/me/call-next') {
    const nextApt = appointments.find((a) => a.status === 'SCHEDULED' || a.status === 'CHECKED_IN');
    if (!nextApt) return fail(400, 'NO_WAITING_PATIENTS', 'Hiện không còn bệnh nhân nào đang chờ gọi số.');
    nextApt.status = 'IN_PROGRESS';
    return ok(nextApt, `Đã gọi số tiếp theo: ${nextApt.queueNumber || 'STT 01'} - ${nextApt.patientName}`);
  }

  if (method === 'PUT' && path === '/doctors/me/profile') {
    const doc = doctors[0];
    Object.assign(doc, body);
    return ok(doc, 'Cập nhật hồ sơ bác sĩ thành công');
  }

  // Doctor detail / slots / reviews
  const doctorMatch = path.match(/^\/doctors\/([^/]+)$/);
  if (method === 'GET' && doctorMatch) {
    const id = doctorMatch[1];
    const doc = doctors.find((d) => d.id === id || d.profileId === id) || doctors[0];
    return ok(doc);
  }

  const doctorSlotsMatch = path.match(/^\/doctors\/([^/]+)\/slots$/);
  if (method === 'GET' && doctorSlotsMatch) {
    const date = query.get('date') || localDate(new Date());
    const slots = [8, 9, 10, 11, 14, 15, 16].map((h, i) => ({
      startTime: `${String(h).padStart(2, '0')}:00:00`,
      endTime: `${String(h).padStart(2, '0')}:30:00`,
      startDateTime: `${date}T${String(h).padStart(2, '0')}:00:00`,
      endDateTime: `${date}T${String(h).padStart(2, '0')}:30:00`,
      isAvailable: i !== 1 && i !== 4,
      available: i !== 1 && i !== 4,
    }));
    return ok(slots);
  }

  const doctorReviewsMatch = path.match(/^\/doctors\/([^/]+)\/reviews$/);
  if (method === 'GET' && doctorReviewsMatch) {
    return ok([
      {
        id: 'rev-1',
        patientName: 'Lê Thị Hoa',
        rating: 5,
        comment: 'Bác sĩ An tư vấn rất tận tâm, giải thích phác đồ kiểm soát huyết áp chi tiết dễ hiểu.',
        createdAt: atToday(9, 0, -6),
      },
      {
        id: 'rev-2',
        patientName: 'Nguyễn Hoàng Nam',
        rating: 5,
        comment: 'Kê đơn hiệu quả, tôi đỡ tức ngực hẳn sau 3 ngày điều trị.',
        createdAt: atToday(14, 0, -12),
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // 3. APPOINTMENTS
  // -------------------------------------------------------------------------
  if (method === 'GET' && path === '/appointments/my') {
    return ok(appointments);
  }

  if (method === 'POST' && path === '/appointments') {
    const doctor = doctors.find((d) => d.id === body?.doctorId) || doctors[0];
    const newApt = {
      id: `ap-${Date.now()}`,
      appointmentCode: `APT-${String(appointments.length + 1).padStart(4, '0')}`,
      patientId: '11111111-1111-1111-1111-111111111111',
      patientName: 'Lê Thị Hoa',
      patientEmail: 'patient@mediassist.local',
      patientPhone: '0912345678',
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorEmail: doctor.email,
      scheduledStart: body?.scheduledStart || atToday(9, 0, 1),
      scheduledEnd: body?.scheduledEnd || atToday(9, 30, 1),
      status: 'SCHEDULED',
      paymentStatus: 'UNPAID',
      feeAmount: doctor.consultationFee || 350000,
      consultationNotes: body?.consultationNotes || '',
      queueNumber: `STT 0${(appointments.length % 9) + 1}`,
      clinicRoom: 'Phòng 204 - Khu Khám Chuyên Khoa',
      clinicFloor: 'Tầng 2',
      clinicBuilding: 'Khu A',
      clinicAddress: doctor.hospitalAffiliation || 'Bệnh viện Đại Học Y Dược TP.HCM',
      qrCodeData: `MEDIPASS:APT-NEW:${doctor.id}:${Date.now()}`,
      chiefComplaint: body?.chiefComplaint || 'Khám theo dõi định kỳ',
      vitalSignsJson: null,
      icd10Code: null,
      icd10Name: null,
      prescriptionJson: null,
      treatmentPlan: null,
      followUpDate: null,
      medicalDocumentId: null,
      triageSessionId: null,
      checkedInAt: null,
      createdAt: atToday(8, 0, 0),
    };
    appointments.unshift(newApt);
    return ok(newApt, 'Đặt lịch khám thành công');
  }

  const aptTicketMatch = path.match(/^\/appointments\/([^/]+)\/ticket$/);
  if (method === 'GET' && aptTicketMatch) {
    const id = aptTicketMatch[1];
    const apt = appointments.find((a) => a.id === id) || appointments[0];
    return ok(apt);
  }

  const aptStatusMatch = path.match(/^\/appointments\/([^/]+)\/status$/);
  if (method === 'PATCH' && aptStatusMatch) {
    const id = aptStatusMatch[1];
    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      if (body?.status) apt.status = body.status;
      if (body?.cancellationReason) apt.cancellationReason = body.cancellationReason;
    }
    return ok(apt, 'Cập nhật trạng thái cuộc hẹn thành công');
  }

  const aptCheckinMatch = path.match(/^\/appointments\/([^/]+)\/check-in$/);
  if (method === 'PATCH' && aptCheckinMatch) {
    const id = aptCheckinMatch[1];
    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      apt.status = 'CHECKED_IN';
      apt.checkedInAt = atToday(8, 30, 0);
    }
    return ok(apt, 'Check-in thành công tại quầy tiếp đón');
  }

  const aptRescheduleMatch = path.match(/^\/appointments\/([^/]+)\/reschedule$/);
  if (method === 'PATCH' && aptRescheduleMatch) {
    const id = aptRescheduleMatch[1];
    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      if (body?.scheduledStart) apt.scheduledStart = body.scheduledStart;
      if (body?.scheduledEnd) apt.scheduledEnd = body.scheduledEnd;
    }
    return ok(apt, 'Dời lịch khám thành công');
  }

  const aptCompleteMatch = path.match(/^\/appointments\/([^/]+)\/complete-clinical$/);
  if (method === 'POST' && aptCompleteMatch) {
    const id = aptCompleteMatch[1];
    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      apt.status = 'COMPLETED';
      if (body?.icd10Code) apt.icd10Code = body.icd10Code;
      if (body?.icd10Name) apt.icd10Name = body.icd10Name;
      if (body?.prescriptionJson) apt.prescriptionJson = body.prescriptionJson;
      if (body?.treatmentPlan) apt.treatmentPlan = body.treatmentPlan;
      if (body?.vitalSignsJson) apt.vitalSignsJson = body.vitalSignsJson;
    }
    return ok(apt, 'Ký duyệt bệnh án và hoàn tất ca khám thành công');
  }

  const aptReviewMatch = path.match(/^\/appointments\/([^/]+)\/review$/);
  if (method === 'POST' && aptReviewMatch) {
    return ok(body, 'Gửi đánh giá bác sĩ thành công');
  }

  const aptPatientMatch = path.match(/^\/appointments\/patient\/([^/]+)$/);
  if (method === 'GET' && aptPatientMatch) {
    return ok(appointments.filter((a) => a.status === 'COMPLETED'));
  }

  // -------------------------------------------------------------------------
  // 4. PATIENT PROFILE
  // -------------------------------------------------------------------------
  if (method === 'GET' && (path === '/patient/profile' || path.startsWith('/patient/profile/by-user/'))) {
    return ok(patientProfile);
  }

  if (method === 'PUT' && path === '/patient/profile') {
    Object.assign(patientProfile, body);
    return ok(patientProfile, 'Cập nhật hồ sơ bệnh nhân thành công');
  }

  // -------------------------------------------------------------------------
  // 5. TRIAGE (AI PHÂN LUỒNG TRIỆU CHỨNG)
  // -------------------------------------------------------------------------
  if (method === 'GET' && (path === '/triage/history' || path.startsWith('/triage/patient/'))) {
    return ok(triageHistory);
  }

  if (method === 'POST' && path === '/triage/assess') {
    const text = body?.symptomsText || '';
    const isChestPain = text.toLowerCase().includes('đau ngực') || text.toLowerCase().includes('khó thở');

    const newSession = {
      id: `tr-${Date.now()}`,
      userId: '11111111-1111-1111-1111-111111111111',
      patientName: 'Lê Thị Hoa',
      patientEmail: 'patient@mediassist.local',
      symptomsText: text,
      isEmergency: isChestPain,
      urgencyLevel: isChestPain ? 'URGENT' : 'ROUTINE',
      primarySpecialty: isChestPain ? 'Tim mạch (Cardiology)' : 'Tiêu hóa - Gan mật',
      sbarSummary: `S: ${text.slice(0, 80)}. B: Bệnh nhân có tiền sử theo dõi ngoại trú. A: ${isChestPain ? 'Nghi ngờ thiếu máu cơ tim hoặc bệnh mạch vành' : 'Rối loạn tiêu hóa chức năng'}. R: Đề nghị khám chuyên khoa.`,
      aiAdvice: isChestPain
        ? '⚠️ Bạn đang có dấu hiệu đau ngực/khó thở. Cần nghỉ ngơi tại chỗ và đặt khám sớm nhất với Bác sĩ chuyên khoa Tim mạch. Nếu xuất hiện cơn đau thắt lan ra cánh tay trái, vui lòng bấm GỌI 115 ngay.'
        : 'Triệu chứng của bạn phù hợp với chuyên khoa Tiêu hóa. Khuyến cáo ăn nhẹ, tránh chất kích thích và đặt lịch hẹn khám chuyên khoa.',
      recommendedDoctors: doctors.slice(0, 3),
      createdAt: atToday(8, 0, 0),
    };
    triageHistory.unshift(newSession);
    return ok(newSession, 'Phân tích triệu chứng thành công');
  }

  if (method === 'GET' && path === '/triage/search/semantic') {
    return ok(doctors.slice(0, 4).map((d, i) => ({
      ...d,
      similarityScore: +(0.95 - i * 0.05).toFixed(2),
    })));
  }

  // -------------------------------------------------------------------------
  // 6. OCR & VISION MEDICAL DOCUMENTS
  // -------------------------------------------------------------------------
  if (method === 'GET' && path === '/documents/quota') {
    return ok({
      scanQuota: 8,
      subscriptionTier: 'VIP',
      vipValidUntil: '2026-12-31T23:59:59',
      isVip: true,
      vip: true,
      hasQuota: true,
    });
  }

  if (method === 'GET' && (path === '/documents/my' || path.startsWith('/documents/patient/'))) {
    return ok(documents);
  }

  if (method === 'POST' && path === '/documents/analyze-preview') {
    const doc = documents[0];
    return ok({
      id: doc.id,
      fileName: doc.fileName,
      extractedData: doc.analysis,
      confidenceScore: 0.98,
      processingTimeMs: 820,
    }, 'Bóc tách và phân tích hồ sơ cận lâm sàng thành công');
  }

  const docAnalysisMatch = path.match(/^\/documents\/([^/]+)\/analysis$/);
  if (method === 'GET' && docAnalysisMatch) {
    const doc = documents.find((d) => d.id === docAnalysisMatch[1]) || documents[0];
    return ok(doc.analysis);
  }

  if (method === 'GET' && path === '/documents/sample-random-pdf') {
    return ok({
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Phieu_Xet_Nghiem_Sinh_Hoa_Mau_Demo.pdf',
    });
  }

  // -------------------------------------------------------------------------
  // 7. ADMIN OPERATIONS & FINOPS
  // -------------------------------------------------------------------------
  if (method === 'GET' && path === '/admin/stats') {
    return ok(MOCK_ADMIN_STATS);
  }

  if (method === 'GET' && path === '/admin/ai-usage') {
    return ok(MOCK_AI_USAGE);
  }

  if (method === 'GET' && path === '/admin/doctors') {
    return ok(doctors);
  }

  if (method === 'GET' && path === '/admin/doctors/pending') {
    return ok([
      {
        id: 'doc-pending-1',
        profileId: 'dp-pending-1',
        fullName: 'BS. Lê Thị Kim Oanh',
        email: 'dr.oanh@hospital.vn',
        phone: '0908887766',
        specialties: ['Nhi khoa (Pediatrics)'],
        licenseNumber: '028911/BYT-CCHN',
        hospitalAffiliation: 'Bệnh viện Nhi Đồng 2 TP.HCM',
        academicTitle: 'ThS.BS',
        licenseIssuedBy: 'Bộ Y Tế',
        isVerified: false,
        userStatus: 'PENDING',
        createdAt: atToday(14, 0, -2),
      },
    ]);
  }

  const doctorVetMatch = path.match(/^\/admin\/doctors\/([^/]+)\/vet$/);
  if (method === 'POST' && doctorVetMatch) {
    return ok(null, 'Đã phê duyệt chứng chỉ hành nghề bác sĩ thành công');
  }

  if (method === 'POST' && path === '/admin/doctors/sync-vectors') {
    return ok({ syncedCount: doctors.length }, 'Đã đồng bộ toàn bộ HNSW vector embeddings cho mạng lưới bác sĩ');
  }

  if (method === 'GET' && path === '/admin/appointments') {
    return ok(appointments);
  }

  if (method === 'GET' && path === '/admin/users') {
    return ok(Object.values(MOCK_USERS));
  }

  const userStatusMatch = path.match(/^\/admin\/users\/([^/]+)\/status$/);
  if (method === 'PATCH' && userStatusMatch) {
    return ok(null, 'Cập nhật trạng thái người dùng thành công');
  }

  if (method === 'GET' && path === '/admin/triage-sessions') {
    return ok(triageHistory);
  }

  if (method === 'GET' && path === '/admin/audit-logs') {
    return ok([
      {
        id: 'aud-1',
        action: 'USER_LOGIN',
        actorEmail: 'doctor@mediassist.local',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        status: 'SUCCESS',
        timestamp: atToday(8, 30, 0),
      },
      {
        id: 'aud-2',
        action: 'PRESCRIPTION_SIGNED',
        actorEmail: 'doctor@mediassist.local',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        status: 'SUCCESS',
        timestamp: atToday(8, 15, -7),
      },
      {
        id: 'aud-3',
        action: 'AI_TRIAGE_EVALUATION',
        actorEmail: 'patient@mediassist.local',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        status: 'SUCCESS',
        timestamp: atToday(8, 0, -1),
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // 8. SYSTEM CONFIG & PAYMENTS
  // -------------------------------------------------------------------------
  if (method === 'GET' && path === '/system/ai-mode') {
    return ok({
      forcedOfflineSimulation: isOfflineAiMode,
      onlineNeuralActive: !isOfflineAiMode,
      activeEngineDescription: isOfflineAiMode
        ? 'Giả Lập Tắt API Key (Unsupervised Character N-gram Hashing 1536-d)'
        : 'Mạng Nơ-ron Transformer Trực Tuyến (openai/text-embedding-3-small 1536-d)',
      vectorDimensions: 1536,
      modelName: isOfflineAiMode ? 'unsupervised-feature-hashing' : 'openai/text-embedding-3-small',
      statusLabel: isOfflineAiMode ? 'Chế Độ Test Offline (Tắt API Key)' : 'Neural AI Trực Tuyến (Online Mode)',
    });
  }

  if (method === 'POST' && path === '/system/ai-mode/toggle') {
    isOfflineAiMode = !isOfflineAiMode;
    return ok({
      forcedOfflineSimulation: isOfflineAiMode,
      onlineNeuralActive: !isOfflineAiMode,
      statusLabel: isOfflineAiMode ? 'Chế Độ Test Offline (Tắt API Key)' : 'Neural AI Trực Tuyến (Online Mode)',
    }, `Đã chuyển đổi trạng thái AI sang: ${isOfflineAiMode ? 'Offline' : 'Online'}`);
  }

  if (method === 'GET' && path === '/payments/packages') {
    return ok([
      { code: 'BASIC_5', name: 'Gói Quét Cơ Bản (+5 Lượt)', description: 'Bổ sung 5 lượt phân tích hồ sơ cận lâm sàng chất lượng cao', priceVnd: 29000.0, scans: 5, durationDays: 30, unlimitedScans: false },
      { code: 'VIP_MONTHLY', name: 'Hội Viên MediPass VIP (30 Ngày)', description: 'Không giới hạn số lượt quét tài liệu và ưu tiên ghép nối bác sĩ chuyên khoa', priceVnd: 149000.0, scans: null, durationDays: 30, unlimitedScans: true },
      { code: 'VIP_ENTERPRISE', name: 'Hội Viên MediPass Doanh Nghiệp (90 Ngày)', description: 'Gói toàn diện dành cho gia đình và doanh nghiệp với 90 ngày không giới hạn', priceVnd: 399000.0, scans: null, durationDays: 90, unlimitedScans: true },
    ]);
  }

  if (method === 'POST' && path === '/payments/checkout') {
    return ok({
      paymentUrl: 'https://sandbox.vnpay.vn/paymentv2/vpcpay.html?mock=true',
      orderCode: `ORDER-${Date.now()}`,
      amount: 149000,
    }, 'Khởi tạo cổng thanh toán VNPay thành công');
  }

  if (method === 'POST' && path === '/payments/verify') {
    return ok({ status: 'PAID' }, 'Giao dịch thanh toán đã được xác nhận');
  }

  if (method === 'GET' && path === '/notifications/unread-count') {
    return ok({ count: 2 });
  }

  if (method === 'GET' && path === '/notifications/my') {
    return ok([
      {
        id: 'notif-1',
        title: 'Lịch hẹn đã được xác nhận',
        content: 'Cuộc hẹn APT-0001 với TS.BS Nguyễn Văn An đã sẵn sàng đón tiếp.',
        isRead: false,
        createdAt: atToday(8, 0, 0),
      },
      {
        id: 'notif-2',
        title: 'Hoàn tất phân tích cận lâm sàng',
        content: 'Hồ sơ xét nghiệm lipid máu của bạn đã được đối soát chỉ số.',
        isRead: false,
        createdAt: atToday(8, 30, -5),
      },
    ]);
  }

  if (method === 'PATCH' && path === '/notifications/read-all') {
    return ok(null, 'Đã đánh dấu đọc tất cả thông báo');
  }

  if (method === 'GET' && path === '/clinical/ontology/icd10') {
    return ok([
      { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
      { code: 'I20.9', name: 'Cơn đau thắt ngực, không xác định' },
      { code: 'K21.0', name: 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản' },
      { code: 'K29.7', name: 'Viêm dạ dày, không xác định' },
      { code: 'E11', name: 'Bệnh đái tháo đường không phụ thuộc insulin' },
      { code: 'J45', name: 'Hen suyễn (Hen phế quản)' },
      { code: 'J44', name: 'Bệnh phổi tắc nghẽn mạn tính khác (COPD)' },
      { code: 'M17', name: 'Thoái hóa khớp gối' },
      { code: 'L20', name: 'Viêm da cơ địa' },
    ]);
  }

  // Fallback for any other API
  return ok({}, 'Mock API default response');
}
