import React, { useState, useEffect, useMemo } from 'react';
import { Search, Activity, Stethoscope, RefreshCw, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';

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

  // Add Specialty Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.post('/admin/specialties', {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
      });
      setSuccessMsg(`Đã thêm thành công chuyên khoa "${name.trim()}"!`);
      setName('');
      setSlug('');
      setDescription('');
      setIsAddModalOpen(false);
      fetchSpecialties();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMsg(axiosError.response?.data?.error?.message || 'Không thể tạo chuyên khoa mới.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination state (Limit/Offset)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const filteredSpecialties = useMemo(() => {
    return specialties.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [specialties, searchTerm]);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Paginated specialties slice
  const paginatedSpecialties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSpecialties.slice(start, start + pageSize);
  }, [filteredSpecialties, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Danh Mục Chuyên Khoa Y Tế</h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý các chuyên khoa lâm sàng, hỗ trợ gắn thẻ định danh cho bác sĩ và AI Triage phân luồng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setName('');
              setSlug('');
              setDescription('');
              setErrorMsg(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm Chuyên Khoa
          </button>
          <button
            onClick={fetchSpecialties}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Làm Mới
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-sm font-medium text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedSpecialties.map((item) => (
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

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredSpecialties.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[6, 9, 18, 30]}
              itemLabel="chuyên khoa"
            />
          </div>
        </div>
      )}

      {/* Add Specialty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thêm Chuyên Khoa Y Tế Mới</h3>
                  <p className="text-xs text-slate-500">Mở rộng danh mục lâm sàng cho AI Triage & Ghép Bác Sĩ</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-medium text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSpecialty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Chuyên Khoa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa Tiêu Hóa - Gan Mật, Khoa Nhi..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Định Danh (Slug) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="slug-chuyen-khoa"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Dùng để định tuyến API và ghép nhãn Vector Embedding pgvector.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô Tả Lâm Sàng
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi khám chữa bệnh, các bệnh lý tiếp nhận chính..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Chuyên Khoa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
