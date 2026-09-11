import React, { useState } from 'react';
import { UploadCloud, FileText, Sparkles } from 'lucide-react';

export const DocumentSummarizerPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRunAnalysis = () => {
    if (!file) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tóm Tắt & Giải Nghĩa Bệnh Án Bằng AI</h2>
        <p className="text-slate-500 text-sm mt-1">
          Tải lên ảnh chụp kết quả xét nghiệm, đơn thuốc hoặc bệnh án để AI giải thích từ ngữ chuyên môn bằng ngôn ngữ dễ hiểu.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition text-center">
        <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-800">Kéo thả tài liệu y tế vào đây hoặc bấm để chọn tệp</p>
        <p className="text-xs text-slate-400 mt-1">Hỗ trợ định dạng PDF, JPG, PNG dung lượng tối đa 15MB</p>

        <label className="mt-4 inline-block px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-semibold cursor-pointer transition">
          Chọn Tệp Từ Máy Tính
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} className="hidden" />
        </label>

        {file && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between max-w-md mx-auto text-left">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-800 truncate">{file.name}</span>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              {analyzing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Đang dịch...
                </>
              ) : (
                <>Phân Tích AI</>
              )}
            </button>
          </div>
        )}
      </div>

      {analyzed && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">Bản Tóm Tắt & Giải Thích Lâm Sàng (AI Phân Tích)</h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
              Độ chính xác tham khảo: Cao
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
              <strong>Lưu ý y tế quan trọng:</strong> Nội dung tóm tắt được tạo bởi mô hình AI nhằm hỗ trợ bệnh nhân hiểu các chỉ số xét nghiệm phức tạp. Đây không phải là kết luận chẩn đoán thay thế bác sĩ.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2 text-xs uppercase tracking-wider">Chỉ Số Đáng Chú Ý</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center justify-between">
                    <span>Cholesterol toàn phần:</span>
                    <span className="font-bold text-rose-600">6.2 mmol/L (Tăng nhẹ)</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Đường huyết lúc đói (Fasting Glucose):</span>
                    <span className="font-bold text-emerald-600">5.1 mmol/L (Bình thường)</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Men gan AST/ALT:</span>
                    <span className="font-bold text-emerald-600">22 / 24 U/L (Bình thường)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2 text-xs uppercase tracking-wider">Khuyến Nghị AI Hướng Dẫn</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chỉ số Cholesterol toàn phần có xu hướng vượt ngưỡng chuẩn khuyến cáo. Bạn nên điều chỉnh chế độ ăn giảm chất béo bão hòa và tham khảo ý kiến bác sĩ Tim Mạch hoặc Nội Tổng Quát.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
