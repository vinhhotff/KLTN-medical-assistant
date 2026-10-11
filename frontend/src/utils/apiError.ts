interface AxiosLikeError {
  response?: { status?: number; data?: { message?: string; error?: { code?: string; message?: string } } };
  request?: unknown;
}

/** User-facing message from a backend ApiResponse error, with a fallback. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosLikeError;
  return e?.response?.data?.error?.message || e?.response?.data?.message || fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  return (err as AxiosLikeError)?.response?.status;
}

export function getApiErrorCode(err: unknown): string | undefined {
  return (err as AxiosLikeError)?.response?.data?.error?.code;
}

/** True for network failures (no response) and 5xx — the cases where "Thử lại" makes sense. */
export function isRetryableError(err: unknown): boolean {
  const status = getApiErrorStatus(err);
  return status === undefined || status >= 500;
}

/** True when the backend refused because the scan/payment quota is exhausted. */
export function isQuotaError(err: unknown): boolean {
  return getApiErrorStatus(err) === 402 || getApiErrorCode(err) === 'QUOTA_EXCEEDED';
}
