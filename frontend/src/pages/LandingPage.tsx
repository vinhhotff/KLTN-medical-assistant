import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface SampleItem {
  name: string;
  ref: string;
  val: string;
  status: string;
  color: string;
}

interface SamplePayload {
  title: string;
  risk: string;
  riskClass: string;
  items: SampleItem[];
  summary: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorImg: string;
}

const SAMPLE_DATA: Record<'lipid' | 'thyroid' | 'general', SamplePayload> = {
  lipid: {
    title: "Đang xử lý mẫu: Bảng xét nghiệm lipid tim mạch",
    risk: "Chú Ý • Mức Trung Bình",
    riskClass: "bg-amber-50 text-amber-800",
    items: [
      { name: "Cholesterol Toàn Phần", ref: "Tham chiếu: < 200 mg/dL", val: "245 mg/dL", status: "Tăng cao ↑", color: "text-error" },
      { name: "Triglycerides", ref: "Tham chiếu: < 150 mg/dL", val: "198 mg/dL", status: "Bất thường ↑", color: "text-error" },
      { name: "HDL-Cholesterol (Tốt)", ref: "Tham chiếu: > 40 mg/dL", val: "48 mg/dL", status: "Đạt chuẩn ✓", color: "text-secondary" }
    ],
    summary: "Chỉ số mỡ máu toàn phần và triglycerides tăng vừa phải, có thể làm tăng nguy cơ mảng bám động mạch. Khuyến nghị tư vấn Chuyên khoa Tim mạch hoặc Dinh dưỡng lâm sàng.",
    doctorName: "BS. CKII Nguyễn Minh Tuấn",
    doctorSpecialty: "Khớp 98% chuyên khoa Tim mạch • BV Tim Hà Nội",
    doctorImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9dNw07t-qFJgqPYpgTRow1U8l_j39x3P-q9tb_n0VzsrsEN9vLwalX_fEWLBV_yVhCIdggIsmpbL4yOTxmNgt7tvsvspQCq0JIBYMidO6EOOpxxdiQuEXr2x5T6vpHCCKF_kf6mEPGFHm5vNI-a1LpmGs5DByOpQYJfwQVYMvhNv84Rr4vR26Lw7v6EXNA4YHb26fSzZNCqE2Eau4B4mgcmDTtSVXgBYAVj1I9IkSCv4ir_SzFe9m7A"
  },
  thyroid: {
    title: "Đang xử lý mẫu: Chức năng tuyến giáp TSH & Hormones",
    risk: "Cần Lưu Ý Đặc Biệt",
    riskClass: "bg-error-container text-on-error-container",
    items: [
      { name: "TSH (Thyroid Stimulating)", ref: "Tham chiếu: 0.4 - 4.0 mIU/L", val: "7.85 mIU/L", status: "Tăng rất cao ↑", color: "text-error" },
      { name: "Free T4 (FT4)", ref: "Tham chiếu: 0.8 - 1.8 ng/dL", val: "0.72 ng/dL", status: "Hạ thấp ↓", color: "text-error" },
      { name: "Anti-TPO (Kháng thể)", ref: "Tham chiếu: < 35 IU/mL", val: "112 IU/mL", status: "Dương tính ↑", color: "text-error" }
    ],
    summary: "Dấu hiệu điển hình của suy giáp nguyên phát (có thể do viêm tuyến giáp Hashimoto). Cần bác sĩ Nội tiết kê đơn bù hormone thyroxine kịp thời.",
    doctorName: "BS. CKII Lê Hoàng Oanh",
    doctorSpecialty: "Khớp 99% chuyên khoa Nội Tiết • BV Chợ Rẫy",
    doctorImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9cJehecZXYTwfOiCCLiPD-OUTDDjCmmHEziK1Uv0tNPqNrHoLh7svXrLl27ip7z5If6dVLpfNVYWjp2sEBO4pFqZNpky6Bezg8HcpfTl5XzS8TMBG0kNgPvUdHyl3uSm450LngbLp4T9ZWuEiYjL6jDVOpU_RuhvunIxvtafIiK6qHJ6ORo3b4asi05dvoiW7RDKDNAaR-SDUPP6Qoef7cU5a9dqyeUdDcSwBTtjnE1Og1lflk3TUuw"
  },
  general: {
    title: "Đang xử lý mẫu: Bệnh án xuất viện đa khoa tổng hợp",
    risk: "Tình Trạng Ổn Định",
    riskClass: "bg-emerald-50 text-emerald-800",
    items: [
      { name: "Glucose huyết đói", ref: "Tham chiếu: 70 - 99 mg/dL", val: "92 mg/dL", status: "Bình thường ✓", color: "text-secondary" },
      { name: "Men gan ALT (SGPT)", ref: "Tham chiếu: < 35 U/L", val: "28 U/L", status: "Bình thường ✓", color: "text-secondary" },
      { name: "Độ lọc cầu thận eGFR", ref: "Tham chiếu: > 90 mL/min", val: "98 mL/min", status: "Chức năng tốt ✓", color: "text-secondary" }
    ],
    summary: "Tất cả các chỉ số cơ bản của thận, gan và đường huyết đều nằm trong giới hạn tối ưu. Tiếp tục duy trì chế độ sinh hoạt và tái khám định kỳ 6 tháng.",
    doctorName: "TS. BS. Trần Hải Đăng",
    doctorSpecialty: "Khớp 96% Nội Tổng Quát & Thần Kinh • BV Bạch Mai",
    doctorImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9uyDi1trgqaS24jm6kY_UkDTY6dgNsu-F4UsPKYAsoAAieXS1tOyTq3kLEe7HPhu5sSbTPpZqsg_tGjKkT1iRtXg-X9pIJa4xsr_LxwDcTp6T9pt0MY4pylx2xdIMW34AQuegw3o0a7hMqtBlOV1V5BSa8Z5aApIuka3NxhlFL1tulF16UgD4tq84WiOZNWUHgWhQuRC1ZyPZApHgqUi9HEHS235KSeEOtqYdxk9xHCa1kuT_KamI5g"
  }
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [activeSample, setActiveSample] = useState<'lipid' | 'thyroid' | 'general'>('lipid');
  const [scanStatus, setScanStatus] = useState<string>(SAMPLE_DATA.lipid.title);
  const [scanPercent, setScanPercent] = useState<string>('100% (Sẵn sàng)');
  const [progressWidth, setProgressWidth] = useState<number>(100);

  const handleSelectSample = (type: 'lipid' | 'thyroid' | 'general') => {
    setActiveSample(type);
    setProgressWidth(25);
    setScanPercent('Đang đọc OCR...');
    setScanStatus('Đang bóc tách chỉ số y khoa bằng AI...');

    setTimeout(() => {
      setProgressWidth(100);
      setScanPercent('100% (Sẵn sàng)');
      setScanStatus(SAMPLE_DATA[type].title);
    }, 280);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setScanStatus(`Đang phân tích: ${fileName}`);
      setProgressWidth(40);
      setScanPercent('Đang quét OCR...');

      setTimeout(() => {
        setProgressWidth(100);
        setScanPercent('100% (Hoàn tất)');
        setActiveSample('lipid');
        setScanStatus(SAMPLE_DATA.lipid.title);
      }, 500);
    }
  };

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      navigate('/patient/documents');
    } else {
      navigate('/login');
    }
  };

  const handleDoctorBooking = () => {
    if (isAuthenticated) {
      navigate('/patient/doctors');
    } else {
      navigate('/login');
    }
  };

  const currentData = SAMPLE_DATA[activeSample];

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      
      {/* 1. Clinical Emergency Warning Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,41,66,0.04)]">
        <div className="bg-error-container text-on-error-container px-margin-sm md:px-margin py-space-2xs">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between font-label-sm text-label-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[15px] font-bold">emergency</span>
              <span>Cảnh báo khẩn cấp hoặc Đe dọa tính mạng: Gọi ngay 115 hoặc di chuyển tới phòng cấp cứu gần nhất.</span>
            </div>
            <div className="flex items-center gap-space-md">
              <a className="flex items-center gap-space-2xs underline font-semibold hover:text-error transition-colors" href="tel:115">
                Cấp Cứu Toàn Quốc (115)
              </a>
              <span className="hidden sm:inline text-on-error-container/40">|</span>
              <span className="hidden sm:inline">Hỗ trợ khẩn cấp: 1-800-555-0199</span>
            </div>
          </div>
        </div>

        {/* 2. Main Navigation Bar */}
        <div className="h-20 max-w-[1440px] mx-auto px-margin-sm md:px-margin flex items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-lg flex-shrink-0">
            <Link to="/" className="flex items-center gap-space-sm group">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-secondary-container flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px] text-secondary">vital_signs</span>
              </div>
              <span className="font-title-md text-title-md text-primary tracking-tight font-bold">
                MediAssist<span className="text-secondary"> AI</span>
              </span>
            </Link>

            <div className="hidden xl:flex items-center gap-space-xs bg-surface-container-low text-secondary px-space-sm py-space-2xs rounded-full border border-secondary/20">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Chuẩn BYT &amp; HL7 FHIR Encrypted
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-space-xs">
            <a className="px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-medium" href="#">
              Trang chủ
            </a>
            <a className="px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-medium" href="#quick-demo">
              Report Analysis
            </a>
            <a className="px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-medium" href="#specialists-section">
              Doctor Matches
            </a>
            <button
              onClick={handlePrimaryCta}
              className="px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-medium cursor-pointer"
            >
              Live Consultation
            </button>
            <button
              onClick={handlePrimaryCta}
              className="px-space-md py-space-xs font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-medium cursor-pointer"
            >
              Doctor Workspace
            </button>
          </nav>

          <div className="flex items-center gap-space-md flex-shrink-0">
            <button
              aria-label="Triage Notifications"
              className="relative p-space-xs rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
              </span>
            </button>

            <div className="h-6 w-[1px] bg-outline-variant/40 hidden sm:block"></div>

            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  if (user.role === 'ADMIN') navigate('/admin');
                  else if (user.role === 'DOCTOR') navigate('/doctor');
                  else navigate('/patient');
                }}
                className="flex items-center gap-space-sm pl-space-2xs cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-white font-bold flex items-center justify-center text-xs ring-2 ring-primary-fixed">
                    {user.fullName ? user.fullName.split(' ').slice(-1)[0][0] : 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-xs text-on-surface">{user.fullName}</span>
                  <span className="font-label-sm text-label-sm text-outline">{user.role} Portal</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-space-md py-space-xs font-label-md text-label-md text-primary hover:bg-surface-container rounded-lg transition-colors"
                >
                  Đăng Nhập
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="px-space-md py-space-xs font-label-md text-label-md bg-primary-container hover:bg-primary text-on-primary rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Khám Ngay
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-28 bg-surface">
        <div className="max-w-[1440px] mx-auto px-margin-sm md:px-margin min-h-[calc(100vh-14rem)]">
          <div className="flex flex-col w-full">
            
            {/* ==================== HERO SECTION ==================== */}
            <section className="relative overflow-hidden pt-space-md pb-space-2xl bg-gradient-to-b from-surface-container-lowest via-surface to-surface">
              {/* Subtle Background Glow Orbs */}
              <div className="absolute -top-32 left-1/4 w-96 h-96 bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
              <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] bg-primary-fixed/25 rounded-full blur-3xl pointer-events-none -z-10"></div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                
                {/* Left Column: Copy & CTA */}
                <div className="lg:col-span-7 flex flex-col items-start">
                  
                  {/* Live Status Pill */}
                  <div className="inline-flex items-center gap-space-xs bg-surface-container-low text-secondary px-space-md py-space-xs rounded-full shadow-xs mb-space-md">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                    </span>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-on-secondary-container">
                      Hệ Thống Trực Tuyến • AI Chẩn Đoán v4.8 Active
                    </span>
                  </div>

                  {/* Main Heading */}
                  <h1 className="font-display-lg text-display-lg text-primary tracking-tight mb-space-md max-w-2xl">
                    Chẩn Đoán Thông Minh Từ Bệnh Án PDF — <span className="text-secondary">Kết Nối Bác Sĩ</span> Tức Thì
                  </h1>

                  {/* Subtitle */}
                  <p className="font-body-lg text-body-lg text-on-surface-variant mb-space-xl max-w-xl leading-relaxed">
                    Tải lên kết quả xét nghiệm máu, hình ảnh chụp cắt lớp (CT/MRI) hoặc tóm tắt bệnh án xuất viện. Hệ thống AI bóc tách chỉ số bất thường trong 30 giây và ghép nối bạn với bác sĩ chuyên khoa đầu ngành.
                  </p>

                  {/* CTA Buttons Group */}
                  <div className="flex flex-wrap items-center gap-space-md w-full sm:w-auto">
                    <button
                      onClick={handlePrimaryCta}
                      className="inline-flex items-center justify-center gap-space-sm bg-primary-container hover:bg-primary text-on-primary font-title-md text-title-md px-space-xl py-space-md rounded-lg shadow-md transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[22px]">upload_file</span>
                      <span>Tải Lên Bệnh Án PDF Miễn Phí</span>
                    </button>
                    <a
                      className="inline-flex items-center justify-center gap-space-sm bg-surface-container-lowest text-primary hover:bg-surface-container font-title-md text-title-md px-space-lg py-space-md rounded-lg shadow-xs transition-all duration-200"
                      href="#specialists-section"
                    >
                      <span className="material-symbols-outlined text-[20px] text-secondary">stethoscope</span>
                      <span>Khám Phá Bác Sĩ</span>
                    </a>
                  </div>

                  {/* Compliance & Metric Badges Strip */}
                  <div className="mt-space-2xl pt-space-lg border-t-0 grid grid-cols-3 gap-space-md w-full max-w-xl">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">verified_user</span>
                      </div>
                      <div>
                        <div className="font-label-sm text-label-sm text-outline font-semibold">BẢO MẬT TUYỆT ĐỐI</div>
                        <div className="font-title-md text-title-md text-on-surface font-bold">HIPAA 256-bit</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">query_stats</span>
                      </div>
                      <div>
                        <div className="font-label-sm text-label-sm text-outline font-semibold">ĐỘ CHÍNH XÁC AI</div>
                        <div className="font-title-md text-title-md text-on-surface font-bold">99.4% Chuẩn</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <div className="w-9 h-9 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">medical_services</span>
                      </div>
                      <div>
                        <div className="font-label-sm text-label-sm text-outline font-semibold">CHUYÊN GIA SẴN SÀNG</div>
                        <div className="font-title-md text-title-md text-on-surface font-bold">1,200+ Bác Sĩ</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Hero Visual Showcase with Floating Overlays */}
                <div className="lg:col-span-5 relative mt-space-lg lg:mt-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-surface-container-lowest border border-outline-variant/30">
                    <img
                      alt="Bác sĩ chuyên khoa MediAssist AI đang tư vấn kết quả phân tích tim mạch trên màn hình cho bệnh nhân"
                      className="w-full h-auto object-cover max-h-[520px] transform transition-transform duration-700 hover:scale-[1.01]"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKapt12RlJP5C-7szFWNFCLng5nuqRmQ9wnAu6Ozez8-0PKzsEXvMjZY_DN5nQEdWzlLdTLn-x_YWuDHq_uvflmLJQqy4J27uqbKmua_WECsQ0jExiRWvEKL8qCjqr_Bmxbsj_Tsst4a7HeYpEOrQP-M_gKrCy5M9Aigv_08JIhU-pb4vomjnZLR3YTHdgrwhc4oI6ci24GJyyuim1d7RVAR13TQMU-ONgVHzeRkPz0oywlL5sX5Qcfw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent"></div>

                    {/* Bottom Info Bar inside Hero Image */}
                    <div className="absolute bottom-4 left-4 right-4 p-space-md bg-surface-container-lowest/90 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-headline-sm text-headline-sm">
                          <span className="material-symbols-outlined text-[20px]">vital_signs</span>
                        </div>
                        <div>
                          <div className="font-title-md text-title-md text-primary font-bold">Phân Tích Tim Mạch Hoàn Tất</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">Hồ sơ #MC-8942 • 0.8s xử lý OCR</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-space-sm py-1 rounded-full text-label-sm font-label-sm bg-secondary-container text-on-secondary-container font-semibold">
                        Bình thường (94%)
                      </span>
                    </div>
                  </div>

                  {/* Floating Card: Specialist Match Overlap */}
                  <div className="-mt-8 -ml-6 relative z-10 w-72 bg-surface-container-lowest p-space-md rounded-xl shadow-xl hidden sm:flex flex-col gap-space-xs border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary font-semibold">
                        <span className="material-symbols-outlined text-[16px]">bolt</span> Ghép Đôi Siêu Tốc
                      </span>
                      <span className="font-label-sm text-label-sm bg-surface-container-high px-2 py-0.5 rounded text-primary font-bold">1.2 phút</span>
                    </div>
                    <div className="font-body-md text-body-md text-on-surface font-semibold">BS. CKII Nguyễn Minh Tuấn</div>
                    <div className="font-body-sm text-body-sm text-outline">Viện Tim Mạch Quốc Gia • 18 năm kinh nghiệm</div>
                    <div className="flex items-center justify-between pt-space-xs mt-space-2xs">
                      <div className="flex items-center text-secondary font-label-sm text-label-sm gap-1">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                        <span className="font-bold text-on-surface">4.99</span> (340+ tư vấn)
                      </div>
                      <span className="inline-flex h-2 w-2 rounded-full bg-secondary"></span>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* ==================== INTERACTIVE PDF DEMO DROPZONE ==================== */}
            <section className="my-space-2xl" id="quick-demo">
              <div className="bg-surface-container-low rounded-2xl p-space-lg md:p-space-2xl shadow-xs">
                <div className="max-w-3xl mx-auto text-center mb-space-xl">
                  <div className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold mb-space-2xs">
                    Trải Nghiệm Trực Quan
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                    Thử Nghiệm Tải Lên &amp; Phân Tích Bệnh Án Mẫu
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs leading-relaxed">
                    Chọn một hồ sơ xét nghiệm có sẵn dưới đây hoặc kéo thả file PDF của bạn để quan sát cách trí tuệ nhân tạo giải mã kết quả y khoa chỉ trong vài giây.
                  </p>
                </div>

                {/* Main Interactive Sandbox Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
                  
                  {/* Left 7 cols: Upload and File Selector */}
                  <div className="lg:col-span-7 flex flex-col justify-between bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30">
                    
                    {/* Sample Files Selector */}
                    <div>
                      <span className="font-label-md text-label-md text-on-surface-variant mb-space-xs block font-medium">
                        1. Chọn hồ sơ y tế mẫu để chạy demo ngay:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs mb-space-lg">
                        <button
                          className={`text-left p-space-sm rounded-lg transition-all duration-150 cursor-pointer ${
                            activeSample === 'lipid'
                              ? 'bg-surface-container text-primary ring-1 ring-secondary/30'
                              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                          }`}
                          onClick={() => handleSelectSample('lipid')}
                        >
                          <div className="flex items-center gap-1 font-label-md text-label-md font-semibold mb-0.5">
                            <span className="material-symbols-outlined text-[16px] text-secondary">bloodtype</span>
                            <span>Lipid Panel</span>
                          </div>
                          <div className="font-body-sm text-body-sm text-outline">Xét nghiệm mỡ máu &amp; Triglyceride</div>
                        </button>

                        <button
                          className={`text-left p-space-sm rounded-lg transition-all duration-150 cursor-pointer ${
                            activeSample === 'thyroid'
                              ? 'bg-surface-container text-primary ring-1 ring-secondary/30'
                              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                          }`}
                          onClick={() => handleSelectSample('thyroid')}
                        >
                          <div className="flex items-center gap-1 font-label-md text-label-md font-semibold mb-0.5">
                            <span className="material-symbols-outlined text-[16px] text-secondary">metabolism</span>
                            <span>Tuyến Giáp TSH</span>
                          </div>
                          <div className="font-body-sm text-body-sm text-outline">Chỉ số FT3, FT4, TSH</div>
                        </button>

                        <button
                          className={`text-left p-space-sm rounded-lg transition-all duration-150 cursor-pointer ${
                            activeSample === 'general'
                              ? 'bg-surface-container text-primary ring-1 ring-secondary/30'
                              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                          }`}
                          onClick={() => handleSelectSample('general')}
                        >
                          <div className="flex items-center gap-1 font-label-md text-label-md font-semibold mb-0.5">
                            <span className="material-symbols-outlined text-[16px] text-secondary">assignment</span>
                            <span>Đa Khoa Tổng Hợp</span>
                          </div>
                          <div className="font-body-sm text-body-sm text-outline">Tóm tắt bệnh án xuất viện</div>
                        </button>
                      </div>
                    </div>

                    {/* Drag & Drop zone */}
                    <div className="relative cursor-pointer bg-surface-container-low hover:bg-surface-container rounded-xl p-space-xl flex flex-col items-center justify-center text-center transition-colors border-2 border-dashed border-outline-variant/50">
                      <input
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        type="file"
                      />
                      <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-space-sm">
                        <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                      </div>
                      <div className="font-title-md text-title-md text-primary font-bold">Kéo và thả tệp PDF bệnh án hoặc hình chụp tại đây</div>
                      <div className="font-body-sm text-body-sm text-outline mt-space-2xs">Hỗ trợ PDF, PNG, JPG, DICOM • Dung lượng tối đa 25MB</div>
                      <div className="mt-space-md inline-flex items-center gap-2 bg-surface-container-lowest px-space-md py-1.5 rounded-lg shadow-xs text-primary font-label-md text-label-md font-semibold">
                        <span className="material-symbols-outlined text-[18px]">folder_open</span> Duyệt file từ máy tính
                      </div>
                    </div>

                    {/* Live Scanning Bar */}
                    <div className="mt-space-md">
                      <div className="flex items-center justify-between text-body-sm font-body-sm mb-1">
                        <span className="text-on-surface-variant font-medium">{scanStatus}</span>
                        <span className="text-secondary font-bold font-mono">{scanPercent}</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                    </div>

                  </div>

                  {/* Right 5 cols: Instant Live Diagnosis Simulator Panel */}
                  <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-outline-variant/30">
                    <div>
                      <div className="flex items-center justify-between mb-space-sm">
                        <span className="font-label-md text-label-md font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px] text-secondary">psychology</span> Bóc Tách Tức Thì
                        </span>
                        <span className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded font-semibold ${currentData.riskClass}`}>
                          {currentData.risk}
                        </span>
                      </div>

                      {/* Parsed Biomarkers List */}
                      <div className="flex flex-col gap-space-xs mb-space-md">
                        {currentData.items.map((item, idx) => (
                          <div key={idx} className="p-space-sm bg-surface rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-body-md text-body-md font-semibold text-primary">{item.name}</div>
                              <div className="font-body-sm text-body-sm text-outline">{item.ref}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-title-md text-title-md ${item.color} font-bold`}>{item.val}</div>
                              <span className={`font-label-sm text-label-sm ${item.color} font-medium`}>{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Plain Language Explanation */}
                      <div className="p-space-sm bg-surface-container rounded-lg mb-space-md">
                        <div className="font-label-md text-label-md text-primary font-semibold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-secondary">forum</span> Tóm Tắt Dễ Hiểu
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                          {currentData.summary}
                        </p>
                      </div>
                    </div>

                    {/* Suggested Doctor Direct Action */}
                    <div className="pt-space-sm">
                      <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-lg mb-space-sm">
                        <img alt="Bác sĩ đề xuất" className="w-10 h-10 rounded-full object-cover" src={currentData.doctorImg} />
                        <div className="flex-1 min-w-0">
                          <div className="font-title-md text-title-md text-primary truncate font-bold">{currentData.doctorName}</div>
                          <div className="font-body-sm text-body-sm text-secondary truncate">{currentData.doctorSpecialty}</div>
                        </div>
                      </div>
                      <button
                        onClick={handleDoctorBooking}
                        className="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary hover:bg-on-secondary-container font-title-md text-title-md py-space-sm rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">video_call</span>
                        <span>Đặt Khám Với Bác Sĩ Này Ngay</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </section>

            {/* ==================== 3-STEP WORKFLOW ==================== */}
            <section className="my-space-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-sm">
                <div>
                  <div className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold mb-space-2xs">
                    Quy Trình Hoạt Động
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                    Giải Mã Bệnh Án Qua 3 Bước Liền Mạch
                  </h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md leading-relaxed">
                  Không còn hoang mang trước những thuật ngữ khó hiểu hay chờ đợi hàng tuần để gặp đúng chuyên gia.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                
                {/* Step 1 */}
                <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-xs relative group hover:shadow-md transition-shadow border border-outline-variant/30">
                  <div className="flex items-center justify-between mb-space-lg">
                    <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[28px]">document_scanner</span>
                    </div>
                    <span className="font-headline-lg text-headline-lg font-bold text-surface-container-high">01</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs font-bold">Tải Bệnh Án Dạng PDF Hoặc Ảnh Chụp</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
                    Hệ thống tiếp nhận mọi định dạng: kết quả xét nghiệm sinh hóa, ảnh chụp X-quang, MRI/CT, đơn thuốc viết tay hoặc giấy chuyển tuyến.
                  </p>
                  <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md font-semibold">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Mã hóa đầu cuối bảo mật PHI</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-xs relative group hover:shadow-md transition-shadow border border-outline-variant/30">
                  <div className="flex items-center justify-between mb-space-lg">
                    <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                      <span className="material-symbols-outlined text-[28px]">analytics</span>
                    </div>
                    <span className="font-headline-lg text-headline-lg font-bold text-surface-container-high">02</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs font-bold">AI Phân Tích &amp; Đối Chiếu Dữ Liệu</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
                    Công nghệ OCR thế hệ mới trích xuất các chỉ số sinh học, đánh dấu giá trị nguy hiểm và chuyển thể thành bản phân tích ngôn ngữ đời thường rõ ràng.
                  </p>
                  <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md font-semibold">
                    <span className="material-symbols-outlined text-[18px]">speed</span>
                    <span>Tốc độ xử lý dưới 30 giây</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-xs relative group hover:shadow-md transition-shadow border border-outline-variant/30">
                  <div className="flex items-center justify-between mb-space-lg">
                    <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[28px]">video_chat</span>
                    </div>
                    <span className="font-headline-lg text-headline-lg font-bold text-surface-container-high">03</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs font-bold">Khám 1:1 Với Chuyên Gia Đầu Ngành</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
                    Hệ thống khớp hồ sơ với bác sĩ chuyên khoa phù hợp nhất. Bắt đầu phiên hội chẩn từ xa có tích hợp xem bệnh án song song và kê đơn điện tử.
                  </p>
                  <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md font-semibold">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>100% Bác sĩ có chứng chỉ hành nghề</span>
                  </div>
                </div>

              </div>
            </section>

            {/* ==================== METRICS & CLINICAL ACCREDITATION ==================== */}
            <section className="my-space-2xl bg-primary-container text-on-primary rounded-2xl p-space-xl md:p-space-2xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-lg mb-space-xl text-center">
                <div>
                  <div className="font-display-lg text-display-lg text-secondary-fixed font-bold tracking-tight">150K+</div>
                  <div className="font-body-sm text-body-sm text-surface-container-high mt-1">Bệnh án xử lý an toàn</div>
                </div>
                <div>
                  <div className="font-display-lg text-display-lg text-secondary-fixed font-bold tracking-tight">1.2m</div>
                  <div className="font-body-sm text-body-sm text-surface-container-high mt-1">Thời gian khớp bác sĩ</div>
                </div>
                <div>
                  <div className="font-display-lg text-display-lg text-secondary-fixed font-bold tracking-tight">98.8%</div>
                  <div className="font-body-sm text-body-sm text-surface-container-high mt-1">Bệnh nhân hài lòng</div>
                </div>
                <div>
                  <div className="font-display-lg text-display-lg text-secondary-fixed font-bold tracking-tight">50+</div>
                  <div className="font-body-sm text-body-sm text-surface-container-high mt-1">Bệnh viện &amp; Lab liên kết</div>
                </div>
              </div>

              <div className="pt-space-lg border-t border-surface-container-high/20 flex flex-wrap items-center justify-between gap-space-md">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-surface-variant font-semibold">
                  Tiêu Chuẩn Tuân Thủ Y Tế Quốc Tế:
                </span>
                <div className="flex flex-wrap items-center gap-space-lg text-surface-container-high font-label-md text-label-md">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">health_and_safety</span>
                    <span>HIPAA Certified</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">hub</span>
                    <span>HL7 FHIR v4</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">shield</span>
                    <span>ISO 27001 Security</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-secondary-fixed">lock_clock</span>
                    <span>GDPR / Nghị Định 13 Compliant</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== FEATURED SPECIALISTS ==================== */}
            <section className="my-space-2xl" id="specialists-section">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-sm">
                <div>
                  <div className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold mb-space-2xs">
                    Mạng Lưới Chuyên Gia
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                    Đội Ngũ Bác Sĩ Tiêu Biểu Sẵn Sàng Hội Chẩn
                  </h2>
                </div>
                <button
                  onClick={handleDoctorBooking}
                  className="inline-flex items-center gap-1 text-secondary font-title-md text-title-md hover:underline cursor-pointer"
                >
                  <span>Xem toàn bộ 1,200+ bác sĩ</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                
                {/* Doctor 1 */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col justify-between border border-outline-variant/30">
                  <div>
                    <div className="flex items-center gap-space-md mb-space-md">
                      <img
                        alt="Bác sĩ Tuấn"
                        className="w-16 h-16 rounded-xl object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9dNw07t-qFJgqPYpgTRow1U8l_j39x3P-q9tb_n0VzsrsEN9vLwalX_fEWLBV_yVhCIdggIsmpbL4yOTxmNgt7tvsvspQCq0JIBYMidO6EOOpxxdiQuEXr2x5T6vpHCCKF_kf6mEPGFHm5vNI-a1LpmGs5DByOpQYJfwQVYMvhNv84Rr4vR26Lw7v6EXNA4YHb26fSzZNCqE2Eau4B4mgcmDTtSVXgBYAVj1I9IkSCv4ir_SzFe9m7A"
                      />
                      <div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">Tim Mạch Học</span>
                        <h4 className="font-title-md text-title-md text-primary mt-1 font-bold">PGS. TS. Nguyễn Minh Tuấn</h4>
                        <p className="font-body-sm text-body-sm text-outline">BV Tim Hà Nội • 21 năm kn</p>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md leading-relaxed">
                      Chuyên gia can thiệp mạch vành, tăng huyết áp kháng trị và rối loạn chuyển hóa lipid phức tạp.
                    </p>
                    <div className="flex items-center justify-between text-body-sm font-body-sm mb-space-md bg-surface p-space-xs rounded-lg">
                      <span className="text-on-surface-variant">Đánh giá:</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                        4.98 (420 lượt)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-sm text-label-sm font-label-sm">
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-secondary"></span> Lịch trống: 15:30 Hôm nay
                      </span>
                      <span className="text-outline font-bold">450.000đ / phiên</span>
                    </div>
                    <button
                      onClick={handleDoctorBooking}
                      className="w-full py-2.5 rounded-lg bg-primary-container text-on-primary font-title-md text-title-md hover:bg-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span> Đặt Lịch Tư Vấn
                    </button>
                  </div>
                </div>

                {/* Doctor 2 */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col justify-between border border-outline-variant/30">
                  <div>
                    <div className="flex items-center gap-space-md mb-space-md">
                      <img
                        alt="Bác sĩ Oanh"
                        className="w-16 h-16 rounded-xl object-cover bg-surface-container"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9cJehecZXYTwfOiCCLiPD-OUTDDjCmmHEziK1Uv0tNPqNrHoLh7svXrLl27ip7z5If6dVLpfNVYWjp2sEBO4pFqZNpky6Bezg8HcpfTl5XzS8TMBG0kNgPvUdHyl3uSm450LngbLp4T9ZWuEiYjL6jDVOpU_RuhvunIxvtafIiK6qHJ6ORo3b4asi05dvoiW7RDKDNAaR-SDUPP6Qoef7cU5a9dqyeUdDcSwBTtjnE1Og1lflk3TUuw"
                      />
                      <div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">Nội Tiết &amp; Tiểu Đường</span>
                        <h4 className="font-title-md text-title-md text-primary mt-1 font-bold">BS. CKII Lê Hoàng Oanh</h4>
                        <p className="font-body-sm text-body-sm text-outline">BV Chợ Rẫy • 16 năm kn</p>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md leading-relaxed">
                      Chuyên gia điều trị đái tháo đường thai kỳ, suy giáp Hashimoto, rối loạn tuyến thượng thận và béo phì.
                    </p>
                    <div className="flex items-center justify-between text-body-sm font-body-sm mb-space-md bg-surface p-space-xs rounded-lg">
                      <span className="text-on-surface-variant">Đánh giá:</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                        4.99 (512 lượt)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-sm text-label-sm font-label-sm">
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-secondary"></span> Lịch trống: 16:15 Hôm nay
                      </span>
                      <span className="text-outline font-bold">400.000đ / phiên</span>
                    </div>
                    <button
                      onClick={handleDoctorBooking}
                      className="w-full py-2.5 rounded-lg bg-primary-container text-on-primary font-title-md text-title-md hover:bg-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span> Đặt Lịch Tư Vấn
                    </button>
                  </div>
                </div>

                {/* Doctor 3 */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col justify-between border border-outline-variant/30">
                  <div>
                    <div className="flex items-center gap-space-md mb-space-md">
                      <img
                        alt="Bác sĩ Đăng"
                        className="w-16 h-16 rounded-xl object-cover bg-surface-container"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9uyDi1trgqaS24jm6kY_UkDTY6dgNsu-F4UsPKYAsoAAieXS1tOyTq3kLEe7HPhu5sSbTPpZqsg_tGjKkT1iRtXg-X9pIJa4xsr_LxwDcTp6T9pt0MY4pylx2xdIMW34AQuegw3o0a7hMqtBlOV1V5BSa8Z5aApIuka3NxhlFL1tulF16UgD4tq84WiOZNWUHgWhQuRC1ZyPZApHgqUi9HEHS235KSeEOtqYdxk9xHCa1kuT_KamI5g"
                      />
                      <div>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-semibold">Thần Kinh Học</span>
                        <h4 className="font-title-md text-title-md text-primary mt-1 font-bold">TS. BS. Trần Hải Đăng</h4>
                        <p className="font-body-sm text-body-sm text-outline">BV Bạch Mai • 19 năm kn</p>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md leading-relaxed">
                      Chuyên gia chẩn đoán hình ảnh thần kinh, đau nửa đầu mạn tính, rối loạn tiền đình và thoái hóa thần kinh.
                    </p>
                    <div className="flex items-center justify-between text-body-sm font-body-sm mb-space-md bg-surface p-space-xs rounded-lg">
                      <span className="text-on-surface-variant">Đánh giá:</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                        4.96 (280 lượt)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-sm text-label-sm font-label-sm">
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-secondary"></span> Lịch trống: 18:00 Hôm nay
                      </span>
                      <span className="text-outline font-bold">500.000đ / phiên</span>
                    </div>
                    <button
                      onClick={handleDoctorBooking}
                      className="w-full py-2.5 rounded-lg bg-primary-container text-on-primary font-title-md text-title-md hover:bg-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span> Đặt Lịch Tư Vấn
                    </button>
                  </div>
                </div>

              </div>
            </section>

            {/* ==================== REAL CLINICAL TESTIMONIALS ==================== */}
            <section className="my-space-2xl">
              <div className="bg-surface-container-low rounded-2xl p-space-xl md:p-space-2xl">
                <div className="max-w-2xl mx-auto text-center mb-space-xl">
                  <div className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold mb-space-2xs">
                    Hiệu Quả Thực Tế
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                    Niềm Tin Từ Người Bệnh &amp; Bác Sĩ Đồng Hành
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                  {/* Patient Review */}
                  <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-xs flex flex-col justify-between border border-outline-variant/30">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 mb-space-sm">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[18px]">star</span>
                        ))}
                      </div>
                      <p className="font-body-md text-body-md text-on-surface italic mb-space-md leading-relaxed">
                        “Cầm tờ kết quả xét nghiệm máu với 4 chỉ số bôi đỏ, tôi thực sự hoang mang không biết phải đi khám khoa nào trước. Sau khi tải PDF lên MediAssist AI, hệ thống giải thích mạch lạc mức độ nguy cơ và kết nối ngay với BS Tuấn. Buổi khám trực tuyến kéo dài 25 phút giúp tôi an tâm tuyệt đối.”
                      </p>
                    </div>
                    <div className="flex items-center gap-space-sm pt-space-sm border-t-0">
                      <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-label-md">
                        HQ
                      </div>
                      <div>
                        <div className="font-title-md text-title-md text-primary font-bold">Anh Hoàng Quốc H. (46 tuổi)</div>
                        <div className="font-body-sm text-body-sm text-outline">Bệnh nhân phát hiện sớm rối loạn Lipid máu • Hà Nội</div>
                      </div>
                    </div>
                  </div>

                  {/* Physician Review */}
                  <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-xs flex flex-col justify-between border border-outline-variant/30">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 mb-space-sm">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[18px]">star</span>
                        ))}
                      </div>
                      <p className="font-body-md text-body-md text-on-surface italic mb-space-md leading-relaxed">
                        “MediAssist AI giúp bác sĩ tiết kiệm ít nhất 10 phút đọc lại các chồng giấy xét nghiệm cũ. Khi tôi bắt đầu phiên khám, toàn bộ lịch sử bệnh án và các chỉ số quan trọng đã được hệ thống OCR và chuẩn hóa theo chuẩn quốc tế, giúp việc đưa ra phác đồ chính xác hơn rất nhiều.”
                      </p>
                    </div>
                    <div className="flex items-center gap-space-sm pt-space-sm border-t-0">
                      <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-label-md">
                        ĐH
                      </div>
                      <div>
                        <div className="font-title-md text-title-md text-primary font-bold">TS. BS. Đỗ Hữu Nghị</div>
                        <div className="font-body-sm text-body-sm text-outline">Cố Vấn Chuyên Khoa Nội Tiết • BV Đại Học Y Hà Nội</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* ==================== BOTTOM HIGH-CONVERTING CTA ==================== */}
            <section className="my-space-2xl">
              <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-3xl p-space-xl md:p-space-2xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-space-xl relative overflow-hidden">
                <div className="absolute -left-16 -top-16 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold mb-space-sm">
                    <span className="material-symbols-outlined text-[14px]">shield_person</span> Bảo mật e-PHI chuẩn Bộ Y Tế
                  </span>
                  <h2 className="font-display-lg text-display-lg text-white tracking-tight mb-space-xs font-bold">
                    Sẵn Sàng Hiểu Rõ Tình Trạng Sức Khỏe Của Bạn?
                  </h2>
                  <p className="font-body-lg text-body-lg text-surface-container-high leading-relaxed">
                    Tải hồ sơ PDF đầu tiên chỉ trong 1 phút. Nhận bản phân tích nguy cơ miễn phí và kết nối trực tiếp với bác sĩ chuyên khoa phù hợp nhất.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-space-sm shrink-0 w-full lg:w-auto">
                  <a
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim font-title-md text-title-md px-space-xl py-space-md rounded-lg shadow-md transition-all font-bold"
                    href="#quick-demo"
                  >
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    <span>Tải Bệnh Án Ngay Bây Giờ</span>
                  </a>
                  <a
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-white font-title-md text-title-md px-space-lg py-space-md rounded-lg transition-colors font-semibold"
                    href="#specialists-section"
                  >
                    <span>Tìm Bác Sĩ Phù Hợp</span>
                  </a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant/20 py-space-xl mt-space-2xl">
        <div className="max-w-[1440px] mx-auto px-margin-sm md:px-margin flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant font-body-sm text-body-sm">
          <div>© 2026 MediAssist-AI Clinical Technologies Inc. All rights reserved. Encrypted e-PHI Infrastructure.</div>
          <div className="flex items-center gap-space-lg font-medium">
            <Link to="/login" className="hover:text-on-surface hover:underline">Cổng Bác Sĩ</Link>
            <Link to="/login" className="hover:text-on-surface hover:underline">Cổng Quản Trị Viên</Link>
            <a className="hover:text-on-surface hover:underline" href="#">Bảo Mật HIPAA / ISO 27001</a>
            <a className="hover:text-on-surface hover:underline text-error" href="tel:115">Khẩn Cấp 115</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
