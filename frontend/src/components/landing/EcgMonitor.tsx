import React, { useState, useEffect } from 'react';
import { Activity, Heart, Wind, Thermometer, ShieldCheck, Zap } from 'lucide-react';

interface VitalState {
  bpm: number;
  spo2: number;
  sys: number;
  dia: number;
  temp: number;
  rhythm: string;
  status: 'normal' | 'alert' | 'triage';
}

export const EcgMonitor: React.FC = () => {
  const [vitals, setVitals] = useState<VitalState>({
    bpm: 72,
    spo2: 99,
    sys: 120,
    dia: 80,
    temp: 36.8,
    rhythm: 'Sinus Rhythm (Bình thường)',
    status: 'normal'
  });

  // Micro-variations in vitals for clinical realism
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => {
        const deltaBpm = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0);
        const newBpm = Math.min(76, Math.max(69, prev.bpm + deltaBpm));
        return {
          ...prev,
          bpm: newBpm,
        };
      });
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative rounded-3xl bg-white/95 backdrop-blur-xl border border-sky-100 shadow-2xl shadow-sky-900/10 p-5 sm:p-7 overflow-hidden">
      {/* Background Clinical Grid Accent */}
      <div className="absolute inset-0 bg-medical-grid opacity-60 pointer-events-none rounded-3xl" />
      
      {/* Top Monitor Status Bar */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-slate-800 uppercase">
                Màn Hình Chỉ Số Sinh Tồn EMR
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase tracking-widest border border-sky-200">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Chẩn đoán nhịp thời gian thực • Chuẩn HL7 FHIR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chỉ số ổn định</span>
          </span>
          <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">
            Lead II • 25mm/s
          </span>
        </div>
      </div>

      {/* Real-time ECG Waveform Canvas / SVG */}
      <div className="relative z-10 my-4 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white shadow-inner overflow-hidden border border-slate-800">
        <div className="absolute inset-0 bg-medical-grid-dense opacity-25 pointer-events-none" />
        
        {/* ECG Lead Info & BPM Glow */}
        <div className="relative flex items-center justify-between px-2 pt-1 pb-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> ECG LEAD II
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">{vitals.rhythm}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-bold">
            <Heart className="w-4 h-4 fill-rose-500 animate-cardiac" />
            <span className="text-base font-black tracking-tight">{vitals.bpm}</span>
            <span className="text-[10px] text-slate-400">BPM</span>
          </div>
        </div>

        {/* Dynamic SVG Waveform */}
        <div className="relative h-20 w-full overflow-hidden flex items-center">
          <svg
            viewBox="0 0 800 100"
            preserveAspectRatio="none"
            className="w-full h-full text-cyan-400"
          >
            <defs>
              <linearGradient id="ecgGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Background guide wave */}
            <path
              d="M 0,50 L 70,50 L 80,45 L 90,55 L 100,50 L 130,50 L 140,30 L 150,85 L 160,10 L 170,65 L 180,50 L 220,50 L 235,42 L 250,50 L 320,50 L 330,45 L 340,55 L 350,50 L 380,50 L 390,30 L 400,85 L 410,10 L 420,65 L 430,50 L 470,50 L 485,42 L 500,50 L 570,50 L 580,45 L 590,55 L 600,50 L 630,50 L 640,30 L 650,85 L 660,10 L 670,65 L 680,50 L 720,50 L 735,42 L 750,50 L 800,50"
              fill="none"
              stroke="#0e7490"
              strokeWidth="1.5"
              strokeOpacity="0.3"
            />
            {/* Animated Active ECG Line */}
            <path
              d="M 0,50 L 70,50 L 80,45 L 90,55 L 100,50 L 130,50 L 140,30 L 150,85 L 160,10 L 170,65 L 180,50 L 220,50 L 235,42 L 250,50 L 320,50 L 330,45 L 340,55 L 350,50 L 380,50 L 390,30 L 400,85 L 410,10 L 420,65 L 430,50 L 470,50 L 485,42 L 500,50 L 570,50 L 580,45 L 590,55 L 600,50 L 630,50 L 640,30 L 650,85 L 660,10 L 670,65 L 680,50 L 720,50 L 735,42 L 750,50 L 800,50"
              fill="none"
              stroke="url(#ecgGlow)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg"
            />
          </svg>

          {/* Sweep Light Reflection Bar */}
          <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none animate-ecg" />
        </div>
      </div>

      {/* 4 Core Vital Signs Diagnostic Metrics Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        
        {/* Metric 1: Heart Rate */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Nhịp Tim (HR)</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-cardiac" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight">{vitals.bpm}</span>
            <span className="text-[10px] font-semibold text-slate-500">lần/phút</span>
          </div>
          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-1">
            Bình thường
          </span>
        </div>

        {/* Metric 2: SpO2 */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Nồng Độ Oxy (SpO2)</span>
            <Wind className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-cyan-700 tracking-tight">{vitals.spo2}%</span>
            <span className="text-[10px] font-semibold text-slate-500">bão hòa</span>
          </div>
          <span className="inline-block text-[9px] font-bold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded mt-1">
            Tối ưu 95-100%
          </span>
        </div>

        {/* Metric 3: Blood Pressure */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Huyết Áp (NIBP)</span>
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight">{vitals.sys}/{vitals.dia}</span>
            <span className="text-[10px] font-semibold text-slate-500">mmHg</span>
          </div>
          <span className="inline-block text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded mt-1">
            Chuẩn JNC 8
          </span>
        </div>

        {/* Metric 4: Body Temperature */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Thân Nhiệt (TEMP)</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tight">{vitals.temp}°C</span>
            <span className="text-[10px] font-semibold text-slate-500">nách</span>
          </div>
          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-1">
            Không sốt
          </span>
        </div>

      </div>

      {/* Clinical Telemetry Footer */}
      <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-600" />
          <span>Tự động đồng bộ vào Bệnh Án Điện Tử (EMR Cloud)</span>
        </div>
        <span className="font-mono font-medium text-slate-400 text-[10px]">
          ID: #VIT-2026-LIVE
        </span>
      </div>
    </div>
  );
};
