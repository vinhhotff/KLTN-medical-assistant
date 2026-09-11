package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.service.MedicalDocumentValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

class MedicalDocumentValidatorTest {

    private MedicalDocumentValidator validator;

    @BeforeEach
    void setUp() {
        validator = new MedicalDocumentValidator();
    }

    @Test
    @DisplayName("Should reject empty or corrupted binary files")
    void testEmptyFileThrowsException() {
        byte[] emptyBytes = new byte[3];
        AppException ex = assertThrows(AppException.class, () ->
                validator.validateDocument(emptyBytes, "application/pdf", "", "empty.pdf")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("UNREADABLE_DOCUMENT", ex.getCode());
    }

    @Test
    @DisplayName("Should reject unsupported binary formats (e.g. executables or random binaries)")
    void testUnsupportedFormatThrowsException() {
        byte[] exeBytes = new byte[]{0x4D, 0x5A, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, (byte) 0x88};
        AppException ex = assertThrows(AppException.class, () ->
                validator.validateDocument(exeBytes, "application/x-msdownload", "Some text here and there", "malware.exe")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("UNSUPPORTED_FORMAT", ex.getCode());
    }

    @Test
    @DisplayName("Should reject blurry/unreadable images with less than 15 extracted characters")
    void testBlurryOrShortTextThrowsException() {
        byte[] dummyPdf = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0x25};
        AppException ex = assertThrows(AppException.class, () ->
                validator.validateDocument(dummyPdf, "application/pdf", "123", "a.pdf")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("UNREADABLE_DOCUMENT", ex.getCode());
    }

    @Test
    @DisplayName("Should reject non-medical documents (e.g. supermarket receipt, funny cat meme)")
    void testNonMedicalDocumentThrowsException() {
        byte[] dummyPdf = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0x25};
        String groceryReceipt = "HÓA ĐƠN SIÊU THỊ WINMART - Mua 2 chai nước tương, 1 gói bột giặt OMO, 3 bịch sữa chua";

        AppException ex = assertThrows(AppException.class, () ->
                validator.validateDocument(dummyPdf, "application/pdf", groceryReceipt, "hoa_don.pdf")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("NON_MEDICAL_DOCUMENT", ex.getCode());
    }

    @Test
    @DisplayName("Should pass gatekeeper validation when clinical lab indicators are present")
    void testValidMedicalDocumentPasses() {
        byte[] dummyPdf = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0x25};
        String labReport = "KHOA XÉT NGHIỆM - PHIẾU KẾT QUẢ XÉT NGHIỆM SINH HÓA. Glucose: 6.8 mmol/L, Cholesterol: 5.5 mmol/L";

        assertDoesNotThrow(() ->
                validator.validateDocument(dummyPdf, "application/pdf", labReport, "ket_qua_xet_nghiem.pdf")
        );
    }
}
