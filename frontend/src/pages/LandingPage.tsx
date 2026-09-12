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
  Microscope,
  Check
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
    inputQuery: 'Đau thắt ngực dữ dội sau xương ức, lan ra cánh tay trái và cằm, vã mồ hôi khó thở 20 phút',
    isEmergency: true,
    specialty: 'Tim Mạch Can Thiệp',
    priorityLabel: 'CẤP CỨU ĐỎ (Red-Flag)',
    sbar: {
      situation: 'Cơn đau thắt ngực cấp tính kèm khó thở, vã mồ hôi và lan chi trên trái kéo dài trên 20 phút.',
      background: 'Bệnh nhân có triệu chứng điển hình của hội chứng vành cấp (Acute Coronary Syndrome). Cần xử trí khẩn.',
      assessment: 'Mức độ ưu tiên: CẤP CỨU ĐỎ (Red-Flag). Nghi ngờ Nhồi máu cơ tim cấp (STEMI/NSTEMI).',
      recommendation: 'Kích hoạt ngay Cấp Cứu 115 hoặc di chuyển khẩn cấp tới phòng can thiệp tim mạch trong giờ vàng.'
    }
  },
  {
    id: 'fever-infection',
    chipLabel: '🩺 Sốt cao 39.2°C & phát ban',
    inputQuery: 'Sốt cao 39.2°C liên tục 2 ngày, đau nhức hốc mắt và khớp cơ, kèm phát ban nhẹ dưới da',
    isEmergency: false,
    specialty: 'Truyền Nhiễm & Nội Tổng Quát',
    priorityLabel: 'Bán Khẩn (Khám Trong Ngày)',
    sbar: {
      situation: 'Sốt cao co giật nhẹ, đau nhức toàn thân và hốc mắt kéo dài 48 giờ.',
      background: 'Thời điểm dịch tễ sốt xuất huyết Dengue hoặc sốt virus. Chưa ghi nhận dấu hiệu xuất huyết tiêu hóa.',
      assessment: 'Mức độ ưu tiên: Bán khẩn (Màu Vàng). Cần làm xét nghiệm công thức máu (CBC) và kháng nguyên NS1.',
      recommendation: 'Uống nhiều nước Oresol, hạ sốt bằng Paracetamol đúng liều, đặt hẹn khám bác sĩ truyền nhiễm trong ngày.'
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
      recommendation: 'Quét phiếu xét nghiệm PDF vào hệ thống để trích xuất biểu đồ chỉ số và kết nối Bác sĩ chuyên khoa Gan Mật.'
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
      assessment: 'Mức độ ưu tiên: Cần khám chuyên khoa sớm. Cần đo điện tâm đồ ECG và xét nghiệm hormon tuyến giáp TSH.',
      recommendation: 'Nghỉ ngơi tại chỗ, tránh cà phê chất kích thích và đặt lịch khám Bác sĩ Tim Mạch để đo Holter ECG 24h.'
    }
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [activeScenario, setActiveScenario] = useState<SymptomScenario>(PRESET_SCENARIOS[0]);
  const [symptomInput, setSymptomInput] = useState<string>(PRESET_SCENARIOS[0].inputQuery);
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
      navigate('/patient/doctors');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      
      {/* 1. Sleek Medical Disclaimer Banner */}
      <MedicalDisclaimerBanner dismissible={false} />

      {/* 2. Spacious, Modern Clinical Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 via-blue-600 to-cyan-500 rounded-2xl text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-all">
              <HeartPulse className="w-6 h-6 animate-cardiac" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                  MediAssist<span className="text-sky-600">.ai</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold uppercase tracking-wider border border-sky-200">
                  Chuẩn BYT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                Hệ Sinh Thái Trợ Lý Y Tế Số & Bác Sĩ Tuyến Đầu
              </p>
            </div>
          </Link>

          {/* Clean Navigation Links with No Cramped Word Wrapping */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#triage-demo" className="hover:text-sky-600 transition whitespace-nowrap">
              Sàng Lọc AI
            </a>
            <a href="#features" className="hover:text-sky-600 transition whitespace-nowrap">
              Giải Pháp Y Tế
            </a>
            <a href="#doctors" className="hover:text-sky-600 transition whitespace-nowrap">
              Đội Ngũ Bác Sĩ
            </a>
            <a href="#workflow" className="hover:text-sky-600 transition whitespace-nowrap">
              Quy Trình Khám
            </a>
            <a href="#pricing" className="hover:text-sky-600 transition whitespace-nowrap">
              Bảng Giá Escrow
            </a>
          </nav>

          {/* Emergency 115 & Actions */}
          <div className="flex items-center gap-3">
            {/* 115 Pill */}
            <a
              href="tel:115"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition shadow-xs"
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
                className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Bảng Điều Khiển</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-sky-600 rounded-xl transition"
                >
                  Đăng Nhập
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg shadow-sky-600/20 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Khám Ngay</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section - Ultra Clean, Breathable White & Blue */}
      <section className="relative pt-12 pb-24 bg-gradient-to-b from-sky-50/40 via-white to-slate-50/50 border-b border-sky-100 overflow-hidden">
        
        {/* Soft Ambient Radiance */}
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-sky-200/25 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Clinical Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-bold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600" />
                </span>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Nền Tảng Trợ Lý Sức Khỏe Số Chuẩn Lâm Sàng</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.2]">
                Chăm sóc sức khỏe thông minh cùng{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500">
                  AI & Bác sĩ đầu ngành
                </span>
              </h1>

              {/* Subtitle - Human, Reassuring, Clear */}
              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Hệ thống trợ lý y tế thông minh hỗ trợ sàng lọc triệu chứng ban đầu, giải thích phiếu xét nghiệm tức thì và kết nối trực tuyến với các Bác sĩ chuyên khoa giàu kinh nghiệm từ Bệnh viện Chợ Rẫy, Bạch Mai, ĐH Y Dược.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleStartTriage}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-sm shadow-xl shadow-sky-600/25 transition cursor-pointer"
                >
                  <span>Khám Sàng Lọc AI Miễn Phí</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleStartBooking}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-sky-50 border border-sky-200 text-slate-800 font-bold text-sm shadow-xs transition cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span>Tìm Bác Sĩ Chuyên Khoa</span>
                </button>
              </div>

              {/* 4 Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-sky-100">
                <div className="space-y-0.5">
                  <div className="text-xl font-black text-slate-900">&lt; 5ms</div>
                  <div className="text-xs text-slate-500">Rào Chắn Cấp Cứu</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl font-black text-sky-600">120+</div>
                  <div className="text-xs text-slate-500">Bác Sĩ CKI/CKII</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl font-black text-emerald-600">100%</div>
                  <div className="text-xs text-slate-500">Bảo Lãnh Ký Quỹ</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl font-black text-blue-600">Chuẩn BYT</div>
                  <div className="text-xs text-slate-500">Bảo Mật HL7/FHIR</div>
                </div>
              </div>

            </div>

            {/* Right Interactive Device Column (Light-mode EcgMonitor) */}
            <div className="lg:col-span-6">
              <EcgMonitor />
            </div>

          </div>
        </div>
      </section>

      {/* 4. Partner Hospitals Bar */}
      <section className="py-12 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Hợp tác & Kết nối cùng đội ngũ Bác sĩ đến từ các Bệnh viện Tuyến Đầu
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            {[
              { name: 'BV Chợ Rẫy', city: 'TP. Hồ Chí Minh', badge: 'Tuyến Trung Ương' },
              { name: 'BV Bạch Mai', city: 'Hà Nội', badge: 'Tuyến Trung Ương' },
              { name: 'BV ĐH Y Dược', city: 'TP. Hồ Chí Minh', badge: 'Hạng Đặc Biệt' },
              { name: 'Viện Tim Tâm Đức', city: 'TP. Hồ Chí Minh', badge: 'Chuyên Khoa Sâu' },
              { name: 'BV Nhi Đồng 1', city: 'TP. Hồ Chí Minh', badge: 'Nhi Tuyến 1' },
              { name: 'BV Từ Dũ', city: 'TP. Hồ Chí Minh', badge: 'Sản Phụ Khoa' },
            ].map((hosp, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50/70 border border-sky-100 hover:border-sky-300 hover:bg-sky-50/50 transition">
                <Building2 className="w-5 h-5 text-sky-600 mx-auto mb-1" />
                <div className="text-xs font-bold text-slate-800">{hosp.name}</div>
                <div className="text-[10px] text-slate-500">{hosp.city}</div>
                <span className="inline-block text-[9px] font-semibold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full mt-1.5">
                  {hosp.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive Live SBAR Triage Simulator */}
      <section id="triage-demo" className="py-20 bg-gradient-to-b from-white to-sky-50/30 border-b border-sky-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
              Trải Nghiệm Trực Tiếp
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Mô Phỏng Phân Luồng Lâm Sàng SBAR & Red-Flag
            </h2>
            <p className="text-sm text-slate-600">
              Bấm chọn kịch bản mẫu hoặc nhập triệu chứng thực tế để kiểm tra khả năng phát hiện nguy kịch tức thì.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-sky-100 p-6 sm:p-8 space-y-6 shadow-xl shadow-sky-900/5">
            
            {/* Quick Scenario Preset Chips */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-600" />
                <span>Kịch bản lâm sàng thử nghiệm nhanh:</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeScenario.id === sc.id
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-300'
                        : 'bg-slate-50 hover:bg-sky-50 text-slate-700 border border-slate-200'
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
                  placeholder="Mô tả triệu chứng của bạn (ví dụ: đau ngực lan vai, sốt 2 ngày, nổi mẩn ngứa...)"
                  className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Phân Luồng
                </button>
              </div>
            </form>

            {/* LIVE SBAR CLINICAL RESULT CARD */}
            <div className={`p-6 rounded-2xl border transition-all ${
              activeScenario.isEmergency
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : 'bg-sky-50/60 border-sky-200 text-slate-900'
            }`}>
              
              {/* Result Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-current/10">
                <div className="flex items-center gap-2.5">
                  {activeScenario.isEmergency ? (
                    <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">
                      {activeScenario.isEmergency
                        ? 'CẢNH BÁO RED-FLAG: NGUY CƠ CẤP CỨU KHẨN CẤP'
                        : `KẾT QUẢ ĐỊNH HƯỚNG: CHUYÊN KHOA ${activeScenario.specialty.toUpperCase()}`}
                    </h4>
                    <p className="text-xs opacity-75">
                      Bệnh án tóm tắt theo cấu trúc SBAR lâm sàng quốc tế
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

              {/* SBAR 4 Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    S - SITUATION (Hiện tượng):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.situation}</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    B - BACKGROUND (Bệnh sử):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.background}</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-sky-700 block mb-1">
                    A - ASSESSMENT (Đánh giá lâm sàng):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.assessment}</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-extrabold text-emerald-700 block mb-1">
                    R - RECOMMENDATION (Khuyến nghị xử trí):
                  </span>
                  <p className="text-slate-700 leading-relaxed">{activeScenario.sbar.recommendation}</p>
                </div>
              </div>

              {/* Action inside Card */}
              <div className="mt-5 pt-3.5 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Dữ liệu phân luồng được bảo mật và mã hóa chuẩn y tế quốc tế.
                </span>

                {activeScenario.isEmergency ? (
                  <a
                    href="tel:115"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition animate-pulse"
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
                    <span>Đặt Khám Chuyên Khoa {activeScenario.specialty}</span>
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 6. Core Clinical Services (4 Trụ Cột Lâm Sàng) */}
      <section id="features" className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
              Công Nghệ Y Tế Thông Minh
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              4 Trụ Cột Chăm Sóc Sức Khỏe Toàn Diện
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ứng dụng các chuẩn giao tiếp lâm sàng quốc tế và trí tuệ nhân tạo có trách nhiệm để phục vụ người bệnh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-slate-50/70 rounded-3xl p-7 border border-sky-100 hover:border-sky-300 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 w-fit mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Rào Chắn Red-Flag 24/7
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Phát hiện tức thì các dấu hiệu nguy kịch (đột quỵ, nhồi máu cơ tim, suy hô hấp cấp) và hướng dẫn sơ cứu khẩn cấp, kết nối trực tiếp tổng đài 115.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-slate-200/60 flex items-center text-xs font-bold text-rose-600">
                <span>Rào chắn an toàn tức thì</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-50/70 rounded-3xl p-7 border border-sky-100 hover:border-sky-300 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="p-3.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 w-fit mb-4">
                  <Microscope className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Đọc Hiểu Phiếu Xét Nghiệm
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chụp ảnh hoặc tải lên phiếu xét nghiệm PDF để nhận bảng phân tích sinh hóa máu, men gan, chức năng thận với các cờ cảnh báo bất thường trong 3 giây.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-slate-200/60 flex items-center text-xs font-bold text-sky-600">
                <span>Phân tích cận lâm sàng</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-50/70 rounded-3xl p-7 border border-sky-100 hover:border-sky-300 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="p-3.5 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 w-fit mb-4">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Ghép Nối Bác Sĩ Chuẩn Xác
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  So khớp bệnh sử và mức độ bất thường với chuyên khoa sâu và kinh nghiệm điều trị thực tế của các bác sĩ đầu ngành đã được Hội đồng Y khoa kiểm duyệt.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-slate-200/60 flex items-center text-xs font-bold text-teal-600">
                <span>Đối chiếu bệnh học thông minh</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-50/70 rounded-3xl p-7 border border-sky-100 hover:border-sky-300 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 w-fit mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Bệnh Án EMR & Toa Thuốc
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lưu trữ hồ sơ y tế trọn đời trên Cloud EMR bảo mật, theo dõi biến thiên chỉ số sinh hiệu và nhận toa thuốc điện tử có mã QR xác thực chuẩn Bộ Y Tế.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-slate-200/60 flex items-center text-xs font-bold text-blue-600">
                <span>Hồ sơ sức khỏe số trọn đời</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. Featured Specialists Showcase */}
      <section id="doctors" className="py-20 bg-gradient-to-b from-white to-sky-50/30 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
                Đội Ngũ Bác Sĩ
              </span>
              <h2 className="text-3xl font-black text-slate-900">
                Bác Sĩ Tuyến Đầu Đã Được Thẩm Định CCHN
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm">
                100% Bác sĩ có Chứng Chỉ Hành Nghề từ Bộ Y Tế và đang công tác tại các bệnh viện lớn
              </p>
            </div>

            <button
              onClick={handleStartBooking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition cursor-pointer self-start md:self-auto"
            >
              <span>Xem Danh Bạ 120+ Bác Sĩ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Doctor 1 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white font-bold flex items-center justify-center text-base shadow-md">
                    ĐK
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">BS. CKI Nguyễn Đăng Khoa</h4>
                      <Award className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">Tim Mạch Can Thiệp</p>
                    <span className="inline-block text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full mt-1">
                      BV Chợ Rẫy TP.HCM
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Độ tương đồng:</span>
                    <span className="font-mono font-bold text-sky-600">98.4% Match</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.9 (328 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">300.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 2 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center text-base shadow-md">
                    HN
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">BS. CKII Lê Hoàng Nam</h4>
                      <Award className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">Cấp Cứu Nhi Khoa</p>
                    <span className="inline-block text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full mt-1">
                      BV Nhi Đồng 1
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Độ tương đồng:</span>
                    <span className="font-mono font-bold text-teal-600">96.8% Match</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 5.0 (412 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">350.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 3 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold flex items-center justify-center text-base shadow-md">
                    MC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">ThS. BS Trần Minh Châu</h4>
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">Tiêu Hóa - Gan Mật</p>
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full mt-1">
                      BV Bạch Mai Hà Nội
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Độ tương đồng:</span>
                    <span className="font-mono font-bold text-indigo-600">97.2% Match</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.9 (289 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">280.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

            {/* Doctor 4 */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 hover:border-sky-300 transition-all flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center text-base shadow-md">
                    NQ
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900">TS. BS Phạm Nhật Quang</h4>
                      <Award className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">Nội Thần Kinh</p>
                    <span className="inline-block text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full mt-1">
                      BV ĐH Y Dược TP.HCM
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Độ tương đồng:</span>
                    <span className="font-mono font-bold text-cyan-600">95.9% Match</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Đánh giá:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.95 (194 ca)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ký quỹ Escrow:</span>
                  <span className="text-xs font-black text-slate-900">320.000đ</span>
                </div>
                <button
                  onClick={handleStartBooking}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đặt Khám
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 8. 4-Step Patient Journey (Quy Trình 4 Bước Chuẩn Y Khoa) */}
      <section id="workflow" className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
              Quy Trình Chuẩn Y Khoa
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              4 Bước Tiếp Cận Dịch Vụ Khám Bệnh Từ Xa
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Tối ưu hóa thời gian khám chữa bệnh nhưng vẫn bảo đảm tuyệt đối sự cẩn trọng và chuẩn mực lâm sàng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Mô Tả Triệu Chứng',
                desc: 'Nhập dấu hiệu bất thường hoặc tải lên kết quả cận lâm sàng (phiếu xét nghiệm máu, siêu âm, ECG).',
                icon: AlertTriangle,
                color: 'text-rose-600 bg-rose-50 border-rose-200'
              },
              {
                step: '02',
                title: 'Sàng Lọc Lâm Sàng AI',
                desc: 'Hệ thống định dạng bệnh sử chuẩn SBAR, phát hiện cờ đỏ cấp cứu và bóc tách các chỉ số xét nghiệm.',
                icon: Microscope,
                color: 'text-sky-600 bg-sky-50 border-sky-200'
              },
              {
                step: '03',
                title: 'Khám Cùng Bác Sĩ',
                desc: 'Tư vấn trực tuyến bảo mật với Bác sĩ chuyên khoa sâu được thẩm định chứng chỉ hành nghề.',
                icon: UserCheck,
                color: 'text-teal-600 bg-teal-50 border-teal-200'
              },
              {
                step: '04',
                title: 'Toa Thuốc & Bệnh Án',
                desc: 'Nhận toa thuốc điện tử có mã QR xác thực và lưu trữ hồ sơ bệnh án EMR trọn đời trên Cloud.',
                icon: Stethoscope,
                color: 'text-blue-600 bg-blue-50 border-blue-200'
              }
            ].map((st, i) => (
              <div key={i} className="bg-slate-50/60 rounded-3xl p-6 border border-sky-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-sky-200 font-mono">{st.step}</span>
                    <div className={`p-3 rounded-2xl border ${st.color}`}>
                      <st.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{st.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-sky-600">
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. Transparent Pricing & Escrow Guarantee */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-sky-50/40 via-white to-slate-50 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 bg-teal-100 px-3.5 py-1 rounded-full border border-teal-200">
              Kinh Tế Y Tế Minh Bạch
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Chi Phí Rõ Ràng Cho Từng Nhu Cầu Chăm Sóc Sức Khỏe
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Bảo vệ viện phí qua tài khoản ký quỹ trung gian Escrow và cam kết hoàn tiền 100% nếu phiên khám bị hủy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* TIER 1 */}
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
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 lượt OCR phiếu xét nghiệm PDF/hình ảnh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đối chiếu chỉ số với khoảng tham chiếu chuẩn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gợi ý câu hỏi cần tham vấn Bác sĩ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>0đ nếu tài liệu trùng lặp đã quét trước đó</span>
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

            {/* TIER 2: POPULAR */}
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
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>5 lượt OCR xét nghiệm chuyên sâu (tiết kiệm 32%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lưu trữ đám mây bệnh án EMR dài hạn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Phân tích biểu đồ biến thiên chỉ số theo thời gian</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ưu tiên ghép Bác sĩ chuyên khoa sâu</span>
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

            {/* TIER 3 */}
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
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sàng lọc Triage AI & Red-Flag không giới hạn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>10 lượt OCR xét nghiệm chuyên sâu mỗi tháng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Giảm 10% phí khám Telehealth Bác sĩ CKI / CKII</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
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
              Toàn bộ viện phí khám trực tuyến với Bác sĩ được giữ an toàn tại tài khoản trung gian. Bệnh nhân được hoàn tiền 100% nếu phiên khám bị hủy hoặc không được bác sĩ phản hồi.
            </div>
          </div>

        </div>
      </section>

      {/* 10. FAQ Accordion */}
      <section className="py-20 bg-white border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Giải Đáp Thắc Mắc
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Câu Hỏi Thường Gặp
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
                className="bg-slate-50/70 rounded-2xl border border-sky-100 overflow-hidden shadow-xs transition"
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
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-sky-100/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 11. Final Call To Action Banner */}
      <section className="py-20 bg-gradient-to-tr from-sky-800 via-blue-800 to-sky-900 text-white relative overflow-hidden">
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

      {/* 12. Clinical Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="p-2 bg-sky-600 rounded-xl text-white">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="font-black text-base">MediAssist.ai</span>
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
              <li><a href="#triage-demo" className="hover:text-white transition">Sàng Lọc Cấp Cứu Red-Flag</a></li>
              <li><a href="#features" className="hover:text-white transition">Quét PDF Xét Nghiệm</a></li>
              <li><a href="#doctors" className="hover:text-white transition">Ghép Nối Bác Sĩ Chuyên Khoa</a></li>
              <li><a href="#workflow" className="hover:text-white transition">Bệnh Án Điện Tử EMR</a></li>
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
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Tiêu Chuẩn & An Toàn</h4>
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
