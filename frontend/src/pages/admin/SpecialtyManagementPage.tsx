import React, { useState } from 'react';
import { Plus, Search, Activity, Stethoscope } from 'lucide-react';

interface Specialty {
  id: string;
  code: string;
  name: string;
  description: string;
  doctorCount: number;
  isActive: boolean;
}

const INITIAL_SPECIALTIES: Specialty[] = [
  {
    id: 'sp-1',
    code: 'CARDIO',
    name: 'Tim Mạch',
    description: 'Chẩn đoán và điều trị các bệnh lý tim, mạch máu và huyết áp cao.',
    doctorCount: 8,
    isActive: true,
  },
  {
    id: 'sp-2',
    code: 'DERMA',
    name: 'Da Liễu & Thẩm Mỹ Da',
    description: 'Điều trị viêm da cơ địa, mụn trứng cá, vảy nến và các bệnh ngoài da.',
    doctorCount: 12,
    isActive: true,
  },
  {
    id: 'sp-3',
    code: 'PEDIA',
    name: 'Nhi Khoa',
    description: 'Chăm sóc sức khỏe, tiêm chủng và điều trị bệnh cho trẻ sơ sinh và trẻ nhỏ.',
    doctorCount: 15,
    isActive: true,
  },
  {
    id: 'sp-4',
    code: 'NEURO',
    name: 'Thần Kinh',
    description: 'Khám và tư vấn các rối loạn tiền đình, đau đầu mạn tính, mất ngủ, đột quỵ.',
    doctorCount: 6,
    isActive: true,
  },
  {
    id: 'sp-5',
    code: 'ENT',
    name: 'Tai Mũi Họng',
    description: 'Khám viêm xoang, viêm họng hạt, viêm amidan và các bệnh lý đường hô hấp trên.',
    doctorCount: 9,
    isActive: true,
  },
  {
    id: 'sp-6',
    code: 'GENMED',
    name: 'Nội Tổng Quát',
    description: 'Khám tổng quát định kỳ, tầm soát bệnh mạn tính như tiểu đường, mỡ máu.',
    doctorCount: 20,
    isActive: true,
  },
];

export const SpecialtyManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSpecialties = INITIAL_SPECIALTIES.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition">
          <Plus className="w-4 h-4" />
          Thêm Chuyên Khoa
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSpecialties.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {item.code}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Activity className="w-3 h-3" /> Đang sử dụng
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{item.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span>{item.doctorCount} Bác sĩ trực thuộc</span>
              </div>
              <button className="text-indigo-600 hover:text-indigo-800 font-medium">Chỉnh sửa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
