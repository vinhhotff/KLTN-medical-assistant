import { useAuthStore } from '../store/useAuthStore';

/**
 * Trạng thái xác thực email của người dùng đang đăng nhập (Bệnh nhân hoặc Bác sĩ).
 * Chỉ coi là chưa xác thực khi emailVerified === false (user cũ trong localStorage có thể thiếu field này;
 * PatientLayout và DoctorLayout gọi lại /auth/me để cập nhật). Quản trị viên không bị chặn.
 */
export const useEmailVerification = () => {
  const user = useAuthStore((state) => state.user);
  const isUnverified =
    (user?.role === 'PATIENT' || user?.role === 'DOCTOR') && user.emailVerified === false;
  return { isUnverified };
};
