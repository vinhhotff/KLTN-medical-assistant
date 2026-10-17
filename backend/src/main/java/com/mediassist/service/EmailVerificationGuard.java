package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import org.springframework.http.HttpStatus;

/**
 * Rao chan dung chung o tang service: benh nhan chua xac thuc email khong duoc dat/doi lich hay thanh toan.
 * Ly do: email la kenh duy nhat de gui xac nhan lich hen, bien nhan, thong bao huy va khoi phuc tai khoan;
 * email sai/khong so huu => benh nhan khong nhan duoc thong tin, con chu email that nhan du lieu cua nguoi khac.
 * Chi ap dung cho PATIENT; bac si/quan tri vien khong bi chan.
 */
public final class EmailVerificationGuard {

    public static final String ERROR_CODE = "EMAIL_NOT_VERIFIED";
    public static final String MESSAGE =
            "Vui lòng xác thực email trước khi đặt lịch khám hoặc thanh toán. Kiểm tra hộp thư của bạn hoặc bấm \"Gửi lại email xác thực\".";

    private EmailVerificationGuard() {}

    public static void requireVerifiedPatient(User user) {
        if (user != null && user.getRole() == Role.PATIENT && !user.isEmailVerified()) {
            throw new AppException(HttpStatus.FORBIDDEN, ERROR_CODE, MESSAGE);
        }
    }
}
