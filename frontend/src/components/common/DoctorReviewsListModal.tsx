import React, { useState, useEffect } from 'react';
import { Star, X, Award, MessageSquare, ThumbsUp, Calendar } from 'lucide-react';
import { api, DoctorReviewDto } from '../../services/api';

interface DoctorReviewsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  doctorHospital?: string;
  doctorSpecialty?: string;
  doctorRating?: number;
  reviewCount?: number;
}

export const DoctorReviewsListModal: React.FC<DoctorReviewsListModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  doctorHospital,
  doctorSpecialty,
  doctorRating = 4.9,
  reviewCount = 0,
}) => {
  const [reviews, setReviews] = useState<DoctorReviewDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchReviews();
    }
  }, [isOpen, doctorId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doctors/${doctorId}/reviews`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setReviews(res.data.data);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  // Calculate rating breakdown
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    }
  });

  const totalReviewsRecorded = reviews.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start justify-between pr-8">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30 flex items-center space-x-1">
                  <Award className="w-3 h-3 mr-1 inline" />
                  Đánh Giá Từ Người Bệnh Thực Tế
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{doctorName}</h3>
              {(doctorSpecialty || doctorHospital) && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {[doctorSpecialty, doctorHospital].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>

            {/* Score Badge */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center min-w-[100px] backdrop-blur-md">
              <div className="flex items-center justify-center space-x-1 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400" />
                <span className="text-2xl font-black text-white">{doctorRating.toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {reviewCount || totalReviewsRecorded} lượt khám
              </p>
            </div>
          </div>

          {/* Rating breakdown filter bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center space-x-2 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterRating === null
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Tất cả ({totalReviewsRecorded})
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => setFilterRating(filterRating === s ? null : s)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center space-x-1 ${
                  filterRating === s
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <span>{s}</span>
                <Star className={`w-3 h-3 ${filterRating === s ? 'fill-slate-900 text-slate-900' : 'fill-amber-400 text-amber-400'}`} />
                <span className="text-[10px] opacity-80">({ratingCounts[s] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Đang tải danh sách phản hồi từ bệnh nhân...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Chưa có đánh giá nào cho mức sao này</p>
              <p className="text-xs text-slate-500">
                Mọi đánh giá sau ca khám hoàn tất sẽ được tự động hiển thị và cập nhật tại đây.
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => {
              const formattedDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Mới đây';

              const tagsArray = rev.tags
                ? rev.tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all space-y-2.5"
                >
                  {/* Review Item Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {rev.patientName ? rev.patientName.charAt(0) : 'B'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{rev.patientName || 'Bệnh nhân'}</p>
                        <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 mr-0.5 inline" />
                          <span>Khám ngày {formattedDate}</span>
                          {rev.appointmentCode && (
                            <span className="font-mono text-slate-400"> • #{rev.appointmentCode}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`w-3.5 h-3.5 ${
                            st <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-200 text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {tagsArray.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tagsArray.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center space-x-1"
                        >
                          <ThumbsUp className="w-2.5 h-2.5 mr-1" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  {rev.comment && (
                    <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Đánh giá được xác thực qua hồ sơ ca khám EMR hoàn tất</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
