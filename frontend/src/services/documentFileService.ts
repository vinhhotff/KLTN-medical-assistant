import axios from 'axios';
import { api, isPatientAccessDenied, PATIENT_ACCESS_DENIED_MESSAGE } from './api';

/**
 * Quyền xem tệp y tế gốc do backend cấp (UC-28).
 * - Tệp trên Supabase bucket PRIVATE: url là signed URL hết hạn sau expiresInSeconds giây.
 * - Tệp local (fallback dev): url là /api/v1/documents/{id}/file, expiresAt = null.
 */
export interface DocumentFileAccess {
  url: string;
  expiresAt: string | null;
  expiresInSeconds: number | null;
  fileName?: string;
  contentType?: string;
}

export type DocumentFileErrorKind = 'FORBIDDEN' | 'NOT_FOUND' | 'STORAGE_UNAVAILABLE' | 'RATE_LIMITED' | 'UNKNOWN';

export class DocumentFileAccessError extends Error {
  readonly kind: DocumentFileErrorKind;

  constructor(kind: DocumentFileErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'DocumentFileAccessError';
  }
}

export const SIGNED_URL_NOTE = 'Liên kết tạm thời, hết hạn sau 15 phút';

const serverMessage = (error: unknown): string | undefined => {
  if (!axios.isAxiosError(error)) return undefined;
  const body = error.response?.data as { error?: { message?: string }; message?: string } | undefined;
  return body?.error?.message || body?.message;
};

/** Chuyển lỗi HTTP thành thông báo tiếng Việt theo từng tình huống. */
export const toDocumentFileError = (error: unknown): DocumentFileAccessError => {
  if (error instanceof DocumentFileAccessError) return error;
  if (isPatientAccessDenied(error)) {
    return new DocumentFileAccessError('FORBIDDEN', PATIENT_ACCESS_DENIED_MESSAGE);
  }
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  switch (status) {
    case 403:
      return new DocumentFileAccessError('FORBIDDEN', 'Bạn không có quyền xem tệp y tế này.');
    case 404:
      return new DocumentFileAccessError('NOT_FOUND',
        'Tài liệu này không có tệp gốc hoặc tệp đã bị xóa khỏi hệ thống lưu trữ.');
    case 429:
      return new DocumentFileAccessError('RATE_LIMITED',
        serverMessage(error) || 'Bạn đã mở tệp quá nhiều lần trong thời gian ngắn. Vui lòng chờ 1 phút rồi thử lại.');
    case 503:
      return new DocumentFileAccessError('STORAGE_UNAVAILABLE',
        'Hệ thống lưu trữ tệp y tế tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
    default:
      return new DocumentFileAccessError('UNKNOWN',
        serverMessage(error) || 'Không thể tạo liên kết xem tệp. Vui lòng kiểm tra kết nối và thử lại.');
  }
};

/** GET /documents/{id}/signed-url: kiểm tra quyền + ghi audit phía backend. */
export const getDocumentFileAccess = async (documentId: string, download = false): Promise<DocumentFileAccess> => {
  try {
    const res = await api.get<{ data: DocumentFileAccess }>(`/documents/${documentId}/signed-url`, {
      params: { download },
    });
    return res.data.data;
  } catch (error) {
    throw toDocumentFileError(error);
  }
};

const toAbsoluteUrl = (url: string): string => new URL(url, window.location.origin).toString();

/** Liên kết đã hết hạn (chừa 5 giây an toàn)? Tệp local không hết hạn. */
export const isFileAccessExpired = (access: DocumentFileAccess | null): boolean =>
  !!access?.expiresAt && new Date(access.expiresAt).getTime() - 5000 <= Date.now();

/**
 * Mở tệp gốc trong tab mới. PHẢI gọi trực tiếp trong click handler:
 * cửa sổ trống được mở ngay (tránh popup blocker), sau đó mới gán location khi đã có signed URL.
 */
export const openDocumentFile = async (documentId: string): Promise<void> => {
  const win = window.open('', '_blank');
  if (win) {
    try {
      win.opener = null;
      win.document.title = 'Đang mở tệp y tế...';
      win.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:24px;color:#334155">Đang tạo liên kết bảo mật để mở tệp y tế...</p>';
    } catch {
      // Bỏ qua: chỉ là nội dung chờ
    }
  }
  try {
    const access = await getDocumentFileAccess(documentId, false);
    const target = toAbsoluteUrl(access.url);
    if (win && !win.closed) {
      win.location.href = target;
    } else {
      window.open(target, '_blank', 'noopener');
    }
  } catch (error) {
    win?.close();
    throw toDocumentFileError(error);
  }
};

/** Tải tệp gốc về máy bằng signed URL có tham số download (Content-Disposition: attachment). */
export const downloadDocumentFile = async (documentId: string): Promise<void> => {
  const access = await getDocumentFileAccess(documentId, true);
  const link = document.createElement('a');
  link.href = toAbsoluteUrl(access.url);
  link.rel = 'noopener';
  if (access.fileName) link.download = access.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
