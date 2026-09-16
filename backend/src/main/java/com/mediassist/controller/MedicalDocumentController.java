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
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.mediassist.service.MeddiesPdfGeneratorService;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@Tag(name = "Multimodal Medical Document & OCR", description = "Endpoints for scanning PDF/Image lab records, extracting indicators and recommending doctors via pgvector")
public class MedicalDocumentController {

    private final MedicalDocumentAnalysisService analysisService;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final UserRepository userRepository;
    private final com.mediassist.service.SecurityRateLimiterService rateLimiterService;
    private final MeddiesPdfGeneratorService meddiesPdfGeneratorService;

    public MedicalDocumentController(MedicalDocumentAnalysisService analysisService,
                                     MedicalDocumentRepository medicalDocumentRepository,
                                     UserRepository userRepository,
                                     com.mediassist.service.SecurityRateLimiterService rateLimiterService,
                                     MeddiesPdfGeneratorService meddiesPdfGeneratorService) {
        this.analysisService = analysisService;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.userRepository = userRepository;
        this.rateLimiterService = rateLimiterService;
        this.meddiesPdfGeneratorService = meddiesPdfGeneratorService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and analyze medical document(s) (PDF/Image), extract lab indicators and recommend doctors via pgvector")
    public ResponseEntity<ApiResponse<DocumentAnalysisResponse>> analyzeDocument(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                    "Vui lòng đăng nhập tài khoản bệnh nhân trước khi tải lên và phân tích hồ sơ xét nghiệm.");
        }

        String userEmail = authentication.getName();
        List<MultipartFile> resolvedFiles = resolveFiles(file, files);
        validateBatchConstraints(resolvedFiles);

        if (rateLimiterService != null && rateLimiterService.isUploadPenalized(userEmail)) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "UPLOAD_COOLDOWN_ACTIVE",
                    "Tài khoản tạm thời bị khóa tính năng tải tệp trong 10 phút do gửi nhiều tệp không hợp lệ liên tiếp. Vui lòng thử lại sau.");
        }

        if (rateLimiterService != null && !rateLimiterService.allowDocumentUpload(userEmail)) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều yêu cầu phân tích hồ sơ trong thời gian ngắn. Vui lòng chờ 1 phút trước khi tải tệp tiếp theo.");
        }

        DocumentAnalysisResponse response = analysisService.analyzeDocuments(resolvedFiles, userEmail);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(value = "/analyze-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Kiểm thử và bóc tách tức thì hồ sơ y tế không cần đăng nhập (Preview cho Trang chủ & Thử nghiệm)")
    public ResponseEntity<ApiResponse<DocumentAnalysisResponse>> analyzeDocumentPreview(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            jakarta.servlet.http.HttpServletRequest request) {

        String clientIp = extractClientIp(request);
        if (rateLimiterService != null && !rateLimiterService.allowPreviewUpload(clientIp)) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "PREVIEW_RATE_LIMIT_EXCEEDED",
                    "Bạn đã đạt giới hạn 3 lần phân tích xem trước miễn phí trong 10 phút. Vui lòng đăng nhập hoặc tạo tài khoản để tiếp tục sử dụng.");
        }

        List<MultipartFile> resolvedFiles = resolveFiles(file, files);
        validateBatchConstraints(resolvedFiles);

        DocumentAnalysisResponse response = analysisService.analyzeDocumentsPreview(resolvedFiles);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private void validateBatchConstraints(List<MultipartFile> resolvedFiles) {
        if (resolvedFiles == null || resolvedFiles.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Vui lòng chọn ít nhất một tệp tài liệu y tế (PDF hoặc ảnh) để phân tích.");
        }

        if (resolvedFiles.size() > 5) {
            throw new AppException(HttpStatus.BAD_REQUEST, "TOO_MANY_FILES",
                    "Hệ thống hỗ trợ tải lên tối đa 5 tệp tài liệu trong một lần phân tích.");
        }

        long totalSize = 0;
        for (MultipartFile f : resolvedFiles) {
            if (f.getSize() > 10 * 1024 * 1024) {
                throw new AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE",
                        String.format("Tệp '%s' có dung lượng vượt quá giới hạn an toàn 10MB.", f.getOriginalFilename()));
            }
            totalSize += f.getSize();
        }

        if (totalSize > 25 * 1024 * 1024) {
            throw new AppException(HttpStatus.BAD_REQUEST, "TOTAL_SIZE_TOO_LARGE",
                    "Tổng dung lượng các tệp tải lên vượt quá giới hạn an toàn 25MB.");
        }
    }

    private List<MultipartFile> resolveFiles(MultipartFile file, List<MultipartFile> files) {
        List<MultipartFile> result = new java.util.ArrayList<>();
        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    result.add(f);
                }
            }
        }
        if (result.isEmpty() && file != null && !file.isEmpty()) {
            result.add(file);
        }
        return result;
    }

    private String extractClientIp(jakarta.servlet.http.HttpServletRequest request) {
        if (request == null) return "unknown";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    @GetMapping("/my")
    @Operation(summary = "Get list of medical documents uploaded by current patient")
    public ResponseEntity<ApiResponse<List<MedicalDocument>>> getMyDocuments(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem danh sách hồ sơ y tế của bạn.");
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        List<MedicalDocument> list = medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/patient/{patientId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Bác sĩ hoặc Quản trị viên xem hồ sơ cận lâm sàng và tệp xét nghiệm đã tải lên của bệnh nhân")
    public ResponseEntity<ApiResponse<List<MedicalDocument>>> getPatientDocuments(@PathVariable("patientId") java.util.UUID patientId) {
        List<MedicalDocument> list = medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(patientId);
        if (list == null) {
            list = Collections.emptyList();
        }
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/quota")
    @Operation(summary = "Lấy thông tin hạn ngạch phân tích tài liệu và gói hội viên của người dùng hiện tại")
    public ResponseEntity<ApiResponse<com.mediassist.dto.UserQuotaDto>> getUserQuota(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để kiểm tra hạn ngạch phân tích.");
        }
        com.mediassist.dto.UserQuotaDto quotaDto = analysisService.getUserQuota(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(quotaDto));
    }

    @PostMapping("/quota/purchase")
    @Operation(summary = "Nạp lượt quét hoặc đăng ký gói VIP hội viên (Sandbox / VietQR)")
    public ResponseEntity<ApiResponse<com.mediassist.dto.UserQuotaDto>> purchaseQuota(
            @Valid @RequestBody com.mediassist.dto.PurchaseQuotaRequest request,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để nâng cấp gói dịch vụ.");
        }
        com.mediassist.dto.UserQuotaDto quotaDto = analysisService.purchaseQuota(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(quotaDto));
    }

    @GetMapping(value = "/sample-random-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Lấy và tải về tệp PDF phiếu xét nghiệm ngẫu nhiên từ kho 150.000 hồ sơ Meddies Persona VIE")
    public ResponseEntity<byte[]> downloadSampleRandomPdf(jakarta.servlet.http.HttpServletRequest request) {
        String clientIp = extractClientIp(request);
        if (rateLimiterService != null && !rateLimiterService.allowSamplePdfDownload(clientIp)) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                    "Bạn đã yêu cầu tạo quá nhiều tệp PDF mẫu trong thời gian ngắn. Vui lòng chờ 1 phút trước khi tải lại.");
        }

        MeddiesPdfGeneratorService.GeneratedPdfResult result = meddiesPdfGeneratorService.generateRandomMeddiesPdf();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.getFileName() + "\"")
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .body(result.getPdfBytes());
    }
}
