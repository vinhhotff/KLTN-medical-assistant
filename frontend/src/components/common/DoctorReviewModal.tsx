import React, { useState, useEffect } from 'react';
import { Star, X, Check, Award, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';
import { api, DoctorReviewDto } from '../../services/api';

interface DoctorReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    appointmentCode: string;
    doctorId: string;
    doctorName: string;
    doctorHospital?: string;
    doctorSpecialty?: string;
    scheduledStart?: string;
  } | null;
  existingReview?: DoctorReviewDto | null;
  onReviewSubmitted: (review: DoctorReviewDto) => void;
}

const PRESET_TAGS = [
  'Tận tâm, chu đáo',
  'Chuyên môn cao',
  'Giải thích dễ hiểu',
  'Đúng giờ',
  'Kê đơn hiệu quả',
  'Thân thiện',
  'Lắng nghe người bệnh',
  'Cơ sở vật chất tốt'
];

const RATING_DESCRIPTIONS: Record<number, { text: string; color: string }> = {
  1: { text: 'Chưa hài lòng - Cần cải thiện dịch vụ', color: 'text-red-500' },
  2: { text: 'Tạm ổn - Trải nghiệm ở mức trung bình', color: 'text-orange-500' },
  3: { text: 'Bình thường - Đạt yêu cầu khám chữa bệnh', color: 'text-amber-500' },
  4: { text: 'Hài lòng - Bác sĩ tư vấn tốt, đáng tin cậy', color: 'text-blue-500' },
  5: { text: 'Rất hài lòng - Bác sĩ chuyên môn xuất sắc & tận tâm', color: 'text-emerald-500' },
};

export const DoctorReviewModal: React.FC<DoctorReviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  existingReview,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      if (existingReview.tags) {
        setSelectedTags(existingReview.tags.split(',').map((t) => t.trim()).filter(Boolean));
      } else {
        setSelectedTags([]);
      }
    } else {
      setRating(5);
      setHoverRating(0);
      setSelectedTags(['Tận tâm, chu đáo', 'Chuyên môn cao']);
      setComment('');
      setErrorMessage(null);
    }
  }, [existingReview, isOpen]);

  if (!isOpen || !appointment) return null;

  const toggleTag = (tag: string) => {
    if (existingReview) return; // Read-only
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingReview) {
      onClose();
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Vui lòng chọn số sao đánh giá từ 1 đến 5.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        rating,
        comment: comment.trim(),
        tags: selectedTags.join(', '),
      };

      const res = await api.post(`/appointments/${appointment.id}/review`, payload);
      if (res.data?.success && res.data?.data) {
        onReviewSubmitted(res.data.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = !!existingReview;
  const currentDisplayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transition-all transform scale-100">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {isReadOnly ? 'Đánh Giá Ca Khám' : 'Đánh Giá Bác Sĩ & Dịch Vụ'}
              </h3>
              <p className="text-xs text-emerald-100">
                Mã ca khám: <span className="font-mono font-semibold">{appointment.appointmentCode}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
            <p className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">Bác sĩ phụ trách</p>
            <p className="text-base font-bold text-white">{appointment.doctorName}</p>
            {(appointment.doctorSpecialty || appointment.doctorHospital) && (
              <p className="text-xs text-emerald-100 mt-0.5">
                {[appointment.doctorSpecialty, appointment.doctorHospital].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isReadOnly && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Bạn đã hoàn tất gửi đánh giá cho ca khám này. Điểm số đã được ghi nhận vào uy tín của Bác sĩ.</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="text-center space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isReadOnly ? 'Điểm bạn đã đánh giá' : 'Mức độ hài lòng của bạn'}
            </label>
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  disabled={isReadOnly}
                  onMouseEnter={() => !isReadOnly && setHoverRating(star)}
                  onMouseLeave={() => !isReadOnly && setHoverRating(0)}
                  onClick={() => !isReadOnly && setRating(star)}
                  className={`p-1.5 rounded-xl transition-all transform ${
                    !isReadOnly ? 'hover:scale-125 cursor-pointer active:scale-95' : 'cursor-default'
                  } ${
                    star <= currentDisplayRating
                      ? 'text-amber-400 drop-shadow-sm'
                      : 'text-slate-200'
                  }`}
                >
                  <Star
                    className={`w-9 h-9 ${
                      star <= currentDisplayRating
                        ? 'fill-amber-400 text-amber-400 stroke-[1.5]'
                        : 'fill-transparent stroke-slate-300 stroke-[1.5]'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Score Text Description */}
            <p className={`text-xs font-semibold ${RATING_DESCRIPTIONS[currentDisplayRating]?.color || 'text-slate-600'}`}>
              {currentDisplayRating} / 5 Sao — {RATING_DESCRIPTIONS[currentDisplayRating]?.text}
            </p>
          </div>

          {/* Preset Tags Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Điểm ấn tượng về Bác sĩ</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    disabled={isReadOnly}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 ring-2 ring-emerald-400 ring-offset-1'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } ${isReadOnly && !isSelected ? 'opacity-40' : ''}`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
              <span>Nhận xét chi tiết (tùy chọn)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isReadOnly}
              placeholder={isReadOnly ? 'Không có nhận xét chi tiết' : 'Chia sẻ cụ thể trải nghiệm khám bệnh của bạn (thái độ, hiệu quả điều trị, dặn dò của bác sĩ)...'}
              maxLength={1000}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                isReadOnly
                  ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              } transition-all resize-none`}
            />
            {!isReadOnly && (
              <p className="text-[10px] text-slate-400 text-right">
                {comment.length}/1000 ký tự
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isReadOnly ? 'Đóng' : 'Để Sau'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Gửi Đánh Giá Ngay</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
