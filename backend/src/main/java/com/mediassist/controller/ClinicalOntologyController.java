package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.clinical.Icd10DiagnosisDto;
import com.mediassist.dto.clinical.LabIndicatorDto;
import com.mediassist.service.ClinicalOntologyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clinical/ontology")
@Tag(name = "Clinical Ontology & Medical Standards", description = "Endpoints cung cấp bản thể luận y khoa chuẩn WHO ICD-10 và LOINC / QĐ 3280/QĐ-BYT Bộ Y Tế")
public class ClinicalOntologyController {

    private final ClinicalOntologyService clinicalOntologyService;

    public ClinicalOntologyController(ClinicalOntologyService clinicalOntologyService) {
        this.clinicalOntologyService = clinicalOntologyService;
    }

    @GetMapping("/icd10")
    @Operation(summary = "Tra cứu danh mục mã bệnh chẩn đoán chuẩn WHO ICD-10 và Bộ Y Tế Việt Nam")
    public ResponseEntity<ApiResponse<List<Icd10DiagnosisDto>>> searchIcd10(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "specialty", required = false) String specialty) {
        List<Icd10DiagnosisDto> results = clinicalOntologyService.searchIcd10(query, specialty);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/icd10/{code}")
    @Operation(summary = "Lấy chi tiết mã chẩn đoán ICD-10 theo mã bệnh")
    public ResponseEntity<ApiResponse<Icd10DiagnosisDto>> getIcd10ByCode(@PathVariable("code") String code) {
        return clinicalOntologyService.getIcd10ByCode(code)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/lab-indicators")
    @Operation(summary = "Tra cứu danh mục chỉ số cận lâm sàng Hóa sinh chuẩn mã LOINC và khoảng tham chiếu Bộ Y Tế")
    public ResponseEntity<ApiResponse<List<LabIndicatorDto>>> searchLabIndicators(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "specialty", required = false) String specialty) {
        List<LabIndicatorDto> results = clinicalOntologyService.searchLabIndicators(query, specialty);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/lab-indicators/{loincCode}")
    @Operation(summary = "Lấy chi tiết chỉ số xét nghiệm theo mã quốc tế LOINC")
    public ResponseEntity<ApiResponse<LabIndicatorDto>> getLabIndicatorByLoinc(@PathVariable("loincCode") String loincCode) {
        return clinicalOntologyService.getLabIndicatorByLoinc(loincCode)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
