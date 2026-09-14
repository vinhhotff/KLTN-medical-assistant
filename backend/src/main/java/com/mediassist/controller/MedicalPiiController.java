package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.DeidentificationResult;
import com.mediassist.dto.DeidentifyTextRequest;
import com.mediassist.service.MedicalPiiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pii")
@Tag(name = "Medical PII Privacy Shield", description = "Endpoints for de-identifying sensitive health data conforming to Decree 13/2023/ND-CP & HIPAA (Meddies-PII schema)")
public class MedicalPiiController {

    private final MedicalPiiService medicalPiiService;

    public MedicalPiiController(MedicalPiiService medicalPiiService) {
        this.medicalPiiService = medicalPiiService;
    }

    @PostMapping("/deidentify")
    @Operation(summary = "De-identify medical text and produce Meddies-PII tagged research format (Decree 13/2023/ND-CP & HIPAA)")
    public ResponseEntity<ApiResponse<DeidentificationResult>> deidentifyText(
            @Valid @RequestBody DeidentifyTextRequest request) {
        DeidentificationResult result = medicalPiiService.maskPii(request.getText());
        return ResponseEntity.ok(ApiResponse.success(result, "Khử định danh dữ liệu y tế thành công theo Nghị định 13/2023/NĐ-CP & HIPAA"));
    }
}
