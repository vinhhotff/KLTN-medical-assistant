export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const atToday = (hh: number, mm = 0, dayOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `${localDate(d)}T${pad(hh)}:${pad(mm)}:00`;
};

export const MOCK_USERS: Record<string, MockUser> = {
  'patient@mediassist.local': {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'patient@mediassist.local',
    fullName: 'Lê Thị Hoa',
    role: 'PATIENT',
    status: 'ACTIVE',
    phone: '0912345678',
    avatarUrl: null,
    createdAt: atToday(8, 0, -30),
  },
  'doctor@mediassist.local': {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'doctor@mediassist.local',
    fullName: 'TS.BS Nguyễn Văn An',
    role: 'DOCTOR',
    status: 'ACTIVE',
    phone: '0901234567',
    avatarUrl: null,
    createdAt: atToday(8, 0, -100),
  },
  'dr.tuan@mediassist.local': {
    id: '33333333-3333-3333-3333-333333333334',
    email: 'dr.tuan@mediassist.local',
    fullName: 'BS.CKII Phạm Quốc Tuấn',
    role: 'DOCTOR',
    status: 'ACTIVE',
    phone: '0912345680',
    avatarUrl: null,
    createdAt: atToday(8, 0, -120),
  },
  'dr.huong@mediassist.local': {
    id: '33333333-3333-3333-3333-333333333335',
    email: 'dr.huong@mediassist.local',
    fullName: 'ThS.BS Mai Hương',
    role: 'DOCTOR',
    status: 'ACTIVE',
    phone: '0912345679',
    avatarUrl: null,
    createdAt: atToday(8, 0, -90),
  },
  'admin@mediassist.local': {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@mediassist.local',
    fullName: 'Quản Trị Viên Hệ Thống',
    role: 'ADMIN',
    status: 'ACTIVE',
    phone: '0909998888',
    avatarUrl: null,
    createdAt: atToday(8, 0, -365),
  },
};

export const MOCK_SPECIALTIES = [
  { id: 'sp-1', name: 'Tim mạch (Cardiology)', slug: 'tim-mach', description: 'Bệnh lý tim và mạch máu can thiệp' },
  { id: 'sp-2', name: 'Tiêu hóa - Gan mật (Gastroenterology)', slug: 'tieu-hoa', description: 'Dạ dày, ruột, nội soi can thiệp tiêu hóa' },
  { id: 'sp-3', name: 'Hô hấp & Phổi (Pulmonology)', slug: 'ho-hap', description: 'COPD, hen suyễn, bệnh đường thở mạn tính' },
  { id: 'sp-4', name: 'Thần kinh (Neurology)', slug: 'than-kinh', description: 'Tiền đình, tai biến, động kinh, đau đầu mạn' },
  { id: 'sp-5', name: 'Nhi khoa (Pediatrics)', slug: 'nhi-khoa', description: 'Chăm sóc và điều trị chuyên sâu sơ sinh & trẻ nhỏ' },
  { id: 'sp-6', name: 'Da liễu (Dermatology)', slug: 'da-lieu', description: 'Viêm da cơ địa, laser thẩm mỹ, bệnh tự miễn da' },
  { id: 'sp-7', name: 'Cơ Xương Khớp (Orthopedics)', slug: 'co-xuong-khop', description: 'Phẫu thuật khớp, thoái hóa cột sống, thể thao' },
  { id: 'sp-8', name: 'Nội tổng quát (Internal Medicine)', slug: 'noi-tong-quat', description: 'Khám tầm soát toàn diện và bệnh lý nền mạn tính' },
  { id: 'sp-9', name: 'Thận & Tiết niệu (Nephrology)', slug: 'than-tiet-nieu', description: 'Tán sỏi, suy thận mạn và ghép thận' },
  { id: 'sp-10', name: 'Sản Phụ Khoa (Obstetrics)', slug: 'san-phu-khoa', description: 'Quản lý thai kỳ nguy cơ cao, phụ khoa chuyên sâu' },
  { id: 'sp-11', name: 'Nội tiết (Endocrinology)', slug: 'noi-tiet', description: 'Đái tháo đường, suy giáp, rối loạn chuyển hóa' },
  { id: 'sp-12', name: 'Tai Mũi Họng (ENT)', slug: 'tai-mui-hong', description: 'Nội soi xoang, amidan Coblator, viêm tai giữa' },
];

