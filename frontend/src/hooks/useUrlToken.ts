import { useEffect } from 'react';

/** Đọc ?token= từ URL hiện tại. Hàm thuần (an toàn khi React StrictMode gọi initializer 2 lần). */
export const readTokenFromUrl = (): string | null =>
  new URLSearchParams(window.location.search).get('token');

/**
 * Xóa query chứa token khỏi thanh địa chỉ ngay sau khi trang mount (history.replaceState),
 * để token trong link email không còn trong lịch sử trình duyệt hay header Referer.
 */
export const useStripTokenFromUrl = () => {
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
};
