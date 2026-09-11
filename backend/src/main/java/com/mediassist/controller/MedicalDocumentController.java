package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.User;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.MedicalDocumentAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@Tag(name = "Multimodal Medical Document & OCR", description = "Endpoints for scanning PDF/Image lab records, extracting indicators and recommending doctors via pgvector")
public class MedicalDocumentController {

    private final MedicalDocumentAnalysisService analysisService;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final UserRepository userRepository;

    public MedicalDocumentController(MedicalDocumentAnalysisService analysisService,
                                     MedicalDocumentRepository medicalDocumentRepository,
                                     UserRepository userRepository) {
        this.analysisService = analysisService;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and analyze medical document (PDF/Image), extract lab indicators and recommend doctors via pgvector")
    public ResponseEntity<ApiResponse<DocumentAnalysisResponse>> analyzeDocument(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Vui lòng chọn tệp tài liệu y tế (PDF hoặc ảnh) để phân tích.");
        }

        if (file.getSize() > 15 * 1024 * 1024) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "Dung lượng tệp tối đa cho phép là 15MB.");
        }

        String userEmail = authentication != null ? authentication.getName() : null;
        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, userEmail);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my")
    @Operation(summary = "Get list of medical documents uploaded by current patient")
    public ResponseEntity<ApiResponse<List<MedicalDocument>>> getMyDocuments(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        List<MedicalDocument> list = medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