export const MOCK_DOCTORS = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    profileId: 'dp-1',
    fullName: 'TS.BS Nguyễn Văn An',
    email: 'doctor@mediassist.local',
    phone: '0901234567',
    bio: 'Hơn 22 năm kinh nghiệm trong lĩnh vực can thiệp mạch vành, điều trị suy tim và rối loạn nhịp tim tại Bệnh viện Đại Học Y Dược TP.HCM.',
    licenseNumber: '008921/BYT-CCHN',
    consultationFee: 450000,
    yearsOfExperience: 22,
    isVerified: true,
    specialties: ['Tim mạch (Cardiology)'],
    academicTitle: 'TS.BS',
    hospitalAffiliation: 'Bệnh viện Đại Học Y Dược TP.HCM',
    department: 'Khoa Can Thiệp Tim Mạch & Hồi Sức',
    licenseIssuedBy: 'Bộ Y Tế',
    rating: 4.98,
    totalConsultations: 3420,
    reviewCount: 48,
    userStatus: 'ACTIVE',
    createdAt: atToday(8, 0, -100),
  },
  {
    id: '33333333-3333-3333-3333-333333333334',
    profileId: 'dp-2',
    fullName: 'BS.CKII Phạm Quốc Tuấn',
    email: 'dr.tuan@mediassist.local',
    phone: '0912345680',
    bio: 'Chuyên sâu nội soi can thiệp tiêu hóa, tầm soát ung thư sớm đường tiêu hóa và điều trị viêm loét dạ dày tá tràng tại BV Chợ Rẫy.',
    licenseNumber: '011284/BYT-CCHN',
    consultationFee: 350000,
    yearsOfExperience: 16,
    isVerified: true,
    specialties: ['Tiêu hóa - Gan mật (Gastroenterology)'],
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Chợ Rẫy TP.HCM',
    department: 'Khoa Nội Tiêu Hóa',
    licenseIssuedBy: 'Sở Y Tế TP.HCM',
    rating: 4.92,
    totalConsultations: 2150,
    reviewCount: 28,
    userStatus: 'ACTIVE',
    createdAt: atToday(8, 0, -120),
  },
  {
    id: '33333333-3333-3333-3333-333333333335',
    profileId: 'dp-3',
    fullName: 'ThS.BS Mai Hương',
    email: 'dr.huong@mediassist.local',
    phone: '0912345679',
    bio: 'Chuyên gia bệnh phổi tắc nghẽn mạn tính (COPD), hen phế quản khó trị và nhiễm trùng đường hô hấp tại Bệnh viện Bạch Mai.',
    licenseNumber: '004312/BYT-CCHN',
    consultationFee: 400000,
    yearsOfExperience: 18,
    isVerified: true,
    specialties: ['Hô hấp & Phổi (Pulmonology)'],
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Bạch Mai Hà Nội',
    department: 'Trung Tâm Hô Hấp Quốc Gia',
    licenseIssuedBy: 'Bộ Y Tế',
    rating: 4.95,
    totalConsultations: 2810,
    reviewCount: 48,
    userStatus: 'ACTIVE',
    createdAt: atToday(8, 0, -90),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    profileId: 'dp-4',
    fullName: 'TS.BS Đỗ Bích Thảo',
    email: 'dr.thao@mediassist.local',
    phone: '0912345681',
    bio: 'Hơn 14 năm kinh nghiệm laser thẩm mỹ da, điều trị mụn trứng cá nặng, viêm da cơ địa và bệnh tự miễn ngoài da.',
    licenseNumber: '009472/BYT-CCHN',
    consultationFee: 350000,
    yearsOfExperience: 14,
    isVerified: true,
    specialties: ['Da liễu (Dermatology)'],
    academicTitle: 'TS.BS',
    hospitalAffiliation: 'Bệnh viện Da Liễu Trung Ương',
    department: 'Khoa Laser & Tạo Hình Da',
    licenseIssuedBy: 'Bộ Y Tế',
    rating: 4.94,
    totalConsultations: 1980,
    reviewCount: 28,
    userStatus: 'ACTIVE',
    createdAt: atToday(8, 0, -80),
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    profileId: 'dp-5',
    fullName: 'ThS.BS Vũ Đức Toàn',
    email: 'dr.toan@mediassist.local',
    phone: '0912345682',
    bio: 'Phẫu thuật nội soi khớp gối, khớp vai, điều trị thoái hóa cột sống thắt lưng và chấn thương thể thao tại BV Việt Đức.',
    licenseNumber: '013891/BYT-CCHN',
    consultationFee: 300000,
    yearsOfExperience: 12,
    isVerified: true,
    specialties: ['Cơ Xương Khớp (Orthopedics)'],
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Hữu Nghị Việt Đức',
    department: 'Khoa Phẫu Thuật Khớp',
    licenseIssuedBy: 'Bộ Y Tế',
    rating: 4.89,
    totalConsultations: 1640,
    reviewCount: 19,
    userStatus: 'ACTIVE',
    createdAt: atToday(8, 0, -60),
  },
];

