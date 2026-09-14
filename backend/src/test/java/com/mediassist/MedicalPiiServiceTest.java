package com.mediassist;

import com.mediassist.dto.DeidentificationResult;
import com.mediassist.dto.PiiEntityDto;
import com.mediassist.dto.PiiType;
import com.mediassist.service.MedicalPiiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MedicalPiiServiceTest {

    private MedicalPiiService piiService;

    @BeforeEach
    void setUp() {
        piiService = new MedicalPiiService();
    }

    @Test
    @DisplayName("Should detect and mask patient names, CCCD, BHYT, phone, address, and DOB in hospital lab report")
    void testDeidentifyComprehensiveLabReport() {
        String labReport = """
                BỆNH VIỆN BẠCH MAI
                Khoa Huyết Học
                Họ và tên: Nguyễn Văn Bình
                Ngày sinh: 15/08/1982
                Giới tính: Nam
                CCCD: 079201008123
                BHYT: DN4791234567890
                SĐT: 0987123456
                Địa chỉ: Số 12 Đường Giải Phóng, P.Đồng Tâm, Q.Hai Bà Trưng, Hà Nội
                Mã BN: BN2408001
                Glucose: 5.4 mmol/L (3.9 - 6.4)
                WBC: 12.5 G/L (4.0 - 10.0)
                """;

        DeidentificationResult result = piiService.maskPii(labReport);

        assertNotNull(result);
        assertTrue(result.isPiiProtected());
        assertTrue(result.getPiiEntitiesCount() >= 6, "Expected at least 6 PII entities detected");

        String masked = result.getMaskedText();
        assertFalse(masked.contains("Nguyễn Văn Bình"), "Real patient name must NOT be present in masked text");
        assertFalse(masked.contains("079201008123"), "CCCD must NOT be present in masked text");
        assertFalse(masked.contains("0987123456"), "Phone number must NOT be present in masked text");
        assertFalse(masked.contains("DN4791234567890"), "BHYT must NOT be present in masked text");
        assertFalse(masked.contains("15/08/1982"), "DOB must NOT be present in masked text");

        assertTrue(masked.contains("[BỆNH_NHÂN_1]"), "Expected [BỆNH_NHÂN_1] token");
        assertTrue(masked.contains("[SỐ_ĐỊNH_DANH_1]"), "Expected [SỐ_ĐỊNH_DANH_1] token");
        assertTrue(masked.contains("[SĐT_1]"), "Expected [SĐT_1] token");
        assertTrue(masked.contains("[NGÀY_SINH_1]"), "Expected [NGÀY_SINH_1] token");

        // Medical values MUST remain intact
        assertTrue(masked.contains("Glucose: 5.4 mmol/L"));
        assertTrue(masked.contains("WBC: 12.5 G/L"));

        // Meddies-PII Tagged Format check
        String meddies = result.getMeddiesTaggedText();
        assertTrue(meddies.contains("[Nguyễn Văn Bình]<human_name>"), "Should contain Meddies-PII human_name tag");
        assertTrue(meddies.contains("[0987123456]<phone_number>"), "Should contain Meddies-PII phone_number tag");
        assertTrue(meddies.contains("[15/08/1982]<date>"), "Should contain Meddies-PII date tag");
    }

    @Test
    @DisplayName("Should detect and mask self-disclosed PII in patient triage symptom input")
    void testDeidentifyTriageInput() {
        String triageInput = "Tôi là Trần Thị Mai, số điện thoại 0903123456, ở 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM. Bác sĩ ơi tôi bị đau đầu dữ dội từ sáng.";

        DeidentificationResult result = piiService.maskPii(triageInput);

        assertNotNull(result);
        assertTrue(result.isPiiProtected());
        String masked = result.getMaskedText();

        assertFalse(masked.contains("Trần Thị Mai"));
        assertFalse(masked.contains("0903123456"));
        assertTrue(masked.contains("[BỆNH_NHÂN_1]"));
        assertTrue(masked.contains("[SĐT_1]"));
        assertTrue(masked.contains("[ĐỊA_CHỈ_1]"));
        assertTrue(masked.contains("đau đầu dữ dội từ sáng"));
    }

    @Test
    @DisplayName("Should accurately unmask tokens back to original values in AI response")
    void testReidentifyAiResponse() {
        String triageInput = "Tôi là Lê Văn Cường, SĐT 0912345678, bị sốt 39 độ.";
        DeidentificationResult result = piiService.maskPii(triageInput);

        String mockAiResponse = "Chào [BỆNH_NHÂN_1], hệ thống ghi nhận bạn có số điện thoại [SĐT_1] đang bị sốt cao 39 độ. Vui lòng uống nhiều nước và hạ sốt.";
        String restored = result.reidentify(mockAiResponse);

        assertTrue(restored.contains("Chào Lê Văn Cường"));
        assertTrue(restored.contains("0912345678"));
        assertFalse(restored.contains("[BỆNH_NHÂN_1]"));
        assertFalse(restored.contains("[SĐT_1]"));
    }

    @Test
    @DisplayName("Should not produce false positives on medical test results and hospital names")
    void testNoFalsePositivesOnClinicalData() {
        String cleanClinicalText = """
                BỆNH VIỆN ĐẠI HỌC Y DƯỢC TP.HCM
                Khoa Hóa Sinh Lâm Sàng
                Chỉ số xét nghiệm:
                Glucose: 5.2 mmol/L (3.9 - 6.4)
                Ure: 4.8 mmol/L (2.5 - 7.5)
                Creatinine: 78.0 umol/L (44.0 - 88.0)
                AST (SGOT): 25 U/L (< 35)
                ALT (SGPT): 22 U/L (< 35)
                Bác sĩ điều trị: TS.BS Nguyễn Văn An
                """;

        DeidentificationResult result = piiService.maskPii(cleanClinicalText);

        assertNotNull(result);
        // No patient name or patient IDs were in the text (ordering doctor is treated as clinician, not patient PII)
        String masked = result.getMaskedText();
        assertTrue(masked.contains("Glucose: 5.2 mmol/L"));
        assertTrue(masked.contains("Creatinine: 78.0 umol/L"));
        assertTrue(masked.contains("BỆNH VIỆN ĐẠI HỌC Y DƯỢC TP.HCM"));
    }
}
