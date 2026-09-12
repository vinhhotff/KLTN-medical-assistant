import React, { useState, useEffect } from 'react';
import { Activity, Heart, Wind, Thermometer, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

interface VitalState {
  bpm: number;
  spo2: number;
  sys: number;
  dia: number;
  temp: number;
  rhythm: string;
}

export const EcgMonitor: React.FC = () => {
  const [vitals, setVitals] = useState<VitalState>({
    bpm: 72,
    spo2: 99,
    sys: 120,
    dia: 80,
    temp: 36.8,
    rhythm: 'Nhịp xoang đều (Normal Sinus)'
  });

  // Micro-variation for realistic clinical monitor feel
  useEffect(() => {
    const timer = setInterval(() => {
      setVitals(prev => {
        const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.6 ? 1 : 0);
        return {
          ...prev,
          bpm: Math.min(75, Math.max(70, prev.bpm + delta))
        };
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative rounded-3xl bg-white/95 backdrop-blur-xl border border-sky-100 shadow-2xl shadow-sky-600/10 p-6 sm:p-7 overflow-hidden">
      
      {/* Background Clinical Grid */}
      <div className="absolute inset-0 bg-medical-grid opacity-40 pointer-events-none rounded-3xl" />

      {/* Top Header of Device */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-sky-100">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-slate-800 uppercase">
                Bảng Theo Dõi Sinh Hiệu EMR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Trực tuyến
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Dữ liệu lâm sàng thời gian thực • Chuẩn HL7 FHIR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Chuẩn Bộ Y Tế</span>
          </span>
        </div>
      </div>

      {/* LIGHT-MODE Modern Clinical ECG Wave Screen (Soft Ice Blue, NOT Pitch Black) */}
      <div className="relative z-10 my-4.5 p-4 rounded-2xl bg-gradient-to-b from-sky-50/90 via-sky-50/40 to-white border border-sky-200/90 shadow-inner overflow-hidden">
        
        {/* Medical Grid Pattern on Screen */}
        <div className="absolute inset-0 bg-medical-grid-dense opacity-50 pointer-events-none" />

        {/* Screen Status Header */}
        <div className="relative flex items-center justify-between pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-100/80 text-sky-800 font-mono font-bold text-[11px] flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span>LEAD II</span>
            </span>
            <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">
              {vitals.rhythm}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-sky-200 shadow-xs">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-cardiac" />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900 font-mono leading-none">
                {vitals.bpm}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">BPM</span>
            </div>
          </div>
        </div>

        {/* SVG Animated Continuous ECG Waveform */}
        <div className="relative h-20 w-full overflow-hidden flex items-center">
          <svg
            viewBox="0 0 800 100"
            preserveAspectRatio="none"
            className="w-full h-full text-sky-600"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Soft guide line */}
            <path
              d="M 0,50 L 70,50 L 80,45 L 90,55 L 100,50 L 130,50 L 140,25 L 150,85 L 160,10 L 170,65 L 180,50 L 220,50 L 235,42 L 250,50 L 320,50 L 330,45 L 340,55 L 350,50 L 380,50 L 390,25 L 400,85 L 410,10 L 420,65 L 430,50 L 470,50 L 485,42 L 500,50 L 570,50 L 580,45 L 590,55 L 600,50 L 630,50 L 640,25 L 650,85 L 660,10 L 670,65 L 680,50 L 720,50 L 735,42 L 750,50 L 800,50"
              fill="none"
              stroke="#bae6fd"
              strokeWidth="2"
            />
            {/* Animated Bright Wave */}
            <path
              d="M 0,50 L 70,50 L 80,45 L 90,55 L 100,50 L 130,50 L 140,25 L 150,85 L 160,10 L 170,65 L 180,50 L 220,50 L 235,42 L 250,50 L 320,50 L 330,45 L 340,55 L 350,50 L 380,50 L 390,25 L 400,85 L 410,10 L 420,65 L 430,50 L 470,50 L 485,42 L 500,50 L 570,50 L 580,45 L 590,55 L 600,50 L 630,50 L 640,25 L 650,85 L 660,10 L 670,65 L 680,50 L 720,50 L 735,42 L 750,50 L 800,50"
              fill="none"
              stroke="url(#waveGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg"
            />
          </svg>

          {/* Sweep Shine Light Bar */}
          <div className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-sky-300/30 to-transparent pointer-events-none animate-ecg" />
        </div>

        {/* Calibration Footer */}
        <div className="relative pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Speed: 25 mm/s • Voltage: 10 mm/mV</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tín hiệu rõ
          </span>
        </div>
      </div>

      {/* 4 Core Vital Signs Indicators */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        
        {/* Heart Rate */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Nhịp Tim</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-cardiac" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight font-mono">{vitals.bpm}</span>
            <span className="text-[10px] font-semibold text-slate-500">lần/ph</span>
          </div>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1.5">
            Ổn định
          </span>
        </div>

        {/* SpO2 */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Oxy (SpO2)</span>
            <Wind className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-sky-700 tracking-tight font-mono">{vitals.spo2}%</span>
            <span className="text-[10px] font-semibold text-slate-500">bão hòa</span>
          </div>
          <span className="inline-block text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full mt-1.5">
            Tối ưu
          </span>
        </div>

        {/* Blood Pressure */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Huyết Áp</span>
            <Activity className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight font-mono">{vitals.sys}/{vitals.dia}</span>
            <span className="text-[10px] font-semibold text-slate-500">mmHg</span>
          </div>
          <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mt-1.5">
            Bình thường
          </span>
        </div>

        {/* Temperature */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Thân Nhiệt</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight font-mono">{vitals.temp}°C</span>
            <span className="text-[10px] font-semibold text-slate-500">chuẩn</span>
          </div>
          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1.5">
            Không sốt
          </span>
        </div>

      </div>

      {/* Embedded Doctor Consultation Preview Badge */}
      <div className="relative z-10 mt-4 pt-3.5 border-t border-sky-100 flex items-center justify-between gap-3 bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
            ĐK
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">BS. CKI Nguyễn Đăng Khoa</span>
              <Award className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-[11px] text-slate-500">Tim Mạch Can Thiệp • BV Chợ Rẫy</p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold text-sky-700 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-xs">
          Match 98.4%
        </span>
      </div>

    </div>
  );
};