export const MOCK_PATIENT_PROFILE = {
  id: 'pp-1',
  userId: '11111111-1111-1111-1111-111111111111',
  patientCode: 'BN-2026-0891',
  fullName: 'Lê Thị Hoa',
  email: 'patient@mediassist.local',
  phone: '0912345678',
  citizenId: '079190001234',
  healthInsuranceNumber: 'DN4791234567890',
  dateOfBirth: '1990-04-12',
  gender: 'FEMALE',
  bloodGroup: 'O+',
  address: '215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh',
  allergies: 'Penicillin, Sulfamid',
  medicalHistory: 'Tăng huyết áp vô căn (2023), Viêm dạ dày HP(+) đã tiệt trừ',
  emergencyContactName: 'Trần Văn Nam (Chồng)',
  emergencyContactPhone: '0988776655',
  emergencyContactRelationship: 'SPOUSE',
  createdAt: atToday(8, 0, -30),
  updatedAt: atToday(8, 0, -2),
};

export interface MockAppointment {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  paymentStatus: string;
  feeAmount: number | null;
  consultationNotes?: string | null;
  queueNumber?: string | null;
  clinicRoom?: string | null;
  clinicFloor?: string | null;
  clinicBuilding?: string | null;
  clinicAddress?: string | null;
  qrCodeData?: string | null;
  chiefComplaint?: string | null;
  vitalSignsJson?: string | null;
  icd10Code?: string | null;
  icd10Name?: string | null;
  prescriptionJson?: string | null;
  treatmentPlan?: string | null;
  followUpDate?: string | null;
  medicalDocumentId?: string | null;
  triageSessionId?: string | null;
  checkedInAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'ap-1',
    appointmentCode: 'APT-0001',
    patientId: '11111111-1111-1111-1111-111111111111',
    patientName: 'Lê Thị Hoa',
    patientEmail: 'patient@mediassist.local',
    patientPhone: '0912345678',
    doctorId: '22222222-2222-2222-2222-222222222222',
    doctorName: 'TS.BS Nguyễn Văn An',
    doctorEmail: 'doctor@mediassist.local',
    scheduledStart: atToday(9, 0, 0),
    scheduledEnd: atToday(9, 30, 0),
    status: 'SCHEDULED',
    paymentStatus: 'UNPAID',
    feeAmount: 450000,
    consultationNotes: 'Bệnh nhân tái khám tăng huyết áp, thỉnh thoảng tức ngực khi leo cầu thang',
    queueNumber: 'STT 01',
    clinicRoom: 'Phòng 204 - Khu Khám Tim Mạch Yêu Cầu',
    clinicFloor: 'Tầng 2',
    clinicBuilding: 'Tòa nhà A - BV Đại Học Y Dược TP.HCM',
    clinicAddress: '215 Hồng Bàng, Quận 5, TP.HCM',
    qrCodeData: 'MEDIPASS:APT-0001:TSBS-AN:20261027',
    chiefComplaint: 'Đau tức ngực trái khi gắng sức 3 ngày nay',
    vitalSignsJson: '{"bloodPressure":"140/90","heartRate":82,"temperature":36.8,"weight":58,"height":160}',
    icd10Code: null,
    icd10Name: null,
    prescriptionJson: null,
    treatmentPlan: null,
    followUpDate: null,
    medicalDocumentId: null,
    triageSessionId: null,
    checkedInAt: null,
    createdAt: atToday(7, 0, -2),
  },
  {
    id: 'ap-2',
    appointmentCode: 'APT-0002',
    patientId: '11111111-1111-1111-1111-111111111111',
    patientName: 'Lê Thị Hoa',
    patientEmail: 'patient@mediassist.local',
    patientPhone: '0912345678',
    doctorId: '33333333-3333-3333-3333-333333333334',
    doctorName: 'BS.CKII Phạm Quốc Tuấn',
    doctorEmail: 'dr.tuan@mediassist.local',
    scheduledStart: atToday(10, 0, 0),
    scheduledEnd: atToday(10, 30, 0),
    status: 'CHECKED_IN',
    paymentStatus: 'PAID',
    feeAmount: 350000,
    consultationNotes: 'Đau vùng thượng vị sau bữa ăn dầu mỡ, đầy trướng bụng kéo dài 1 tuần',
    queueNumber: 'STT 04',
    clinicRoom: 'Phòng 108 - Trung Tâm Nội Soi Tiêu Hóa',
    clinicFloor: 'Tầng 1',
    clinicBuilding: 'Khu Khám Bệnh - BV Chợ Rẫy TP.HCM',
    clinicAddress: '201B Nguyễn Chí Thanh, Quận 5, TP.HCM',
    qrCodeData: 'MEDIPASS:APT-0002:BSCK2-TUAN:20261027',
    chiefComplaint: 'Ợ chua, rát thượng vị sau ăn',
    vitalSignsJson: '{"bloodPressure":"120/80","heartRate":76,"temperature":37.0}',
    icd10Code: null,
    icd10Name: null,
    prescriptionJson: null,
    treatmentPlan: null,
    followUpDate: null,
    medicalDocumentId: null,
    triageSessionId: 'tr-1',
    checkedInAt: atToday(9, 45, 0),
    createdAt: atToday(7, 0, -1),
  },
  {
    id: 'ap-3',
    appointmentCode: 'APT-0003',
    patientId: '11111111-1111-1111-1111-111111111111',
    patientName: 'Lê Thị Hoa',
    patientEmail: 'patient@mediassist.local',
    patientPhone: '0912345678',
    doctorId: '22222222-2222-2222-2222-222222222222',
    doctorName: 'TS.BS Nguyễn Văn An',
    doctorEmail: 'doctor@mediassist.local',
    scheduledStart: atToday(8, 0, -7),
    scheduledEnd: atToday(8, 30, -7),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    feeAmount: 450000,
    consultationNotes: 'Huyết áp kiểm soát tốt. Tiếp tục duy trì phác đồ hiện tại.',
    chiefComplaint: 'Hồi hộp, mệt mỏi, đo huyết áp tại nhà 145/90 mmHg',
    vitalSignsJson: '{"bloodPressure":"135/85","heartRate":78,"temperature":36.7,"spo2":98,"bmi":22.6}',
    icd10Code: 'I10',
    icd10Name: 'Tăng huyết áp vô căn (nguyên phát)',
    prescriptionJson: JSON.stringify([
      { drugName: 'Amlodipin 5mg', activeIngredient: 'Amlodipine', dosage: '1 viên sáng sau ăn', quantity: 30, unit: 'viên', days: 30 },
      { drugName: 'Bisoprolol 2.5mg', activeIngredient: 'Bisoprolol hemifumarate', dosage: '1 viên sáng', quantity: 30, unit: 'viên', days: 30 },
    ]),
    treatmentPlan: 'Hạn chế ăn mặn (<5g muối/ngày), tập thể dục nhẹ nhàng 30p mỗi ngày. Tái khám sau 1 tháng mang theo sổ theo dõi huyết áp.',
    followUpDate: localDate(new Date(Date.now() + 23 * 86400000)),
    medicalDocumentId: null,
    triageSessionId: null,
    checkedInAt: atToday(7, 50, -7),
    createdAt: atToday(7, 0, -9),
  },
  {
    id: 'ap-4',
    appointmentCode: 'APT-0004',
    patientId: '11111111-1111-1111-1111-111111111111',
    patientName: 'Lê Thị Hoa',
    patientEmail: 'patient@mediassist.local',
    patientPhone: '0912345678',
    doctorId: '33333333-3333-3333-3333-333333333335',
    doctorName: 'ThS.BS Mai Hương',
    doctorEmail: 'dr.huong@mediassist.local',
    scheduledStart: atToday(14, 0, 3),
    scheduledEnd: atToday(14, 30, 3),
    status: 'SCHEDULED',
    paymentStatus: 'UNPAID',
    feeAmount: 400000,
    consultationNotes: 'Tầm soát viêm phế quản do thời tiết giao mùa',
    chiefComplaint: 'Ho khan có đờm trắng loãng về đêm',
    vitalSignsJson: null,
    icd10Code: null,
    icd10Name: null,
    prescriptionJson: null,
    treatmentPlan: null,
    followUpDate: null,
    medicalDocumentId: null,
    triageSessionId: null,
    checkedInAt: null,
    createdAt: atToday(7, 0, -1),
  },
];

