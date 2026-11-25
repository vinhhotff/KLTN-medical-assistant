package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.User;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.StorageService;
import com.mediassist.service.StorageService.FileUploadResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/storage")
@Tag(name = "Cloud Storage & Media Upload", description = "Quản lý upload hình ảnh, avatar bác sĩ/bệnh nhân và chứng chỉ CCHN lên Supabase Cloud Storage")
public class StorageController {

    private static final Logger log = LoggerFactory.getLogger(StorageController.class);

    private static final long MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );
    private static final List<String> ALLOWED_DOC_TYPES = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"
    );
    private static final Set<String> PUBLIC_LOCAL_FOLDERS = Set.of("avatars", "licenses", "general", "consultations");
    private static final String LOCAL_UPLOADS_PREFIX = "/uploads/";
    private static final String API_FILES_PREFIX = "/api/v1/storage/files/";

    private final StorageService storageService;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;

    public StorageController(StorageService storageService,
                             UserRepository userRepository,
                             DoctorProfileRepository doctorProfileRepository) {
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload tệp hoặc hình ảnh lên Supabase Cloud Storage",
            description = "Hỗ trợ category: avatar, license, medical_document, general. Trả về public URL trực tiếp.")
    public ResponseEntity<ApiResponse<FileUploadResult>> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "general") String category) {

        validateFile(file, category);

        try {
            String folder = resolveFolder(category);
            FileUploadResult result = normalizeResultUrl(storageService.uploadFile(
                    file.getBytes(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    folder,
                    principal != null ? principal.getId() : null
            ));
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Lỗi khi xử lý upload tệp: {}", e.getMessage(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "UPLOAD_FAILED", "Không thể tải tệp lên: " + e.getMessage());
        }
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Upload ảnh đại diện (Avatar) cho Bác sĩ hoặc Bệnh nhân",
            description = "Tải ảnh chân dung lên Supabase Storage và tự động cập nhật avatarUrl vào tài khoản người dùng.")
    public ResponseEntity<ApiResponse<FileUploadResult>> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {

        if (principal == null) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để thực hiện.");
        }

        validateImageFile(file);

        try {
            FileUploadResult result = normalizeResultUrl(storageService.uploadFile(
                    file.getBytes(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    "avatars",
                    principal.getId()
            ));

            // Cập nhật avatarUrl vào User entity
            User user = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng."));
            user.setAvatarUrl(result.url());
            userRepository.save(user);

            log.info("👤 Avatar updated successfully for user {}: {}", principal.getId(), result.url());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Lỗi khi cập nhật avatar: {}", e.getMessage(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "AVATAR_UPLOAD_FAILED", "Không thể tải ảnh đại diện lên: " + e.getMessage());
        }
    }

    @PostMapping(value = "/doctor/license", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional
    @Operation(summary = "Bác sĩ upload bản scan / ảnh chụp Chứng chỉ hành nghề (CCHN)",
            description = "Tải tài liệu CCHN (PDF hoặc ảnh) lên Supabase Storage và tự động cập nhật licenseDocumentUrl.")
    public ResponseEntity<ApiResponse<FileUploadResult>> uploadDoctorLicense(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {

        if (principal == null) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập.");
        }

        validateDocumentFile(file);

        try {
            FileUploadResult result = normalizeResultUrl(storageService.uploadFile(
                    file.getBytes(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    "licenses",
                    principal.getId()
            ));

            // Cập nhật licenseDocumentUrl vào DoctorProfile
            DoctorProfile doctorProfile = doctorProfileRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "DOCTOR_NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ."));
            doctorProfile.setLicenseDocumentUrl(result.url());
            doctorProfileRepository.save(doctorProfile);

            log.info("📜 Doctor license document updated for user {}: {}", principal.getId(), result.url());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Lỗi khi upload bằng cấp / CCHN bác sĩ: {}", e.getMessage(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "LICENSE_UPLOAD_FAILED", "Không thể tải tài liệu CCHN lên: " + e.getMessage());
        }
    }

    @GetMapping("/files/{folder}/{owner}/{filename}")
    @Operation(summary = "Phục vụ tệp fallback cục bộ cho avatars/licenses khi Supabase chưa cấu hình")
    public ResponseEntity<Resource> serveLocalFile(
            @PathVariable("folder") String folder,
            @PathVariable("owner") String owner,
            @PathVariable("filename") String filename) {

        if (!PUBLIC_LOCAL_FOLDERS.contains(folder) || isUnsafeSegment(owner) || isUnsafeSegment(filename)) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Không tìm thấy tệp.");
        }

        try {
            Path baseDir = Paths.get("uploads", folder).toAbsolutePath().normalize();
            Path targetPath = baseDir.resolve(owner).resolve(filename).normalize();
            if (!targetPath.startsWith(baseDir) || !Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
                throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Tệp không tồn tại.");
            }

            Resource resource = new UrlResource(targetPath.toUri());
            String detectedType = Files.probeContentType(targetPath);
            MediaType mediaType = detectedType != null
                    ? MediaType.parseMediaType(detectedType)
                    : resolveMediaTypeByExtension(filename);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .body(resource);
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Không thể đọc tệp.");
        }
    }

    public static void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY", "Tệp hình ảnh không được để trống.");
        }
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "Kích thước ảnh không được vượt quá 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE",
                    "Định dạng hình ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP, GIF.");
        }
    }

    public static void validateDocumentFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY", "Tệp tải lên không được để trống.");
        }
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "Kích thước tệp không được vượt quá 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_DOC_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE",
                    "Định dạng tệp không hợp lệ. Chỉ chấp nhận PDF hoặc hình ảnh (JPG, PNG, WEBP).");
        }
    }

    public static FileUploadResult normalizeResultUrl(FileUploadResult result) {
        if (result == null) return null;
        String accessibleUrl = toAccessibleUrl(result.url());
        if (accessibleUrl.equals(result.url())) {
            return result;
        }
        return new FileUploadResult(accessibleUrl, result.storagePath(), result.fileName(),
                result.fileSizeBytes(), result.contentType());
    }

    public static String toAccessibleUrl(String rawUrl) {
        if (rawUrl == null) return null;
        if (rawUrl.startsWith(LOCAL_UPLOADS_PREFIX)) {
            return API_FILES_PREFIX + rawUrl.substring(LOCAL_UPLOADS_PREFIX.length());
        }
        return rawUrl;
    }

    private void validateFile(MultipartFile file, String category) {
        if ("avatar".equalsIgnoreCase(category) || "avatars".equalsIgnoreCase(category)) {
            validateImageFile(file);
        } else {
            validateDocumentFile(file);
        }
    }

    private String resolveFolder(String category) {
        if (category == null || category.isBlank()) return "general";
        String lower = category.toLowerCase(Locale.ROOT);
        if (lower.contains("avatar")) return "avatars";
        if (lower.contains("license") || lower.contains("cchn")) return "licenses";
        if (lower.contains("consultation") || lower.contains("chat")) return "consultations";
        if (lower.contains("document") || lower.contains("patient")) return "medical_documents";
        return "general";
    }

    private static boolean isUnsafeSegment(String segment) {
        return segment == null || segment.isBlank()
                || segment.contains("..") || segment.contains("/") || segment.contains("\\");
    }

    private static MediaType resolveMediaTypeByExtension(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.valueOf("image/webp");
        if (lower.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
