import React from 'react';
import { MessageSquare, UploadCloud, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PatientDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Chăm Sóc Sức Khỏe Thông Minh Cùng MediAssist-AI
          </h1>
          <p className="mt-3 text-indigo-100 text-base leading-relaxed">
            Mô tả triệu chứng để nhận hỗ trợ định hướng chuyên khoa tức thì, hoặc tải lên kết quả xét nghiệm/đơn thuốc để AI diễn giải sang ngôn ngữ dễ hiểu.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/patient/triage"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow-md hover:bg-indigo-50 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Bắt Đầu Chat Triệu Chứng
            </Link>
            <Link
              to="/patient/documents"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/30 border border-white/20 text-white font-semibold text-sm hover:bg-indigo-500/40 transition"
            >
              <UploadCloud className="w-4 h-4" />
              Tải Lên Kết Quả Xét Nghiệm
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Phân Loại Triệu Chứng AI</h3>
          <p className="text-slate-500 text-sm mt-2">
            Trò chuyện tự nhiên với Trợ lý AI có hệ thống guardrail y tế nghiêm ngặt để xác định mức độ khẩn cấp và chuyên khoa cần khám.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Diễn Giải Bệnh Án Đa Phương Thức</h3>
          <p className="text-slate-500 text-sm mt-2">
            Tải lên file ảnh hoặc PDF kết quả xét nghiệm. Vision LLM OCR sẽ tóm tắt các chỉ số phức tạp thành lời giải thích dễ hiểu.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Ghép Nối Bác Sĩ Ngữ Nghĩa</h3>
          <p className="text-slate-500 text-sm mt-2">
            Tìm kiếm bác sĩ phù hợp nhất dựa trên vector ngữ nghĩa (pgvector) khớp chính xác với tình trạng sức khỏe của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};
