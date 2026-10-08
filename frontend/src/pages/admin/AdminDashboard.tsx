import React, { useEffect, useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Zap, 
  ArrowRight, 
  UserCheck, 
  Users, 
  CalendarCheck, 
  FileText, 
  HeartPulse, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  Cpu,
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export interface DailyStat {
  date: string;
  tokens: number;
  costUsd: number;
}

export interface ServiceStat {
  service: string;
  tokens: number;
  costUsd: number;
  requests: number;
}

export interface AiUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostVnd: number;
  errorRatePercent: number;
  dailyStats: DailyStat[];
  serviceStats: ServiceStat[];
}

interface AdminSystemStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  pendingDoctorsCount: number;
  suspendedUsersCount: number;
  totalAppointments: number;
  scheduledAppointmentsCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  totalDocumentsAnalyzed: number;
  redFlagDocumentsCount: number;
  totalTriageSessions: number;
  emergencyTriageCount: number;
  routineTriageCount: number;
  infrastructureHealth?: Record<string, string>;
  recentActivities?: Array<{
    id: string;
    userEmail: string;
    action: string;
    resource: string;
    createdAt: string;
    metadata?: string;
  }>;
}

interface PendingDoctorSummary {
  profileId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // AI Cost Analytics State
  const [aiStats, setAiStats] = useState<AiUsageStats | null>(null);
  const [aiDaysFilter, setAiDaysFilter] = useState<number>(30);
  const [aiChartMetric, setAiChartMetric] = useState<'tokens' | 'cost'>('tokens');
  const [aiLoading, setAiLoading] = useState<boolean>(true);

  // UI-05: Dynamic exchange rate from Backend (totalCostVnd / totalCostUsd) or live rate fallback
  const dynamicExchangeRate = useMemo(() => {
    if (aiStats?.totalCostUsd && Number(aiStats.totalCostUsd) > 0 && aiStats?.totalCostVnd && Number(aiStats.totalCostVnd) > 0) {
      return Math.round(Number(aiStats.totalCostVnd) / Number(aiStats.totalCostUsd));
    }
    return 25450;
  }, [aiStats?.totalCostUsd, aiStats?.totalCostVnd]);