export const MOCK_TRIAGE_HISTORY = [
  {
    id: 'tr-1',
    userId: '11111111-1111-1111-1111-111111111111',
    patientName: 'Lê Thị Hoa',
    patientEmail: 'patient@mediassist.local',
    symptomsText: 'Đau tức vùng thượng vị âm ỉ sau khi ăn no, thỉnh thoảng ợ hơi, trào ngược dịch chua lên cổ họng vào ban đêm.',
    isEmergency: false,
    urgencyLevel: 'ROUTINE',
    primarySpecialty: 'Tiêu hóa - Gan mật',
    sbarSummary: 'S: Đau thượng vị sau ăn, ợ chua. B: Tiền sử viêm dạ dày năm 2023. A: Nghi ngờ trào ngược dạ dày thực quản (GERD). R: Nên khám chuyên khoa tiêu hóa và nội soi khi có chỉ định.',
    aiAdvice: 'Tránh ăn đồ chua cay, dầu mỡ, không nằm ngay sau ăn ít nhất 2 giờ. Kê cao gối khi ngủ và đặt lịch khám sớm với bác sĩ chuyên khoa Tiêu hóa.',
    createdAt: atToday(8, 0, -1),
  },
];

export const MOCK_DOCUMENTS = [
  {
    id: 'doc-1',
    fileName: 'Ket_Qua_Xet_Nghiem_Sinh_Hoa_Mau_2026.pdf',
    fileSize: 245000,
    uploadedAt: atToday(8, 30, -5),
    patientId: '11111111-1111-1111-1111-111111111111',
    analysis: {
      patientName: 'Lê Thị Hoa',
      testDate: atToday(7, 0, -5),
      hospital: 'Bệnh viện Đại Học Y Dược TP.HCM',
      markers: [
        { name: 'Glucose lúc đói', value: 5.4, unit: 'mmol/L', refRange: '3.9 - 6.1', status: 'NORMAL' },
        { name: 'HbA1c', value: 5.6, unit: '%', refRange: '< 5.7', status: 'NORMAL' },
        { name: 'Cholesterol Toàn Phần', value: 6.2, unit: 'mmol/L', refRange: '< 5.2', status: 'HIGH' },
        { name: 'Triglycerides', value: 2.3, unit: 'mmol/L', refRange: '< 1.7', status: 'HIGH' },
        { name: 'HDL-Cholesterol', value: 1.1, unit: 'mmol/L', refRange: '> 1.0', status: 'NORMAL' },
        { name: 'LDL-Cholesterol', value: 4.1, unit: 'mmol/L', refRange: '< 3.4', status: 'HIGH' },
        { name: 'AST (GOT)', value: 24, unit: 'U/L', refRange: '< 37', status: 'NORMAL' },
        { name: 'ALT (GPT)', value: 22, unit: 'U/L', refRange: '< 41', status: 'NORMAL' },
        { name: 'Creatinine huyết thanh', value: 68, unit: 'µmol/L', refRange: '44 - 88', status: 'NORMAL' },
        { name: 'eGFR', value: 92, unit: 'mL/min/1.73m²', refRange: '> 90', status: 'NORMAL' },
      ],
      aiSummary: 'Kết quả xét nghiệm cho thấy rối loạn lipid máu (Tăng Cholesterol toàn phần, Triglycerides và LDL-Cholesterol). Chức năng gan và thận trong giới hạn bình thường.',
      recommendations: 'Khuyến nghị thay đổi chế độ dinh dưỡng giảm mỡ bão hòa, tăng cường vận động và tư vấn với bác sĩ Tim mạch để cân nhắc dùng Statin nếu cần.',
      redFlagDetected: false,
    },
  },
];

