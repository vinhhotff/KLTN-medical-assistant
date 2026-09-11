import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Sparkles,
  AlertTriangle,
  FileText,
  UserCheck,
  Stethoscope,
  Crown,
  ChevronRight,
  ArrowRight,
  Zap,
  PhoneCall,
  CheckCircle2,
  LogIn,
  X,
  Compass
} from 'lucide-react';
import { MedicalWorldCanvas } from '../components/landing/MedicalWorldCanvas';
import { useAuthStore } from '../store/useAuthStore';

interface StationInfo {
  id: string;
  step: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  description: string;
  tags: string[];
  accentColor: string;
}

const STATIONS: StationInfo[] = [
  {
    id: 'hero',
    step: '00',
    eyebrow: 'HỆ THỐNG Y TẾ SỐ & TRỢ LÝ LÂM SÀNG THÔNG MINH',
    title: 'Khám Phá Thế Giới Y Tế MediAssist-AI',
    subtitle: 'Nền tảng số hóa hành trình y tế toàn diện chuẩn Bộ Y Tế',
    description:
      'Từ sàng lọc khẩn cấp Red-Flag < 5ms, bóc tách chỉ số cận lâm sàng PDF qua AI Multimodal, ghép nối Bác sĩ chuyên khoa sâu bằng pgvector 1536 chiều, đến bàn khám điện tử EMR chuẩn WHO ICD-10.',
    tags: ['AI Scribe', 'pgvector Cosine Match', 'Two-Layer Cache', 'HIS/EMR'],
    accentColor: '#38bdf8',
  },
  {
    id: 'triage',
    step: '01',
    eyebrow: 'BẢO VỆ TÍNH MẠNG NGAY TỪ GIÂY ĐẦU TIÊN',
    title: 'Sàng Lọc Khẩn Cấp Red-Flag & 115 Sieve',
    subtitle: 'Rào chắn an toàn y tế cứng phản hồi tức thì < 5ms',
    description:
      'Hệ thống chủ động sàng lọc từ khóa nguy kịch (nhồi máu cơ tim, đột quỵ, khó thở cấp) trước khi cho phép gọi LLM. Tự động kích hoạt còi cảnh báo đỏ và hướng dẫn gọi cấp cứu 115 trong giờ vàng.',
    tags: ['Hard Red-Flag Regex', 'SBAR Clinical Standard', 'Phản hồi < 5ms', 'Bảo Vệ Tính Mạng'],
    accentColor: '#f43f5e',
  },
  {
    id: 'ocr',
    step: '02',
    eyebrow: 'SỐ HÓA BỆNH ÁN & CHỐNG LÃNG PHÍ TÀI NGUYÊN',
    title: 'Quét PDF Xét Nghiệm & SHA-256 Deduplication',
    subtitle: 'Multimodal OCR trích xuất bảng sinh hóa và đối chiếu khoảng tham chiếu',
    description:
      'Chuyển đổi phiếu xét nghiệm máu, men gan, EEG thành bảng chỉ số định lượng có gắn cờ bất thường. Cơ chế SHA-256 Deduplication trả kết quả tức thì (0ms) và hoàn toàn miễn phí (0 token) khi tải lại tài liệu cũ.',
    tags: ['Multimodal OCR', 'SHA-256 Deduplication', '0đ Cache Hit', 'Supabase Cloud EMR'],
    accentColor: '#06b6d4',
  },
  {
    id: 'doctors',
    step: '03',
    eyebrow: 'KẾT NỐI BÁC SĨ CHUẨN XÁC DỰA TRÊN BỆNH HỌC THỰC TẾ',
    title: 'Khớp Bác Sĩ Tuyến Đầu Bằng pgvector 1536 Chiều',
    subtitle: 'PostgreSQL pgvector tính toán Cosine Similarity chuyên sâu',
    description:
      'Không dựa vào từ khóa tĩnh! Hệ thống đối chiếu trực tiếp các bất thường trong bệnh án với kinh nghiệm lâm sàng của Bác sĩ Chợ Rẫy, Bạch Mai, ĐH Y Dược đã được Hội đồng Admin thẩm định Chứng Chỉ Hành Nghề (CCHN).',
    tags: ['PostgreSQL 16 pgvector', '1536 Chiều Vector', 'Thẩm định CCHN BYT', 'Đặt Lịch Khám Trực Tiếp'],
    accentColor: '#8b5cf6',
  },
  {
    id: 'workstation',
    step: '04',
    eyebrow: 'CHUẨN HÓA BỆNH VIỆN QUỐC TẾ (HIS/EMR)',
    title: 'Bàn Làm Việc Bác Sĩ & Toa Thuốc WHO ICD-10',
    subtitle: 'Hồ sơ bệnh án điện tử, dấu hiệu sinh tồn và phác đồ điều trị ngoại trú',
    description:
      'Bác sĩ theo dõi dấu hiệu sinh tồn Vital Signs (HA, Mạch, Nhiệt, SpO2, BMI tự tính), gắn mã bệnh theo danh mục chuẩn WHO ICD-10 và kê toa thuốc điện tử đa hoạt chất có hướng dẫn dùng thuốc chi tiết.',
    tags: ['HIS/EMR Bệnh Viện', 'Mã Hóa WHO ICD-10', 'Toa Thuốc Đa Hoạt Chất', 'Lưu Trữ Dài Lâu'],
    accentColor: '#10b981',
  },
  {
    id: 'finale',
    step: '05',
    eyebrow: 'KINH TẾ Y TẾ MINH BẠCH & BỀN VỮNG',
    title: 'Bảo Vệ Người Bệnh, Tôn Vinh Chuyên Môn Bác Sĩ',
    subtitle: 'Ký quỹ Escrow bảo vệ viện phí, gói dịch vụ tiết kiệm cho mọi gia đình',
    description:
      'Viện phí được bảo lãnh qua cơ chế ký quỹ Escrow và hoàn tiền 100% khi ca khám bị hủy. Gói quét lẻ chỉ từ 29.000đ hoặc Gói hội viên MediPass VIP 149.000đ/tháng giúp người bệnh an tâm chăm sóc sức khỏe.',
    tags: ['Bảo Lãnh Escrow', 'Hoàn Tiền 100%', 'Gói MediPass VIP', 'Chi Phí Minh Bạch'],
    accentColor: '#f59e0b',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [loadingIntro, setLoadingIntro] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial High-Tech Loading Animation
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoadingIntro(false), 300);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 12;
      });
    }, 120);

    return () => clearInterval(timer);
  }, []);

  // Track scroll position to scrub 3D camera
  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const scrollTop = window.scrollY;
      const docHeight = el.scrollHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, scrollTop / (docHeight || 1)));

      setScrollProgress(progress);

      // Determine active station
      const idx = Math.min(STATIONS.length - 1, Math.floor(progress * STATIONS.length));
      setActiveStationIndex(idx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToStation = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const docHeight = el.scrollHeight - window.innerHeight;
    const targetScroll = (index / (STATIONS.length - 1)) * docHeight;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="relative bg-[#060b18] text-white min-h-[500vh] font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. High-Tech Intro Loading Screen */}
      {loadingIntro && (
        <div className="fixed inset-0 z-50 bg-[#060b18] flex flex-col items-center justify-center p-6 text-center animate-fadeOut">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 backdrop-blur-md shadow-2xl shadow-cyan-500/20">
              <HeartPulse className="w-10 h-10 animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-3xl border border-cyan-400/20 animate-ping pointer-events-none" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            MediAssist-AI
            <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              v1.1.0
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Đang tải không gian 3D Không Gian Y Tế Số & Mô Phỏng Bệnh Viện...
          </p>

          <div className="w-56 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-cyan-400 mt-2">{loadProgress}%</span>
        </div>
      )}

      {/* 2. Interactive Three.js 3D Canvas Background */}
      <MedicalWorldCanvas scrollProgress={scrollProgress} />

      {/* 3. Top Floating Glassmorphism Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-slate-950/70 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToStation(0)}>
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-white tracking-tight">MediAssist-AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                3D World
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Nền Tảng Bệnh Án Điện Tử & Khám Chữa Bệnh Chuẩn BYT</p>
          </div>
        </div>

        {/* Station Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-300">
          {STATIONS.slice(1).map((st, i) => {
            const index = i + 1;
            const isActive = activeStationIndex === index;
            return (
              <button
                key={st.id}
                onClick={() => scrollToStation(index)}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-cyan-400 font-bold shadow-inner'
                    : 'hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{st.title.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </nav>

        {/* Auth CTA Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPricingModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Bảng Giá VIP</span>
          </button>

          {isAuthenticated && user ? (
            <button
              onClick={() => {
                if (user.role === 'ADMIN') navigate('/admin');
                else if (user.role === 'DOCTOR') navigate('/doctor');
                else navigate('/patient');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vào Bảng Điều Khiển ({user.fullName.split(' ').slice(-1)[0]})</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Đăng Nhập
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Bắt Đầu Ngay</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 4. Scrolling Sections / Narrative Stations */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">
        
        {/* STATION 0: HERO INTRO */}
        <section className="min-h-screen flex flex-col justify-center py-24 pointer-events-auto max-w-2xl">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hệ Thống Y Tế Trực Tuyến & Bệnh Án Điện Tử Chuẩn Bộ Y Tế</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-lg">
              Trợ Lý Lâm Sàng Thông Minh &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                Không Gian 3D Y Tế
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              MediAssist-AI chuẩn hóa mọi công đoạn chăm sóc sức khỏe: Nhận diện rào chắn cấp cứu <strong className="text-rose-400">Red-Flag &lt; 5ms</strong>, phân tích phiếu xét nghiệm PDF với <strong className="text-cyan-300">0đ token deduplication</strong>, và kết nối Bác sĩ chuyên khoa sâu qua <strong className="text-purple-300">PostgreSQL pgvector</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition cursor-pointer"
              >
                <span>Bắt Đầu Khám Bệnh Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToStation(1)}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold backdrop-blur-md transition cursor-pointer"
              >
                <span>Cuộn Để Khám Phá 3D</span>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Live Stats Pills */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/10 max-w-lg">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="text-lg font-black text-cyan-400">&lt; 5ms</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Phản hồi Red-Flag</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="text-lg font-black text-emerald-400">1536 Chiều</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Vector Bác sĩ CCHN</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="text-lg font-black text-purple-400">100% Escrow</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Bảo lãnh viện phí</div>
              </div>
            </div>
          </div>
        </section>

        {/* STATION 1: TRIAGE & RED-FLAG */}
        <section className="min-h-screen flex flex-col justify-center py-24 pointer-events-auto">
          <div className="max-w-xl space-y-5 bg-slate-950/80 backdrop-blur-md p-8 rounded-3xl border border-rose-500/30 shadow-2xl shadow-rose-950/40">
            <div className="flex items-center gap-2.5 text-rose-400 text-xs font-extrabold uppercase tracking-wider">
              <div className="p-1.5 bg-rose-500/20 rounded-lg border border-rose-500/30">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <span>Trạm 01 • Cổng Cấp Cứu Thông Minh</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Sàng Lọc Red-Flag Khẩn Cấp & Rào Chắn 115
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Cơ chế Hard Red-Flag kiểm duyệt từ khóa cấp cứu trực tiếp ở tầng Gateway trước khi chuyển đến LLM. Khi người bệnh có dấu hiệu đau thắt ngực lan tay trái, đột quỵ, khó thở cấp tính, hệ thống lập tức khóa phiên tư vấn thông thường và kích hoạt đường dây nóng Cấp Cứu 115 trong giờ vàng.
            </p>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-5 h-5 text-rose-400 animate-bounce" />
                <div>
                  <div className="text-xs font-bold text-rose-200">Kích Hoạt Cuộc Gọi Khẩn Cấp</div>
                  <div className="text-[11px] text-rose-300/80">Cứu nạn y tế toàn quốc 115</div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-600 text-white shadow-md">
                115 Sieve
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                SBAR Format Chuẩn Y Tế
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Ngăn Chặn Ảo Giác AI
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Thời Gian Đáp Ứng &lt; 5ms
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/patient/triage')}
                className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
              >
                <span>Thử nghiệm trợ lý Triage lâm sàng →</span>
              </button>
            </div>
          </div>
        </section>

        {/* STATION 2: OCR & DEDUPLICATION */}
        <section className="min-h-screen flex flex-col justify-center items-end py-24 pointer-events-auto">
          <div className="max-w-xl space-y-5 bg-slate-950/80 backdrop-blur-md p-8 rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 text-left">
            <div className="flex items-center gap-2.5 text-cyan-400 text-xs font-extrabold uppercase tracking-wider">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <span>Trạm 02 • Trung Tâm Chẩn Đoán & OCR</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Quét PDF Bệnh Án & Bóc Tách Chỉ Số Tự Động
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Trích xuất tự động chỉ số sinh hóa máu, men gan ALT/AST, mỡ máu Lipid, điện não đồ EEG. Đối chiếu ngay với khoảng tham chiếu lâm sàng và dịch sang ngôn ngữ bình dân để người bệnh dễ hiểu nhất.
            </p>

            {/* Deduplication Card */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  SHA-256 Deduplication Shield
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
                  0 Token AI • 0đ Phí
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tránh lãng phí chi phí token LLM của chủ phòng khám. Nếu tài liệu đã được tải lên trước đó trong hồ sơ EMR, hệ thống trả về kết quả ngay lập tức (0ms) mà không trừ quota của người dùng.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Roche Cobas 8000 Format
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Supabase Cloud Storage EMR
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Gợi Ý Câu Hỏi Cho Bác Sĩ
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/patient/documents')}
                className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              >
                <span>Xem quy trình quét PDF xét nghiệm →</span>
              </button>
            </div>
          </div>
        </section>

        {/* STATION 3: PGVECTOR SPECIALIST MATCHING */}
        <section className="min-h-screen flex flex-col justify-center py-24 pointer-events-auto">
          <div className="max-w-xl space-y-5 bg-slate-950/80 backdrop-blur-md p-8 rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-950/40">
            <div className="flex items-center gap-2.5 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
              <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>Trạm 03 • Mạng Lưới Bác Sĩ Tuyến Đầu</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Ghép Nối Bác Sĩ Bằng pgvector 1536 Chiều
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              PostgreSQL pgvector sử dụng Cosine Similarity để so khớp bất thường trong tài liệu và triệu chứng người bệnh với năng lực lâm sàng của Bác sĩ Chuyên khoa tại BV Chợ Rẫy, BV Bạch Mai, BV Đại học Y Dược.
            </p>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">TS.BS. Đặng Khoa — Chuyên Khoa Tim Mạch</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Độ khớp: 96%
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Bệnh viện Đại Học Y Dược TP.HCM • CCHN: 008921/BYT-CCHN (Đã thẩm định) • Phí khám niêm yết: 350.000đ
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                HNSW Vector Index
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Thẩm Định Bằng Cấp Bộ Y Tế
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Đặt Khung Giờ 30 Phút/Ca
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/patient/doctors')}
                className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer"
              >
                <span>Tra cứu danh bạ Bác sĩ chuyên khoa →</span>
              </button>
            </div>
          </div>
        </section>

        {/* STATION 4: WORKSTATION & EMR */}
        <section className="min-h-screen flex flex-col justify-center items-end py-24 pointer-events-auto">
          <div className="max-w-xl space-y-5 bg-slate-950/80 backdrop-blur-md p-8 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 text-left">
            <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span>Trạm 04 • Bàn Khám Bệnh Điện Tử (HIS/EMR)</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Bàn Khám Bác Sĩ & Toa Thuốc WHO ICD-10
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Trang bị bàn làm việc chuyên nghiệp cho Bác sĩ lâm sàng: Tiếp nhận dấu hiệu sinh tồn Vital Signs, tự động tính BMI, phân loại mã bệnh quốc tế WHO ICD-10 (như I10 Tăng huyết áp, I20.9 Đau thắt ngực) và phát hành toa thuốc điện tử kèm chữ ký số.
            </p>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span>Toa Thuốc Ngoại Trú Điện Tử</span>
                <span className="font-mono text-slate-300">Mã SID: 2026-HIS-0849</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Lipitor 20mg (Atorvastatin) • 30 viên • Tối sau ăn</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Betaloc ZOK 25mg (Metoprolol) • 30 viên • Sáng sau ăn</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Vital Signs Triage (HA, Mạch, SpO2)
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Mã Hóa WHO ICD-10
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                In Phiếu Khám Ngoại Trú
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              >
                <span>Đăng nhập cổng Bác sĩ làm việc →</span>
              </button>
            </div>
          </div>
        </section>

        {/* STATION 5: FINALE & CTA */}
        <section className="min-h-screen flex flex-col justify-center items-center py-24 pointer-events-auto text-center">
          <div className="max-w-2xl space-y-6 bg-slate-950/85 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-amber-500/40 shadow-2xl shadow-amber-950/40">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Sẵn Sàng Cho Trải Nghiệm Y Tế Thông Minh</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              Bảo Vệ Người Bệnh,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
                Tôn Vinh Y Đức
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto">
              Tham gia ngay hôm nay để trải nghiệm toàn bộ tiện ích: Phân luồng triệu chứng miễn phí, quét phân tích cận lâm sàng 0đ và đặt lịch tư vấn với các bác sĩ hàng đầu.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Ký & Khám Ngay</span>
              </button>

              <button
                onClick={() => setShowPricingModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition cursor-pointer backdrop-blur-md"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Bảng Giá Gói Dịch Vụ</span>
              </button>
            </div>

            {/* Fast Login Demo Access */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tài khoản trải nghiệm nhanh dành cho Hội đồng:
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                >
                  👑 Quản Trị Viên (admin@...)
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                >
                  🩺 Bác Sĩ CKI (doctor.khoa@...)
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                >
                  👤 Bệnh Nhân (patient.binh@...)
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* 5. Fixed Bottom Route Rail (Interactive Checkpoints) */}
      <div className="fixed bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto">
          {STATIONS.map((st, i) => {
            const isActive = activeStationIndex === i;
            return (
              <button
                key={st.id}
                onClick={() => scrollToStation(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={st.title}
              >
                <span>{st.step}</span>
                <span className="hidden sm:inline text-[11px] font-normal">
                  {i === 0 ? 'Khởi Đầu' : st.title.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Pricing Modal (Commercial Monetization & VIP Tiers) */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Bảng Giá Dịch Vụ MediAssist-AI</h3>
                  <p className="text-xs text-slate-400">Minh bạch chi phí, chống lãng phí token LLM</p>
                </div>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Single Pack */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gói Quét Lẻ</span>
                  <div className="text-2xl font-black text-white">29.000đ</div>
                  <p className="text-xs text-slate-400">1 Lượt Phân Tích Chuyên Sâu</p>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Bóc tách sinh hóa máu</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Khớp Bác sĩ pgvector</li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
                >
                  Chọn Gói Này
                </button>
              </div>

              {/* 5-Pack */}
              <div className="p-5 rounded-2xl bg-cyan-950/40 border-2 border-cyan-500/50 flex flex-col justify-between space-y-4 relative shadow-lg shadow-cyan-950/50">
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px]">
                  Tiết Kiệm 32%
                </span>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Gói Tiết Kiệm</span>
                  <div className="text-2xl font-black text-white">99.000đ</div>
                  <p className="text-xs text-cyan-300">5 Lượt (Chỉ 19.800đ/lần)</p>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Tiết kiệm 32% chi phí</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Hạn dùng 12 tháng</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Gợi ý câu hỏi Bác sĩ</li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  Mua Gói 5 Lượt
                </button>
              </div>

              {/* VIP Pack */}
              <div className="p-5 rounded-2xl bg-amber-950/40 border-2 border-amber-500/50 flex flex-col justify-between space-y-4 relative shadow-lg shadow-amber-950/50">
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  Gia Đình VIP
                </span>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">MediPass VIP</span>
                  <div className="text-2xl font-black text-white">149.000đ<span className="text-xs text-slate-400 font-normal">/tháng</span></div>
                  <p className="text-xs text-amber-300">Quét Không Giới Hạn</p>
                  <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Quét PDF không giới hạn</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Ưu tiên xếp lịch Bác sĩ</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Quản lý EMR cả gia đình</li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  Đăng Ký VIP 149k
                </button>
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-slate-400">
              💡 <em>Chính sách bảo vệ tài nguyên: Bệnh nhân tải lại cùng một tài liệu (SHA-256 Deduplication) sẽ <strong>được miễn phí 100%</strong> trọn đời và không tiêu tốn lượt quét.</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
