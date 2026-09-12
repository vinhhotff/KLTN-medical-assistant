import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartPulse,
  Sparkles,
  AlertTriangle,
  FileText,
  UserCheck,
  Stethoscope,
  ChevronRight,
  ArrowRight,
  Zap,
  PhoneCall,
  CheckCircle2,
  LogIn,
  ShieldCheck,
  Activity,
  Award,
  Search,
  Building2,
  ChevronDown,
  Star,
  Compass,
  Microscope
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner';
import { EcgMonitor } from '../components/landing/EcgMonitor';

interface SymptomScenario {
  id: string;
  chipLabel: string;
  inputQuery: string;
  isEmergency: boolean;
  specialty: string;
  priorityLabel: string;
  sbar: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
}

const PRESET_SCENARIOS: SymptomScenario[] = [
  {
    id: 'cardio-emergency',
    chipLabel: '🚨 Đau thắt ngực lan tay trái',
    inputQuery: 'Đau thắt ngực dữ dội vùng sau xương ức, lan ra cánh tay trái và hàm dưới, khó thở vã mồ hôi lạnh 20 phút',
    isEmergency: true,
    specialty: 'Tim Mạch Can Thiệp',
    priorityLabel: 'CẤP CỨU ĐỎ (Red-Flag)',
    sbar: {
      situation: 'Cơn đau thắt ngực cấp tính kèm khó thở, vã mồ hôi và lan chi trên trái kéo dài trên 20 phút.',
      background: 'Bệnh nhân có triệu chứng điển hình của hội chứng vành cấp (Acute Coronary Syndrome). Cần xử trí khẩn.',
      assessment: 'Mức độ ưu tiên: CẤP CỨU ĐỎ (Red-Flag). Nghi ngờ Nhồi máu cơ tim cấp (STEMI/NSTEMI).',
      recommendation: 'Kích hoạt ngay Cấp Cứu 115 hoặc di chuyển khẩn cấp tới phòng can thiệp tim mạch trong giờ vàng (Golden Hour).'
    }
  },
  {
    id: 'fever-infection',
    chipLabel: '🩺 Sốt cao 39.2°C & phát ban',
    inputQuery: 'Sốt cao 39.2°C liên tục 2 ngày, đau nhức hốc mắt và cơ khớp, kèm phát ban nhẹ dưới da',
    isEmergency: false,
    specialty: 'Truyền Nhiễm & Nội Tổng Quát',
    priorityLabel: 'Bán Khẩn (Khám Trong Ngày)',
    sbar: {
      situation: 'Sốt cao liên tục, đau nhức toàn thân và hốc mắt kéo dài 48 giờ.',
      background: 'Thời điểm dịch tễ sốt xuất huyết Dengue hoặc sốt virus. Chưa ghi nhận dấu hiệu xuất huyết tiêu hóa.',
      assessment: 'Mức độ ưu tiên: Bán khẩn (Màu Vàng). Cần làm xét nghiệm công thức máu (CBC) và kháng nguyên NS1.',
      recommendation: 'Bù điện giải bằng Oresol đúng tỷ lệ, hạ sốt Paracetamol đúng liều, đặt hẹn khám bác sĩ truyền nhiễm trong ngày.'
    }
  },
  {
    id: 'liver-enzyme',
    chipLabel: '📄 Men gan ALT 135 U/L sau xét nghiệm',
    inputQuery: 'Kết quả xét nghiệm men gan ALT tăng 135 U/L, AST 98 U/L, cảm giác đầy bụng khó tiêu sau bữa ăn',
    isEmergency: false,
    specialty: 'Tiêu Hóa - Gan Mật',
    priorityLabel: 'Khám Thường Quy',
    sbar: {
      situation: 'Tăng men gan tế bào mức độ trung bình (ALT > 3 lần ngưỡng trên bình thường).',
      background: 'Tiền sử dùng bia rượu hoặc thuốc chuyển hóa qua gan. Cần tầm soát viêm gan B, C và siêu âm ổ bụng.',
      assessment: 'Mức độ ưu tiên: Khám thường quy. Tổn thương tế bào gan chưa có biểu hiện suy tế bào gan cấp.',
      recommendation: 'Quét toàn bộ phiếu xét nghiệm PDF vào hệ thống để trích xuất biểu đồ chỉ số và kết nối Bác sĩ chuyên khoa Gan Mật.'
    }
  },
  {
    id: 'tachycardia',
    chipLabel: '🫀 Hồi hộp, tim đập nhanh 110 bpm',
    inputQuery: 'Cảm giác hồi hộp đánh trống ngực, tim đập nhanh 110 lần/phút lúc nghỉ ngơi, thỉnh thoảng hụt hơi nhẹ',
    isEmergency: false,
    specialty: 'Nội Tim Mạch & Rối Loạn Nhịp',
    priorityLabel: 'Khám Chuyên Khoa Sớm',
    sbar: {
      situation: 'Nhịp tim nhanh khi nghỉ (>100 bpm) kèm hồi hộp và hụt hơi không liên quan gắng sức nặng.',
      background: 'Cần loại trừ cường giáp, rối loạn thần kinh thực vật hoặc rối loạn nhịp tim kịch phát.',
      assessment: 'Mức độ ưu tiên: Cần khám chuyên khoa sớm. Cần đo điện tâm đồ ECG 12 chuyển đạo và xét nghiệm hormon TSH.',
      recommendation: 'Nghỉ ngơi tại chỗ, tránh caffein và đặt lịch khám Bác sĩ Tim Mạch để chỉ định đo Holter ECG 24h.'
    }
  },
  {
    id: 'epigastric',
    chipLabel: '🤢 Đau âm ỉ thượng vị lan sau lưng',
    inputQuery: 'Đau âm ỉ vùng thượng vị sau ăn đồ cay nóng, ợ chua nhiều về đêm, cảm giác cồn cào',
    isEmergency: false,
    specialty: 'Nội Tiêu Hóa & Nội Soi',
    priorityLabel: 'Khám Tiêu Hóa Hẹn Trước',
    sbar: {
      situation: 'Hội chứng khó tiêu chức năng nghi do viêm loét dạ dày - tá tràng hoặc trào ngược GERD.',
      background: 'Bệnh lý tiến triển âm ỉ. Chưa phát hiện dấu hiệu xuất huyết tiêu hóa (phân đen) hay nôn ra máu.',
      assessment: 'Mức độ ưu tiên: Khám ngoại trú theo lịch hẹn. Chưa có dấu hiệu thủng tạng rỗng hay viêm tụy cấp.',
      recommendation: 'Duy trì chế độ ăn thanh đạm, tránh rượu bia và đặt hẹn nội soi tiêu hóa không đau với bác sĩ chuyên khoa.'
    }
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  // Symptom Triage Simulator State
  const [activeScenario, setActiveScenario] = useState<SymptomScenario>(PRESET_SCENARIOS[0]);
  const [symptomInput, setSymptomInput] = useState<string>(PRESET_SCENARIOS[0].inputQuery);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSelectScenario = (scenario: SymptomScenario) => {
    setActiveScenario(scenario);
    setSymptomInput(scenario.inputQuery);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomInput.trim()) return;

    const lower = symptomInput.toLowerCase();
    const isRedFlag =
      lower.includes('thắt ngực') ||
      lower.includes('đau tim') ||
      lower.includes('đột quỵ') ||
      lower.includes('liệt nửa người') ||
      lower.includes('ngừng thở') ||
      lower.includes('hôn mê');

    if (isRedFlag) {
      setActiveScenario(PRESET_SCENARIOS[0]);
    } else {
      setActiveScenario({
        id: 'custom',
        chipLabel: 'Triệu chứng đã nhập',
        inputQuery: symptomInput,
        isEmergency: false,
        specialty: 'Nội Khoa Tổng Quát',
        priorityLabel: 'Khám Ngoại Trú Đề Xuất',
        sbar: {
          situation: `Ghi nhận triệu chứng lâm sàng: "${symptomInput}". Đã xử lý qua bộ bóc tách ngôn ngữ y khoa NLP.`,
          background: 'Hệ thống đối chiếu hồ sơ sức khỏe tiền sử và dữ liệu dịch tễ học lâm sàng.',
          assessment: 'Mức độ ưu tiên: Khám ngoại trú. Đề xuất đánh giá tổng quan các cơ quan liên quan và đo bộ chỉ số sinh tồn.',
          recommendation: 'Đăng nhập hoặc đăng ký phiên khám để nhận kết quả phân tích đầy đủ và kết nối Bác sĩ chuyên khoa phù hợp.'
        }
      });
    }
  };

  const handleStartTriage = () => {
    if (isAuthenticated) {
      navigate('/patient/triage');
    } else {
      navigate('/login');
    }
  };

  const handleStartBooking = () => {
    if (isAuthenticated) {
      navigate('/patient/doctors');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      
      {/* 1. Mandatory Clinical Disclaimer Banner (Fixed at top) */}
      <MedicalDisclaimerBanner dismissible={false} />

      {/* 2. Modern Clinical White & Blue Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Medical Pills */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative p-2.5 bg-gradient-to-tr from-sky-600 via-cyan-600 to-teal-500 rounded-2xl text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition">
                <HeartPulse className="w-6 h-6 animate-cardiac" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl text-slate-900 tracking-tight">
                    MediAssist<span className="text-sky-600">-AI</span>
                  </span>
                  <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-extrabold uppercase tracking-wider border border-sky-200">
                    Chuẩn BYT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  Trợ Lý Y Tế Lâm Sàng & Đặt Khám Chuyên Khoa Số 1
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#triage-simulator" className="hover:text-sky-600 transition flex items-center gap-1">
              <span>Sàng Lọc AI</span>
            </a>
            <a href="#clinical-pillars" className="hover:text-sky-600 transition">
              4 Cột Trụ Lâm Sàng
            </a>
            <a href="#specialists" className="hover:text-sky-600 transition">
              Bác Sĩ Tuyến Đầu
            </a>
            <a href="#workflow" className="hover:text-sky-600 transition">
              Quy Trình 4 Bước
            </a>
            <a href="#pricing" className="hover:text-sky-600 transition">
              Bảng Giá Escrow
            </a>
            <a href="#faq" className="hover:text-sky-600 transition">
              Hỏi Đáp FAQ
            </a>
          </nav>

          {/* Emergency 115 Dial & Auth Buttons */}
          <div className="flex items-center gap-3">
            {/* 115 Quick Alert Button */}
            <a
              href="tel:115"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-extrabold transition shadow-xs"
              title="Tổng đài Cấp cứu Y tế Toàn quốc 115"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>Cấp Cứu 115</span>
            </a>

            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  if (user.role === 'ADMIN') navigate('/admin');
                  else if (user.role === 'DOCTOR') navigate('/doctor');
                  else navigate('/patient');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25 transition cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Bảng Điều Khiển ({user.fullName.split(' ').slice(-1)[0]})</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition"
                >
                  Đăng Nhập
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white shadow-md shadow-sky-600/20 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Khám Miễn Phí</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section - Medical White & Blue with Live ECG Monitor */}
      <section className="relative pt-12 pb-20 bg-gradient-to-b from-sky-50/50 via-white to-slate-50/60 overflow-hidden border-b border-sky-100">
        
        {/* Soft Clinical Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-sky-200/25 rounded-full blur-3xl pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Clinical Presentation & Headlines */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Clinical Standard Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-bold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600" />
                </span>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Hệ Thống Trợ Lý Lâm Sàng & Phân Luồng Y Tế Quốc Gia</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Chăm Sóc Sức Khỏe Thông Minh Cùng{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600">
                  AI & Bác Sĩ Tuyến Đầu
                </span>
              </h1>

              {/* Clinical Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Bảo vệ tính mạng người bệnh với rào chắn <strong className="text-rose-600 font-bold">Red-Flag phản hồi &lt; 5ms</strong>, bóc tách phiếu xét nghiệm PDF với <strong className="text-sky-700 font-bold">SHA-256 Deduplication 0đ</strong>, và ghép nối Bác sĩ chuyên khoa Bệnh viện Chợ Rẫy, Bạch Mai qua <strong className="text-teal-700 font-bold">PostgreSQL pgvector 1536 chiều</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleStartTriage}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-sm shadow-xl shadow-sky-600/25 transition cursor-pointer"
                >
                  <span>Bắt Đầu Khám Sàng Lọc AI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleStartBooking}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-sky-50 border border-sky-200 text-slate-800 font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span>Đặt Lịch Bác Sĩ CKI/CKII</span>
                </button>
              </div>

              {/* 4 Trust Micro-Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">&lt; 5ms</div>
                    <div className="text-[10px] text-slate-500">Red-Flag Cấp Cứu</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">1536 Chiều</div>
                    <div className="text-[10px] text-slate-500">pgvector Match</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">100% Escrow</div>
                    <div className="text-[10px] text-slate-500">Bảo Lãnh Ký Quỹ</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">120+ Bác Sĩ</div>
                    <div className="text-[10px] text-slate-500">Thẩm Định CCHN</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live ECG Monitor & Telemetry Card */}
            <div className="lg:col-span-6 relative">
              
              {/* Floating Clinical Badge 1: Real-time Status */}
              <div className="absolute -top-4 -right-2 z-20 hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-xl shadow-sky-900/10 border border-sky-100 animate-float-slow">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Chuẩn Bộ Y Tế</div>
                  <div className="text-[10px] text-slate-500">Bảo mật HL7 / ISO 27001</div>
                </div>
              </div>

              {/* Floating Clinical Badge 2: pgvector Doctor Matched */}
              <div className="absolute -bottom-4 -left-2 z-20 hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-xl shadow-sky-900/10 border border-sky-100 animate-float-delayed">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-xl">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Bác Sĩ CKI Chợ Rẫy</div>
                  <div className="text-[10px] text-sky-600 font-mono font-bold">Cosine Match: 98.4%</div>
                </div>
              </div>

              {/* Embedded Real-time ECG Component */}
              <EcgMonitor />

            </div>

          </div>
        </div>
      </section>

      {/* 4. Interactive Live Clinical Triage Simulator */}
      <section id="triage-simulator" className="py-16 bg-white border-b border-sky-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
              Trải Nghiệm Trực Tiếp
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Mô Phỏng Phân Luồng Lâm Sàng SBAR & Red-Flag
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Chọn một kịch bản lâm sàng mẫu hoặc nhập triệu chứng của bạn để xem cơ chế phát hiện nguy kịch tức thì
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50/70 border border-sky-100 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Quick Scenario Preset Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>Kịch bản thử nghiệm nhanh:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeScenario.id === sc.id
                        ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                        : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {sc.chipLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleCustomSearch} className="relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder="Mô tả triệu chứng bất thường (ví dụ: đau ngực, ho ra máu, chóng mặt, nổi mề đay...)"
                  className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-xs"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Phân Luồng
                </button>
              </div>
            </form>

            {/* Live Result SBAR Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              activeScenario.isEmergency
                ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-md shadow-rose-100'
                : 'bg-sky-50/60 border-sky-200 text-slate-900'
            }`}>
              
              {/* SBAR Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/10">
                <div className="flex items-center gap-2">
                  {activeScenario.isEmergency ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">
                      {activeScenario.isEmergency
                        ? 'CẢNH BÁO RED-FLAG: NGUY CƠ ĐE DỌA TÍNH MẠNG'
                        : `KẾT QUẢ ĐỊNH HƯỚNG: CHUYÊN KHOA ${activeScenario.specialty.toUpperCase()}`}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      Bệnh án tóm tắt theo chuẩn SBAR quốc tế (Situation - Background - Assessment - Recommendation)
                    </p>
                  </div>
                </div>

                <span className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full ${
                  activeScenario.isEmergency
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-sky-600 text-white'
                }`}>
                  {activeScenario.priorityLabel}
                </span>
              </div>

              {/* SBAR 4 Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3.5 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    S - SITUATION (Hiện tượng):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.situation}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    B - BACKGROUND (Bệnh sử):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.background}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    A - ASSESSMENT (Đánh giá lâm sàng):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.assessment}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-emerald-700 block mb-1">
                    R - RECOMMENDATION (Khuyến nghị xử trí):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.recommendation}</p>
                </div>
              </div>

              {/* Bottom Action inside Simulator */}
              <div className="mt-4 pt-3 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Dữ liệu phân luồng được bảo mật và mã hóa chuẩn HL7/FHIR quốc tế.
                </span>

                {activeScenario.isEmergency ? (
                  <a
                    href="tel:115"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition animate-pulse"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Gọi Ngay Cấp Cứu 115</span>
                  </a>
                ) : (
                  <button
                    onClick={handleStartBooking}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Đặt Khám {activeScenario.specialty}</span>
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. 4 Core Clinical Pillars (4 Trụ Cột Lâm Sàng) */}
      <section id="clinical-pillars" className="py-20 bg-gradient-to-b from-white to-sky-50/40 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
              Kiến Trúc Y Tế Thế Hệ Mới
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              4 Cột Trụ Công Nghệ Phục Vụ Lâm Sàng
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Được thiết kế dựa trên tiêu chuẩn an toàn người bệnh cao nhất, loại bỏ hoàn toàn nguy cơ ảo giác của trí tuệ nhân tạo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-sky-200 font-mono group-hover:text-sky-400 transition">
                    01
                  </span>
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  Rào Chắn Red-Flag &lt; 5ms
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Phát hiện từ khóa đe dọa tính mạng (nhồi máu cơ tim, đột quỵ não, suy hô hấp cấp) ngay tại tầng Gateway trước khi gọi LLM. Kích hoạt chỉ dẫn 115 tức thì.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-rose-600">
                <span>Rào chắn an toàn 100%</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-sky-200 font-mono group-hover:text-sky-400 transition">
                    02
                  </span>
                  <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  Quét Xét Nghiệm SHA-256
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trích xuất tự động bảng chỉ số sinh hóa máu, men gan, chức năng thận từ ảnh/PDF. Băm mã SHA-256 Deduplication trả kết quả 0ms và hoàn toàn miễn phí khi quét lại.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-sky-600">
                <span>Deduplication 0đ</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-sky-200 font-mono group-hover:text-sky-400 transition">
                    03
                  </span>
                  <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  Ghép Bác Sĩ pgvector 1536D
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  PostgreSQL 16 pgvector tính toán Cosine Similarity so khớp triệu chứng và chỉ số bất thường với hồ sơ năng lực điều trị thực tế của Bác sĩ chuyên khoa sâu.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-teal-600">
                <span>Độ tương đồng &gt; 95%</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-sky-200 font-mono group-hover:text-sky-400 transition">
                    04
                  </span>
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  Bệnh Án EMR & ICD-10
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bàn khám Bác sĩ trực tuyến hỗ trợ theo dõi Vital Signs thời gian thực, mã hóa chẩn đoán theo danh mục chuẩn WHO ICD-10 và kê toa thuốc điện tử có mã QR xác thực.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-600">
                <span>Chuẩn WHO Quốc Tế</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Featured Specialist Doctors (Đội Ngũ Bác Sĩ Tuyến Đầu) */}
      <section id="specialists" className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
                Hội Đồng Lâm Sàng
              </span>
              <h2 className="text-3xl font-black text-slate-900">
                Đội Ngũ Bác Sĩ Tuyến Đầu Đã Thẩm Định CCHN
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm">
                100% Bác sĩ có Chứng Chỉ Hành Nghề từ Bộ Y Tế, đang công tác tại các bệnh viện Hạng Đặc Biệt
              </p>
            </div>

            <button
              onClick={handleStartBooking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition cursor-pointer self-start md:self-auto"
            >
              <span>Xem Tất Cả 120+ Bác Sĩ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Doctor 1 */}
            <div className="bg-slate-50/70 rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold flex items-center justify-center text-lg shadow-md">
                    ĐK
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">BS. CKI Nguyễn Đăng Khoa</h4>
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500">Tim Mạch Can Thiệp</p>
                    <span className="inline-block text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full mt-1">
                      BV Chợ Rẫy TP.HCM
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">pgvector Match:</span>
                    <span className="font-mono font-bold text-sky-600">98.4%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.9 (328 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký Quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">300.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 2 */}
            <div className="bg-slate-50/70 rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center text-lg shadow-md">
                    HN
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">BS. CKII Lê Hoàng Nam</h4>
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500">Cấp Cứu Nhi Khoa</p>
                    <span className="inline-block text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full mt-1">
                      BV Nhi Đồng 1
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">pgvector Match:</span>
                    <span className="font-mono font-bold text-teal-600">96.8%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 5.0 (412 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký Quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">350.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 3 */}
            <div className="bg-slate-50/70 rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold flex items-center justify-center text-lg shadow-md">
                    MC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">ThS. BS Trần Minh Châu</h4>
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500">Nội Tiêu Hóa - Gan Mật</p>
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full mt-1">
                      BV Bạch Mai Hà Nội
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">pgvector Match:</span>
                    <span className="font-mono font-bold text-indigo-600">97.2%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.9 (289 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký Quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">280.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 4 */}
            <div className="bg-slate-50/70 rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-md">
                    NQ
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">TS. BS Phạm Nhật Quang</h4>
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500">Nội Thần Kinh</p>
                    <span className="inline-block text-[10px] font-semibold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full mt-1">
                      BV ĐH Y Dược TP.HCM
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">pgvector Match:</span>
                    <span className="font-mono font-bold text-cyan-600">95.9%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.95 (194 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký Quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">320.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. Partner Hospital Network (Mạng Lưới Bệnh Viện Đối Tác) */}
      <section className="py-14 bg-slate-50/80 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Đồng hành cùng đội ngũ Bác sĩ đến từ các Bệnh viện Tuyến Đầu Toàn Quốc
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            {[
              { name: 'BV Chợ Rẫy', city: 'TP. Hồ Chí Minh', badge: 'Tuyến Trung Ương' },
              { name: 'BV Bạch Mai', city: 'Hà Nội', badge: 'Tuyến Trung Ương' },
              { name: 'BV ĐH Y Dược', city: 'TP. Hồ Chí Minh', badge: 'Hạng Đặc Biệt' },
              { name: 'Viện Tim Tâm Đức', city: 'TP. Hồ Chí Minh', badge: 'Chuyên Khoa Sâu' },
              { name: 'BV Nhi Đồng 1', city: 'TP. Hồ Chí Minh', badge: 'Nhi Khoa Tuyến 1' },
              { name: 'BV Phụ Sản Từ Dũ', city: 'TP. Hồ Chí Minh', badge: 'Sản Phụ Khoa' },
            ].map((hosp, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 hover:shadow-sm transition">
                <Building2 className="w-6 h-6 text-sky-600 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-slate-900">{hosp.name}</div>
                <div className="text-[10px] text-slate-500">{hosp.city}</div>
                <span className="inline-block text-[9px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full mt-1.5">
                  {hosp.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. 4-Step Clinical Patient Journey (Quy Trình 4 Bước) */}
      <section id="workflow" className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
              Quy Trình Chuẩn Lâm Sàng
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              4 Bước Số Hóa Hành Trình Chăm Sóc Sức Khỏe
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Từ dấu hiệu ban đầu đến toa thuốc điện tử, mọi bước đều được kiểm soát bởi chuẩn giao tiếp lâm sàng SBAR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              {
                step: '01',
                title: 'Sàng Lọc Red-Flag',
                desc: 'Phản hồi trong < 5ms phát hiện dấu hiệu khẩn cấp đe dọa tính mạng. Định dạng SBAR giúp bác sĩ nắm bắt bệnh án tức thì.',
                icon: AlertTriangle,
                color: 'text-rose-600 bg-rose-50 border-rose-200'
              },
              {
                step: '02',
                title: 'Quét PDF Xét Nghiệm',
                desc: 'Bóc tách tự động chỉ số sinh hóa máu, men gan, chức năng thận. Cơ chế băm SHA-256 Deduplication miễn phí khi tải lại.',
                icon: Microscope,
                color: 'text-sky-600 bg-sky-50 border-sky-200'
              },
              {
                step: '03',
                title: 'Ghép Bác Sĩ pgvector',
                desc: 'PostgreSQL pgvector 1536 chiều tính toán Cosine Similarity đối chiếu bất thường bệnh án với bác sĩ chuyên khoa sâu.',
                icon: UserCheck,
                color: 'text-teal-600 bg-teal-50 border-teal-200'
              },
              {
                step: '04',
                title: 'Bàn Khám EMR & ICD-10',
                desc: 'Khám trực tuyến bảo mật qua WebRTC, kê toa thuốc điện tử danh mục WHO ICD-10 và lưu trữ hồ sơ EMR trọn đời.',
                icon: Stethoscope,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-slate-50/70 rounded-3xl p-6 border border-sky-100 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-300 font-mono">{step.step}</span>
                    <div className={`p-3 rounded-2xl border ${step.color}`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center text-xs font-bold text-sky-600">
                  <span>Xem hướng dẫn chi tiết</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. Transparent Pricing & Escrow Guarantee (Kinh Tế Y Tế & Ký Quỹ) */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-sky-50/50 via-white to-slate-50 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 bg-teal-100 px-3.5 py-1 rounded-full border border-teal-200">
              Minh Bạch Chi Phí & Bảo Lãnh Viện Phí
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Chi Phí Rõ Ràng Cho Từng Nhu Cầu Chăm Sóc Sức Khỏe
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Bảo vệ viện phí của người bệnh qua cơ chế ký quỹ Escrow và hoàn tiền 100% nếu phiên khám bị hủy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* TIER 1: LẺ SCAN */}
            <div className="bg-white rounded-3xl p-7 border border-sky-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Gói Khám Lẻ</div>
                <h3 className="text-xl font-black text-slate-900">Quét Xét Nghiệm Lẻ</h3>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-black text-slate-900">29.000đ</span>
                  <span className="text-xs text-slate-500"> / lượt scan</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 lượt OCR phiếu xét nghiệm PDF/hình ảnh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đối chiếu chỉ số với khoảng tham chiếu chuẩn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gợi ý câu hỏi cần tham vấn Bác sĩ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>0đ nếu tài liệu trùng lặp (SHA-256 Cache)</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTriage}
                className="mt-8 w-full py-3 rounded-xl border border-sky-200 text-xs font-bold text-slate-800 hover:bg-sky-50 transition cursor-pointer"
              >
                Chọn Gói Lẻ
              </button>
            </div>

            {/* TIER 2: TIẾT KIỆM GIA ĐÌNH (BEST VALUE) */}
            <div className="bg-gradient-to-b from-sky-900 via-slate-900 to-sky-950 text-white rounded-3xl p-7 border-2 border-sky-400 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                Phổ Biến Nhất
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-2">Gói Tiết Kiệm</div>
                <h3 className="text-xl font-black text-white">Gói Gia Đình Tiết Kiệm</h3>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-black text-cyan-400">99.000đ</span>
                  <span className="text-xs text-sky-200"> / 5 lượt scan</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>5 lượt OCR xét nghiệm chuyên sâu (tiết kiệm 32%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lưu trữ đám mây bệnh án EMR dài hạn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Phân tích biểu đồ biến thiên chỉ số theo thời gian</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ưu tiên ghép Bác sĩ chuyên khoa pgvector</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTriage}
                className="mt-8 w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition cursor-pointer"
              >
                Kích Hoạt Gói Tiết Kiệm
              </button>
            </div>

            {/* TIER 3: MEDIPASS VIP */}
            <div className="bg-white rounded-3xl p-7 border border-sky-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2">Gói Hội Viên Cao Cấp</div>
                <h3 className="text-xl font-black text-slate-900">MediPass VIP 365</h3>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-black text-slate-900">149.000đ</span>
                  <span className="text-xs text-slate-500"> / tháng</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Triage AI SBAR & Red-Flag không giới hạn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>10 lượt OCR xét nghiệm chuyên sâu mỗi tháng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Giảm 10% phí khám Telehealth Bác sĩ CKI / CKII</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hỗ trợ ưu tiên 24/7 từ đội ngũ lâm sàng</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTriage}
                className="mt-8 w-full py-3 rounded-xl border border-teal-300 text-xs font-bold text-teal-700 hover:bg-teal-50 transition cursor-pointer"
              >
                Đăng Ký Hội Viên VIP
              </button>
            </div>

          </div>

          {/* Escrow Guarantee Callout */}
          <div className="max-w-3xl mx-auto mt-10 p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <strong className="font-extrabold text-emerald-900 block mb-0.5">
                Bảo Lãnh Ký Quỹ Escrow An Toàn Tuyệt Đối:
              </strong>
              Toàn bộ viện phí khám trực tuyến với Bác sĩ (250.000đ - 450.000đ) được giữ an toàn tại tài khoản trung gian. Bệnh nhân được hoàn tiền 100% nếu phiên khám bị hủy hoặc không được bác sĩ phản hồi.
            </div>
          </div>

        </div>
      </section>

      {/* 10. Clinical Endorsements (Đánh Giá Lâm Sàng) */}
      <section className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200">
              Đánh Giá Lâm Sàng
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Được Tin Tưởng Bởi Chuyên Gia Y Tế & Người Bệnh
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-50/70 border border-sky-100 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Bản tóm tắt SBAR của MediAssist-AI giúp tôi nắm bắt chính xác 85% bệnh sử và các chỉ số sinh hóa bất thường của bệnh nhân trước khi bắt đầu phiên khám trực tuyến. Tiết kiệm rất nhiều thời gian khai thác tiền sử."
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                  ĐK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">BS. CKI Nguyễn Đăng Khoa</h4>
                  <p className="text-[10px] text-slate-500">Chuyên Khoa Tim Mạch • BV Chợ Rẫy</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50/70 border border-sky-100 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Tôi đi xét nghiệm men gan cao nhưng không biết hỏi ai. Chụp ảnh phiếu gửi vào MediAssist-AI, hệ thống giải thích rất dễ hiểu, không hù dọa và kết nối ngay bác sĩ tiêu hóa giỏi để tôi an tâm điều trị."
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                  TB
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Anh Trần Bình (45 tuổi)</h4>
                  <p className="text-[10px] text-slate-500">Bệnh nhân ngoại trú • Quận 7, TP.HCM</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50/70 border border-sky-100 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Rào chắn Red-Flag phản hồi cực nhanh là điểm sáng lớn nhất. Bệnh nhân có dấu hiệu nhồi máu cơ tim được hướng dẫn gọi 115 ngay lập tức chứ không tốn thời gian chat lan man, bảo vệ an toàn tính mạng tuyệt đối."
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  HN
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">BS. CKII Lê Hoàng Nam</h4>
                  <p className="text-[10px] text-slate-500">Khoa Nhi Cấp Cứu • BV Nhi Đồng 1</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 11. FAQ Accordion */}
      <section id="faq" className="py-20 bg-slate-50/70 border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
              Giải Đáp Thắc Mắc
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Câu Hỏi Thường Gặp Về Nền Tảng MediAssist-AI
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Nền tảng MediAssist-AI có thay thế việc khám trực tiếp tại bệnh viện không?',
                a: 'Không. MediAssist-AI là công cụ trợ lý lâm sàng giúp sàng lọc sơ bộ, phân loại mức độ khẩn cấp (Red-Flag), giải thích chỉ số xét nghiệm và kết nối Bác sĩ chuyên khoa. Mọi quyết định chẩn đoán chính thức và phác đồ dùng thuốc bắt buộc phải do Bác sĩ có Chứng Chỉ Hành Nghề (CCHN) trực tiếp đảm nhiệm.'
              },
              {
                q: 'Làm thế nào để biết Bác sĩ trên nền tảng có đủ năng lực chuyên môn?',
                a: 'Tất cả Bác sĩ tham gia nền tảng đều phải nộp hồ sơ Chứng Chỉ Hành Nghề (CCHN) do Bộ Y Tế hoặc Sở Y Tế cấp, cùng bằng cấp chuyên khoa (CKI, CKII, Thạc sĩ, Tiến sĩ) và được Ban Giám Đốc Y Khoa của MediAssist-AI thẩm định trực tiếp trước khi kích hoạt tài khoản.'
              },
              {
                q: 'Chính sách bảo lãnh viện phí Escrow hoạt động như thế nào?',
                a: 'Khi bạn đặt lịch khám trực tuyến, chi phí khám sẽ được tạm giữ tại tài khoản ký quỹ trung gian Escrow. Chỉ khi phiên khám kết thúc thành công và bạn nhận được bệnh án EMR cùng toa thuốc, số tiền mới được chuyển đến bác sĩ. Nếu phiên khám bị hủy, bạn được hoàn tiền 100% về ví.'
              },
              {
                q: 'Dữ liệu bệnh án và kết quả xét nghiệm của tôi có được bảo mật không?',
                a: 'Có. Toàn bộ hồ sơ bệnh án EMR và hình ảnh xét nghiệm được mã hóa AES-256 theo chuẩn bảo mật y tế quốc tế HL7/FHIR và lưu trữ tại cụm máy chủ tuân thủ tiêu chuẩn an toàn thông tin ISO 27001.'
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-sky-600' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 12. Final Call To Action Banner */}
      <section className="py-20 bg-gradient-to-tr from-sky-800 via-cyan-800 to-teal-800 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-cyan-200 border border-white/20 text-xs font-semibold">
            <HeartPulse className="w-4 h-4 text-cyan-300 animate-cardiac" />
            <span>Đồng Hành Cùng Sức Khỏe Gia Đình Việt</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Sẵn Sàng Trải Nghiệm Chăm Sóc Sức Khỏe Thế Hệ Mới?
          </h2>

          <p className="text-sky-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Tham gia cùng hàng nghìn người bệnh và bác sĩ đang sử dụng MediAssist-AI để tối ưu hóa thời gian khám chữa bệnh và bảo vệ sức khỏe mỗi ngày.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleStartTriage}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-sky-50 text-sky-900 text-sm font-black shadow-xl shadow-sky-950/20 transition cursor-pointer"
            >
              <span>Bắt Đầu Khám Sàng Lọc AI Miễn Phí</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartBooking}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-sky-950/40 hover:bg-sky-950/60 border border-sky-400/40 text-white text-xs font-bold transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-cyan-300" />
              <span>Tìm Kiếm Bác Sĩ Chuyên Khoa</span>
            </button>
          </div>
        </div>
      </section>

      {/* 13. Clinical Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="p-2 bg-sky-600 rounded-xl text-white">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="font-black text-base">MediAssist-AI</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hệ sinh thái y tế số tích hợp trợ lý lâm sàng SBAR, bóc tách hồ sơ cận lâm sàng Multimodal và kết nối Bác sĩ chuyên khoa sâu theo chuẩn Bộ Y Tế.
            </p>
            <div className="text-[11px] text-slate-400">
              Hotline Khẩn Cấp: <a href="tel:115" className="text-rose-400 font-bold hover:underline">115</a> (Toàn quốc)
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Tính Năng Chính</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#triage-simulator" className="hover:text-white transition">Sàng Lọc Cấp Cứu Red-Flag</a></li>
              <li><a href="#clinical-pillars" className="hover:text-white transition">Quét PDF Xét Nghiệm OCR</a></li>
              <li><a href="#specialists" className="hover:text-white transition">Ghép Nối Bác Sĩ pgvector</a></li>
              <li><a href="#workflow" className="hover:text-white transition">Hồ Sơ Bệnh Án Điện Tử EMR</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Bệnh Viện Đối Tác</h4>
            <ul className="space-y-2 text-[11px]">
              <li>Bệnh viện Chợ Rẫy (TP.HCM)</li>
              <li>Bệnh viện Bạch Mai (Hà Nội)</li>
              <li>Bệnh viện Đại học Y Dược TP.HCM</li>
              <li>Viện Tim Tâm Đức</li>
              <li>Bệnh viện Nhi Đồng 1</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Tiêu Chuẩn & Bảo Mật</h4>
            <ul className="space-y-2 text-[11px]">
              <li>Mã hóa bảo mật chuẩn HL7 / FHIR</li>
              <li>Hệ thống quản lý an toàn ISO 27001</li>
              <li>Bảo lãnh viện phí ký quỹ Escrow 100%</li>
              <li>Hội đồng thẩm định CCHN Bác sĩ BYT</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <span>© 2026 MediAssist-AI. Dự án Khóa Luận Tốt Nghiệp & Phát Triển Doanh Nghiệp Y Tế.</span>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-white transition">Cổng Bác Sĩ</Link>
            <Link to="/login" className="hover:text-white transition">Cổng Quản Trị Viên</Link>
            <Link to="/login" className="hover:text-white transition">Cổng Bệnh Nhân</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
