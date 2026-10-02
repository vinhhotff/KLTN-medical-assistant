import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true, // Always include HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dual Auth Transport: attach Bearer token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mediassist_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear localStorage on unauthorized
      localStorage.removeItem('mediassist_token');
      localStorage.removeItem('mediassist_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const PATIENT_ACCESS_DENIED_MESSAGE =
  'Hồ sơ sức khỏe được bảo vệ theo Nghị định 13/2023/NĐ-CP. Bạn chỉ xem được hồ sơ của bệnh nhân đã có lịch hẹn khám với mình (đã đặt, đang khám hoặc đã hoàn tất). Nếu cần hội chẩn, vui lòng liên hệ Quản trị viên.';

/**
 * Nhận diện lỗi 403 do rào chắn quyền truy cập hồ sơ bệnh nhân.
 * Chỉ khớp khi backend trả error.code === 'FORBIDDEN_PATIENT_ACCESS' (403 khác, ví dụ sai role, không tính).
 */
export const isPatientAccessDenied = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;
  const body = error.response.data as { error?: { code?: string } } | undefined;
  return body?.error?.code === 'FORBIDDEN_PATIENT_ACCESS';
};

export interface DoctorReviewDto {
  id: string;
  appointmentId: string;
  appointmentCode?: string;
  doctorId: string;
  doctorName?: string;
  patientId: string;
  patientName?: string;
  rating: number;
  comment?: string;
  tags?: string;
  createdAt: string;
}

export interface DoctorReviewRequest {
  rating: number;
  comment?: string;
  tags?: string;
}