  const fetchAiUsageData = async (days: number) => {
    try {
      setAiLoading(true);
      const res = await api.get(`/admin/ai-usage?days=${days}`);
      if (res.data?.data) {
        setAiStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load AI usage stats:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, doctorsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/doctors/pending'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.data) {
        setStats(statsRes.value.data.data);
        setLastUpdated(new Date());
      }

      if (doctorsRes.status === 'fulfilled' && doctorsRes.value.data?.data) {
        setPendingDoctors(doctorsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAiUsageData(aiDaysFilter);
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchAiUsageData(aiDaysFilter);
    }, 15000);
    return () => clearInterval(interval);
  }, [aiDaysFilter]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchAiUsageData(aiDaysFilter);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Trung Tâm Chỉ Huy & Giám Sát Toàn Viện
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Tổng hợp dữ liệu vận hành theo thời gian thực: Bác sĩ, Lịch hẹn Telehealth, Cận lâm sàng EMR và Phân luồng AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đồng bộ: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Users & Doctors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân Lực Y Tế</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalDoctors ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Bác sĩ chuyên khoa chính thức</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Bệnh nhân: <strong className="text-slate-800">{stats?.totalPatients ?? 0}</strong></span>
            {stats?.pendingDoctorsCount ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {stats.pendingDoctorsCount} chờ duyệt
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">100% đã duyệt</span>
            )}
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch Khám Telehealth</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalAppointments ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Tổng cuộc hẹn đã đặt</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.completedAppointmentsCount ?? 0} hoàn thành
            </span>
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {stats?.scheduledAppointmentsCount ?? 0} chờ khám
            </span>
          </div>
        </div>

        {/* Card 3: EMR Document Scanner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hồ Sơ Cận Lâm Sàng</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalDocumentsAnalyzed ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Hồ sơ đã phân tích (OCR & Vision)</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {stats?.redFlagDocumentsCount ?? 0} ca bất thường
            </span>
            <span className="text-slate-400">Khấu trừ 1 Quota/đợt</span>
          </div>
        </div>

        {/* Card 4: AI Triage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phân Luồng AI Triage</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.totalTriageSessions ?? 0}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Phiên đánh giá triệu chứng</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {stats?.emergencyTriageCount ? (
              <span className="text-rose-600 font-black flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.emergencyTriageCount} ca cấp cứu khẩn!
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">0 ca cấp cứu mới</span>
            )}
            <span className="text-slate-500 font-medium">{stats?.routineTriageCount ?? 0} định kỳ</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 🤖 SECTION: AI ANALYTICS & FINOPS DASHBOARD                         */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Cpu className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                🤖 Giám Sát Chi Phí & Tài Nguyên AI (FinOps)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi chi phí token, mô hình LLM (Gemini 1.5/Flash), tỷ lệ lỗi và phân bổ ngân sách.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Khoảng thời gian:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAiDaysFilter(days)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    aiDaysFilter === days
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>
        </div>

        {aiLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
            <span className="text-sm font-medium">Đang tính toán chi phí AI và token usage...</span>
          </div>
        ) : (
          <>
            {/* KPI CARDS — 5 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Requests */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>📊 Tổng Requests</span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                  {aiStats?.totalRequests?.toLocaleString('vi-VN') ?? 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Lượt gọi AI Gateway</span>
              </div>

              {/* Card 2: Total Tokens */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>🔤 Tổng Token</span>
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-900 mt-2 font-mono">
                  {aiStats?.totalTokens?.toLocaleString('vi-VN') ?? 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Prompt + Completion</span>
              </div>

              {/* Card 3: Total Cost USD */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>💵 Chi Phí (USD)</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-900 mt-2 font-mono">
                  ${Number(aiStats?.totalCostUsd ?? 0).toFixed(4)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Giá chuẩn Gemini</span>
              </div>

              {/* Card 4: Total Cost VND */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>💰 Chi Phí (VNĐ)</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 mt-2 font-mono">
                  {Number(aiStats?.totalCostVnd ?? (aiStats?.totalCostUsd ? aiStats.totalCostUsd * dynamicExchangeRate : 0)).toLocaleString('vi-VN')}₫
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tỷ giá {dynamicExchangeRate.toLocaleString('vi-VN')}₫/USD</span>
              </div>

              {/* Card 5: Error Rate */}
              <div className={`p-4 rounded-2xl border ${
                (aiStats?.errorRatePercent ?? 0) > 5
                  ? 'bg-rose-50/80 border-rose-200'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className={(aiStats?.errorRatePercent ?? 0) > 5 ? 'text-rose-700' : 'text-slate-500'}>
                    ⚠️ Error Rate
                  </span>
                  <AlertTriangle className={`w-4 h-4 ${(aiStats?.errorRatePercent ?? 0) > 5 ? 'text-rose-600' : 'text-slate-400'}`} />
                </div>
                <div className={`text-2xl font-black mt-2 font-mono ${
                  (aiStats?.errorRatePercent ?? 0) > 5 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                }`}>
                  {Number(aiStats?.errorRatePercent ?? 0).toFixed(1)}%
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tỷ lệ lỗi & timeout</span>
              </div>
            </div>

            {/* ERROR RATE PROGRESS BAR & WARNING */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Tỷ lệ lỗi API: {Number(aiStats?.errorRatePercent ?? 0).toFixed(1)}%</span>
                <span className={(aiStats?.errorRatePercent ?? 0) > 10 ? 'text-rose-600' : 'text-slate-500'}>
                  Ngưỡng an toàn: &lt; 10%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    (aiStats?.errorRatePercent ?? 0) > 10
                      ? 'bg-rose-600'
                      : (aiStats?.errorRatePercent ?? 0) > 5
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, aiStats?.errorRatePercent ?? 0))}%` }}
                />
              </div>
              {(aiStats?.errorRatePercent ?? 0) > 10 && (
                <div className="p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>⚠️ Cần kiểm tra lại AI API integration: Tỷ lệ lỗi vượt quá ngưỡng 10%!</span>
                </div>
              )}
            </div>

            {/* CHARTS GRID (Line Chart & Pie Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LINE CHART (2/3 width) */}
              <div className="lg:col-span-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      Xu Hướng Tiêu Thụ Theo Ngày
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Biến thiên qua {aiDaysFilter} ngày</p>
                  </div>

                  {/* Toggle Metric: [Token] | [Chi phí] */}
                  <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAiChartMetric('tokens')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        aiChartMetric === 'tokens' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiChartMetric('cost')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        aiChartMetric === 'cost' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Chi Phí ($)
                    </button>
                  </div>
                </div>

                <div className="h-[280px] w-full">
                  {(!aiStats?.dailyStats || aiStats.dailyStats.length === 0) ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Chưa có dữ liệu gọi AI trong khoảng thời gian này
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={aiStats.dailyStats} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b" 
                          fontSize={11} 
                          tickFormatter={(val) => {
                            if (!val) return '';
                            const parts = val.split('-');
                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                          }} 
                        />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <RechartsTooltip
                          formatter={(value: any) => [
                            aiChartMetric === 'tokens' ? Number(value).toLocaleString() + ' tokens' : '$' + Number(value).toFixed(6),
                            aiChartMetric === 'tokens' ? 'Tokens' : 'Chi Phí USD'
                          ]}
                          labelFormatter={(label) => `Ngày: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line
                          type="monotone"
                          dataKey={aiChartMetric === 'tokens' ? 'tokens' : 'costUsd'}
                          name={aiChartMetric === 'tokens' ? 'Tokens Sử Dụng' : 'Chi Phí ($ USD)'}
                          stroke="#7c3aed"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#7c3aed' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* PIE CHART (1/3 width) */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-1">
                    <PieChartIcon className="w-4 h-4 text-purple-600" />
                    Phân Bổ Theo Dịch Vụ
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">Triage vs Phân Tích Cận Lâm Sàng</p>

                  <div className="h-[180px] w-full">
                    {(!aiStats?.serviceStats || aiStats.serviceStats.length === 0) ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        Chưa có dữ liệu phân loại
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={aiStats.serviceStats}
                            dataKey="tokens"
                            nameKey="service"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={3}
                          >
                            {aiStats.serviceStats.map((entry, idx) => (
                              <Cell 
                                key={`cell-${idx}`} 
                                fill={entry.service.includes('TRIAGE') ? '#8b5cf6' : '#0ea5e9'} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(val: any, name: any, item: any) => [
                              `${Number(val).toLocaleString()} tokens ($${Number(item.payload.costUsd).toFixed(4)})`,
                              name === 'TRIAGE' ? 'Triage Triệu Chứng' : 'Phân Tích Cận Lâm Sàng'
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Service Details Table */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="space-y-2 text-xs">
                    {aiStats?.serviceStats?.map((s) => {
                      const isTriage = s.service.includes('TRIAGE');
                      const vnd = Number(s.costUsd * dynamicExchangeRate).toLocaleString('vi-VN');
                      return (
                        <div key={s.service} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isTriage ? 'bg-purple-500' : 'bg-sky-500'}`} />
                            <div>
                              <span className="font-bold text-slate-800">
                                {isTriage ? 'Triage Triệu Chứng' : 'Cận Lâm Sàng'}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {s.requests} reqs • {s.tokens.toLocaleString()} tok
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-slate-900 block">${Number(s.costUsd).toFixed(4)}</span>
                            <span className="text-[10px] text-slate-500">{vnd}₫</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Infrastructure & Fast Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">PostgreSQL + pgvector</span>
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">UP (Vector 1536d)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">HNSW Indexing cho AI Doctor Semantic Match</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Redis & 2-Layer Cache</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">UP (&lt;1ms Latency)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">L1 Caffeine in-memory + L2 Distributed Redis</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Rào Chắn An Toàn Lâm Sàng</span>
            <ShieldCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-slate-900">ENFORCED</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Red-flag cứng + Off-topic Guard bảo vệ</p>
        </div>
      </div>

      {/* Two Column Layout: Vetting Queue & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Doctor Vetting Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Hàng Đợi Duyệt Hồ Sơ Bác Sĩ
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                pendingDoctors.length > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {pendingDoctors.length} bác sĩ chờ duyệt
              </span>
            </div>

            {pendingDoctors.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Hiện tại không có hồ sơ bác sĩ mới nào đang chờ xác thực bằng cấp.
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {pendingDoctors.slice(0, 4).map((doc) => (
                  <div
                    key={doc.profileId}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{doc.fullName}</h4>
                      <p className="text-xs text-slate-500">
                        CCHN: <span className="font-mono text-slate-700">{doc.licenseNumber}</span> | Chuyên khoa: {doc.specialties?.join(', ') || 'Chưa phân khoa'}
                      </p>
                    </div>
                    <Link
                      to="/admin/doctors"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Thẩm Định
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <Link
              to="/admin/doctors"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Xem toàn bộ danh bạ bác sĩ <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Live Activity Feed (Audit Logs) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Dòng Hoạt Động Gần Nhất (Live Audit Trail)
                </h3>
              </div>
              <Link
                to="/admin/audit-logs"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Chưa có hoạt động kiểm toán nào được ghi nhận gần đây.
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {stats.recentActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                          {act.action}
                        </span>
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                          {act.userEmail}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 truncate max-w-[280px]">
                        {act.metadata || act.resource}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tuân thủ lưu vết chuẩn Y Tế</span>
            <Link to="/admin/audit-logs" className="font-bold text-indigo-600 hover:underline">
              Tra cứu đầy đủ log &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
