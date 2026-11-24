#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const AVATARS_DIR = join(REPO_ROOT, 'frontend', 'public', 'avatars', 'doctors');

const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'mediassist_postgres';
const REDIS_CONTAINER = process.env.REDIS_CONTAINER || 'mediassist_redis';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo@123456';

const pad = (n) => String(n).padStart(2, '0');
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const sqlJson = (obj) => esc(JSON.stringify(obj));

function localDateOffset(days, skipSunday = false) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  if (skipSunday && d.getDay() === 0) {
    d.setDate(d.getDate() + (days >= 0 ? 1 : -1));
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function atLocalOffset(days, hour, minute, skipSunday = false) {
  return `${localDateOffset(days, skipSunday)} ${pad(hour)}:${pad(minute)}:00+07`;
}

function patientAvatarUrl(fullName) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0F766E&color=ffffff&size=256&bold=true&format=png`;
}

const SPECIALTY_THEME = {
  cardiology: { bg1: '#E0F2FE', bg2: '#CCFBF1', scrub: '#0D9488', badge: 'CARD' },
  neurology: { bg1: '#EDE9FE', bg2: '#E0E7FF', scrub: '#4F46E5', badge: 'NEUR' },
  gastroenterology: { bg1: '#FEF3C7', bg2: '#CCFBF1', scrub: '#0F766E', badge: 'GAST' },
  dermatology: { bg1: '#FCE7F3', bg2: '#F0FDFA', scrub: '#0284C7', badge: 'DERM' },
  pediatrics: { bg1: '#DCFCE7', bg2: '#E0F2FE', scrub: '#059669', badge: 'PEDI' },
  'general-internal-medicine': { bg1: '#E0F2FE', bg2: '#F1F5F9', scrub: '#0369A1', badge: 'INTM' },
  pulmonology: { bg1: '#CFFAFE', bg2: '#E2E8F0', scrub: '#0E7490', badge: 'PULM' },
  orthopedics: { bg1: '#FFEDD5', bg2: '#F1F5F9', scrub: '#1D4ED8', badge: 'ORTH' },
  nephrology: { bg1: '#E0E7FF', bg2: '#F0FDF4', scrub: '#4338CA', badge: 'NEPH' },
  'obstetrics-gynecology': { bg1: '#FFE4E6', bg2: '#FAF5FF', scrub: '#BE185D', badge: 'OBGY' },
  endocrinology: { bg1: '#FEF9C3', bg2: '#ECFDF5', scrub: '#047857', badge: 'ENDO' },
  ent: { bg1: '#DBEAFE', bg2: '#F0FDFA', scrub: '#2563EB', badge: 'ENT' },
};

const SKIN_TONES = ['#F5D0B5', '#EFC2A0', '#F1C7A8', '#E8B896'];
const HAIR_COLORS = ['#1E293B', '#27272A', '#3B2F2F', '#334155', '#475569'];

function isFemaleDoctor(name) {
  return /(Thị|Thu Hà|Hoàng Yến|Minh Châu|Mỹ Linh|Kim|Mai|Lan|Thảo|Ngọc|Thanh|Thủy|Bích|Hương|Hồng)\b/.test(name);
}

function buildDoctorPortraitSvg(doctor, idx) {
  const theme = SPECIALTY_THEME[doctor.specialtySlug] || { bg1: '#E0F2FE', bg2: '#CCFBF1', scrub: '#0D9488', badge: 'MD' };
  const female = isFemaleDoctor(doctor.fullName);
  const skin = SKIN_TONES[idx % SKIN_TONES.length];
  const hair = HAIR_COLORS[idx % HAIR_COLORS.length];
  const hasGlasses = idx % 3 === 0 || doctor.academicTitle === 'TS.BS' || doctor.academicTitle === 'BS.CKII';
  const regionTag = doctor.clinicAddress.includes('Quy Nhơn') ? 'QUY NHƠN' : 'TP.HCM';
  const coatAccent = theme.scrub;
  const lastWord = doctor.fullName.trim().split(' ').pop() || 'BS';
  const initials = lastWord.slice(0, 2).toUpperCase();

  const hairBack = female
    ? `<path d="M74 106 C70 60, 186 60, 182 106 L188 150 C188 164, 174 170, 166 164 L166 118 C166 90, 90 90, 90 118 L90 164 C82 170, 68 164, 68 150 Z" fill="${hair}"/>`
    : `<path d="M84 104 C82 64, 174 64, 172 104 C166 86, 90 86, 84 104 Z" fill="${hair}"/>`;

  const hairFront = female
    ? `<path d="M86 98 C92 66, 168 66, 170 98 C156 80, 114 78, 86 98 Z" fill="${hair}"/>`
    : `<path d="M86 94 C88 64, 168 62, 170 94 C156 76, 128 74, 86 94 Z" fill="${hair}"/>`;

  const glassesSvg = hasGlasses
    ? `<g stroke="#1E293B" stroke-width="2.4" fill="rgba(255,255,255,0.22)">
         <rect x="97" y="106" width="24" height="16" rx="5"/>
         <rect x="135" y="106" width="24" height="16" rx="5"/>
         <line x1="121" y1="113" x2="135" y2="113"/>
       </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="${doctor.fullName}">
  <defs>
    <linearGradient id="bg-${idx}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    <linearGradient id="coat-${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="36" fill="url(#bg-${idx})"/>
  <circle cx="204" cy="48" r="36" fill="#FFFFFF" opacity="0.45"/>
  <circle cx="44" cy="216" r="42" fill="#FFFFFF" opacity="0.35"/>

  <!-- Shoulders & Scrubs -->
  <path d="M36 256 C38 196, 76 178, 128 178 C180 178, 218 196, 220 256 Z" fill="${coatAccent}"/>
  <!-- White Clinical Lab Coat & Lapels -->
  <path d="M36 256 C40 198, 72 180, 108 176 L128 228 L148 176 C184 180, 216 198, 220 256 Z" fill="url(#coat-${idx})" stroke="#CBD5E1" stroke-width="1.5"/>
  <path d="M104 176 L128 226 L112 224 L94 184 Z" fill="#E2E8F0"/>
  <path d="M152 176 L128 226 L144 224 L162 184 Z" fill="#E2E8F0"/>

  <!-- Neck & Face -->
  <rect x="114" y="148" width="28" height="34" rx="12" fill="${skin}"/>
  <path d="M114 156 Q128 166 142 156" fill="none" stroke="rgba(15,23,42,0.12)" stroke-width="2"/>
  ${hairBack}
  <circle cx="88" cy="116" r="8" fill="${skin}"/>
  <circle cx="168" cy="116" r="8" fill="${skin}"/>
  <ellipse cx="128" cy="114" rx="38" ry="44" fill="${skin}"/>
  ${hairFront}

  <!-- Facial Features -->
  <circle cx="109" cy="114" r="3.6" fill="#0F172A"/>
  <circle cx="147" cy="114" r="3.6" fill="#0F172A"/>
  <path d="M101 104 Q109 100 117 103" stroke="${hair}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M139 103 Q147 100 155 104" stroke="${hair}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M126 116 L125 127 Q128 130 131 127" stroke="rgba(120,70,40,0.38)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M116 138 Q128 147 140 138" stroke="#9F5848" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  ${glassesSvg}

  <!-- Stethoscope -->
  <path d="M96 180 C92 214, 108 232, 128 232 C148 232, 164 214, 160 180" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
  <circle cx="152" cy="222" r="9" fill="#94A3B8" stroke="#334155" stroke-width="2.5"/>
  <circle cx="152" cy="222" r="4" fill="#E2E8F0"/>

  <!-- Name Badge & Region Pill -->
  <rect x="64" y="218" width="44" height="22" rx="6" fill="#FFFFFF" stroke="${coatAccent}" stroke-width="1.5"/>
  <text x="86" y="233" font-family="system-ui,Segoe UI,sans-serif" font-size="11" font-weight="700" fill="${coatAccent}" text-anchor="middle">${initials}</text>
  <rect x="148" y="14" width="92" height="22" rx="11" fill="#FFFFFF" fill-opacity="0.9"/>
  <text x="194" y="29" font-family="system-ui,Segoe UI,sans-serif" font-size="10" font-weight="700" fill="#0F172A" text-anchor="middle">${regionTag}</text>
</svg>`;
}

function doctorAvatarUrl(index) {
  return `/avatars/doctors/doc-${pad(index + 1)}.svg`;
}

function generateDoctorAvatars() {
  mkdirSync(AVATARS_DIR, { recursive: true });
  DOCTORS.forEach((doc, idx) => {
    const filePath = join(AVATARS_DIR, `doc-${pad(idx + 1)}.svg`);
    writeFileSync(filePath, buildDoctorPortraitSvg(doc, idx), 'utf8');
  });
  console.log(`🖼️  Generated ${DOCTORS.length} clinical portrait SVG avatars in frontend/public/avatars/doctors/`);
}

const DOCTORS = [
  {
    key: 'doc_timmach',
    email: 'bs.nguyenvanan.timmach@gmail.com',
    fullName: 'TS.BS Nguyễn Văn An',
    phone: '0901234001',
    specialtySlug: 'cardiology',
    academicTitle: 'TS.BS',
    hospitalAffiliation: 'Bệnh viện Đại Học Y Dược TP.HCM',
    clinicAddress: '215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Can Thiệp Tim Mạch',
    licenseNumber: '008921/BYT-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2016-04-12',
    scopeOfPractice: 'Khám bệnh, chữa bệnh chuyên khoa Tim mạch can thiệp, tăng huyết áp, suy tim và rối loạn nhịp tim.',
    yearsOfExperience: 16,
    fee: 450000,
    rating: 4.95,
    totalConsultations: 1840,
    bio: 'Tiến sĩ Y khoa với 16 năm kinh nghiệm điều trị tăng huyết áp kháng trị, bệnh mạch vành, suy tim và tầm soát biến cố tim mạch.',
  },
  {
    key: 'doc_thankinh',
    email: 'bs.tranminhkhoa.thankinh@gmail.com',
    fullName: 'BS.CKII Trần Minh Khoa',
    phone: '0901234002',
    specialtySlug: 'neurology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Chợ Rẫy TP.HCM',
    clinicAddress: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Nội Thần Kinh',
    licenseNumber: '011482/BYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2017-08-20',
    scopeOfPractice: 'Khám và điều trị đau đầu mạn tính, rối loạn tiền đình, sa sút trí tuệ và phục hồi sau đột quỵ.',
    yearsOfExperience: 14,
    fee: 400000,
    rating: 4.90,
    totalConsultations: 1420,
    bio: 'Bác sĩ Chuyên khoa II Thần kinh giàu kinh nghiệm chẩn đoán đau nửa đầu Migraine, rối loạn tiền đình và phòng ngừa đột quỵ não.',
  },
  {
    key: 'doc_tieuhoa',
    email: 'bs.phamquoctuan.tieuhoa@gmail.com',
    fullName: 'ThS.BS Phạm Quốc Tuấn',
    phone: '0901234003',
    specialtySlug: 'gastroenterology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Chợ Rẫy TP.HCM',
    clinicAddress: '201B Nguyễn Chí Thanh, Khu Khám Chuyên Khoa Tiêu Hóa, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Tiêu Hóa - Gan Mật',
    licenseNumber: '014320/BYT-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2018-03-10',
    scopeOfPractice: 'Nội soi tiêu hóa chẩn đoán, điều trị trào ngược dạ dày thực quản (GERD), viêm loét HP và bệnh lý gan mật.',
    yearsOfExperience: 11,
    fee: 350000,
    rating: 4.88,
    totalConsultations: 1180,
    bio: 'Thạc sĩ Tiêu hóa chuyên sâu nội soi dạ dày – đại tràng, điều trị tiệt trừ H. pylori, gan nhiễm mỡ và hội chứng ruột kích thích.',
  },
  {
    key: 'doc_dalieu',
    email: 'bs.lethuha.dalieu@gmail.com',
    fullName: 'BS.CKI Lê Thu Hà',
    phone: '0901234004',
    specialtySlug: 'dermatology',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Da Liễu TP.HCM',
    clinicAddress: '2 Nguyễn Thông, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
    department: 'Khoa Khám Bệnh & Da Liễu Thẩm Mỹ',
    licenseNumber: '019204/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2019-11-05',
    scopeOfPractice: 'Điều trị viêm da cơ địa, mề đay mạn, mụn trứng cá, vảy nến và chăm sóc phục hồi hàng rào bảo vệ da.',
    yearsOfExperience: 9,
    fee: 300000,
    rating: 4.85,
    totalConsultations: 940,
    bio: 'Bác sĩ Chuyên khoa I Da liễu tư vấn chuyên sâu bệnh da liễu dị ứng, viêm da tiếp xúc, vảy nến và phác đồ điều trị chuẩn y khoa.',
  },
  {
    key: 'doc_nhikhoa',
    email: 'bs.hoangminhduc.nhikhoa@gmail.com',
    fullName: 'BS.CKII Hoàng Minh Đức',
    phone: '0901234005',
    specialtySlug: 'pediatrics',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Nhi Đồng 1 TP.HCM',
    clinicAddress: '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP. Hồ Chí Minh',
    department: 'Khoa Nhi Tổng Hợp & Hô Hấp Nhi',
    licenseNumber: '012910/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2015-06-18',
    scopeOfPractice: 'Khám nhi tổng quát, điều trị viêm phế quản, hen trẻ em, rối loạn tiêu hóa và tư vấn tiêm chủng dinh dưỡng.',
    yearsOfExperience: 13,
    fee: 350000,
    rating: 4.94,
    totalConsultations: 2100,
    bio: '13 năm điều trị bệnh lý hô hấp, tiêu hóa và đánh giá phát triển thể chất trẻ sơ sinh đến 15 tuổi tại Bệnh viện Nhi Đồng 1.',
  },
  {
    key: 'doc_noitongquat',
    email: 'bs.vuthimai.noitongquat@gmail.com',
    fullName: 'ThS.BS Vũ Thị Mai',
    phone: '0901234006',
    specialtySlug: 'general-internal-medicine',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Nhân Dân 115',
    clinicAddress: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh',
    department: 'Khoa Khám Bệnh & Nội Tổng Quát',
    licenseNumber: '016551/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2018-09-22',
    scopeOfPractice: 'Tầm soát sức khỏe tổng quát, quản lý đa bệnh lý mạn tính, rối loạn chuyển hóa và đọc chỉ số xét nghiệm.',
    yearsOfExperience: 10,
    fee: 300000,
    rating: 4.86,
    totalConsultations: 1350,
    bio: 'Thạc sĩ Nội khoa phụ trách tầm soát toàn diện, phân tích cận lâm sàng tổng hợp và theo dõi bệnh lý mạn tính cho người trưởng thành.',
  },
  {
    key: 'doc_hohap',
    email: 'bs.dangquanghuy.hohap@gmail.com',
    fullName: 'BS.CKII Đặng Quang Huy',
    phone: '0901234007',
    specialtySlug: 'pulmonology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Phạm Ngọc Thạch',
    clinicAddress: '120 Hồng Bàng, Phường 12, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Hô Hấp & Bệnh Phổi Mạn Tính',
    licenseNumber: '010774/BYT-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2014-12-01',
    scopeOfPractice: 'Chẩn đoán và kiểm soát hen phế quản, COPD, viêm phổi cộng đồng, ho kéo dài và đo chức năng hô hấp.',
    yearsOfExperience: 15,
    fee: 380000,
    rating: 4.91,
    totalConsultations: 1590,
    bio: 'Chuyên gia Hô hấp 15 năm kinh nghiệm quản lý hen phế quản, bệnh phổi tắc nghẽn mạn tính COPD và phục hồi chức năng phổi.',
  },
  {
    key: 'doc_coxuongkhop',
    email: 'bs.buixuanthanh.coxuongkhop@gmail.com',
    fullName: 'ThS.BS Bùi Xuân Thành',
    phone: '0901234008',
    specialtySlug: 'orthopedics',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Chấn Thương Chỉnh Hình TP.HCM',
    clinicAddress: '929 Trần Hưng Đạo, Phường 1, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Cột Sống & Cơ Xương Khớp',
    licenseNumber: '013882/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2017-01-19',
    scopeOfPractice: 'Điều trị thoát vị đĩa đệm, thoái hóa khớp gối, gout, loãng xương và chấn thương dây chằng thể thao.',
    yearsOfExperience: 12,
    fee: 380000,
    rating: 4.89,
    totalConsultations: 1290,
    bio: 'Thạc sĩ Chấn thương Chỉnh hình chuyên điều trị bảo tồn thoái hóa cột sống, đau vai gáy, thoát vị đĩa đệm và chấn thương khớp.',
  },
  {
    key: 'doc_thantietnieu',
    email: 'bs.dothilan.thantietnieu@gmail.com',
    fullName: 'BS.CKI Đỗ Thị Lan',
    phone: '0901234009',
    specialtySlug: 'nephrology',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Bình Dân TP.HCM',
    clinicAddress: '371 Điện Biên Phủ, Phường 4, Quận 3, TP. Hồ Chí Minh',
    department: 'Khoa Thận Học & Tiết Niệu',
    licenseNumber: '018312/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2020-02-14',
    scopeOfPractice: 'Điều trị nhiễm trùng đường tiểu, sỏi tiết niệu, hội chứng thận hư và theo dõi bảo tồn chức năng thận mạn.',
    yearsOfExperience: 8,
    fee: 320000,
    rating: 4.84,
    totalConsultations: 780,
    bio: 'Bác sĩ Chuyên khoa I Nội Thận – Tiết niệu, chuyên quản lý suy thận mạn giai đoạn sớm, sỏi thận và rối loạn tiểu tiện.',
  },
  {
    key: 'doc_sanphukhoa',
    email: 'bs.nguyenthithao.sanphukhoa@gmail.com',
    fullName: 'BS.CKII Nguyễn Thị Thảo',
    phone: '0901234010',
    specialtySlug: 'obstetrics-gynecology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Từ Dũ TP.HCM',
    clinicAddress: '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
    department: 'Khoa Chăm Sóc Trước Sinh & Phụ Khoa',
    licenseNumber: '009450/BYT-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2015-10-08',
    scopeOfPractice: 'Quản lý thai kỳ nguy cơ cao, tầm soát ung thư cổ tử cung, rối loạn nội tiết nữ và chăm sóc tiền sản.',
    yearsOfExperience: 14,
    fee: 400000,
    rating: 4.96,
    totalConsultations: 2340,
    bio: '14 năm công tác tại Bệnh viện Từ Dũ, chuyên theo dõi thai kỳ nguy cơ cao, tiểu đường thai kỳ và khám phụ khoa định kỳ.',
  },
  {
    key: 'doc_noitiet',
    email: 'bs.truongvanhai.noitiet@gmail.com',
    fullName: 'ThS.BS Trương Văn Hải',
    phone: '0901234011',
    specialtySlug: 'endocrinology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Đại Học Y Dược TP.HCM',
    clinicAddress: '215 Hồng Bàng, Khu A - Khoa Nội Tiết, Phường 11, Quận 5, TP. Hồ Chí Minh',
    department: 'Khoa Nội Tiết & Chuyển Hóa',
    licenseNumber: '015109/BYT-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2018-05-25',
    scopeOfPractice: 'Điều trị đái tháo đường type 1/type 2, bệnh lý tuyến giáp (Basedow, suy giáp) và rối loạn chuyển hóa lipid.',
    yearsOfExperience: 11,
    fee: 350000,
    rating: 4.90,
    totalConsultations: 1470,
    bio: 'Thạc sĩ Nội tiết chuyên kiểm soát đường huyết toàn diện, phòng ngừa biến chứng bàn chân đái tháo đường và bướu giáp.',
  },
  {
    key: 'doc_taimuihong',
    email: 'bs.lyhoangnam.taimuihong@gmail.com',
    fullName: 'BS.CKI Lý Hoàng Nam',
    phone: '0901234012',
    specialtySlug: 'ent',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Tai Mũi Họng TP.HCM',
    clinicAddress: '155B Trần Quốc Thảo, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
    department: 'Khoa Mũi Xoang & Thính Học',
    licenseNumber: '017605/SYT-CCHN',
    licenseIssuedBy: 'Sở Y Tế TP. Hồ Chí Minh',
    licenseIssuedDate: '2019-07-11',
    scopeOfPractice: 'Nội soi Tai Mũi Họng, điều trị viêm xoang mạn, viêm mũi dị ứng, viêm amidan và ù tai nghe kém.',
    yearsOfExperience: 9,
    fee: 300000,
    rating: 4.87,
    totalConsultations: 1030,
    bio: 'Bác sĩ Tai Mũi Họng giàu kinh nghiệm điều trị viêm xoang cấp mạn tính, viêm tai giữa và sàng lọc thính lực chuyên sâu.',
  },

  // === 24 BÁC SĨ TẠI QUY NHƠN, BÌNH ĐỊNH (2 BÁC SĨ / CHUYÊN KHOA x 12 CHUYÊN KHOA) ===
  {
    key: 'doc_qn_timmach_1',
    email: 'bs.vominhquan.timmach.qn@gmail.com',
    fullName: 'BS.CKII Võ Minh Quân',
    phone: '0901235001',
    specialtySlug: 'cardiology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Tim Mạch & Lão Học',
    licenseNumber: '021001/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2016-05-10',
    scopeOfPractice: 'Khám và điều trị tăng huyết áp, suy tim mạn, bệnh mạch vành và rối loạn nhịp tim tại Quy Nhơn.',
    yearsOfExperience: 14,
    fee: 350000,
    rating: 4.92,
    totalConsultations: 1120,
    bio: 'Bác sĩ Chuyên khoa II Tim mạch công tác 14 năm tại Bệnh viện Đa khoa Tỉnh Bình Định, chuyên kiểm soát tăng huyết áp và bệnh mạch vành.',
  },
  {
    key: 'doc_qn_timmach_2',
    email: 'bs.phanthingoc.timmach.qn@gmail.com',
    fullName: 'ThS.BS Phan Thị Ngọc',
    phone: '0901235002',
    specialtySlug: 'cardiology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Đa khoa Hòa Bình Quy Nhơn',
    clinicAddress: '355 Trần Hưng Đạo, Phường Trần Hưng Đạo, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Tim Mạch - Siêu Âm Tim',
    licenseNumber: '021002/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2019-03-14',
    scopeOfPractice: 'Siêu âm tim Doppler màu, tầm soát rối loạn mỡ máu, đau thắt ngực và dự phòng biến cố tim mạch.',
    yearsOfExperience: 10,
    fee: 320000,
    rating: 4.88,
    totalConsultations: 860,
    bio: 'Thạc sĩ Nội tim mạch chuyên sâu siêu âm tim Doppler và quản lý điều trị lâu dài cho bệnh nhân tăng huyết áp, suy tim tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_thankinh_1',
    email: 'bs.huynhvanson.thankinh.qn@gmail.com',
    fullName: 'BS.CKII Huỳnh Văn Sơn',
    phone: '0901235003',
    specialtySlug: 'neurology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khu Nội Thần Kinh, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Thần Kinh - Đột Quỵ',
    licenseNumber: '021003/BĐ-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2015-11-20',
    scopeOfPractice: 'Điều trị đau đầu Migraine, rối loạn tiền đình, liệt dây thần kinh mặt và phục hồi sau tai biến mạch máu não.',
    yearsOfExperience: 15,
    fee: 340000,
    rating: 4.91,
    totalConsultations: 1050,
    bio: 'Trưởng nhóm điều trị đột quỵ và nội thần kinh 15 năm kinh nghiệm tại Quy Nhơn, chuyên sâu rối loạn tiền đình và động kinh.',
  },
  {
    key: 'doc_qn_thankinh_2',
    email: 'bs.ngothithanh.thankinh.qn@gmail.com',
    fullName: 'ThS.BS Ngô Thị Thanh',
    phone: '0901235004',
    specialtySlug: 'neurology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Quân y 13 Quy Nhơn',
    clinicAddress: '118 Nguyễn Thái Học, Phường Ngô Mây, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Thần Kinh & Rối Loạn Giấc Ngủ',
    licenseNumber: '021004/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2018-07-02',
    scopeOfPractice: 'Khám mất ngủ mạn tính, suy nhược thần kinh, đau dây thần kinh tọa và tê bì tay chân.',
    yearsOfExperience: 11,
    fee: 300000,
    rating: 4.86,
    totalConsultations: 790,
    bio: 'Thạc sĩ Thần kinh tại Bệnh viện Quân y 13 Quy Nhơn, chuyên điều trị rối loạn giấc ngủ, lo âu và bệnh thần kinh ngoại biên.',
  },
  {
    key: 'doc_qn_tieuhoa_1',
    email: 'bs.trinhquocbao.tieuhoa.qn@gmail.com',
    fullName: 'BS.CKI Trịnh Quốc Bảo',
    phone: '0901235005',
    specialtySlug: 'gastroenterology',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định - Phần mở rộng',
    clinicAddress: '39A Phạm Ngọc Thạch, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Tiêu Hóa & Nội Soi',
    licenseNumber: '021005/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2018-09-12',
    scopeOfPractice: 'Nội soi dạ dày – đại tràng, điều trị loét dạ dày HP dương tính, trào ngược GERD và viêm đại tràng.',
    yearsOfExperience: 10,
    fee: 300000,
    rating: 4.87,
    totalConsultations: 930,
    bio: 'Bác sĩ Chuyên khoa I Tiêu hóa giàu kinh nghiệm nội soi không đau và điều trị triệt để vi khuẩn H. pylori tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_tieuhoa_2',
    email: 'bs.lamthimylinh.tieuhoa.qn@gmail.com',
    fullName: 'ThS.BS Lâm Thị Mỹ Linh',
    phone: '0901235006',
    specialtySlug: 'gastroenterology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Phòng khám Chuyên khoa Tiêu hóa Quy Nhơn',
    clinicAddress: '142 Nguyễn Tất Thành, Phường Lê Hồng Phong, TP. Quy Nhơn, Bình Định',
    department: 'Trung tâm Tiêu Hóa - Gan Mật',
    licenseNumber: '021006/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2020-01-15',
    scopeOfPractice: 'Quản lý viêm gan virus B/C, gan nhiễm mỡ, hội chứng ruột kích thích IBS và dinh dưỡng tiêu hóa.',
    yearsOfExperience: 8,
    fee: 280000,
    rating: 4.89,
    totalConsultations: 680,
    bio: 'Thạc sĩ Tiêu hóa - Gan mật tư vấn phác đồ điều trị viêm gan virus, men gan cao và rối loạn tiêu hóa kéo dài tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_dalieu_1',
    email: 'bs.dinhquangvinh.dalieu.qn@gmail.com',
    fullName: 'BS.CKII Đinh Quang Vinh',
    phone: '0901235007',
    specialtySlug: 'dermatology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Phong - Da liễu Trung ương Quy Hòa',
    clinicAddress: '05A Chế Lan Viên, Phường Ghềnh Ráng, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Khám Bệnh Da Liễu Trung Ương Quy Hòa',
    licenseNumber: '021007/BĐ-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2014-06-22',
    scopeOfPractice: 'Điều trị chuyên sâu vảy nến, viêm da cơ địa kháng trị, nấm da và các bệnh lý da liễu mạn tính.',
    yearsOfExperience: 16,
    fee: 320000,
    rating: 4.95,
    totalConsultations: 1640,
    bio: 'Bác sĩ Chuyên khoa II với 16 năm kinh nghiệm tuyến Trung ương tại Bệnh viện Quy Hòa, chuyên gia đầu ngành bệnh da miễn dịch và dị ứng.',
  },
  {
    key: 'doc_qn_dalieu_2',
    email: 'bs.maihoangyen.dalieu.qn@gmail.com',
    fullName: 'BS.CKI Mai Hoàng Yến',
    phone: '0901235008',
    specialtySlug: 'dermatology',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Phong - Da liễu Trung ương Quy Hòa',
    clinicAddress: '05A Chế Lan Viên, Khu Khám Da Liễu Thẩm Mỹ, Phường Ghềnh Ráng, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Da Liễu Thẩm Mỹ & Laser',
    licenseNumber: '021008/BĐ-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2019-10-08',
    scopeOfPractice: 'Điều trị mụn trứng cá, sẹo rỗ, nám da, viêm da tiếp xúc và chăm sóc phục hồi da chuẩn y khoa.',
    yearsOfExperience: 9,
    fee: 280000,
    rating: 4.90,
    totalConsultations: 870,
    bio: 'Bác sĩ Da liễu Bệnh viện Quy Hòa chuyên sâu điều trị mụn nội tiết, kích ứng mỹ phẩm và trẻ hóa làn da an toàn.',
  },
  {
    key: 'doc_qn_nhikhoa_1',
    email: 'bs.nguyenhuuphuc.nhikhoa.qn@gmail.com',
    fullName: 'BS.CKII Nguyễn Hữu Phúc',
    phone: '0901235009',
    specialtySlug: 'pediatrics',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Nhi Tổng Hợp, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nhi Tổng Hợp & Sơ Sinh',
    licenseNumber: '021009/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2015-08-30',
    scopeOfPractice: 'Khám và điều trị sốt siêu vi, viêm tiểu phế quản, tay chân miệng, sốt xuất huyết trẻ em.',
    yearsOfExperience: 15,
    fee: 300000,
    rating: 4.93,
    totalConsultations: 1580,
    bio: 'Bác sĩ Chuyên khoa II Nhi khoa 15 năm trực cấp cứu và điều trị nhi tổng hợp, hô hấp nhi tại TP. Quy Nhơn.',
  },
  {
    key: 'doc_qn_nhikhoa_2',
    email: 'bs.caothithuy.nhikhoa.qn@gmail.com',
    fullName: 'ThS.BS Cao Thị Thủy',
    phone: '0901235010',
    specialtySlug: 'pediatrics',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Phòng khám Nhi khoa Sài Gòn - Quy Nhơn',
    clinicAddress: '86 An Dương Vương, Phường Nguyễn Văn Cừ, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nhi Hô Hấp & Dinh Dưỡng',
    licenseNumber: '021010/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2018-04-17',
    scopeOfPractice: 'Khám hô hấp nhi, hen suyễn trẻ em, biếng ăn chậm lớn và tư vấn lịch tiêm chủng mở rộng.',
    yearsOfExperience: 10,
    fee: 280000,
    rating: 4.91,
    totalConsultations: 1190,
    bio: 'Thạc sĩ Nhi khoa tận tâm tư vấn dinh dưỡng, kiểm soát khò khè tái phát và hạn chế lạm dụng kháng sinh ở trẻ nhỏ.',
  },
  {
    key: 'doc_qn_noitongquat_1',
    email: 'bs.lequangkhai.noitongquat.qn@gmail.com',
    fullName: 'BS.CKII Lê Quang Khải',
    phone: '0901235011',
    specialtySlug: 'general-internal-medicine',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Hòa Bình Quy Nhơn',
    clinicAddress: '355 Trần Hưng Đạo, Khoa Nội Tổng Quát, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Tổng Quát',
    licenseNumber: '021011/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2016-02-19',
    scopeOfPractice: 'Khám tổng quát sức khỏe định kỳ, quản lý bệnh mạn tính phối hợp và tư vấn kết quả xét nghiệm máu.',
    yearsOfExperience: 14,
    fee: 280000,
    rating: 4.88,
    totalConsultations: 1310,
    bio: 'Bác sĩ Chuyên khoa II Nội tổng quát trực tiếp thăm khám sàng lọc tổng thể và điều phối điều trị đa bệnh lý tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_noitongquat_2',
    email: 'bs.doanthibich.noitongquat.qn@gmail.com',
    fullName: 'BS.CKI Đoàn Thị Bích',
    phone: '0901235012',
    specialtySlug: 'general-internal-medicine',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Trung tâm Y tế TP. Quy Nhơn',
    clinicAddress: '114 Trần Hưng Đạo, Phường Hải Cảng, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Khám Bệnh Tổng Hợp',
    licenseNumber: '021012/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2019-11-25',
    scopeOfPractice: 'Chẩn đoán sốt chưa rõ nguyên nhân, nhiễm trùng cấp, tầm soát mỡ máu – acid uric và chăm sóc ban đầu.',
    yearsOfExperience: 9,
    fee: 250000,
    rating: 4.84,
    totalConsultations: 820,
    bio: 'Bác sĩ Nội tổng quát thân thiện, hỗ trợ đọc xét nghiệm sinh hóa, huyết học và lập kế hoạch phòng bệnh cho cả gia đình.',
  },
  {
    key: 'doc_qn_hohap_1',
    email: 'bs.tranvanhung.hohap.qn@gmail.com',
    fullName: 'BS.CKII Trần Văn Hùng',
    phone: '0901235013',
    specialtySlug: 'pulmonology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Nội Hô Hấp, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Hô Hấp & Bệnh Phổi',
    licenseNumber: '021013/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2015-09-09',
    scopeOfPractice: 'Điều trị COPD, hen phế quản, viêm phổi, tràn dịch màng phổi và đọc phim X-quang / CT ngực.',
    yearsOfExperience: 15,
    fee: 320000,
    rating: 4.90,
    totalConsultations: 1140,
    bio: 'Bác sĩ Chuyên khoa II Hô hấp chuyên sâu quản lý bệnh phổi tắc nghẽn mạn tính COPD, hen phế quản và ho mạn tính ở người cao tuổi.',
  },
  {
    key: 'doc_qn_hohap_2',
    email: 'bs.luongthihuong.hohap.qn@gmail.com',
    fullName: 'ThS.BS Lương Thị Hương',
    phone: '0901235014',
    specialtySlug: 'pulmonology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Quân y 13 Quy Nhơn',
    clinicAddress: '118 Nguyễn Thái Học, Khoa Nội Hô Hấp, Phường Ngô Mây, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Lao & Bệnh Phổi',
    licenseNumber: '021014/BĐ-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2018-12-03',
    scopeOfPractice: 'Đo chức năng hô hấp, điều trị viêm phế quản cấp/mạn, hậu COVID kéo dài và hội chứng ngưng thở khi ngủ.',
    yearsOfExperience: 10,
    fee: 300000,
    rating: 4.86,
    totalConsultations: 740,
    bio: 'Thạc sĩ Hô hấp phụ trách phòng thăm dò chức năng hô hấp tại Bệnh viện Quân y 13 Quy Nhơn, giàu kinh nghiệm điều trị hen và viêm phế quản.',
  },
  {
    key: 'doc_qn_coxuongkhop_1',
    email: 'bs.phamminhtriet.coxuongkhop.qn@gmail.com',
    fullName: 'BS.CKII Phạm Minh Triết',
    phone: '0901235015',
    specialtySlug: 'orthopedics',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Ngoại Chấn Thương - Cơ Xương Khớp, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Chấn Thương Chỉnh Hình',
    licenseNumber: '021015/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2015-05-14',
    scopeOfPractice: 'Điều trị chấn thương thể thao, thoái hóa khớp gối, thoát vị đĩa đệm cột sống và loãng xương.',
    yearsOfExperience: 14,
    fee: 330000,
    rating: 4.91,
    totalConsultations: 1210,
    bio: 'Bác sĩ Chuyên khoa II Cơ Xương Khớp & Chấn thương chỉnh hình, chuyên xử trí bảo tồn và phục hồi chức năng sau chấn thương tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_coxuongkhop_2',
    email: 'bs.hoangthikim.coxuongkhop.qn@gmail.com',
    fullName: 'ThS.BS Hoàng Thị Kim',
    phone: '0901235016',
    specialtySlug: 'orthopedics',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Phòng khám Chuyên khoa Cơ Xương Khớp Quy Nhơn',
    clinicAddress: '210 Lê Hồng Phong, Phường Lê Hồng Phong, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Cơ Xương Khớp & Phục Hồi Chức Năng',
    licenseNumber: '021016/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2019-08-19',
    scopeOfPractice: 'Điều trị viêm khớp dạng thấp, gout cấp mạn, đau vai gáy văn phòng và tiêm khớp dưới siêu âm.',
    yearsOfExperience: 9,
    fee: 300000,
    rating: 4.88,
    totalConsultations: 790,
    bio: 'Thạc sĩ Nội Cơ Xương Khớp chuyên sâu điều trị bệnh gout, viêm khớp tự miễn và loãng xương cho người trung niên tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_thantietnieu_1',
    email: 'bs.nguyenxuanbach.thantietnieu.qn@gmail.com',
    fullName: 'BS.CKII Nguyễn Xuân Bách',
    phone: '0901235017',
    specialtySlug: 'nephrology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Nội Thận - Tiết Niệu, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Thận & Tiết Niệu',
    licenseNumber: '021017/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2016-07-21',
    scopeOfPractice: 'Điều trị sỏi thận – niệu quản, tăng huyết áp do thận, suy thận mạn và phì đại tuyến tiền liệt.',
    yearsOfExperience: 13,
    fee: 320000,
    rating: 4.89,
    totalConsultations: 920,
    bio: 'Bác sĩ Chuyên khoa II Thận - Tiết niệu 13 năm kinh nghiệm quản lý bảo tồn chức năng thận mạn và điều trị sỏi tiết niệu tại Bình Định.',
  },
  {
    key: 'doc_qn_thantietnieu_2',
    email: 'bs.vuthihong.thantietnieu.qn@gmail.com',
    fullName: 'BS.CKI Vũ Thị Hồng',
    phone: '0901235018',
    specialtySlug: 'nephrology',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định - Phần mở rộng',
    clinicAddress: '39A Phạm Ngọc Thạch, Đơn nguyên Thận nhân tạo, TP. Quy Nhơn, Bình Định',
    department: 'Đơn nguyên Thận Học Lâm Sàng',
    licenseNumber: '021018/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2020-04-06',
    scopeOfPractice: 'Điều trị nhiễm trùng đường tiểu tái phát, hội chứng thận hư, đái tháo đường biến chứng thận.',
    yearsOfExperience: 8,
    fee: 280000,
    rating: 4.85,
    totalConsultations: 610,
    bio: 'Bác sĩ Thận học tập trung tầm soát sớm bệnh thận đái tháo đường, viêm cầu thận và nhiễm khuẩn tiết niệu ở phụ nữ.',
  },
  {
    key: 'doc_qn_sanphukhoa_1',
    email: 'bs.dangthiminhchau.sanphukhoa.qn@gmail.com',
    fullName: 'BS.CKII Đặng Thị Minh Châu',
    phone: '0901235019',
    specialtySlug: 'obstetrics-gynecology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Phụ Sản, Phường Trần Phú, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Sản Bệnh & Chăm Sóc Trước Sinh',
    licenseNumber: '021019/BĐ-CCHN',
    licenseIssuedBy: 'Bộ Y Tế',
    licenseIssuedDate: '2014-11-12',
    scopeOfPractice: 'Quản lý thai kỳ nguy cơ cao, siêu âm hình thái thai, tầm soát ung thư cổ tử cung và tiền mãn kinh.',
    yearsOfExperience: 16,
    fee: 350000,
    rating: 4.94,
    totalConsultations: 1820,
    bio: 'Bác sĩ Chuyên khoa II Sản Phụ khoa uy tín hàng đầu tại Quy Nhơn với 16 năm đồng hành chăm sóc thai kỳ an toàn.',
  },
  {
    key: 'doc_qn_sanphukhoa_2',
    email: 'bs.buiquocthinh.sanphukhoa.qn@gmail.com',
    fullName: 'ThS.BS Bùi Quốc Thịnh',
    phone: '0901235020',
    specialtySlug: 'obstetrics-gynecology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định - Phần mở rộng',
    clinicAddress: '39A Phạm Ngọc Thạch, Trung tâm Sản Phụ Khoa, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Phụ Khoa & Hiếm Muộn',
    licenseNumber: '021020/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2018-06-28',
    scopeOfPractice: 'Khám phụ khoa định kỳ, điều trị u xơ tử cung, buồng trứng đa nang PCOS và tư vấn tiền hôn nhân.',
    yearsOfExperience: 10,
    fee: 320000,
    rating: 4.88,
    totalConsultations: 960,
    bio: 'Thạc sĩ Sản Phụ khoa chuyên sâu nội tiết sinh sản, điều trị rối loạn kinh nguyệt, buồng trứng đa nang và chăm sóc thai sản tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_noitiet_1',
    email: 'bs.truongminhtam.noitiet.qn@gmail.com',
    fullName: 'BS.CKII Trương Minh Tâm',
    phone: '0901235021',
    specialtySlug: 'endocrinology',
    academicTitle: 'BS.CKII',
    hospitalAffiliation: 'Bệnh viện Đa khoa Tỉnh Bình Định',
    clinicAddress: '106 Nguyễn Huệ, Khoa Nội Tiết & Đái Tháo Đường, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Nội Tiết - Đái Tháo Đường',
    licenseNumber: '021021/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2016-01-25',
    scopeOfPractice: 'Kiểm soát đường huyết HbA1c, điều trị cường giáp Basedow, suy giáp và tầm soát biến chứng bàn chân tiểu đường.',
    yearsOfExperience: 13,
    fee: 320000,
    rating: 4.91,
    totalConsultations: 1180,
    bio: 'Bác sĩ Chuyên khoa II Nội tiết với 13 năm quản lý toàn diện bệnh nhân đái tháo đường và bệnh lý tuyến giáp tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_noitiet_2',
    email: 'bs.lethithao.noitiet.qn@gmail.com',
    fullName: 'ThS.BS Lê Thị Thảo',
    phone: '0901235022',
    specialtySlug: 'endocrinology',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Phòng khám Nội tiết & Tuyến giáp Quy Nhơn',
    clinicAddress: '68 Xuân Diệu, Phường Hải Cảng, TP. Quy Nhơn, Bình Định',
    department: 'Chuyên Khoa Tuyến Giáp & Chuyển Hóa',
    licenseNumber: '021022/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2019-09-10',
    scopeOfPractice: 'Siêu âm nhân tuyến giáp, điều trị tiểu đường thai kỳ, rối loạn lipid máu và thừa cân béo phì.',
    yearsOfExperience: 9,
    fee: 290000,
    rating: 4.87,
    totalConsultations: 760,
    bio: 'Thạc sĩ Nội tiết chuyên theo dõi nhân giáp TIRADS, đái tháo đường thai kỳ và tư vấn dinh dưỡng chuyển hóa cá thể hóa.',
  },
  {
    key: 'doc_qn_taimuihong_1',
    email: 'bs.duongquockhanh.taimuihong.qn@gmail.com',
    fullName: 'BS.CKI Dương Quốc Khánh',
    phone: '0901235023',
    specialtySlug: 'ent',
    academicTitle: 'BS.CKI',
    hospitalAffiliation: 'Bệnh viện Đa khoa Hòa Bình Quy Nhơn',
    clinicAddress: '355 Trần Hưng Đạo, Khoa Tai Mũi Họng, TP. Quy Nhơn, Bình Định',
    department: 'Khoa Tai Mũi Họng & Phẫu Thuật Đầu Cổ',
    licenseNumber: '021023/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2018-02-14',
    scopeOfPractice: 'Nội soi Tai Mũi Họng ống mềm, điều trị viêm xoang cấp mạn, viêm tai giữa và viêm amidan hốc mủ.',
    yearsOfExperience: 10,
    fee: 280000,
    rating: 4.88,
    totalConsultations: 980,
    bio: 'Bác sĩ Chuyên khoa I Tai Mũi Họng giàu kinh nghiệm điều trị viêm mũi xoang dị ứng thời tiết biển và viêm họng mạn tại Quy Nhơn.',
  },
  {
    key: 'doc_qn_taimuihong_2',
    email: 'bs.nguyenthimai.taimuihong.qn@gmail.com',
    fullName: 'ThS.BS Nguyễn Thị Mai',
    phone: '0901235024',
    specialtySlug: 'ent',
    academicTitle: 'ThS.BS',
    hospitalAffiliation: 'Phòng khám Tai Mũi Họng Nội soi Quy Nhơn',
    clinicAddress: '175 Tây Sơn, Phường Quang Trung, TP. Quy Nhơn, Bình Định',
    department: 'Chuyên Khoa Tai Mũi Họng Nhi & Thính Học',
    licenseNumber: '021024/BĐ-CCHN',
    licenseIssuedBy: 'Sở Y Tế Bình Định',
    licenseIssuedDate: '2020-03-22',
    scopeOfPractice: 'Điều trị VA – amidan ở trẻ em, rối loạn giọng nói, khàn tiếng kéo dài và đo thính lực đồ.',
    yearsOfExperience: 8,
    fee: 270000,
    rating: 4.89,
    totalConsultations: 710,
    bio: 'Thạc sĩ Tai Mũi Họng chuyên khám nội soi nhẹ nhàng cho trẻ nhỏ và người lớn, tư vấn chăm sóc dây thanh và bảo vệ thính giác.',
  },
];

const PATIENTS = [
  {
    key: 'pat_thu',
    email: 'nguyenminhthu.bn@gmail.com',
    fullName: 'Nguyễn Minh Thư',
    phone: '0988101001',
    patientCode: 'BN-2026-10001',
    citizenId: '079192004821',
    bhyt: 'DN4792019482711',
    dob: '1992-05-18',
    gender: 'FEMALE',
    bloodGroup: 'O+',
    address: '128 Nguyễn Tri Phương, Phường 9, Quận 5, TP. Hồ Chí Minh',
    allergies: 'Dị ứng Penicillin, Amoxicillin, hải sản giáp xác',
    medicalHistory: 'Viêm dạ dày trào ngược GERD 2 năm, thiếu máu thiếu sắt nhẹ',
    ecName: 'Nguyễn Văn Thắng',
    ecPhone: '0908111222',
    ecRel: 'Anh trai',
    tier: 'FREE',
    quota: 3,
    vipDays: null,
  },
  {
    key: 'pat_nam',
    email: 'tranhoangnam.bn@gmail.com',
    fullName: 'Trần Hoàng Nam',
    phone: '0988101002',
    patientCode: 'BN-2026-10002',
    citizenId: '079078001592',
    bhyt: 'GD4792019881042',
    dob: '1978-11-04',
    gender: 'MALE',
    bloodGroup: 'A+',
    address: '45 Lý Tự Trọng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    allergies: 'Dị ứng Aspirin và nhóm kháng viêm NSAIDs',
    medicalHistory: 'Tăng huyết áp nguyên phát độ II (5 năm), Rối loạn lipid máu hỗn hợp',
    ecName: 'Lê Thị Thanh Mai',
    ecPhone: '0908222333',
    ecRel: 'Vợ',
    tier: 'VIP_MONTHLY',
    quota: 99,
    vipDays: 30,
  },
  {
    key: 'pat_kimanh',
    email: 'lethikimanh.bn@gmail.com',
    fullName: 'Lê Thị Kim Anh',
    phone: '0988101003',
    patientCode: 'BN-2026-10003',
    citizenId: '079186009341',
    bhyt: 'DN4792020112945',
    dob: '1986-03-22',
    gender: 'FEMALE',
    bloodGroup: 'B+',
    address: '88 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
    allergies: 'Phấn hoa, mạt bụi nhà, lông mèo',
    medicalHistory: 'Hen phế quản kiểm soát một phần từ năm 2021',
    ecName: 'Lê Văn Hùng',
    ecPhone: '0908333444',
    ecRel: 'Bố ruột',
    tier: 'FREE',
    quota: 2,
    vipDays: null,
  },
  {
    key: 'pat_giabao',
    email: 'phamgiabao.bn@gmail.com',
    fullName: 'Phạm Gia Bảo',
    phone: '0988101004',
    patientCode: 'BN-2026-10004',
    citizenId: '001095012847',
    bhyt: 'HN4012022991823',
    dob: '1995-08-09',
    gender: 'MALE',
    bloodGroup: 'AB+',
    address: '165 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
    allergies: 'Chưa ghi nhận tiền sử dị ứng thuốc',
    medicalHistory: 'Đau nửa đầu Migraine không có aura, thoái hóa nhẹ cột sống cổ C5–C6',
    ecName: 'Phạm Thị Hồng',
    ecPhone: '0912444555',
    ecRel: 'Mẹ ruột',
    tier: 'FREE',
    quota: 5,
    vipDays: null,
  },
  {
    key: 'pat_thuytrang',
    email: 'vothuytrang.bn@gmail.com',
    fullName: 'Võ Thùy Trang',
    phone: '0988101005',
    patientCode: 'BN-2026-10005',
    citizenId: '048182003198',
    bhyt: 'DN4482021772930',
    dob: '1982-12-28',
    gender: 'FEMALE',
    bloodGroup: 'O-',
    address: '74 Bạch Đằng, Phường Hải Châu I, Quận Hải Châu, TP. Đà Nẵng',
    allergies: 'Kháng sinh nhóm Sulfonamide (Co-trimoxazol)',
    medicalHistory: 'Đái tháo đường type 2 (4 năm, đang điều trị Metformin 850mg/ngày)',
    ecName: 'Võ Quang Minh',
    ecPhone: '0905555666',
    ecRel: 'Chồng',
    tier: 'VIP_MONTHLY',
    quota: 50,
    vipDays: 45,
  },
];

// 15 Relative Appointments: 6 COMPLETED + 4 TODAY + 3 UPCOMING + 2 CANCELLED
const APPOINTMENTS = [
  // === 6 COMPLETED (Past 2 weeks) ===
  {
    code: 'AP-DEMO-C001',
    patientKey: 'pat_nam',
    doctorKey: 'doc_timmach',
    startAt: atLocalOffset(-13, 8, 30, true),
    endAt: atLocalOffset(-13, 9, 0, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 450000,
    queueNumber: 'STT 01',
    room: 'Phòng 201 - Khoa Tim Mạch',
    chiefComplaint: 'Đau đầu vùng chẩm sáng sớm, hồi hộp trống ngực khi leo cầu thang 1 tuần nay',
    vitals: { bloodPressure: '148/92', heartRate: 86, temperature: 36.7, respiratoryRate: 18, height: 171, weight: 74, bmi: 25.3, spO2: 98 },
    icdCode: 'I10',
    icdName: 'Tăng huyết áp vô căn (nguyên phát)',
    prescription: [
      { drugName: 'Amlodipin 5mg', activeIngredient: 'Amlodipine besylate', dosage: 'Uống 1 viên/lần buổi sáng sau ăn', quantity: 30, unit: 'viên', days: 30 },
      { drugName: 'Losartan 50mg', activeIngredient: 'Losartan potassium', dosage: 'Uống 1 viên/lần buổi tối', quantity: 30, unit: 'viên', days: 30 },
    ],
    treatmentPlan: 'Giảm muối dưới 5g/ngày, đo huyết áp tại nhà sáng/tối và ghi nhật ký. Tránh gắng sức đột ngột, tái khám sau 4 tuần.',
    followUpDays: 14,
    notes: 'Bệnh nhân đáp ứng tốt, tránh tuyệt đối nhóm NSAIDs do tiền sử dị ứng Aspirin.',
    review: { rating: 5, comment: 'Bác sĩ giải thích cặn kẽ kết quả điện tim và điều chỉnh đơn thuốc rất dễ hiểu.', tags: 'Tận tình,Giải thích rõ,Đúng giờ' },
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-C002',
    patientKey: 'pat_thu',
    doctorKey: 'doc_tieuhoa',
    startAt: atLocalOffset(-11, 9, 30, true),
    endAt: atLocalOffset(-11, 10, 0, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 350000,
    queueNumber: 'STT 02',
    room: 'Phòng 302 - Khoa Tiêu Hóa',
    chiefComplaint: 'Nóng rát vùng thượng vị sau bữa ăn, ợ chua về đêm gây khó ngủ kéo dài 10 ngày',
    vitals: { bloodPressure: '112/72', heartRate: 74, temperature: 36.6, respiratoryRate: 16, height: 160, weight: 52, bmi: 20.3, spO2: 99 },
    icdCode: 'K21.0',
    icdName: 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản',
    prescription: [
      { drugName: 'Nexium MUPS 40mg', activeIngredient: 'Esomeprazol', dosage: 'Uống 1 viên trước ăn sáng 30 phút', quantity: 14, unit: 'viên', days: 14 },
      { drugName: 'Gaviscon Dual Action', activeIngredient: 'Natri alginat + Natri bicarbonat', dosage: 'Uống 1 gói sau ăn 30 phút và trước khi ngủ', quantity: 28, unit: 'gói', days: 14 },
    ],
    treatmentPlan: 'Chia nhỏ bữa ăn, không nằm ngay sau ăn trong vòng 3 giờ, hạn chế cà phê và thức ăn cay chua.',
    followUpDays: 10,
    notes: 'Không kê kháng sinh Beta-lactam (bệnh nhân dị ứng Penicillin/Amoxicillin).',
    review: { rating: 5, comment: 'Khám nhẹ nhàng, dặn dò chế độ ăn uống chi tiết và kê thuốc hợp cơ địa dị ứng.', tags: 'Tận tình,Chuyên môn cao' },
    payMethod: 'STRIPE',
  },
  {
    code: 'AP-DEMO-C003',
    patientKey: 'pat_kimanh',
    doctorKey: 'doc_hohap',
    startAt: atLocalOffset(-8, 10, 0, true),
    endAt: atLocalOffset(-8, 10, 30, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 380000,
    queueNumber: 'STT 03',
    room: 'Phòng 108 - Khoa Hô Hấp',
    chiefComplaint: 'Khó thở nhẹ và khò khè về khuya khi thay đổi thời tiết, kèm ho khan rải rác',
    vitals: { bloodPressure: '118/76', heartRate: 82, temperature: 36.8, respiratoryRate: 20, height: 158, weight: 54, bmi: 21.6, spO2: 96 },
    icdCode: 'J45.9',
    icdName: 'Hen phế quản kiểm soát một phần',
    prescription: [
      { drugName: 'Symbicort Turbuhaler 160/4.5mcg', activeIngredient: 'Budesonide + Formoterol', dosage: 'Hít 1 nhát sáng, 1 nhát tối hàng ngày (súc miệng sau hít)', quantity: 1, unit: 'lọ', days: 30 },
      { drugName: 'Singulair 10mg', activeIngredient: 'Montelukast', dosage: 'Uống 1 viên mỗi tối trước khi đi ngủ', quantity: 30, unit: 'viên', days: 30 },
    ],
    treatmentPlan: 'Hướng dẫn kỹ thuật bình hít Turbuhaler chuẩn, tránh phấn hoa và bụi nhà, mang thuốc cắt cơn khi ra ngoài.',
    followUpDays: 21,
    notes: 'Đo SpO2 sau khí dung cải thiện từ 96% lên 98%.',
    review: { rating: 5, comment: 'Bác sĩ chỉ tận tay cách dùng ống hít đúng cách, giảm hẳn khó thở sau 3 ngày.', tags: 'Tận tâm,Hiệu quả' },
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-C004',
    patientKey: 'pat_thuytrang',
    doctorKey: 'doc_noitiet',
    startAt: atLocalOffset(-6, 14, 0, true),
    endAt: atLocalOffset(-6, 14, 30, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 350000,
    queueNumber: 'STT 05',
    room: 'Phòng 210 - Khoa Nội Tiết',
    chiefComplaint: 'Tái khám định kỳ kiểm tra chỉ số HbA1c, hay khát nước buổi chiều và tê nhẹ đầu ngón chân',
    vitals: { bloodPressure: '128/80', heartRate: 76, temperature: 36.5, respiratoryRate: 17, height: 157, weight: 61, bmi: 24.7, spO2: 98 },
    icdCode: 'E11.9',
    icdName: 'Đái tháo đường type 2 chưa có biến chứng nặng',
    prescription: [
      { drugName: 'Glucophage XR 750mg', activeIngredient: 'Metformin HCl', dosage: 'Uống 1 viên/ngày ngay sau bữa tối', quantity: 30, unit: 'viên', days: 30 },
      { drugName: 'Forxiga 10mg', activeIngredient: 'Dapagliflozin', dosage: 'Uống 1 viên/ngày vào buổi sáng', quantity: 30, unit: 'viên', days: 30 },
    ],
    treatmentPlan: 'Kiểm soát khẩu phần tinh bột, đi bộ 30 phút mỗi ngày, kiểm tra lại HbA1c và chức năng thận sau 1 tháng.',
    followUpDays: 28,
    notes: 'Ghi nhận dị ứng Sulfonamide -> tránh nhóm Sulfonylurea và nhóm thuốc gốc Sulfa.',
    review: { rating: 4, comment: 'Tư vấn chế độ ăn cho người tiểu đường rất thực tế.', tags: 'Rõ ràng,Chu đáo' },
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-C005',
    patientKey: 'pat_giabao',
    doctorKey: 'doc_thankinh',
    startAt: atLocalOffset(-4, 15, 0, true),
    endAt: atLocalOffset(-4, 15, 30, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 400000,
    queueNumber: 'STT 06',
    room: 'Phòng 203 - Khoa Thần Kinh',
    chiefComplaint: 'Đau nửa đầu bên phải theo nhịp mạch đập kèm sợ ánh sáng khi làm việc máy tính nhiều',
    vitals: { bloodPressure: '118/74', heartRate: 72, temperature: 36.6, respiratoryRate: 16, height: 173, weight: 67, bmi: 22.4, spO2: 99 },
    icdCode: 'G43.9',
    icdName: 'Đau nửa đầu (Migraine), không đặc hiệu',
    prescription: [
      { drugName: 'Sumatriptan 50mg', activeIngredient: 'Sumatriptan', dosage: 'Uống 1 viên ngay khi khởi phát cơn đau (tối đa 2 viên/24h)', quantity: 10, unit: 'viên', days: 15 },
      { drugName: 'Magne B6 Corbiere', activeIngredient: 'Magnesium lactat + Pyridoxin', dosage: 'Uống 1 viên sáng, 1 viên trưa sau ăn', quantity: 30, unit: 'viên', days: 15 },
    ],
    treatmentPlan: 'Ngủ đủ 7–8 tiếng, áp dụng quy tắc 20-20-20 khi dùng màn hình, tránh bỏ bữa và hạn chế caffein buổi chiều.',
    followUpDays: 14,
    notes: 'Không có dấu hiệu thần kinh khu trú, loại trừ tăng áp lực nội sọ.',
    review: { rating: 5, comment: 'Thuốc cắt cơn hiệu quả nhanh, bác sĩ hướng dẫn phòng ngừa tái phát rất tốt.', tags: 'Hiệu quả,Đúng giờ' },
    payMethod: 'STRIPE',
  },
  {
    code: 'AP-DEMO-C006',
    patientKey: 'pat_giabao',
    doctorKey: 'doc_coxuongkhop',
    startAt: atLocalOffset(-2, 10, 30, true),
    endAt: atLocalOffset(-2, 11, 0, true),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fee: 380000,
    queueNumber: 'STT 04',
    room: 'Phòng 112 - Cơ Xương Khớp',
    chiefComplaint: 'Đau mỏi vùng cổ vai gáy lan xuống bả vai phải sau khi ngồi làm việc liên tục 8 giờ',
    vitals: { bloodPressure: '120/76', heartRate: 74, temperature: 36.7, respiratoryRate: 16, height: 173, weight: 67, bmi: 22.4, spO2: 99 },
    icdCode: 'M54.2',
    icdName: 'Đau cột sống cổ (Cervicalgia)',
    prescription: [
      { drugName: 'Mydocalm 150mg', activeIngredient: 'Tolperisone', dosage: 'Uống 1 viên x 2 lần/ngày sáng tối sau ăn', quantity: 20, unit: 'viên', days: 10 },
      { drugName: 'Arcoxia 60mg', activeIngredient: 'Etoricoxib', dosage: 'Uống 1 viên/ngày sau ăn sáng khi đau nhiều', quantity: 7, unit: 'viên', days: 7 },
    ],
    treatmentPlan: 'Tập vật lý trị liệu kéo giãn cột sống cổ 15 phút/ngày, nâng màn hình ngang tầm mắt.',
    followUpDays: 12,
    notes: 'Vận động cột sống cổ hạn chế nhẹ khi xoay phải, chưa có dấu hiệu chèn ép rễ nặng.',
    review: null,
    payMethod: 'VIETQR',
  },

  // === 4 TODAY (3 SCHEDULED + 1 IN_PROGRESS -> Dashboard queue looks alive immediately) ===
  {
    code: 'AP-DEMO-T001',
    patientKey: 'pat_nam',
    doctorKey: 'doc_timmach',
    startAt: atLocalOffset(0, 9, 0, false),
    endAt: atLocalOffset(0, 9, 30, false),
    status: 'IN_PROGRESS',
    paymentStatus: 'PAID',
    fee: 450000,
    queueNumber: 'STT 01',
    room: 'Phòng 201 - Khoa Tim Mạch',
    chiefComplaint: 'Tái khám kiểm tra huyết áp sau 2 tuần dùng Amlodipin + Losartan, thỉnh thoảng hơi choáng khi đứng dậy nhanh',
    vitals: { bloodPressure: '132/82', heartRate: 76 },
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Bệnh nhân đã có mặt tại phòng khám để đối chiếu nhật ký huyết áp.',
    review: null,
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-T002',
    patientKey: 'pat_thu',
    doctorKey: 'doc_timmach',
    startAt: atLocalOffset(0, 10, 0, false),
    endAt: atLocalOffset(0, 10, 30, false),
    status: 'SCHEDULED',
    paymentStatus: 'PAID',
    fee: 450000,
    queueNumber: 'STT 02',
    room: 'Phòng 201 - Khoa Tim Mạch',
    chiefComplaint: 'Hồi hộp tim đập nhanh kèm tức nhẹ ngực trái buổi sáng sau khi uống cà phê',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Yêu cầu đo điện tâm đồ ECG 12 chuyển đạo.',
    review: null,
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-T003',
    patientKey: 'pat_thuytrang',
    doctorKey: 'doc_timmach',
    startAt: atLocalOffset(0, 14, 0, false),
    endAt: atLocalOffset(0, 14, 30, false),
    status: 'SCHEDULED',
    paymentStatus: 'UNPAID',
    fee: 450000,
    queueNumber: 'STT 03',
    room: 'Phòng 201 - Khoa Tim Mạch',
    chiefComplaint: 'Khám tầm soát biến chứng tim mạch trên bệnh nhân đái tháo đường type 2',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Lưu ý tiền sử dị ứng nhóm Sulfonamide.',
    review: null,
    payMethod: null,
  },
  {
    code: 'AP-DEMO-T004',
    patientKey: 'pat_kimanh',
    doctorKey: 'doc_tieuhoa',
    startAt: atLocalOffset(0, 15, 0, false),
    endAt: atLocalOffset(0, 15, 30, false),
    status: 'SCHEDULED',
    paymentStatus: 'PAID',
    fee: 350000,
    queueNumber: 'STT 01',
    room: 'Phòng 302 - Khoa Tiêu Hóa',
    chiefComplaint: 'Đầy hơi chướng bụng sau ăn, đi tiêu phân lỏng thất thường 2 tuần gần đây',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Nghi ngờ hội chứng ruột kích thích (IBS) hoặc không dung nạp lactose.',
    review: null,
    payMethod: 'STRIPE',
  },

  // === 3 UPCOMING (Next 5 days, skipping Sunday) ===
  {
    code: 'AP-DEMO-U001',
    patientKey: 'pat_thu',
    doctorKey: 'doc_tieuhoa',
    startAt: atLocalOffset(2, 9, 0, true),
    endAt: atLocalOffset(2, 9, 30, true),
    status: 'SCHEDULED',
    paymentStatus: 'PAID',
    fee: 350000,
    queueNumber: 'STT 01',
    room: 'Phòng 302 - Khoa Tiêu Hóa',
    chiefComplaint: 'Tái khám đánh giá đáp ứng điều trị GERD sau 2 tuần dùng Nexium',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Đem theo kết quả xét nghiệm hơi thở kiểm tra HP (nếu có).',
    review: null,
    payMethod: 'STRIPE',
  },
  {
    code: 'AP-DEMO-U002',
    patientKey: 'pat_giabao',
    doctorKey: 'doc_taimuihong',
    startAt: atLocalOffset(3, 10, 30, true),
    endAt: atLocalOffset(3, 11, 0, true),
    status: 'SCHEDULED',
    paymentStatus: 'PAID',
    fee: 300000,
    queueNumber: 'STT 01',
    room: 'Phòng 105 - Tai Mũi Họng',
    chiefComplaint: 'Nghẹt mũi một bên kéo dài vào sáng sớm, chảy dịch mũi sau và đau nặng vùng trán',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Đăng ký nội soi Tai Mũi Họng ống mềm.',
    review: null,
    payMethod: 'VIETQR',
  },
  {
    code: 'AP-DEMO-U003',
    patientKey: 'pat_nam',
    doctorKey: 'doc_noitongquat',
    startAt: atLocalOffset(5, 14, 30, true),
    endAt: atLocalOffset(5, 15, 0, true),
    status: 'SCHEDULED',
    paymentStatus: 'UNPAID',
    fee: 300000,
    queueNumber: 'STT 02',
    room: 'Phòng 102 - Nội Tổng Quát',
    chiefComplaint: 'Khám kiểm tra sức khỏe tổng quát, xét nghiệm mỡ máu và men gan định kỳ 6 tháng',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    notes: 'Nhịn ăn sáng/trước xét nghiệm máu theo hướng dẫn.',
    review: null,
    payMethod: null,
  },

  // === 2 CANCELLED (Within last 7 days with realistic reasons) ===
  {
    code: 'AP-DEMO-X001',
    patientKey: 'pat_kimanh',
    doctorKey: 'doc_dalieu',
    startAt: atLocalOffset(-5, 15, 0, true),
    endAt: atLocalOffset(-5, 15, 30, true),
    status: 'CANCELLED',
    paymentStatus: 'REFUNDED',
    fee: 300000,
    refundAmount: 300000,
    refundPercentage: 100,
    refundedAt: atLocalOffset(-6, 10, 15, true),
    refundPolicyNote: 'Hoàn tiền 100% (Hủy lịch trước giờ khám trên 24 giờ)',
    queueNumber: 'STT 04',
    room: 'Phòng 109 - Khoa Da Liễu',
    chiefComplaint: 'Nổi mề đay mẩn đỏ vùng cánh tay sau khi tiếp xúc bụi ẩm',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    cancellationReason: 'Bệnh nhân bận công tác đột xuất tại Bình Dương, xin hủy và hoàn tiền để đặt lại cuối tuần.',
    notes: null,
    review: null,
    payMethod: 'STRIPE',
  },
  {
    code: 'AP-DEMO-X002',
    patientKey: 'pat_thuytrang',
    doctorKey: 'doc_sanphukhoa',
    startAt: atLocalOffset(-1, 16, 0, true),
    endAt: atLocalOffset(-1, 16, 30, true),
    status: 'CANCELLED',
    paymentStatus: 'UNPAID',
    fee: 400000,
    queueNumber: 'STT 07',
    room: 'Phòng 206 - Sản Phụ Khoa',
    chiefComplaint: 'Khám kiểm tra phụ khoa định kỳ 6 tháng',
    vitals: null,
    icdCode: null,
    icdName: null,
    prescription: null,
    treatmentPlan: null,
    followUpDays: null,
    cancellationReason: 'Thay đổi lịch di chuyển chuyến bay từ Đà Nẵng vào TP.HCM.',
    notes: null,
    review: null,
    payMethod: null,
  },
];

function buildSql() {
  const lines = [];
  lines.push('\\set ON_ERROR_STOP on');
  lines.push('BEGIN;');
  lines.push('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  lines.push('');
  lines.push('-- ===================================================================');
  lines.push('-- 1. CLEANUP OLD TEST DATA IN STRICT FK ORDER (CHILD -> PARENT)');
  lines.push('-- Preserves: flyway_schema_history, specialties, system_configs, ADMIN');
  lines.push('-- ===================================================================');
  lines.push('DELETE FROM doctor_reviews;');
  lines.push('DELETE FROM ai_token_usage;');
  lines.push('DELETE FROM document_analyses;');
  lines.push('DELETE FROM payment_transactions;');
  lines.push('DELETE FROM notifications;');
  lines.push('DELETE FROM password_reset_tokens;');
  lines.push('DELETE FROM email_verification_tokens;');
  lines.push('DELETE FROM audit_logs;');
  lines.push('DELETE FROM appointments;');
  lines.push('DELETE FROM triage_sessions;');
  lines.push('DELETE FROM medical_documents;');
  lines.push('DELETE FROM doctor_schedule_exceptions;');
  lines.push('DELETE FROM doctor_schedule_slots;');
  lines.push('DELETE FROM doctor_specialties;');
  lines.push('DELETE FROM doctor_profiles;');
  lines.push('DELETE FROM patient_profiles;');
  lines.push("DELETE FROM users WHERE role IN ('DOCTOR', 'PATIENT');");
  lines.push('');

  lines.push('DO $$');
  lines.push('DECLARE');
  lines.push(`  v_pw_hash TEXT := crypt(${esc(DEMO_PASSWORD)}, gen_salt('bf', 10));`);
  for (const d of DOCTORS) {
    lines.push(`  v_user_${d.key} UUID;`);
    lines.push(`  v_prof_${d.key} UUID;`);
    lines.push(`  v_spec_${d.key} UUID;`);
  }
  for (const p of PATIENTS) {
    lines.push(`  v_user_${p.key} UUID;`);
  }
  lines.push('  v_appt_id UUID;');
  lines.push('  v_tx_idx INT := 0;');
  lines.push('  v_day TEXT;');
  lines.push("  v_weekdays TEXT[] := ARRAY['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];");
  lines.push('BEGIN');
  lines.push("  IF (SELECT COUNT(*) FROM specialties) = 0 THEN RAISE EXCEPTION 'specialties catalog is empty!'; END IF;");
  lines.push("  IF (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') = 0 THEN RAISE EXCEPTION 'No ADMIN user found!'; END IF;");
  lines.push('');

  // Doctors
  lines.push('  -- 2. SEED 36 VERIFIED DOCTORS ACROSS ALL 12 SPECIALTIES (12 TP.HCM + 24 QUY NHƠN)');
  DOCTORS.forEach((d, idx) => {
    const avatar = doctorAvatarUrl(idx);
    lines.push(`  INSERT INTO users (email, password_hash, full_name, phone, avatar_url, role, status, is_active, email_verified, email_verified_at)`);
    lines.push(`  VALUES (${esc(d.email)}, v_pw_hash, ${esc(d.fullName)}, ${esc(d.phone)}, ${esc(avatar)}, 'DOCTOR', 'ACTIVE', TRUE, TRUE, NOW())`);
    lines.push(`  RETURNING id INTO v_user_${d.key};`);

    lines.push(`  INSERT INTO doctor_profiles (user_id, bio, license_number, consultation_fee, years_of_experience, academic_title, hospital_affiliation, clinic_address, department, license_issued_by, license_issued_date, scope_of_practice, verification_status, is_verified, verified_at, rating, total_consultations, review_count, slot_duration_minutes, buffer_time_minutes)`);
    lines.push(`  VALUES (v_user_${d.key}, ${esc(d.bio)}, ${esc(d.licenseNumber)}, ${d.fee.toFixed(2)}, ${d.yearsOfExperience}, ${esc(d.academicTitle)}, ${esc(d.hospitalAffiliation)}, ${esc(d.clinicAddress)}, ${esc(d.department)}, ${esc(d.licenseIssuedBy)}, ${esc(d.licenseIssuedDate)}::date, ${esc(d.scopeOfPractice)}, 'APPROVED', TRUE, NOW(), ${d.rating}, ${d.totalConsultations}, 0, 30, 0)`);
    lines.push(`  RETURNING id INTO v_prof_${d.key};`);

    lines.push(`  SELECT id INTO v_spec_${d.key} FROM specialties WHERE slug = ${esc(d.specialtySlug)} LIMIT 1;`);
    lines.push(`  IF v_spec_${d.key} IS NULL THEN RAISE EXCEPTION 'Missing specialty slug: %', ${esc(d.specialtySlug)}; END IF;`);
    lines.push(`  INSERT INTO doctor_specialties (doctor_profile_id, specialty_id) VALUES (v_prof_${d.key}, v_spec_${d.key});`);

    // Mon-Fri Morning & Afternoon + Saturday Morning
    lines.push(`  FOREACH v_day IN ARRAY v_weekdays LOOP`);
    lines.push(`    INSERT INTO doctor_schedule_slots (doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active) VALUES (v_prof_${d.key}, v_day, '08:00:00'::time, '12:00:00'::time, 30, TRUE);`);
    lines.push(`    INSERT INTO doctor_schedule_slots (doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active) VALUES (v_prof_${d.key}, v_day, '13:30:00'::time, '17:00:00'::time, 30, TRUE);`);
    lines.push(`  END LOOP;`);
    lines.push(`  INSERT INTO doctor_schedule_slots (doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active) VALUES (v_prof_${d.key}, 'SATURDAY', '08:00:00'::time, '12:00:00'::time, 30, TRUE);`);
    lines.push('');
  });

  // Sample schedule exceptions for Cardiologist #1 (Cal.com tab demo)
  const ex1Date = localDateOffset(7, true);
  const ex2Date = localDateOffset(10, true);
  lines.push(`  -- Sample Date Exceptions for TS.BS Nguyễn Văn An`);
  lines.push(`  INSERT INTO doctor_schedule_exceptions (doctor_profile_id, exception_date, is_day_off, custom_shifts_json, reason) VALUES`);
  lines.push(`    (v_prof_doc_timmach, ${esc(ex1Date)}::date, TRUE, '[]', 'Tham dự Hội nghị Tim mạch Toàn quốc'),`);
  lines.push(`    (v_prof_doc_timmach, ${esc(ex2Date)}::date, FALSE, '[{"startTime":"08:00","endTime":"11:30"},{"startTime":"18:00","endTime":"20:30"}]', 'Khám tăng cường ngoài giờ buổi tối');`);
  lines.push('');

  // Patients
  lines.push('  -- 3. SEED 5 PATIENTS WITH FULL EMR PROFILES');
  for (const p of PATIENTS) {
    const avatar = patientAvatarUrl(p.fullName);
    const vipClause = p.vipDays ? `NOW() + INTERVAL '${p.vipDays} days'` : 'NULL';
    lines.push(`  INSERT INTO users (email, password_hash, full_name, phone, avatar_url, role, status, is_active, email_verified, email_verified_at, scan_quota, subscription_tier, vip_valid_until)`);
    lines.push(`  VALUES (${esc(p.email)}, v_pw_hash, ${esc(p.fullName)}, ${esc(p.phone)}, ${esc(avatar)}, 'PATIENT', 'ACTIVE', TRUE, TRUE, NOW(), ${p.quota}, ${esc(p.tier)}, ${vipClause})`);
    lines.push(`  RETURNING id INTO v_user_${p.key};`);

    lines.push(`  INSERT INTO patient_profiles (user_id, patient_code, citizen_id, health_insurance_number, date_of_birth, gender, blood_group, address, allergies, medical_history, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)`);
    lines.push(`  VALUES (v_user_${p.key}, ${esc(p.patientCode)}, ${esc(p.citizenId)}, ${esc(p.bhyt)}, ${esc(p.dob)}::date, ${esc(p.gender)}, ${esc(p.bloodGroup)}, ${esc(p.address)}, ${esc(p.allergies)}, ${esc(p.medicalHistory)}, ${esc(p.ecName)}, ${esc(p.ecPhone)}, ${esc(p.ecRel)});`);
    lines.push('');
  }

  // Appointments + PaymentTransactions + DoctorReviews
  lines.push('  -- 4. SEED 15 RELATIVE-TIME APPOINTMENTS + PAYMENTS + REVIEWS');
  for (const a of APPOINTMENTS) {
    const docVar = `v_user_${a.doctorKey}`;
    const patVar = `v_user_${a.patientKey}`;
    const followUp = a.followUpDays !== null && a.followUpDays !== undefined
      ? `${esc(localDateOffset(a.followUpDays, true))}::date`
      : 'NULL';
    const refundAmountSql = a.refundAmount !== undefined && a.refundAmount !== null ? Number(a.refundAmount).toFixed(2) : 'NULL';
    const refundPctSql = a.refundPercentage !== undefined && a.refundPercentage !== null ? String(a.refundPercentage) : 'NULL';
    const refundedAtSql = a.refundedAt ? `${esc(a.refundedAt)}::timestamptz` : 'NULL';
    const refundNoteSql = esc(a.refundPolicyNote || null);

    lines.push(`  INSERT INTO appointments (appointment_code, patient_id, doctor_id, scheduled_start, scheduled_end, status, payment_status, fee_amount, refund_amount, refund_percentage, refunded_at, refund_policy_note, queue_number, clinic_room, chief_complaint, vital_signs_json, icd_code, icd10code, icd_version, icd10_name, icd10name, prescription_json, treatment_plan, follow_up_date, cancellation_reason, consultation_notes)`);
    lines.push(`  VALUES (${esc(a.code)}, ${patVar}, ${docVar}, ${esc(a.startAt)}::timestamptz, ${esc(a.endAt)}::timestamptz, ${esc(a.status)}, ${esc(a.paymentStatus)}, ${a.fee.toFixed(2)}, ${refundAmountSql}, ${refundPctSql}, ${refundedAtSql}, ${refundNoteSql}, ${esc(a.queueNumber)}, ${esc(a.room)}, ${esc(a.chiefComplaint)}, ${a.vitals ? sqlJson(a.vitals) : 'NULL'}, ${esc(a.icdCode)}, ${esc(a.icdCode)}, 'ICD-10', ${esc(a.icdName)}, ${esc(a.icdName)}, ${a.prescription ? sqlJson(a.prescription) : 'NULL'}, ${esc(a.treatmentPlan)}, ${followUp}, ${esc(a.cancellationReason || null)}, ${esc(a.notes)})`);
    lines.push(`  RETURNING id INTO v_appt_id;`);

    if (a.paymentStatus === 'PAID' || a.paymentStatus === 'REFUNDED') {
      const txStatus = a.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'COMPLETED';
      lines.push(`  v_tx_idx := v_tx_idx + 1;`);
      lines.push(`  INSERT INTO payment_transactions (transaction_code, user_id, order_type, reference_id, amount, currency, payment_method, payment_gateway, status, created_at, updated_at, version)`);
      lines.push(`  VALUES ('TX-SEED-' || LPAD(v_tx_idx::text, 4, '0'), ${patVar}, 'APPOINTMENT_FEE', v_appt_id::text, ${a.fee.toFixed(2)}, 'VND', ${esc(a.payMethod || 'VIETQR')}, 'SANDBOX', ${esc(txStatus)}, (${esc(a.startAt)}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh'), NOW(), 0);`);
    }

    if (a.review) {
      lines.push(`  INSERT INTO doctor_reviews (id, appointment_id, doctor_id, patient_id, rating, comment, tags, created_at, updated_at)`);
      lines.push(`  VALUES (gen_random_uuid(), v_appt_id, ${docVar}, ${patVar}, ${a.review.rating}, ${esc(a.review.comment)}, ${esc(a.review.tags)}, NOW(), NOW());`);
    }
  }

  // Recompute review_count dynamically from seeded reviews so counts match DB reality
  lines.push('');
  lines.push('  UPDATE doctor_profiles dp SET review_count = COALESCE((SELECT COUNT(*) FROM doctor_reviews dr WHERE dr.doctor_id = dp.user_id), 0);');
  lines.push('');

  // Sample realistic notifications for primary doctor and patient
  lines.push('  -- 5. SAMPLE NOTIFICATIONS FOR DEMO WORKFLOW');
  lines.push(`  INSERT INTO notifications (user_id, type, title, message, is_read) VALUES`);
  lines.push(`    (v_user_doc_timmach, 'APPOINTMENT_NEW', 'Lịch Hẹn Hôm Nay: AP-DEMO-T002', 'Bệnh nhân Nguyễn Minh Thư có lịch hẹn khám Tim mạch vào lúc 10:00 hôm nay.', FALSE),`);
  lines.push(`    (v_user_doc_timmach, 'SYSTEM', 'Hồ Sơ CCHN Đã Xác Thực', 'Tài khoản TS.BS Nguyễn Văn An đã hiển thị công khai trên hệ thống tìm kiếm.', TRUE),`);
  lines.push(`    (v_user_pat_thu, 'APPOINTMENT_CONFIRMED', 'Xác Nhận Lịch Khám: AP-DEMO-T002', 'Lịch khám với TS.BS Nguyễn Văn An lúc 10:00 hôm nay đã được xác nhận tại 215 Hồng Bàng, Q.5.', FALSE);`);

  lines.push('END $$;');
  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

function runPsql(sql) {
  const res = spawnSync(
    'docker',
    ['exec', '-i', POSTGRES_CONTAINER, 'sh', '-c', 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
    { input: sql, encoding: 'utf8' }
  );
  if (res.status !== 0) {
    console.error('❌ PostgreSQL execution failed:');
    if (res.stdout) console.error(res.stdout);
    if (res.stderr) console.error(res.stderr);
    process.exit(res.status || 1);
  }
  return res.stdout || '';
}

function flushRedis() {
  const res = spawnSync('docker', ['exec', REDIS_CONTAINER, 'redis-cli', 'FLUSHDB'], { encoding: 'utf8' });
  if (res.status === 0) {
    console.log('🧹 Redis L2 cache flushed (FLUSHDB).');
  } else {
    console.warn('⚠️  Could not flush Redis (skipping):', res.stderr?.trim() || 'unknown error');
  }
}

function verifySummary() {
  const query = `
    SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role;
    SELECT status, COUNT(*) AS count FROM appointments GROUP BY status ORDER BY status;
    SELECT COUNT(*) AS doctor_schedule_slots FROM doctor_schedule_slots WHERE is_active = TRUE;
    SELECT COUNT(*) AS schedule_exceptions FROM doctor_schedule_exceptions;
    SELECT email, full_name, role FROM users WHERE role = 'ADMIN' ORDER BY email;
  `;
  return runPsql(query);
}

console.log('🚀 MediAssist-AI Production Reset & Seed Script starting...');
generateDoctorAvatars();
const sql = buildSql();
runPsql(sql);
flushRedis();
const statsOut = verifySummary();

console.log('\n✅ Database Reset & Seed COMPLETED atomically!');
console.log(statsOut.trim());

console.log('\n================ DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP DEMO ================');
console.log(`Mật khẩu chung cho toàn bộ Bác sĩ & Bệnh nhân: ${DEMO_PASSWORD}`);
console.log('------------------------------------------------------------------------');
console.table([
  { VaiTro: 'ADMIN (Giu nguyen)', Email: 'admin@mediassist.local', MatKhau: '(Giu nguyen mat khau Admin)', HoTen: 'System Administrator', DiaChiPhongKham: '—' },
  ...DOCTORS.map((d, idx) => ({
    VaiTro: `DOCTOR (${d.specialtySlug})`,
    Email: d.email,
    MatKhau: DEMO_PASSWORD,
    HoTen: d.fullName,
    DiaChiPhongKham: d.clinicAddress,
    Avatar: doctorAvatarUrl(idx),
  })),
  ...PATIENTS.map((p) => ({
    VaiTro: `PATIENT (${p.bloodGroup})`,
    Email: p.email,
    MatKhau: DEMO_PASSWORD,
    HoTen: p.fullName,
    DiaChiPhongKham: p.address,
    Avatar: 'ui-avatars PNG',
  })),
]);
