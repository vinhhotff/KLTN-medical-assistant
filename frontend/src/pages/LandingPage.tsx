import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { formatRating, formatVnd } from '../utils/display';
import { getApiErrorMessage } from '../utils/apiError';
import { devLog } from '../utils/logger';

gsap.registerPlugin(useGSAP);

const PREVIEW_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
};

interface DoctorDetail {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio: string;
  licenseNumber: string;
  consultationFee: number | null;
  yearsOfExperience: number;
  specialties: string[];
  verified: boolean;
  academicTitle?: string;
  hospitalAffiliation?: string;
  department?: string;
  licenseIssuedBy?: string;
  rating?: number;
  totalConsultations?: number;
  reviewCount?: number;
}

interface SpecialtyItem {
  id: string;
  name: string;
  code?: string;
  slug?: string;
  description?: string;
}

const DOCTOR_PORTRAITS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB9dNw07t-qFJgqPYpgTRow1U8l_j39x3P-q9tb_n0VzsrsEN9vLwalX_fEWLBV_yVhCIdggIsmpbL4yOTxmNgt7tvsvspQCq0JIBYMidO6EOOpxxdiQuEXr2x5T6vpHCCKF_kf6mEPGFHm5vNI-a1LpmGs5DByOpQYJfwQVYMvhNv84Rr4vR26Lw7v6EXNA4YHb26fSzZNCqE2Eau4B4mgcmDTtSVXgBYAVj1I9IkSCv4ir_SzFe9m7A",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB9cJehecZXYTwfOiCCLiPD-OUTDDjCmmHEziK1Uv0tNPqNrHoLh7svXrLl27ip7z5If6dVLpfNVYWjp2sEBO4pFqZNpky6Bezg8HcpfTl5XzS8TMBG0kNgPvUdHyl3uSm450LngbLp4T9ZWuEiYjL6jDVOpU_RuhvunIxvtafIiK6qHJ6ORo3b4asi05dvoiW7RDKDNAaR-SDUPP6Qoef7cU5a9dqyeUdDcSwBTtjnE1Og1lflk3TUuw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB9uyDi1trgqaS24jm6kY_UkDTY6dgNsu-F4UsPKYAsoAAieXS1tOyTq3kLEe7HPhu5sSbTPpZqsg_tGjKkT1iRtXg-X9pIJa4xsr_LxwDcTp6T9pt0MY4pylx2xdIMW34AQuegw3o0a7hMqtBlOV1V5BSa8Z5aApIuka3NxhlFL1tulF16UgD4tq84WiOZNWUHgWhQuRC1ZyPZApHgqUi9HEHS235KSeEOtqYdxk9xHCa1kuT_KamI5g",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1594824813576-a4c330df3d85?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=400&auto=format&fit=crop&q=80",
];

const getDoctorAvatar = (doc: DoctorDetail, index: number): string => {
  if (doc.avatarUrl && doc.avatarUrl.trim().startsWith('http')) {
    return doc.avatarUrl;
  }
  return DOCTOR_PORTRAITS[index % DOCTOR_PORTRAITS.length];
};

interface AbnormalIndicator {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: string;
  clinicalSignificance?: string;
}

interface AnalysisResult {
  documentId?: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  clinicalSummary: string;
  plainLanguageExplanation: string;
  indicators: AbnormalIndicator[];
  recommendedSpecialtySlug: string;
  recommendedSpecialtyName: string;
  suggestedQuestions: string[];
  matchedDoctors: DoctorDetail[];
  modelUsed?: string;
  doctorRecommendationReason?: string;
  hospitalName?: string;
  departmentName?: string;
  orderingDoctor?: string;
  testDate?: string;
  sidCode?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  deviceModel?: string;
}

interface SampleItem {
  name: string;
  ref: string;
  val: string;
  status: string;
  color: string;
}

interface SampleProfile {
  title: string;
  risk: string;
  riskClass: string;
  specialtyKeyword: string;
  items: SampleItem[];
  summary: string;
}