export const MOCK_ADMIN_STATS = {
  totalUsers: 24,
  totalPatients: 16,
  totalDoctors: 6,
  pendingDoctorsCount: 1,
  suspendedUsersCount: 0,
  totalAppointments: 12,
  scheduledAppointmentsCount: 5,
  completedAppointmentsCount: 6,
  cancelledAppointmentsCount: 1,
  totalDocumentsAnalyzed: 18,
  redFlagDocumentsCount: 2,
  totalTriageSessions: 22,
  emergencyTriageCount: 2,
  routineTriageCount: 20,
  infrastructureHealth: {
    postgres: 'UP',
    redis: 'UP',
    vectorIndexHNSW: 'HEALTHY (1536-d)',
    twoLayerCache: 'ACTIVE (L1 Caffeine + L2 Redis)',
  },
  recentActivities: [
    { id: 'act-1', type: 'LOGIN', description: 'Bác sĩ TS.BS Nguyễn Văn An vừa đăng nhập vào hệ thống', time: atToday(8, 30, 0) },
    { id: 'act-2', type: 'TRIAGE', description: 'Phiên AI Triage phát hiện triệu chứng đau ngực - Khuyến cáo Tim Mạch', time: atToday(8, 15, 0) },
    { id: 'act-3', type: 'BOOKING', description: 'Bệnh nhân Lê Thị Hoa đặt lịch khám thành công mã APT-0001', time: atToday(8, 0, 0) },
  ],
};

