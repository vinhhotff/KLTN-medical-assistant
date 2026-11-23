package com.mediassist.model.entity;

/**
 * Trạng thái thẩm định chứng chỉ hành nghề và hồ sơ chuyên môn của Bác sĩ.
 * Tuân thủ quy định kiểm duyệt của Bộ Y Tế / Hội đồng chuyên môn bệnh viện.
 */
public enum VerificationStatus {
    /** Bác sĩ mới đăng ký, chưa điền số CCHN hoặc chưa tải lên bản scan chứng chỉ. */
    UNSUBMITTED,

    /** Bác sĩ đã khai báo CCHN và tải lên bản scan, đang chờ Quản trị viên đối soát. */
    PENDING_VERIFICATION,

    /** Quản trị viên đã xác thực CCHN và kích hoạt bác sĩ (có thể nhận khám & đồng bộ pgvector). */
    APPROVED,

    /** Quản trị viên từ chối cấp phép do CCHN không hợp lệ / mờ / sai lệch thông tin. */
    REJECTED
}
