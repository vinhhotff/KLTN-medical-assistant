import React, { useState, useEffect } from 'react';
import { Search, Activity, Stethoscope, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface SpecialtyItem {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const SpecialtyManagementPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/specialties');
      if (res.data?.data) {
        setSpecialties(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load specialties:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecialties = specialties.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Danh Mục Chuyên Khoa Y Tế</h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý các chuyên khoa lâm sàng, hỗ trợ gắn thẻ định danh cho bác sĩ và AI Triage phân luồng.
          </p>
        </div>
        <button
          onClick={fetchSpecialties}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Làm Mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên chuyên khoa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">Tổng cộng: {filteredSpecialties.length} chuyên khoa</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Đang tải danh mục chuyên khoa...</div>
      ) : filteredSpecialties.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Không tìm thấy chuyên khoa phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSpecialties.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {item.slug.toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Activity className="w-3 h-3" /> Chuẩn Bộ Y Tế
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{item.description}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Stethoscope className="w-4 h-4 text-indigo-600" />
                  <span>Kích hoạt trên AI Triage</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
