package com.mediassist.service;

import com.mediassist.common.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Lưu trữ tệp y tế trên Supabase Storage bucket PRIVATE.
 * - Upload trả về object key (không phải URL công khai).
 * - Xem / tải tệp chỉ qua signed URL ngắn hạn (mặc định 900 giây), cấp sau khi đã kiểm tra quyền.
 * - Supabase lỗi khi upload → fallback lưu local "/uploads/..." (môi trường dev).
 */
@Service
public class SupabaseStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    /** HTTP client tối giản, inject được để unit test không cần mạng. */
    @FunctionalInterface
    interface HttpTransport {
        HttpResult send(String method, String url, Map<String, String> headers, byte[] body) throws Exception;
    }

    record HttpResult(int status, String body) {}

    private final String supabaseUrl;
    private final String supabaseKey;
    private final String supabaseBucket;
    private final boolean supabaseEnabled;
    private final int signedUrlTtlSeconds;
    private final HttpTransport transport;

    @Autowired
    public SupabaseStorageService(@Value("${supabase.url:https://your-project.supabase.co}") String supabaseUrl,
                                  @Value("${supabase.key:}") String supabaseKey,
                                  @Value("${supabase.bucket:medical-documents}") String supabaseBucket,
                                  @Value("${supabase.enabled:false}") boolean supabaseEnabled,
                                  @Value("${app.storage.signed-url-ttl-seconds:900}") int signedUrlTtlSeconds) {
        this(supabaseUrl, supabaseKey, supabaseBucket, supabaseEnabled, signedUrlTtlSeconds, defaultTransport());
    }

    SupabaseStorageService(String supabaseUrl, String supabaseKey, String supabaseBucket, boolean supabaseEnabled,
                           int signedUrlTtlSeconds, HttpTransport transport) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.supabaseBucket = supabaseBucket;
        this.supabaseEnabled = supabaseEnabled;
        this.signedUrlTtlSeconds = signedUrlTtlSeconds > 0 ? signedUrlTtlSeconds : 900;
        this.transport = transport;
    }

    private static HttpTransport defaultTransport() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        return (method, url, headers, body) -> {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(10));
            headers.forEach(builder::header);
            HttpRequest.BodyPublisher publisher = body != null
                    ? HttpRequest.BodyPublishers.ofByteArray(body)
                    : HttpRequest.BodyPublishers.noBody();
            builder.method(method, publisher);
            HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new HttpResult(response.statusCode(), response.body());
        };
    }

    boolean isSupabaseConfigured() {
        return supabaseEnabled && supabaseKey != null && !supabaseKey.isBlank() && !supabaseKey.contains("mock");
    }

    private Map<String, String> authHeaders(String contentType) {
        if (contentType == null) {
            return Map.of("Authorization", "Bearer " + supabaseKey, "apikey", supabaseKey);
        }
        return Map.of("Authorization", "Bearer " + supabaseKey, "apikey", supabaseKey, "Content-Type", contentType);
    }

    @Override
    public int getSignedUrlTtlSeconds() {
        return signedUrlTtlSeconds;
    }

    /** Cảnh báo sớm nếu bucket đang để Public (ai có link cũng tải được tệp y tế). */
    @EventListener(ApplicationReadyEvent.class)
    public void verifyBucketIsPrivate() {
        if (!isSupabaseConfigured()) {
            log.info("ℹ️ Supabase Storage chưa cấu hình (SUPABASE_KEY rỗng hoặc supabase.enabled=false) → tệp y tế lưu local '/uploads/'.");
            return;
        }
        try {
            HttpResult result = transport.send("GET", SupabaseStorageUrls.bucketEndpoint(supabaseUrl, supabaseBucket),
                    authHeaders(null), null);
            if (result.status() == 200) {
                Boolean isPublic = SupabaseStorageUrls.parseBucketPublic(result.body());
                if (Boolean.TRUE.equals(isPublic)) {
                    log.warn("🚨 [SECURITY] Supabase bucket '{}' đang ở chế độ PUBLIC: bất kỳ ai có link đều tải được tệp y tế! "
                            + "Vào Supabase Dashboard → Storage → bucket '{}' → Edit bucket → TẮT 'Public bucket'.", supabaseBucket, supabaseBucket);
                } else if (Boolean.FALSE.equals(isPublic)) {
                    log.info("🔒 Supabase bucket '{}' là PRIVATE. Tệp y tế chỉ truy cập qua signed URL {} giây.", supabaseBucket, signedUrlTtlSeconds);
                }
            } else {
                log.warn("⚠️ Không kiểm tra được trạng thái bucket '{}' (HTTP {}).", supabaseBucket, result.status());
            }
        } catch (Exception e) {
            log.warn("⚠️ Không kiểm tra được trạng thái bucket '{}': {}", supabaseBucket, e.getMessage());
        }
    }

    @Override
    public String uploadDocument(byte[] fileBytes, String fileName, String contentType, UUID userId) {
        String sanitizedName = fileName != null ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_") : "doc.pdf";
        String userPrefix = userId != null ? userId.toString() : "anonymous";
        String objectKey = "patients/" + userPrefix + "/" + UUID.randomUUID().toString().substring(0, 8) + "_" + sanitizedName;

        // 1. Attempt upload to private Supabase bucket if configured and enabled
        if (isSupabaseConfigured()) {
            try {
                HttpResult result = transport.send("POST",
                        SupabaseStorageUrls.uploadEndpoint(supabaseUrl, supabaseBucket, objectKey),
                        authHeaders(contentType != null ? contentType : "application/octet-stream"),
                        fileBytes);
                if (result.status() == 200 || result.status() == 201) {
                    log.info("✅ Document stored in private Supabase bucket '{}'", supabaseBucket);
                    return objectKey;
                }
                log.warn("⚠️ Supabase Storage returned HTTP {}: {}. Falling back to resilient local storage.", result.status(), result.body());
                if (result.status() == 400 || result.status() == 404) {
                    log.warn("💡 HƯỚNG DẪN TECH LEAD: Hãy tạo bucket '{}' trên Supabase Dashboard (Storage → New bucket → Tên: '{}' → "
                            + "TẮT 'Public bucket' (bucket PRIVATE) → Save). Tệp y tế chỉ được xem qua signed URL ngắn hạn.", supabaseBucket, supabaseBucket);
                }
            } catch (Exception e) {
                log.warn("⚠️ Supabase upload encountered transient error ({}). Triggering zero-crash local storage fallback.", e.getMessage());
            }
        }

        // 2. Resilient Local Storage Fallback (Zero-Crash Guarantee)
        return saveToLocalStorage(fileBytes, userPrefix, sanitizedName);
    }

    private String saveToLocalStorage(byte[] fileBytes, String userPrefix, String sanitizedName) {
        try {
            Path uploadDir = Paths.get("uploads", "medical_documents", userPrefix);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String uniqueFileName = UUID.randomUUID().toString().substring(0, 8) + "_" + sanitizedName;
            Path filePath = uploadDir.resolve(uniqueFileName);
            Files.write(filePath, fileBytes);

            String localPath = "/uploads/medical_documents/" + userPrefix + "/" + uniqueFileName;
            log.info("💾 Document securely saved to resilient local EMR storage: {}", localPath);
            return localPath;
        } catch (Exception e) {
            // Không trả đường dẫn giả: tài liệu sẽ được đánh dấu hasFile=false
            log.error("❌ Failed to save document to local storage: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public SignedUrl createSignedUrl(String objectKey, boolean download, String downloadFileName) {
        if (objectKey == null || objectKey.isBlank() || objectKey.startsWith("/uploads/")) {
            throw fileNotAvailable();
        }
        if (!isSupabaseConfigured()) {
            log.warn("⚠️ Yêu cầu signed URL cho object Supabase nhưng SUPABASE_KEY rỗng hoặc supabase.enabled=false.");
            throw storageUnavailable();
        }

        String key = SupabaseStorageUrls.toObjectKey(objectKey, supabaseBucket);
        HttpResult result;
        try {
            result = transport.send("POST",
                    SupabaseStorageUrls.signEndpoint(supabaseUrl, supabaseBucket, key),
                    authHeaders("application/json"),
                    SupabaseStorageUrls.signRequestBody(signedUrlTtlSeconds).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("⚠️ Supabase sign request failed: {}", e.getClass().getSimpleName());
            throw storageUnavailable();
        }

        if (result.status() >= 200 && result.status() < 300) {
            String signedPath = SupabaseStorageUrls.parseSignedUrlPath(result.body());
            if (signedPath == null) {
                log.warn("⚠️ Supabase sign response thiếu field signedURL (HTTP {}).", result.status());
                throw storageUnavailable();
            }
            Instant expiresAt = Instant.now().plusSeconds(signedUrlTtlSeconds);
            // Không log URL/token
            log.debug("🔏 Issued signed URL (ttl={}s, download={})", signedUrlTtlSeconds, download);
            return new SignedUrl(SupabaseStorageUrls.buildSignedUrl(supabaseUrl, signedPath, download, downloadFileName),
                    expiresAt, signedUrlTtlSeconds);
        }
        if (SupabaseStorageUrls.isObjectNotFound(result.status(), result.body())) {
            log.warn("⚠️ Supabase object không tồn tại trong bucket '{}' (HTTP {}).", supabaseBucket, result.status());
            throw fileNotAvailable();
        }
        log.warn("⚠️ Supabase sign request returned HTTP {}.", result.status());
        throw storageUnavailable();
    }

    @Override
    public boolean deleteDocument(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return false;
        }

        // 1. Local Storage File Deletion (Protected against Path Traversal)
        if (storagePath.startsWith("/uploads/")) {
            try {
                String relPath = storagePath.substring(1);
                Path baseUploadDir = Paths.get("uploads").toAbsolutePath().normalize();
                Path localPath = Paths.get(relPath).toAbsolutePath().normalize();

                if (!localPath.startsWith(baseUploadDir)) {
                    log.warn("🚨 [SECURITY - PATH TRAVERSAL DETECTED] Attempted deletion outside uploads directory: {}", storagePath);
                    return false;
                }

                boolean deleted = Files.deleteIfExists(localPath);
                log.info("💾 Local file deletion result for '{}': {}", localPath, deleted);
                return deleted;
            } catch (Exception e) {
                log.warn("⚠️ Failed to delete local file '{}': {}", storagePath, e.getMessage());
                return false;
            }
        }

        // 2. Supabase Storage Object Deletion (object key, hoặc URL public kiểu cũ)
        if (!isSupabaseConfigured()) {
            log.warn("⚠️ Không xóa được object Supabase: storage chưa cấu hình.");
            return false;
        }
        try {
            String key = SupabaseStorageUrls.toObjectKey(storagePath, supabaseBucket);
            HttpResult result = transport.send("DELETE",
                    SupabaseStorageUrls.uploadEndpoint(supabaseUrl, supabaseBucket, key), authHeaders(null), null);
            log.info("🗑️ Supabase DELETE response code: {}", result.status());
            return result.status() >= 200 && result.status() < 300;
        } catch (Exception e) {
            log.warn("⚠️ Failed to delete object from Supabase: {}", e.getMessage());
            return false;
        }
    }

    private AppException fileNotAvailable() {
        return new AppException(HttpStatus.NOT_FOUND, ERROR_FILE_NOT_AVAILABLE,
                "Tệp gốc của tài liệu này không còn khả dụng trên hệ thống lưu trữ.");
    }

    private AppException storageUnavailable() {
        return new AppException(HttpStatus.SERVICE_UNAVAILABLE, ERROR_STORAGE_UNAVAILABLE,
                "Hệ thống lưu trữ tệp y tế tạm thời không khả dụng. Vui lòng thử lại sau ít phút.");
    }
}
