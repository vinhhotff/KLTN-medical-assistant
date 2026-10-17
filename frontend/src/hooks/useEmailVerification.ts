import { useAuthStore } from '../store/useAuthStore';

/**
 * Trạng thái xác thực email của bệnh nhân đang đăng nhập.
 * Chỉ coi là chưa xác thực khi emailVerified === false (user cũ trong localStorage có thể thiếu field này;
 * PatientLayout gọi lại /auth/me để cập nhật). Bác sĩ/quản trị viên không bị chặn.
 */
export const useEmailVerification = () => {
  const user = useAuthStore((state) => state.user);
  const isUnverified = user?.role === 'PATIENT' && user.emailVerified === false;
  return { isUnverified };
};