const SAMPLE_PROFILES: Record<'lipid' | 'respiratory' | 'general', SampleProfile> = {
  lipid: {
    title: "Mẫu tham khảo: Bảng xét nghiệm lipid tim mạch",
    risk: "Chú Ý • Mức Trung Bình",
    riskClass: "bg-amber-400/20 text-amber-300 border border-amber-400/40",
    specialtyKeyword: "Cardio",
    items: [
      { name: "Cholesterol Toàn Phần", ref: "Tham chiếu: < 200 mg/dL", val: "245 mg/dL", status: "Tăng cao ↑", color: "text-rose-400" },
      { name: "Triglycerides", ref: "Tham chiếu: < 150 mg/dL", val: "198 mg/dL", status: "Bất thường ↑", color: "text-rose-400" },
      { name: "HDL-Cholesterol (Tốt)", ref: "Tham chiếu: > 40 mg/dL", val: "48 mg/dL", status: "Đạt chuẩn ✓", color: "text-emerald-400" }
    ],
    summary: "Chỉ số mỡ máu toàn phần và triglycerides tăng vừa phải, có thể làm tăng nguy cơ mảng bám động mạch. Khuyến nghị tư vấn Chuyên khoa Tim mạch hoặc Dinh dưỡng lâm sàng."
  },
  respiratory: {
    title: "Mẫu tham khảo: Đo chức năng hô hấp & Phổi FEV1/FVC",
    risk: "Cần Lưu Ý • Mức Độ Vừa",
    riskClass: "bg-amber-400/20 text-amber-300 border border-amber-400/40",
    specialtyKeyword: "Pulmon",
    items: [
      { name: "Chỉ số FEV1/FVC", ref: "Tham chiếu: > 75%", val: "63%", status: "Hội chứng tắc nghẽn ↓", color: "text-rose-400" },
      { name: "Dung tích sống gắng sức (FVC)", ref: "Tham chiếu: > 80%", val: "84%", status: "Bình thường ✓", color: "text-emerald-400" },
      { name: "Độ bão hòa Oxy SpO2", ref: "Tham chiếu: 96 - 100%", val: "95%", status: "Giảm nhẹ ↓", color: "text-amber-300" }
    ],
    summary: "Dấu hiệu tắc nghẽn đường thở gợi ý hen phế quản hoặc COPD nhẹ. Khuyến nghị tư vấn Chuyên khoa Hô hấp & Phổi để đo phế dung ký chuyên sâu."
  },
  general: {
    title: "Mẫu tham khảo: Bệnh án xuất viện đa khoa tổng hợp",
    risk: "Tình Trạng Ổn Định",
    riskClass: "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40",
    specialtyKeyword: "General",
    items: [
      { name: "Glucose huyết đói", ref: "Tham chiếu: 70 - 99 mg/dL", val: "92 mg/dL", status: "Bình thường ✓", color: "text-emerald-400" },
      { name: "Men gan ALT (SGPT)", ref: "Tham chiếu: < 35 U/L", val: "28 U/L", status: "Bình thường ✓", color: "text-emerald-400" },
      { name: "Độ lọc cầu thận eGFR", ref: "Tham chiếu: > 90 mL/min", val: "98 mL/min", status: "Chức năng tốt ✓", color: "text-emerald-400" }
    ],
    summary: "Tất cả các chỉ số cơ bản của thận, gan và đường huyết đều nằm trong giới hạn tối ưu. Tiếp tục duy trì chế độ sinh hoạt và tái khám định kỳ 6 tháng."
  }
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const pageRef = useRef<HTMLDivElement>(null);

  // Database State
  const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Interactive Real Backend Scan State
  const [activeSample, setActiveSample] = useState<'lipid' | 'respiratory' | 'general'>('lipid');
  const [realAnalysis, setRealAnalysis] = useState<AnalysisResult | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('Sẵn sàng đọc phiếu xét nghiệm của bạn');
  const [scanPercent, setScanPercent] = useState<string>('100% (Sẵn sàng)');
  const [progressWidth, setProgressWidth] = useState<number>(100);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'real' | 'sample'>('sample');

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          animate: '(prefers-reduced-motion: no-preference)',
        },
        () => {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.from('.gsap-nav-shell', { y: -24, autoAlpha: 0, duration: 0.55 })
            .from('.gsap-hero-badge', { y: 18, autoAlpha: 0, duration: 0.45 }, '-=0.3')
            .from('.gsap-hero-title', { y: 32, autoAlpha: 0, duration: 0.65 }, '-=0.25')
            .from('.gsap-hero-sub', { y: 20, autoAlpha: 0, duration: 0.5 }, '-=0.35')
            .from('.gsap-hero-cta', { y: 16, autoAlpha: 0, stagger: 0.08, duration: 0.45 }, '-=0.3')
            .from('.gsap-bento-card', { y: 28, scale: 0.98, autoAlpha: 0, stagger: 0.1, duration: 0.6 }, '-=0.45');
        }
      );
      return () => mm.revert();
    },
    { scope: pageRef }
  );

  // 1. Fetch real doctors and specialties from PostgreSQL Database
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [docsRes, specsRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/specialties')
        ]);

        if (isMounted) {
          const docsData = docsRes.data?.data || [];
          const specsData = specsRes.data?.data || [];
          setDoctors(docsData);
          setSpecialties(specsData);
        }
      } catch (err) {
        devLog.error('Failed to load landing data:', err);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const topDoctor = useMemo(() => {
    return doctors.length > 0 ? doctors[0] : null;
  }, [doctors]);

  const recommendedDoctorForSample = useMemo(() => {
    if (doctors.length === 0) return null;
    const profile = SAMPLE_PROFILES[activeSample];
    const matched = doctors.find(d =>
      d.specialties?.some(s => s.toLowerCase().includes(profile.specialtyKeyword.toLowerCase()))
    );
    return matched || doctors[0];
  }, [doctors, activeSample]);

  const filteredDoctors = useMemo(() => {
    if (selectedSpecialty === 'ALL') return doctors;
    const lower = selectedSpecialty.toLowerCase();
    return doctors.filter(d =>
      d.specialties?.some(s => s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase()))
    );
  }, [doctors, selectedSpecialty]);

  const totalConsultationsCount = useMemo(() => {
    const sum = doctors.reduce((acc, d) => acc + (d.totalConsultations || 0), 0);
    return sum > 0 ? sum.toLocaleString('vi-VN') : null;
  }, [doctors]);

  const handleSelectSample = (type: 'lipid' | 'respiratory' | 'general') => {
    if (isScanning) return;
    setUploadError(null);
    setRealAnalysis(null);
    setScanMode('sample');
    setActiveSample(type);
    setProgressWidth(100);
    setScanPercent('100% (Mẫu tham khảo)');
    setScanStatus(SAMPLE_PROFILES[type].title);
  };

  const executeRealScan = async (file: File) => {
    if (isScanning) return;
    setIsScanning(true);
    setUploadError(null);
    setRealAnalysis(null);
    setProgressWidth(45);
    setScanPercent('Đang xử lý...');
    setScanStatus(`Đang đọc tệp "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/documents/analyze-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.data) {
        setRealAnalysis(res.data.data);
        setScanMode('real');
        setProgressWidth(100);
        setScanPercent('100% (Hoàn tất)');
        setScanStatus(`Đã phân tích xong: ${file.name}`);
      }
    } catch (err: unknown) {
      setProgressWidth(0);
      setScanPercent('0% (Từ chối)');
      setRealAnalysis(null);

      const errMsg = getApiErrorMessage(err, 'Tệp không phân tích được hoặc không chứa thông tin xét nghiệm hợp lệ.');

      setUploadError(errMsg);
      setScanStatus(`Lỗi: ${errMsg}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isScanning) return;

    e.target.value = '';

    const name = file.name.toLowerCase();
    const ext = Object.keys(PREVIEW_TYPES).find((x) => name.endsWith(x));
    if (!ext || (file.type !== '' && !PREVIEW_TYPES[ext].includes(file.type.toLowerCase()))) {
      setRealAnalysis(null);
      setUploadError(`Tệp "${file.name}" không đúng định dạng. Chỉ nhận PDF, PNG, JPG.`);
      setScanStatus('Định dạng tệp không được hỗ trợ');
      setProgressWidth(0);
      setScanPercent('0% (Từ chối)');
      return;
    }

    if (file.size < 100) {
      setRealAnalysis(null);
      setUploadError(
        `⚠️ Tệp "${file.name}" quá nhỏ hoặc rỗng (${file.size} bytes). Hệ thống từ chối quét file rỗng! Vui lòng tải file PDF xét nghiệm có nội dung lâm sàng.`
      );
      setScanStatus(`Lỗi: Tệp tin "${file.name}" không có nội dung xét nghiệm hợp lệ`);
      setProgressWidth(0);
      setScanPercent('0% (Từ chối)');
      return;
    }

    executeRealScan(file);
  };

  const handleRunRealSampleScan = async () => {
    if (isScanning) return;
    try {
      setScanStatus('Đang nạp phiếu xét nghiệm mẫu...');
      const response = await fetch('/sample_medical_report.pdf');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample_medical_report.pdf', { type: 'application/pdf' });
      await executeRealScan(sampleFile);
    } catch (err) {
      devLog.error('Failed to load sample PDF for real scan:', err);
      setUploadError('Không tải được phiếu mẫu. Vui lòng thử lại.');
    }
  };

  const handleDoctorBooking = (doctorId?: string) => {
    if (isAuthenticated) {
      if (doctorId) {
        navigate(`/patient/doctors?doctorId=${doctorId}`);
      } else {
        navigate('/patient/doctors');
      }
    } else {
      navigate('/login');
    }
  };

  const currentSample = SAMPLE_PROFILES[activeSample];

  return (
    <div ref={pageRef} className="bg-[#F6F3EC] bg-atelier-dots font-sans text-slate-900 antialiased min-h-screen overflow-x-hidden">
      {/* 1. Top Clinical Emergency Telemetry Strip — Soft Clinical Rose Palette */}
      <div className="bg-rose-50/90 text-rose-950 border-b border-rose-200/80 px-4 sm:px-8 py-2 relative z-50">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300/80 font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              RED-FLAG 115
            </span>
            <span className="truncate text-rose-900/90 font-medium">
              Cấp cứu lâm sàng hoặc đe dọa tức thì: Bỏ qua chờ khám, liên hệ ngay 115 hoặc khoa Cấp cứu gần nhất.
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <a className="underline font-bold text-rose-700 hover:text-rose-900 transition-colors" href="tel:115">
              Cấp Cứu Toàn Quốc (115)
            </a>
            <span className="hidden md:inline text-rose-300">//</span>
            <span className="hidden md:inline text-rose-800/80">Hỗ trợ khẩn cấp: 1-800-555-0199</span>
          </div>
        </div>
      </div>

      {/* 2. Floating Architectural Pill Command Header — Smooth Frosted Glass Pill */}
      <header className="gsap-nav-shell sticky top-3 z-40 px-4 sm:px-8 mt-3">
        <div className="max-w-[1440px] mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.04)] px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-display font-bold text-base shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform duration-300">
                M+
              </div>
              <div>
                <span className="font-display text-lg text-slate-900 tracking-tight font-bold block leading-none">
                  MediAssist <span className="font-serif italic font-normal text-teal-600">Atelier</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 block mt-0.5">
                  CLINICAL AI // V4.8
                </span>
              </div>
            </Link>

            <div className="hidden xl:flex items-center gap-1.5 bg-teal-50 text-teal-800 px-3 py-1 rounded-full border border-teal-200/80 font-mono text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>HIPAA &amp; HL7 FHIR V4</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 font-display text-xs font-bold">
            <a
              className="px-3.5 py-2 text-teal-700 bg-teal-50/80 rounded-full transition-colors"
              href="#"
            >
              01 // Trang chủ
            </a>
            <a
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              href="#quick-demo"
            >
              02 // Phân Tích Bệnh Án
            </a>
            <a
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              href="#specialists-section"
            >
              03 // Mạng Lưới Bác Sĩ
            </a>
            <button
              onClick={() => handleDoctorBooking()}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              04 // Hội Chẩn Trực Tuyến
            </button>
            <button
              onClick={() => navigate('/doctor')}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              05 // Bàn Khám Bác Sĩ
            </button>
          </nav>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'DOCTOR' ? '/doctor' : '/patient')}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition-colors cursor-pointer text-left"
                  type="button"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                    {user.fullName ? user.fullName.split(' ').slice(-1)[0][0].toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <span className="font-display font-bold text-xs block leading-none truncate max-w-[120px]">{user.fullName}</span>
                    <span className="font-mono text-[9px] text-teal-700 uppercase">
                      {user.role === 'ADMIN' ? 'Quản Trị' : user.role === 'DOCTOR' ? 'Bác Sĩ' : 'Bệnh Nhân'}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => logout()}
                  title="Đăng xuất"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full border border-slate-200 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 font-display text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                >
                  Đăng Nhập
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 font-display text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Khám Ngay →
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-8 pb-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          {/* ==================== ASYMMETRIC CLINICAL BENTO HERO ==================== */}
          <section className="relative pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 Columns: Editorial Manifesto & Metrics Bento */}
              <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-[0_10px_35px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

                <div>
                  {/* Live Status Pill */}
                  <div className="gsap-hero-badge inline-flex items-center gap-2 bg-teal-50 text-teal-800 border border-teal-200/80 px-3.5 py-1.5 rounded-full mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
                      Hệ Thống Trực Tuyến • AI Chẩn Đoán v4.8 Active
                    </span>
                  </div>

                  {/* Editorial Display Heading */}
                  <h1 className="gsap-hero-title font-display text-3xl sm:text-5xl lg:text-[54px] text-slate-900 tracking-tight leading-[1.08] font-bold mb-6">
                    Chẩn Đoán Thông Minh Từ{' '}
                    <span className="font-serif italic font-normal text-teal-600 underline decoration-teal-400/50 decoration-2 underline-offset-4">
                      Bệnh Án PDF
                    </span>{' '}
                    — Kết Nối Bác Sĩ Tức Thì.
                  </h1>

                  {/* Subtitle */}
                  <p className="gsap-hero-sub text-base sm:text-lg text-slate-600 mb-8 max-w-2xl leading-relaxed">
                    Tải lên kết quả xét nghiệm máu, hình ảnh chụp cắt lớp (CT/MRI) hoặc tóm tắt bệnh án xuất viện. Hệ thống AI bóc tách chỉ số bất thường trong 30 giây và ghép nối bạn với bác sĩ chuyên khoa đầu ngành.
                  </p>

                  {/* CTA Buttons Group */}
                  <div className="flex flex-wrap items-center gap-3.5">
                    <a
                      className="gsap-hero-cta inline-flex items-center justify-center gap-2.5 bg-teal-600 hover:bg-teal-700 text-white font-display text-sm px-6 py-3.5 rounded-2xl shadow-md shadow-teal-600/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer font-bold"
                      href="#quick-demo"
                    >
                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                      <span>Tải Lên Bệnh Án PDF Miễn Phí</span>
                    </a>
                    <a
                      className="gsap-hero-cta inline-flex items-center justify-center gap-2 bg-[#F6F3EC] text-slate-800 hover:bg-slate-200/70 font-display text-sm px-5 py-3.5 rounded-2xl border border-slate-300/80 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer font-bold"
                      href="#specialists-section"
                    >
                      <span className="material-symbols-outlined text-[20px] text-teal-600">stethoscope</span>
                      <span>Khám Phá Bác Sĩ{doctors.length > 0 ? ` (${doctors.length})` : ''}</span>
                    </a>
                  </div>
                </div>

                {/* Bottom Architectural Telemetry Strip */}
                <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-slate-200/80">
                    <div className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">01 // QUYỀN RIÊNG TƯ</div>
                    <div className="font-display text-sm text-slate-900 font-bold mt-1">Ẩn thông tin cá nhân</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/60">
                    <div className="font-mono text-[10px] text-teal-700 font-bold uppercase tracking-widest">02 // AI HỖ TRỢ</div>
                    <div className="font-display text-sm text-slate-900 font-bold mt-1">Giải thích dễ hiểu</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
                    <div className="font-mono text-[10px] text-emerald-700 font-bold uppercase tracking-widest">03 // CHUYÊN GIA</div>
                    <div className="font-display text-sm text-slate-900 font-bold mt-1">
                      {isLoadingData ? '…' : doctors.length > 0 ? `${doctors.length} bác sĩ` : 'Đang cập nhật'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Luminous Clinical Observatory Card */}
              <div className="gsap-bento-card lg:col-span-5 bg-white text-slate-800 border border-slate-200/90 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex flex-col justify-between overflow-hidden">
                {/* Console Header Bar */}
                <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-teal-700 font-bold tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>TELEHEALTH LIVE // #MC-2026</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">FHIR-R4</span>
                </div>

                {/* Clinical Visual Showcase */}
                <div className="relative p-5 pb-0">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
                    <img
                      alt="Bác sĩ chuyên khoa đang tư vấn kết quả phân tích tim mạch trên màn hình cho bệnh nhân"
                      className="w-full h-64 sm:h-72 object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKapt12RlJP5C-7szFWNFCLng5nuqRmQ9wnAu6Ozez8-0PKzsEXvMjZY_DN5nQEdWzlLdTLn-x_YWuDHq_uvflmLJQqy4J27uqbKmua_WECsQ0jExiRWvEKL8qCjqr_Bmxbsj_Tsst4a7HeYpEOrQP-M_gKrCy5M9Aigv_08JIhU-pb4vomjnZLR3YTHdgrwhc4oI6ci24GJyyuim1d7RVAR13TQMU-ONgVHzeRkPz0oywlL5sX5Qcfw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-teal-800 font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                      <span className="material-symbols-outlined text-[14px] text-teal-600">vital_signs</span>
                      <span>OCR VISION: 0.8s • VERIFIED</span>
                    </div>
                  </div>
                </div>

                {/* Featured Specialist Card inside Luminous Console */}
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-teal-800 font-mono text-[10px] uppercase tracking-wider font-bold bg-teal-50 border border-teal-200/70 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[14px] text-teal-600">bolt</span>
                      Bác sĩ trên hệ thống
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                      {topDoctor?.hospitalAffiliation || ''}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FCFBF8] border border-slate-200/80 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        alt={topDoctor?.fullName || "Bác sĩ tiêu biểu"}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        src={topDoctor ? getDoctorAvatar(topDoctor, 0) : DOCTOR_PORTRAITS[0]}
                      />
                      <div className="min-w-0">
                        <div className="font-display text-sm text-slate-900 font-bold truncate">
                          {topDoctor ? [topDoctor.academicTitle, topDoctor.fullName].filter(Boolean).join(' ') : isLoadingData ? 'Đang tải...' : 'Chưa có bác sĩ'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate">
                          {[topDoctor?.specialties?.[0], topDoctor?.yearsOfExperience ? `${topDoctor.yearsOfExperience} năm kinh nghiệm` : null].filter(Boolean).join(' • ')}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                          {formatRating(topDoctor?.rating, topDoctor?.reviewCount) ? (
                            <>
                              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span className="text-slate-800 font-mono text-[11px] font-bold">{formatRating(topDoctor?.rating, topDoctor?.reviewCount)}</span>
                              <span className="text-slate-400 text-[10px]">({topDoctor?.reviewCount} đánh giá)</span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">Chưa có đánh giá</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDoctorBooking(topDoctor?.id)}
                      className="px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-display text-xs font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>Đặt Khám</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== INTERACTIVE PDF DEMO DROPZONE (BIO-SCANNER TERMINAL) — Light Atelier Laboratory ==================== */}
          <section className="my-12" id="quick-demo">
            <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-[0_10px_35px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs uppercase tracking-widest font-bold mb-2">
                    MODULE 02 // TRẢI NGHIỆM TRỰC QUAN VISION OCR
                  </div>
                  <h2 className="font-display text-2xl sm:text-4xl text-slate-900 tracking-tight font-bold">
                    Thử Nghiệm Tải Lên &amp;{' '}
                    <span className="font-serif italic font-normal text-teal-600">Phân Tích Bệnh Án Mẫu</span>
                  </h2>
                </div>
                <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                  Chọn một hồ sơ xét nghiệm có sẵn dưới đây hoặc kéo thả file PDF của bạn để quan sát cách trí tuệ nhân tạo giải mã kết quả y khoa chỉ trong vài giây.
                </p>
              </div>

              {/* Main Interactive Sandbox Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left 7 cols: Upload and File Selector */}
                <div className="lg:col-span-7 flex flex-col justify-between bg-[#FCFBF8] text-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs">
                  {/* Test Action Bar */}
                  <div className="mb-5 p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleRunRealSampleScan}
                        disabled={isScanning}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-display text-xs font-bold transition-all shadow-sm shadow-teal-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isScanning ? 'animate-spin' : ''}`}>
                          {isScanning ? 'sync' : 'bolt'}
                        </span>
                        <span>{isScanning ? 'Đang phân tích...' : 'Thử với phiếu xét nghiệm mẫu'}</span>
                      </button>

                      <a
                        href="/sample_medical_report.pdf"
                        download="benh_an_xet_nghiem_mau_mediassist.pdf"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F6F3EC] hover:bg-slate-200/70 text-slate-800 font-display text-xs font-bold transition-all border border-slate-300/80"
                        title="Tải về file PDF mẫu có 5 chỉ số sinh hóa hợp lệ để kiểm thử tải lên"
                      >
                        <span className="material-symbols-outlined text-[16px] text-teal-600">download</span>
                        <span>Tải phiếu mẫu (PDF)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => navigate(isAuthenticated ? '/patient/documents' : '/login')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-teal-700 hover:bg-teal-50 font-mono text-[11px] font-bold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                        <span>Bàn Làm Việc AI EMR →</span>
                      </button>
                    </div>
                  </div>

                  {/* Sample Files Selector */}
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-2.5 block font-bold">
                      1. Hoặc chọn nhanh hồ sơ y tế mẫu có sẵn:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                      <button
                        className={`text-left p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                          scanMode === 'sample' && activeSample === 'lipid'
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                            : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/90 shadow-xs'
                        }`}
                        onClick={() => handleSelectSample('lipid')}
                      >
                        <div className="flex items-center gap-1.5 font-display text-xs font-bold mb-0.5">
                          <span className={`material-symbols-outlined text-[16px] ${scanMode === 'sample' && activeSample === 'lipid' ? 'text-teal-100' : 'text-teal-600'}`}>bloodtype</span>
                          <span>Lipid Panel</span>
                        </div>
                        <div className={`text-[11px] ${scanMode === 'sample' && activeSample === 'lipid' ? 'text-teal-100' : 'text-slate-500'}`}>
                          Xét nghiệm mỡ máu &amp; Triglyceride
                        </div>
                      </button>

                      <button
                        className={`text-left p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                          scanMode === 'sample' && activeSample === 'respiratory'
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                            : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/90 shadow-xs'
                        }`}
                        onClick={() => handleSelectSample('respiratory')}
                      >
                        <div className="flex items-center gap-1.5 font-display text-xs font-bold mb-0.5">
                          <span className={`material-symbols-outlined text-[16px] ${scanMode === 'sample' && activeSample === 'respiratory' ? 'text-teal-100' : 'text-teal-600'}`}>pulmonology</span>
                          <span>Hô Hấp &amp; Khí Máu</span>
                        </div>
                        <div className={`text-[11px] ${scanMode === 'sample' && activeSample === 'respiratory' ? 'text-teal-100' : 'text-slate-500'}`}>
                          Chỉ số FEV1, SpO2, PaO2
                        </div>
                      </button>

                      <button
                        className={`text-left p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                          scanMode === 'sample' && activeSample === 'general'
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                            : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/90 shadow-xs'
                        }`}
                        onClick={() => handleSelectSample('general')}
                      >
                        <div className="flex items-center gap-1.5 font-display text-xs font-bold mb-0.5">
                          <span className={`material-symbols-outlined text-[16px] ${scanMode === 'sample' && activeSample === 'general' ? 'text-teal-100' : 'text-teal-600'}`}>assignment</span>
                          <span>Đa Khoa Tổng Hợp</span>
                        </div>
                        <div className={`text-[11px] ${scanMode === 'sample' && activeSample === 'general' ? 'text-teal-100' : 'text-slate-500'}`}>
                          Tóm tắt bệnh án xuất viện
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Validation Error Warning Banner */}
                  {uploadError && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 text-rose-900 border border-rose-200 text-xs flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">error</span>
                      <div className="flex-1">
                        <div className="font-bold text-rose-800">Hệ thống từ chối tệp không hợp lệ:</div>
                        <div className="mt-0.5 text-xs text-rose-900 leading-relaxed">{uploadError}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-rose-800 hover:text-rose-600 text-sm font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Drag & Drop zone */}
                  <div
                    className={`relative cursor-pointer bg-white hover:bg-teal-50/20 border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                      isScanning ? 'ring-2 ring-teal-500 bg-teal-50/40' : ''
                    }`}
                  >
                    <input
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      aria-label="Chọn tệp phiếu xét nghiệm để phân tích"
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      onChange={handleFileUpload}
                      disabled={isScanning}
                      type="file"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center mb-3 shadow-xs">
                      <span className={`material-symbols-outlined text-[28px] text-teal-600 ${isScanning ? 'animate-bounce' : ''}`}>
                        {isScanning ? 'vital_signs' : 'cloud_upload'}
                      </span>
                    </div>
                    <div className="font-display text-base text-slate-900 font-bold">
                      {isScanning ? 'Đang đọc và phân tích tài liệu...' : 'Kéo và thả tệp PDF bệnh án hoặc hình chụp tại đây'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Hỗ trợ PDF, PNG, JPG • Tệp cần có nội dung xét nghiệm • Bản xem trước không lưu vào hồ sơ
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 bg-[#FCFBF8] px-4 py-2 rounded-xl border border-slate-300 shadow-xs text-slate-900 font-display text-xs font-bold">
                      <span className="material-symbols-outlined text-[18px] text-teal-600">folder_open</span> Duyệt file từ máy tính
                    </div>
                  </div>

                  {/* Live Scanning Bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">{scanStatus}</span>
                      <span className="text-teal-700 font-bold font-mono">{scanPercent}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Instant Live Diagnosis Simulator Panel — Light Clinical Card */}
                {uploadError ? (
                  <div className="lg:col-span-5 bg-white p-6 rounded-2xl flex flex-col justify-between border border-rose-300 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[20px]">cancel</span>
                          Từ Chối Phân Tích
                        </span>
                        <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                          Không Hợp Lệ
                        </span>
                      </div>

                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4">
                        <div className="font-display text-sm text-rose-800 font-bold mb-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px]">report</span>
                          Lý do từ chối từ Gatekeeper Y Tế:
                        </div>
                        <p className="text-xs text-rose-900 leading-relaxed">{uploadError}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl mb-4 border border-slate-200">
                        <div className="font-display text-xs text-slate-800 font-bold mb-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-teal-600">verified_user</span>
                          Nguyên tắc an toàn y tế &amp; Trách nhiệm lâm sàng:
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Hệ thống <strong>TUYỆT ĐỐI KHÔNG</strong> tự động suy đoán, bịa đặt hoặc đề xuất bệnh án đối với tệp tin không chứa dữ liệu xét nghiệm rõ ràng.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunRealSampleScan}
                      className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-display text-xs py-3 rounded-xl transition-colors cursor-pointer font-bold shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>Thử Lại Với Phiếu Xét Nghiệm Mẫu Chuẩn BYT</span>
                    </button>
                  </div>
                ) : realAnalysis ? (
                  <div className="lg:col-span-5 bg-white p-6 rounded-2xl flex flex-col justify-between border border-teal-300 shadow-md animate-fadeIn">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[20px] text-teal-600">verified</span>
                          Kết quả phân tích
                        </span>
                        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                          {realAnalysis.recommendedSpecialtyName || 'Chuyên Khoa'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-4 max-h-56 overflow-y-auto pr-1">
                        {realAnalysis.indicators && realAnalysis.indicators.length > 0 ? (
                          realAnalysis.indicators.map((item, idx) => (
                            <div key={idx} className="p-3 bg-[#FCFBF8] rounded-xl flex items-center justify-between border border-slate-200/80">
                              <div>
                                <div className="font-display text-xs font-bold text-slate-900">{item.name}</div>
                                <div className="font-mono text-[10px] text-slate-400">Tham chiếu: {item.referenceRange}</div>
                              </div>
                              <div className="text-right">
                                <div className={`font-mono text-sm font-bold ${item.status === 'ELEVATED' || item.status === 'LOW' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {item.value} {item.unit}
                                </div>
                                <span className={`font-mono text-[10px] font-bold ${item.status === 'ELEVATED' || item.status === 'LOW' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {item.status === 'ELEVATED' ? 'Tăng cao ↑' : item.status === 'LOW' ? 'Giảm ↓' : 'Bình thường ✓'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center border border-slate-200">
                            Không phát hiện chỉ số sinh hóa vượt ngưỡng bất thường.
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl mb-4">
                        <div className="font-mono text-[11px] text-teal-800 font-bold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-teal-600">forum</span>
                          Tóm Tắt Lâm Sàng (AI Phân Tích Thật)
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {realAnalysis.plainLanguageExplanation || realAnalysis.clinicalSummary}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      {realAnalysis.matchedDoctors && realAnalysis.matchedDoctors.length > 0 ? (
                        <div className="flex items-center gap-3 p-3 bg-[#FCFBF8] rounded-xl mb-3 border border-slate-200">
                          <img
                            alt={realAnalysis.matchedDoctors[0].fullName}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                            src={getDoctorAvatar(realAnalysis.matchedDoctors[0], 0)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-sm text-slate-900 truncate font-bold">
                              {realAnalysis.matchedDoctors[0].academicTitle} {realAnalysis.matchedDoctors[0].fullName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 truncate">
                              {realAnalysis.matchedDoctors[0].specialties?.[0] || 'Chuyên Khoa'} • {realAnalysis.matchedDoctors[0].hospitalAffiliation}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDoctorBooking(realAnalysis.matchedDoctors?.[0]?.id)}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white hover:bg-teal-700 font-display text-xs py-3 rounded-xl transition-all cursor-pointer font-bold shadow-md shadow-teal-600/20"
                      >
                        <span className="material-symbols-outlined text-[18px]">video_call</span>
                        <span>Đặt Khám Với Bác Sĩ Chuyên Khoa Phù Hợp Này</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-teal-600">psychology</span>
                          Bóc Tách Mẫu Minh Họa
                        </span>
                        <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold ${currentSample.riskClass}`}>
                          {currentSample.risk}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 mb-4">
                        {currentSample.items.map((item, idx) => (
                          <div key={idx} className="p-3 bg-[#FCFBF8] border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs">
                            <div>
                              <div className="font-display text-xs font-bold text-slate-900">{item.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{item.ref}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono text-sm ${item.color} font-bold`}>{item.val}</div>
                              <span className={`font-mono text-[10px] ${item.color} font-medium`}>{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 bg-teal-50/60 border border-teal-200/70 rounded-xl mb-4">
                        <div className="font-mono text-[11px] text-teal-800 font-bold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-teal-600">forum</span> Tóm Tắt Dễ Hiểu
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{currentSample.summary}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      {recommendedDoctorForSample ? (
                        <div className="flex items-center gap-3 p-3 bg-[#FCFBF8] border border-slate-200/80 rounded-xl mb-3 shadow-2xs">
                          <img
                            alt={recommendedDoctorForSample.fullName}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                            src={getDoctorAvatar(recommendedDoctorForSample, 1)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-sm text-slate-900 truncate font-bold">
                              {recommendedDoctorForSample.academicTitle} {recommendedDoctorForSample.fullName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 truncate">
                              {recommendedDoctorForSample.specialties?.[0] || 'Chuyên Khoa'} • {recommendedDoctorForSample.hospitalAffiliation}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDoctorBooking(recommendedDoctorForSample?.id)}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-display text-xs py-3 rounded-xl transition-all cursor-pointer font-bold shadow-md shadow-teal-600/20"
                      >
                        <span className="material-symbols-outlined text-[18px]">video_call</span>
                        <span>Đặt Khám Với Bác Sĩ Này Ngay</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ==================== 3-STEP PROTOCOL ==================== */}
          <section className="my-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="font-mono text-xs text-teal-700 uppercase tracking-widest font-bold mb-1">
                  PROTOCOL // QUY TRÌNH HOẠT ĐỘNG
                </div>
                <h2 className="font-display text-2xl sm:text-4xl text-slate-900 tracking-tight font-bold">
                  Giải Mã Bệnh Án Qua{' '}
                  <span className="font-serif italic font-normal text-teal-600">3 Bước Liền Mạch</span>
                </h2>
              </div>
              <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                Không còn hoang mang trước những thuật ngữ khó hiểu hay chờ đợi hàng tuần để gặp đúng chuyên gia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  num: '01',
                  icon: 'document_scanner',
                  title: 'Tải Bệnh Án Dạng PDF Hoặc Ảnh Chụp',
                  desc: 'Hệ thống tiếp nhận mọi định dạng: kết quả xét nghiệm sinh hóa, ảnh chụp X-quang, MRI/CT, đơn thuốc viết tay hoặc giấy chuyển tuyến.',
                  tag: 'Mã hóa đầu cuối bảo mật PHI',
                },
                {
                  num: '02',
                  icon: 'analytics',
                  title: 'AI Phân Tích & Đối Chiếu Dữ Liệu',
                  desc: 'Công nghệ OCR thế hệ mới trích xuất các chỉ số sinh học, đánh dấu giá trị nguy hiểm và chuyển thể thành bản phân tích ngôn ngữ đời thường rõ ràng.',
                  tag: 'Tốc độ xử lý dưới 30 giây',
                },
                {
                  num: '03',
                  icon: 'video_chat',
                  title: 'Khám 1:1 Với Chuyên Gia Đầu Ngành',
                  desc: 'Hệ thống khớp hồ sơ với bác sĩ chuyên khoa phù hợp nhất. Bắt đầu phiên hội chẩn từ xa có tích hợp xem bệnh án song song và kê đơn điện tử.',
                  tag: '100% Bác sĩ có chứng chỉ hành nghề',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shadow-2xs">
                        <span className="material-symbols-outlined text-[24px] text-teal-600">{step.icon}</span>
                      </div>
                      <span className="font-mono text-3xl font-bold text-slate-200">//{step.num}</span>
                    </div>
                    <h3 className="font-display text-lg text-slate-900 mb-2 font-bold">{step.title}</h3>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 font-mono text-[11px] text-teal-700 font-bold">
                    ✓ {step.tag}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==================== METRICS & CLINICAL ACCREDITATION ==================== */}
          <section className="my-14 bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-center">
              <div className="p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200/80">
                <div className="font-mono text-3xl sm:text-4xl text-teal-700 font-bold tracking-tight">
                  {totalConsultationsCount ?? '—'}
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-1 uppercase">Lượt khám đã hoàn tất</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200/80">
                <div className="font-mono text-3xl sm:text-4xl text-emerald-600 font-bold tracking-tight">24/7</div>
                <div className="font-mono text-[11px] text-slate-500 mt-1 uppercase">Trợ lý triệu chứng sẵn sàng</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200/80">
                <div className="font-mono text-3xl sm:text-4xl text-slate-900 font-bold tracking-tight">
                  {isLoadingData ? '…' : doctors.length > 0 ? `${doctors.length} Bác Sĩ` : '—'}
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-1 uppercase">Bác sĩ thẩm định chứng chỉ</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FCFBF8] border border-slate-200/80">
                <div className="font-mono text-3xl sm:text-4xl text-amber-600 font-bold tracking-tight">
                  {isLoadingData ? '…' : specialties.length > 0 ? `${specialties.length} Khoa` : '—'}
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-1 uppercase">Chuyên khoa lâm sàng trọng điểm</div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-bold">
                Nguyên tắc thiết kế an toàn y tế:
              </span>
              <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
                <span>● Bảo vệ dữ liệu sức khoẻ (HIPAA)</span>
                <span>● Chuẩn giao tiếp HL7 FHIR v4</span>
                <span>● Mã hoá kênh truyền SSL/TLS</span>
                <span>● Nghị định 13/2023/NĐ-CP</span>
              </div>
            </div>
          </section>

          {/* ==================== FEATURED SPECIALISTS ==================== */}
          <section className="my-14" id="specialists-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div>
                <div className="font-mono text-xs text-teal-700 uppercase tracking-widest font-bold mb-1">
                  DIRECTORY // MẠNG LƯỚI CHUYÊN GIA THỰC TẾ
                </div>
                <h2 className="font-display text-2xl sm:text-4xl text-slate-900 tracking-tight font-bold">
                  Đội Ngũ Bác Sĩ Tuyến Đầu{' '}
                  <span className="font-serif italic font-normal text-teal-600">Sẵn Sàng Hội Chẩn</span>
                </h2>
              </div>
              <button
                onClick={() => handleDoctorBooking()}
                className="inline-flex items-center gap-1.5 text-slate-900 font-display text-sm font-bold hover:text-teal-600 cursor-pointer transition-colors"
              >
                <span>Xem toàn bộ {doctors.length > 0 ? doctors.length : 12} bác sĩ</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>

            {specialties.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
                <button
                  onClick={() => setSelectedSpecialty('ALL')}
                  className={`px-4 py-2 rounded-full font-mono text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    selectedSpecialty === 'ALL'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Tất Cả ({doctors.length})
                </button>
                {specialties.slice(0, 10).map((spec) => {
                  const displayName = spec.name.includes('(')
                    ? spec.name.split('(')[1].replace(')', '').trim()
                    : spec.name;
                  const isSelected = selectedSpecialty === spec.name;
                  return (
                    <button
                      key={spec.id}
                      onClick={() => setSelectedSpecialty(isSelected ? 'ALL' : spec.name)}
                      className={`px-4 py-2 rounded-full font-mono text-xs transition-all shrink-0 cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      {displayName}
                    </button>
                  );
                })}
              </div>
            )}

            {isLoadingData ? (
              <div className="py-16 text-center text-slate-500 font-mono text-sm">
                Đang kết nối cơ sở dữ liệu bệnh viện...
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-600">
                Chưa có bác sĩ nào thuộc chuyên khoa đã chọn.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredDoctors.slice(0, 6).map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          alt={doc.fullName}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                          src={getDoctorAvatar(doc, idx)}
                        />
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 font-bold">
                            {doc.specialties?.[0] || "Đa Khoa"}
                          </span>
                          <h4 className="font-display text-base text-slate-900 mt-1 font-bold truncate">
                            {doc.academicTitle ? `${doc.academicTitle} ` : ''}{doc.fullName}
                          </h4>
                          <p className="font-mono text-[11px] text-slate-500 truncate">
                            {doc.hospitalAffiliation || "Bệnh Viện Tuyến Trung Ương"}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                        {doc.bio || (doc.hospitalAffiliation ? `Công tác tại ${doc.hospitalAffiliation}.` : 'Bác sĩ chưa cập nhật giới thiệu.')}
                      </p>

                      <div className="flex items-center justify-between text-xs mb-4 bg-[#FCFBF8] p-2.5 rounded-xl border border-slate-200/80">
                        <span className="font-mono text-[11px] text-slate-500">Đánh giá:</span>
                        {formatRating(doc.rating, doc.reviewCount) ? (
                          <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                            ★ {formatRating(doc.rating, doc.reviewCount)} ({doc.reviewCount} đánh giá)
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-xs">Chưa có đánh giá</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3 font-mono text-xs font-bold">
                        <span className="text-teal-700">
                          {doc.yearsOfExperience ? `${doc.yearsOfExperience} năm KN` : 'Chưa cập nhật KN'}
                        </span>
                        <span className="text-slate-900">
                          {formatVnd(doc.consultationFee) ? `${formatVnd(doc.consultationFee)} / lượt` : 'Phí: liên hệ'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDoctorBooking(doc.id)}
                        className="w-full py-3 rounded-xl bg-teal-600 text-white font-display text-xs font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-teal-600/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span> Đặt Lịch Tư Vấn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-[#FCFBF8] text-slate-600 border-t border-slate-200/90 py-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-500">
          <div>© 2026 MediAssist — Đồ án tốt nghiệp Kỹ sư phần mềm. Thông tin mang tính hỗ trợ tham khảo lâm sàng.</div>
          <div className="flex items-center gap-6 font-bold">
            <a className="hover:text-teal-700 transition-colors" href="#">HIPAA Compliance</a>
            <a className="hover:text-teal-700 transition-colors" href="#">HL7 FHIR v4</a>
            <a className="hover:text-rose-700 text-rose-600 transition-colors" href="tel:115">Cấp Cứu 115</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
