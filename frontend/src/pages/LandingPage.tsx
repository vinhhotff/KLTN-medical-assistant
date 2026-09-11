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
  Compass
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { MedicalDisclaimerBanner } from '../components/common/MedicalDisclaimerBanner';

interface SymptomScenario {
  id: string;
  chipLabel: string;
  inputQuery: string;
  isEmergency: boolean;
  specialty: string;
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
    sbar: {
      situation: 'Cơn đau thắt ngực cấp tính kèm khó thở, vã mồ hôi và lan chi trên trái kéo dài trên 20 phút.',
      background: 'Bệnh nhân có triệu chứng điển hình của hội chứng vành cấp (Acute Coronary Syndrome). Cần xử trí khẩn.',
      assessment: 'Mức độ ưu tiên: CẤP CỨU ĐỎ (Red-Flag). Nghi ngờ Nhồi máu cơ tim cấp (STEMI/NSTEMI).',
      recommendation: 'Kích hoạt ngay Cấp Cứu 115 hoặc di chuyển khẩn cấp tới phòng cấp cứu can thiệp tim mạch trong giờ vàng (Golden Hour).'
    }
  },
  {
    id: 'fever-infection',
    chipLabel: '🩺 Sốt cao 39.2°C & đau đầu',
    inputQuery: 'Sốt cao 39.2°C liên tục 2 ngày, đau nhức hốc mắt và cơ khớp, kèm phát ban nhẹ dưới da',
    isEmergency: false,
    specialty: 'Truyền Nhiễm & Nội Tổng Quát',
    sbar: {
      situation: 'Sốt cao co giật nhẹ, đau nhức toàn thân và hốc mắt kéo dài 48 giờ.',
      background: 'Thời điểm dịch tễ sốt xuất huyết Dengue hoặc sốt virus. Chưa ghi nhận dấu hiệu xuất huyết tiêu hóa.',
      assessment: 'Mức độ ưu tiên: Bán khẩn (Màu Vàng). Cần làm xét nghiệm công thức máu (CBC) và kháng nguyên NS1.',
      recommendation: 'Uống nhiều nước oresol, hạ sốt bằng Paracetamol đúng liều, đặt hẹn khám bác sĩ truyền nhiễm trong ngày.'
    }
  },
  {
    id: 'liver-enzyme',
    chipLabel: '📄 Men gan ALT 135 U/L sau xét nghiệm',
    inputQuery: 'Kết quả xét nghiệm men gan ALT tăng 135 U/L, AST 98 U/L, cảm giác đầy bụng khó tiêu sau bữa ăn',
    isEmergency: false,
    specialty: 'Tiêu Hóa - Gan Mật',
    sbar: {
      situation: 'Tăng men gan tế bào mức độ trung bình (ALT > 3 lần ngưỡng trên bình thường).',
      background: 'Tiền sử dùng bia rượu hoặc thuốc chuyển hóa qua gan. Cần tầm soát viêm gan B, C và siêu âm ổ bụng.',
      assessment: 'Mức độ ưu tiên: Khám thường quy (Màu Xanh). Tổn thương tế bào gan chưa có suy gan cấp.',
      recommendation: 'Chụp lại toàn bộ phiếu xét nghiệm PDF vào hệ thống để trích xuất chỉ số và kết nối Bác sĩ chuyên khoa Gan Mật.'
    }
  },
  {
    id: 'tachycardia',
    chipLabel: '🫀 Hồi hộp, tim đập nhanh 110 bpm',
    inputQuery: 'Cảm giác hồi hộp đánh trống ngực, tim đập nhanh 110 lần/phút lúc nghỉ ngơi, thỉnh thoảng hụt hơi nhẹ',
    isEmergency: false,
    specialty: 'Nội Tim Mạch & Rối Loạn Nhịp',
    sbar: {
      situation: 'Nhịp tim nhanh khi nghỉ (>100 bpm) kèm hồi hộp và hụt hơi không liên quan gắng sức nặng.',
      background: 'Cần loại trừ cường giáp, rối loạn thần kinh thực vật hoặc rối loạn nhịp tim kịch phát.',
      assessment: 'Mức độ ưu tiên: Cần khám chuyên khoa sớm (Màu Vàng nhạt). Cần đo điện tâm đồ ECG và xét nghiệm TSH.',
      recommendation: 'Nghỉ ngơi tại chỗ, tránh caffein và đặt lịch khám Bác sĩ Tim Mạch để chỉ định đo Holter ECG 24h.'
    }
  },
  {
    id: 'epigastric',
    chipLabel: '🤢 Đau quặn bụng thượng vị',
    inputQuery: 'Đau âm ỉ thượng vị lan ra sau lưng sau khi ăn đồ cay nóng, ợ chua nhiều về đêm',
    isEmergency: false,
    specialty: 'Nội Tiêu Hóa & Nội Soi',
    sbar: {
      situation: 'Hội chứng khó tiêu chức năng nghi do viêm loét dạ dày - tá tràng hoặc trào ngược GERD.',
      background: 'Bệnh lý tiến triển âm ỉ. Cần theo dõi tính chất phân để loại trừ xuất huyết tiêu hóa vi thể.',
      assessment: 'Mức độ ưu tiên: Khám tiêu hóa theo lịch hẹn. Chưa có dấu hiệu thủng tạng rỗng hay viêm tụy cấp.',
      recommendation: 'Tư vấn chế độ ăn mềm, kiêng chất kích thích và kết nối bác sĩ nội soi tiêu hóa.'
    }
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  // Symptom Triage Simulator State
  const [activeScenario, setActiveScenario] = useState<SymptomScenario>(PRESET_SCENARIOS[0]);
  const [symptomInput, setSymptomInput] = useState<string>(PRESET_SCENARIOS[0].inputQuery);

  // Showcase Tabs State
  const [activeTab, setActiveTab] = useState<'triage' | 'ocr' | 'doctors' | 'workstation'>('triage');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSelectScenario = (scenario: SymptomScenario) => {
    setActiveScenario(scenario);
    setSymptomInput(scenario.inputQuery);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomInput.trim()) return;

    // Check emergency red-flags
    const lower = symptomInput.toLowerCase();
    const isRedFlag = lower.includes('thắt ngực') || lower.includes('đau tim') || lower.includes('đột quỵ') || lower.includes('liệt nửa người') || lower.includes('ngừng thở');

    if (isRedFlag) {
      setActiveScenario(PRESET_SCENARIOS[0]);
    } else {
      setActiveScenario({
        id: 'custom',
        chipLabel: 'Tự động phân tích',
        inputQuery: symptomInput,
        isEmergency: false,
        specialty: 'Nội Khoa Tổng Quát',
        sbar: {
          situation: `Ghi nhận triệu chứng: "${symptomInput}". Đã chuyển qua bộ tiền xử lý lâm sàng NLP.`,
          background: 'Hệ thống đối chiếu hồ sơ sức khỏe và dữ liệu dịch tễ học địa phương.',
          assessment: 'Mức độ ưu tiên: Khám ngoại trú. Đề xuất đánh giá tổng quan các cơ quan liên quan.',
          recommendation: 'Đăng nhập để nhận kết quả phân tích đầy đủ và kết nối Bác sĩ chuyên khoa phù hợp.'
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
      navigate('/patient/booking');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. Mandatory Clinical Disclaimer Banner */}
      <MedicalDisclaimerBanner dismissible={false} />

      {/* 2. Frosted Modern Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Clinical System Pill */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl text-slate-900 tracking-tight">MediAssist-AI</span>
                  <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider border border-emerald-200">
                    Chuẩn BYT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  Nền Tảng Trợ Lý Y Tế & Telehealth Quốc Gia
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#triage-demo" className="hover:text-indigo-600 transition">Sàng Lọc Triage AI</a>
            <a href="#ocr-features" className="hover:text-indigo-600 transition">Quét Bệnh Án PDF</a>
            <a href="#specialists" className="hover:text-indigo-600 transition">Bác Sĩ Tuyến Đầu</a>
            <a href="#workflow" className="hover:text-indigo-600 transition">Quy Trình 4 Bước</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Bảng Giá Dịch Vụ</a>
            <a href="#faq" className="hover:text-indigo-600 transition">Hỏi Đáp FAQ</a>
          </nav>

          {/* CTA & User Status Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  if (user.role === 'ADMIN') navigate('/admin');
                  else if (user.role === 'DOCTOR') navigate('/doctor');
                  else navigate('/patient');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Bảng Điều Khiển ({user.fullName.split(' ').slice(-1)[0]})</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đăng Nhập
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Khám Miễn Phí</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section with Interactive Symptom Triage Simulator */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-white via-indigo-50/30 to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Headlines */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Nền Tảng Trợ Lý Y Tế AI & Telehealth Chuẩn Lâm Sàng Đầu Tiên</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Chăm Sóc Sức Khỏe Chủ Động Cùng{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500">
                AI & Bác Sĩ Tuyến Đầu
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Rào chắn khẩn cấp <strong className="text-rose-600 font-semibold">Red-Flag phản hồi &lt; 5ms</strong>, phân tích phiếu xét nghiệm PDF với <strong className="text-indigo-600 font-semibold">SHA-256 Deduplication 0đ</strong>, và kết nối Bác sĩ chuyên khoa Bệnh viện Chợ Rẫy, Bạch Mai qua <strong className="text-blue-600 font-semibold">PostgreSQL pgvector 1536 chiều</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleStartTriage}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer"
              >
                <span>Bắt Đầu Khám Sàng Lọc AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleStartBooking}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm transition cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span>Đặt Lịch Bác Sĩ CKI/CKII</span>
              </button>
            </div>
          </div>

          {/* INTERACTIVE SIMULATOR CARD */}
          <div id="triage-demo" className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Mô Phỏng Phân Luồng Lâm Sàng Tức Thì (Live Triage Simulator)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm chọn kịch bản mẫu hoặc nhập triệu chứng để trải nghiệm cơ chế sàng lọc Red-Flag
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                Phản Hồi: &lt; 5ms
              </span>
            </div>

            {/* Quick Scenario Preset Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Kịch bản lâm sàng thử nghiệm nhanh:
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeScenario.id === sc.id
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {sc.chipLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Search / Symptom Bar */}
            <form onSubmit={handleCustomSearch} className="relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder="Mô tả triệu chứng của bạn (ví dụ: đau ngực, ho kéo dài, mẩn ngứa...)"
                  className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Phân Luồng
                </button>
              </div>
            </form>

            {/* LIVE RESULT SBAR CARD */}
            <div className={`p-5 rounded-2xl border transition-all ${
              activeScenario.isEmergency
                ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                : 'bg-indigo-50/50 border-indigo-200 text-slate-900'
            }`}>
              
              {/* Header Status of SBAR */}
              <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-current/10">
                <div className="flex items-center gap-2">
                  {activeScenario.isEmergency ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">
                      {activeScenario.isEmergency
                        ? 'CẢNH BÁO NGUY CƠ RED-FLAG (CẤP CỨU 115)'
                        : `KẾT QUẢ ĐỊNH HƯỚNG: ${activeScenario.specialty.toUpperCase()}`}
                    </h4>
                    <p className="text-xs opacity-80">
                      Bệnh án tóm tắt theo chuẩn SBAR lâm sàng quốc tế
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  activeScenario.isEmergency
                    ? 'bg-rose-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {activeScenario.isEmergency ? 'Mức 1: Cấp Cứu' : 'Phân Luồng Ngoại Trú'}
                </span>
              </div>

              {/* SBAR 4 Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3.5 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-indigo-700 block mb-0.5">
                    S - SITUATION (Hiện tượng):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.situation}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-indigo-700 block mb-0.5">
                    B - BACKGROUND (Bệnh sử):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.background}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-indigo-700 block mb-0.5">
                    A - ASSESSMENT (Đánh giá):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.assessment}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-emerald-700 block mb-0.5">
                    R - RECOMMENDATION (Khuyến nghị):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.recommendation}</p>
                </div>
              </div>

              {/* Bottom Action inside Simulator */}
              <div className="mt-4 pt-3 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Dữ liệu phân luồng được bảo mật và mã hóa chuẩn y tế HL7 FHIR.
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Đặt Khám {activeScenario.specialty}</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* 4 Trust Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
              <div className="text-2xl font-black text-rose-600">&lt; 5ms</div>
              <div className="text-xs font-semibold text-slate-700 mt-1">Rào Chắn Red-Flag Cứng</div>
              <div className="text-[11px] text-slate-500">Bảo vệ tính mạng tức thì</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
              <div className="text-2xl font-black text-indigo-600">1536 Chiều</div>
              <div className="text-xs font-semibold text-slate-700 mt-1">pgvector Cosine Match</div>
              <div className="text-[11px] text-slate-500">Ghép bác sĩ chuẩn xác</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
              <div className="text-2xl font-black text-emerald-600">100% Escrow</div>
              <div className="text-xs font-semibold text-slate-700 mt-1">Bảo Lãnh Ký Quỹ Viện Phí</div>
              <div className="text-[11px] text-slate-500">Hoàn tiền nếu hủy ca</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
              <div className="text-2xl font-black text-blue-600">120+ Bác Sĩ</div>
              <div className="text-xs font-semibold text-slate-700 mt-1">Đã Thẩm Định CCHN</div>
              <div className="text-[11px] text-slate-500">Chợ Rẫy, Bạch Mai, ĐHYD</div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Partner Hospitals Section */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Hợp tác & Đồng hành cùng Đội ngũ Bác sĩ đến từ các Bệnh viện Tuyến Đầu
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
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-slate-900">{hosp.name}</div>
                <div className="text-[10px] text-slate-500">{hosp.city}</div>
                <span className="inline-block text-[9px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full mt-1.5">
                  {hosp.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 4-Step Clinical Workflow */}
      <section id="workflow" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
              Quy Trình Khám Chữa Bệnh Chuẩn Y Khoa
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              4 Bước Số Hóa Hành Trình Chăm Sóc Sức Khỏe
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Từ triệu chứng ban đầu đến toa thuốc điện tử, mọi khâu đều được kiểm soát nghiêm ngặt nhằm bảo đảm an toàn người bệnh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: AlertTriangle,
                color: 'text-rose-600 bg-rose-100 border-rose-200',
                title: 'Sàng Lọc Red-Flag & SBAR',
                desc: 'Phản hồi trong < 5ms để phát hiện dấu hiệu khẩn cấp đe dọa tính mạng. Định dạng bệnh sử theo chuẩn SBAR giúp bác sĩ nắm bắt bệnh án tức thì.'
              },
              {
                step: '02',
                icon: FileText,
                color: 'text-indigo-600 bg-indigo-100 border-indigo-200',
                title: 'Quét PDF Multimodal OCR',
                desc: 'Bóc tách tự động chỉ số sinh hóa máu, men gan, chức năng thận. Cơ chế băm SHA-256 Deduplication trả kết quả 0ms và hoàn toàn miễn phí khi tải lại.'
              },
              {
                step: '03',
                icon: UserCheck,
                color: 'text-blue-600 bg-blue-100 border-blue-200',
                title: 'Khớp Bác Sĩ pgvector',
                desc: 'PostgreSQL pgvector 1536 chiều tính toán Cosine Similarity đối chiếu bất thường bệnh án với bác sĩ chuyên khoa sâu đã thẩm định CCHN.'
              },
              {
                step: '04',
                icon: Stethoscope,
                color: 'text-emerald-600 bg-emerald-100 border-emerald-200',
                title: 'Bàn Khám EMR & ICD-10',
                desc: 'Khám bệnh trực tuyến bảo mật, lưu trữ hồ sơ EMR trọn đời, theo dõi Vital Signs và kê toa thuốc điện tử chuẩn danh mục quốc tế WHO ICD-10.'
              }
            ].map((st, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-300 font-mono">
                      {st.step}
                    </span>
                    <div className={`p-3 rounded-2xl border ${st.color}`}>
                      <st.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">{st.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600">
                  <span>Khám phá tính năng</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Interactive Feature Deep-Dive Showcase (Tabs UI) */}
      <section id="ocr-features" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Khám Phá Công Nghệ Lâm Sàng
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Công Nghệ Y Tế Thông Minh Được Thiết Kế Cho Bạn
            </h2>
            <p className="text-slate-600 text-sm">
              Trải nghiệm các mô-đun lâm sàng chính xác, bảo mật và thân thiện với người dùng
            </p>
          </div>

          {/* Tabs Selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { id: 'triage', label: '🚨 Trợ Lý Triage SBAR', icon: AlertTriangle },
              { id: 'ocr', label: '📄 Máy Quét Xét Nghiệm PDF', icon: FileText },
              { id: 'doctors', label: '🩺 Ghép Bác Sĩ pgvector', icon: UserCheck },
              { id: 'workstation', label: '🏥 Bàn Khám EMR & ICD-10', icon: Stethoscope },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg">
            {activeTab === 'triage' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Hard Red-Flag Regex &lt; 5ms</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Sàng Lọc Cấp Cứu 115 & Rào Chắn Ảo Giác AI
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Hệ thống chủ động sàng lọc từ khóa nguy kịch (nhồi máu cơ tim, tai biến đột quỵ, khó thở cấp) ngay tại tầng Gateway trước khi gọi LLM. Ngăn chặn nguy cơ AI đưa ra lời khuyên sai lệch khi người bệnh đang đối mặt với tình huống đe dọa tính mạng.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Định dạng SBAR chuẩn hóa giao tiếp giữa bệnh nhân và bác sĩ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hướng dẫn sơ cứu khẩn cấp trong thời gian chờ xe cấp cứu 115</span>
                    </li>
                  </ul>
                  <button
                    onClick={handleStartTriage}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    <span>Trải nghiệm Triage SBAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Mẫu Phiếu Triage SBAR Điện Tử</span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">Priority: RED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong className="text-indigo-700">[S] Situation:</strong> Đau ngực trái lan hàm dưới (25 phút), vã mồ hôi.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong className="text-indigo-700">[B] Background:</strong> Nam 54 tuổi, tiền sử tăng huyết áp 5 năm.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong className="text-indigo-700">[A] Assessment:</strong> Nguy cơ nhồi máu cơ tim cấp thành trước.
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <strong className="text-emerald-700">[R] Recommendation:</strong> Kích hoạt 115, chuyển phòng Catheterization Lab.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ocr' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Multimodal OCR + SHA-256 Deduplication</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Quét PDF Xét Nghiệm & Bóc Tách Bảng Sinh Hóa
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Chuyển đổi phiếu xét nghiệm máu, men gan, chức năng thận thành bảng số liệu trực quan có gắn cờ bất thường (Bình thường / Cao / Nguy hiểm).
                  </p>
                  <div className="p-4 bg-white rounded-2xl border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span>Cơ Chế Tiết Kiệm SHA-256 Deduplication:</span>
                      <span className="text-emerald-600 font-mono">0 Token • 0đ</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Nếu phiếu xét nghiệm đã từng được tải lên trước đó, hệ thống lập tức trích xuất kết quả từ bộ nhớ đệm (0ms) mà không trừ quota của người dùng.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Bảng Chỉ Số Sinh Hóa (Trích Xuất OCR)</span>
                    <span className="text-[10px] text-slate-400">Roche Cobas Format</span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-1.5">Tên Chỉ Số</th>
                        <th className="py-1.5">Kết Quả</th>
                        <th className="py-1.5">Tham Chiếu</th>
                        <th className="py-1.5 text-right">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2">Glucose máu</td>
                        <td>6.9 mmol/L</td>
                        <td className="text-slate-500">3.9 - 6.4</td>
                        <td className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Cao</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Men gan ALT (GPT)</td>
                        <td className="font-bold text-rose-600">125 U/L</td>
                        <td className="text-slate-500">&lt; 41</td>
                        <td className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">Rất Cao</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Creatinine huyết thanh</td>
                        <td>88 µmol/L</td>
                        <td className="text-slate-500">62 - 106</td>
                        <td className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Bình thường</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'doctors' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                    <UserCheck className="w-4 h-4" />
                    <span>PostgreSQL 16 pgvector Cosine Similarity</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Ghép Nối Bác Sĩ Bằng Vector Bệnh Học 1536 Chiều
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Không dùng phương pháp tìm kiếm từ khóa tĩnh thông thường. Hệ thống nhúng toàn bộ bệnh sử và chỉ số cận lâm sàng của bạn vào không gian vector 1536 chiều để so khớp mức độ tương đồng bệnh học với kinh nghiệm điều trị thực tế của các bác sĩ đầu ngành.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% Bác sĩ được Hội đồng Y khoa kiểm duyệt CCHN trước khi nhận ca</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bảo lãnh viện phí qua tài khoản ký quỹ Escrow minh bạch</span>
                    </li>
                  </ul>
                  <button
                    onClick={handleStartBooking}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    <span>Xem danh bạ Bác sĩ chuyên khoa</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      ĐK
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">BS. CKI Nguyễn Đăng Khoa</h4>
                        <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                          <Award className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Chuyên Khoa Tim Mạch Can Thiệp • BV Chợ Rẫy</p>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span className="flex items-center text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" /> 4.9 (328 lượt khám)
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-purple-700 font-mono font-bold">pgvector Match: 98.4%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-600 block text-[11px]">Phí Khám Escrow (Bảo Lãnh):</span>
                      <span className="text-purple-900 font-black text-sm">300.000đ / phiên</span>
                    </div>
                    <button
                      onClick={handleStartBooking}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Đặt Lịch Ngay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workstation' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                    <Stethoscope className="w-4 h-4" />
                    <span>Hospital Workstation (HIS / EMR)</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Bàn Khám Bác Sĩ & Toa Thuốc Chuẩn WHO ICD-10
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Hỗ trợ Bác sĩ theo dõi bộ chỉ số sinh tồn Vital Signs theo thời gian thực (Huyết áp, Mạch, SpO2, BMI tự động), gắn mã bệnh theo danh mục chuẩn WHO ICD-10 và kê đơn thuốc điện tử đa hoạt chất.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Lưu trữ hồ sơ bệnh án trọn đời trên Cloud EMR bảo mật</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tự động xuất đơn thuốc điện tử có mã QR xác thực</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Bệnh Án Điện Tử EMR #MA-2026-9041</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">ICD-10: I20.0</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center py-1">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Huyết Áp</span>
                      <span className="font-bold text-slate-800">120/80</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Mạch</span>
                      <span className="font-bold text-slate-800">76 bpm</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">SpO2</span>
                      <span className="font-bold text-emerald-700">99%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">BMI</span>
                      <span className="font-bold text-slate-800">22.4</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">Đơn Thuốc Điện Tử Đã Kê:</span>
                    <p className="text-slate-600 text-[11px]">1. Aspirin 81mg - Uống 1 viên sau ăn sáng</p>
                    <p className="text-slate-600 text-[11px]">2. Atorvastatin 20mg - Uống 1 viên trước khi ngủ</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 7. Transparent Pricing & Service Tiers */}
      <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
              Kinh Tế Y Tế Minh Bạch & Bền Vững
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Chi Phí Rõ Ràng Cho Từng Nhu Cầu Chăm Sóc Sức Khỏe
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Bảo vệ viện phí của người bệnh qua cơ chế ký quỹ Escrow và hoàn tiền 100% nếu phiên khám bị hủy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* TIER 1: LẺ SCAN */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm flex flex-col justify-between">
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
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                Chọn Gói Lẻ
              </button>
            </div>

            {/* TIER 2: TIẾT KIỆM GIA ĐÌNH (BEST VALUE) */}
            <div className="bg-gradient-to-b from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-7 border-2 border-indigo-500 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                Phổ Biến Nhất
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">Gói Tiết Kiệm</div>
                <h3 className="text-xl font-black text-white">Gói Gia Đình Tiết Kiệm</h3>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-black text-amber-400">99.000đ</span>
                  <span className="text-xs text-indigo-200"> / 5 lượt scan</span>
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
                className="mt-8 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                Kích Hoạt Gói Tiết Kiệm
              </button>
            </div>

            {/* TIER 3: MEDIPASS VIP */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Gói Hội Viên Cao Cấp</div>
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
                className="mt-8 w-full py-3 rounded-xl border border-purple-300 text-xs font-bold text-purple-700 hover:bg-purple-50 transition cursor-pointer"
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

      {/* 8. Doctor & Patient Testimonials */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Đánh Giá Lâm Sàng
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Được Tin Tưởng Bởi Chuyên Gia Y Tế & Người Bệnh
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
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
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  ĐK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">BS. CKI Nguyễn Đăng Khoa</h4>
                  <p className="text-[10px] text-slate-500">Chuyên Khoa Tim Mạch • BV Chợ Rẫy</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
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
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  TB
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Anh Trần Bình (45 tuổi)</h4>
                  <p className="text-[10px] text-slate-500">Bệnh nhân ngoại trú • Quận 7, TP.HCM</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
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

      {/* 9. FAQ Accordion */}
      <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
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
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-indigo-600' : ''
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

      {/* 10. Final Call To Action Banner */}
      <section className="py-20 bg-gradient-to-tr from-indigo-900 via-blue-900 to-indigo-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold">
            <HeartPulse className="w-4 h-4 text-indigo-400" />
            <span>Đồng Hành Cùng Sức Khỏe Gia Đình Việt</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Sẵn Sàng Trải Nghiệm Chăm Sóc Sức Khỏe Thế Hệ Mới?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Tham gia cùng hàng nghìn người bệnh và bác sĩ đang sử dụng MediAssist-AI để tối ưu hóa thời gian khám chữa bệnh và bảo vệ sức khỏe mỗi ngày.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleStartTriage}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black shadow-xl shadow-indigo-600/40 transition cursor-pointer"
            >
              <span>Bắt Đầu Khám Sàng Lọc AI Miễn Phí</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartBooking}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-indigo-300" />
              <span>Tìm Kiếm Bác Sĩ Chuyên Khoa</span>
            </button>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="font-black text-base">MediAssist-AI</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hệ sinh thái y tế số tích hợp trợ lý lâm sàng SBAR, bóc tách hồ sơ cận lâm sàng Multimodal và kết nối Bác sĩ chuyên khoa sâu theo chuẩn Bộ Y Tế.
            </p>
            <div className="text-[11px] text-slate-500">
              Hotline Khẩn Cấp: <strong className="text-rose-400">115</strong> (Toàn quốc)
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Tính Năng Chính</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#triage-demo" className="hover:text-white transition">Sàng Lọc Cấp Cứu Red-Flag</a></li>
              <li><a href="#ocr-features" className="hover:text-white transition">Quét PDF Xét Nghiệm OCR</a></li>
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