export const MOCK_AI_USAGE = {
  totalRequests: 48,
  totalTokens: 64200,
  totalCostUsd: 0.52,
  totalCostVnd: 13234,
  errorRatePercent: 1.8,
  exchangeRate: 25450,
  dailyStats: [
    { date: localDate(new Date(Date.now() - 6 * 86400000)), requests: 6, tokens: 7800, costUsd: 0.06 },
    { date: localDate(new Date(Date.now() - 5 * 86400000)), requests: 8, tokens: 9200, costUsd: 0.07 },
    { date: localDate(new Date(Date.now() - 4 * 86400000)), requests: 5, tokens: 6500, costUsd: 0.05 },
    { date: localDate(new Date(Date.now() - 3 * 86400000)), requests: 10, tokens: 13400, costUsd: 0.11 },
    { date: localDate(new Date(Date.now() - 2 * 86400000)), requests: 7, tokens: 8900, costUsd: 0.07 },
    { date: localDate(new Date(Date.now() - 1 * 86400000)), requests: 9, tokens: 12100, costUsd: 0.10 },
    { date: localDate(new Date()), requests: 3, tokens: 6300, costUsd: 0.06 },
  ],
  serviceStats: [
    { service: 'AI Symptom Triage (Gemini Flash)', requests: 28, tokens: 36000, costVnd: 7400 },
    { service: 'Vision OCR Document Summarizer', requests: 14, tokens: 22000, costVnd: 4500 },
    { service: 'Doctor Semantic Embedding (1536-d)', requests: 6, tokens: 6200, costVnd: 1334 },
  ],
};
