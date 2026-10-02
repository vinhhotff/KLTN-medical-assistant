package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.dto.DocumentFileAccessDto;
import com.mediassist.dto.MedicalDocumentDto;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.User;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.MedicalDocumentAnalysisService;
import com.mediassist.service.MedicalDocumentFileAccessService;
import com.mediassist.service.PatientAccessGuard;
import com.mediassist.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.mediassist.service.MeddiesPdfGeneratorService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@Tag(name = "Multimodal Medical Document & OCR", description = "Endpoints for scanning PDF/Image lab records, extracting indicators and recommending doctors via pgvector")
public class MedicalDocumentController {

    private final MedicalDocumentAnalysisService analysisService;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final UserRepository userRepository;
    private final com.mediassist.service.SecurityRateLimiterService rateLimiterService;
    private final MeddiesPdfGeneratorService meddiesPdfGeneratorService;
    private final PatientAccessGuard patientAccessGuard;
    private final MedicalDocumentFileAccessService fileAccessService;

    public MedicalDocumentController(MedicalDocumentAnalysisService analysisService,
                                     MedicalDocumentRepository medicalDocumentRepository,
                                     UserRepository userRepository,
                                     com.mediassist.service.SecurityRateLimiterService rateLimiterService,
                                     MeddiesPdfGeneratorService meddiesPdfGeneratorService,
                                     PatientAccessGuard patientAccessGuard,
                                     MedicalDocumentFileAccessService fileAccessService) {
        this.analysisService = analysisService;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.userRepository = userRepository;
        this.rateLimiterService = rateLimiterService;
        this.meddiesPdfGeneratorService = meddiesPdfGeneratorService;
        this.patientAccessGuard = patientAccessGuard;
        this.fileAccessService = fileAccessService;
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

    private User requireCurrentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                        "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."));
    }

    /** Tài liệu y tế thuộc về bệnh nhân đã tải lên: kiểm tra quyền theo chủ sở hữu tài liệu. */
    private void assertCanAccessDocument(User actor, MedicalDocument doc, String resource) {
        UUID ownerId = doc.getUser() != null ? doc.getUser().getId() : null;
        patientAccessGuard.assertCanAccessPatient(actor.getId(), actor.getRole(), ownerId, resource);
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
    public ResponseEntity<ApiResponse<List<MedicalDocumentDto>>> getMyDocuments(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem danh sách hồ sơ y tế của bạn.");
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        List<MedicalDocumentDto> list = medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(MedicalDocumentDto::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/patient/{patientId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Bác sĩ hoặc Quản trị viên xem hồ sơ cận lâm sàng và tệp xét nghiệm đã tải lên của bệnh nhân")
    public ResponseEntity<ApiResponse<List<MedicalDocumentDto>>> getPatientDocuments(
            @PathVariable("patientId") UUID patientId,
            Authentication authentication) {
        User actor = requireCurrentUser(authentication);
        patientAccessGuard.assertCanAccessPatient(actor.getId(), actor.getRole(), patientId, "medical_documents/patient/" + patientId);
        List<MedicalDocumentDto> list = medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(patientId)
                .stream().map(MedicalDocumentDto::fromEntity).toList();
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

    @GetMapping("/{id}/analysis")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem kết quả phân tích AI và bóc tách chỉ số cận lâm sàng của tài liệu")
    public ResponseEntity<ApiResponse<DocumentAnalysisResponse>> getDocumentAnalysis(
            @PathVariable("id") UUID id,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem thông tin phân tích.");
        }

        MedicalDocument doc = medicalDocumentRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy tài liệu y tế."));

        assertCanAccessDocument(requireCurrentUser(authentication), doc, "medical_documents/" + id + "/analysis");

        DocumentAnalysisResponse resp = analysisService.getDocumentAnalysis(id);
        return ResponseEntity.ok(ApiResponse.success(resp));
    }

    @GetMapping("/{id}/signed-url")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cấp signed URL ngắn hạn (15 phút) để xem / tải tệp y tế gốc sau khi kiểm tra quyền và ghi audit")
    public ResponseEntity<ApiResponse<DocumentFileAccessDto>> getSignedFileUrl(
            @PathVariable("id") UUID id,
            @RequestParam(value = "download", defaultValue = "false") boolean download,
            Authentication authentication) {
        User actor = requireFileAccessActor(authentication);
        DocumentFileAccessDto access = fileAccessService.issueAccess(actor, id, download);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(access));
    }

    @GetMapping("/{id}/file")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem hoặc tải về tệp gốc của tài liệu y tế: tệp Supabase → 302 tới signed URL mới; tệp local → stream trực tiếp")
    public ResponseEntity<byte[]> viewOrDownloadFile(
            @PathVariable("id") UUID id,
            @RequestParam(value = "download", defaultValue = "false") boolean download,
            Authentication authentication) {
        User actor = requireFileAccessActor(authentication);
        MedicalDocument doc = fileAccessService.loadAuthorizedDocument(actor, id, "medical_documents/" + id + "/file");

        // 1. Tệp trên bucket Supabase PRIVATE → ghi audit và redirect 302 tới signed URL mới
        if (!doc.isLocalFile()) {
            DocumentFileAccessDto access = fileAccessService.issueSignedAccess(actor, doc, download);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(access.getUrl()))
                    .cacheControl(CacheControl.noStore())
                    .build();
        }

        // 2. Tệp local (fallback dev) → stream qua backend (đã kiểm tra quyền)
        byte[] fileBytes = readLocalFile(doc.getStoragePath());
        if (fileBytes == null || fileBytes.length == 0) {
            throw new AppException(HttpStatus.NOT_FOUND, StorageService.ERROR_FILE_NOT_AVAILABLE,
                    "Tệp gốc của tài liệu này không còn khả dụng trên hệ thống lưu trữ.");
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (doc.getContentType() != null && !doc.getContentType().isBlank()) {
            try {
                mediaType = MediaType.parseMediaType(doc.getContentType());
            } catch (Exception ignored) {}
        }

        String safeName = doc.getFileName() != null ? doc.getFileName().replaceAll("[\"\r\n]", "_") : "document";
        String disposition = (download ? "attachment" : "inline") + "; filename=\"" + safeName + "\"";

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .body(fileBytes);
    }

    private User requireFileAccessActor(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem tệp tài liệu.");
        }
        if (rateLimiterService != null && !rateLimiterService.allowDocumentFileAccess(authentication.getName())) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                    "Bạn đã mở tệp y tế quá nhiều lần trong thời gian ngắn. Vui lòng chờ 1 phút rồi thử lại.");
        }
        return requireCurrentUser(authentication);
    }

    private byte[] readLocalFile(String storagePath) {
        try {
            Path localPath = Paths.get(storagePath.substring(1)).toAbsolutePath().normalize();
            Path baseUploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (localPath.startsWith(baseUploadDir) && Files.exists(localPath)) {
                return Files.readAllBytes(localPath);
            }
        } catch (Exception ignored) {}
        return null;
    }
}
