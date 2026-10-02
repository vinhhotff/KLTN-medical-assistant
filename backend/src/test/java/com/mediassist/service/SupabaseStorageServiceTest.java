package com.mediassist.service;

import com.mediassist.common.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử SupabaseStorageService với HTTP transport giả (không gọi mạng) và các hàm dựng URL thuần.
 */
class SupabaseStorageServiceTest {

    private static final String BASE = "https://demo.supabase.co";
    private static final String BUCKET = "medical-documents";
    private static final String KEY = "patients/u1/abcd1234_xet_nghiem.pdf";

    private record Call(String method, String url, Map<String, String> headers, String body) {}

    private final List<Call> calls = new ArrayList<>();

    private SupabaseStorageService service(String key, boolean enabled, SupabaseStorageService.HttpTransport responder) {
        SupabaseStorageService.HttpTransport recording = (method, url, headers, body) -> {
            calls.add(new Call(method, url, headers, body != null ? new String(body, StandardCharsets.UTF_8) : null));
            return responder.send(method, url, headers, body);
        };
        return new SupabaseStorageService(BASE, key, BUCKET, enabled, 900, recording);
    }

    private SupabaseStorageService signingService(int status, String body) {
        return service("service-role-test", true, (m, u, h, b) -> new SupabaseStorageService.HttpResult(status, body));
    }

    @Test
    @DisplayName("Ký URL: POST /object/sign/{bucket}/{key}, body expiresIn=900, header Bearer + apikey, URL đầy đủ đúng")
    void createSignedUrl_BuildsFullUrlFromSignedPath() {
        SupabaseStorageService svc = signingService(200,
                "{\"signedURL\":\"/object/sign/medical-documents/" + KEY + "?token=abc.def\"}");

        Instant before = Instant.now();
        StorageService.SignedUrl signed = svc.createSignedUrl(KEY, false, "xét nghiệm.pdf");

        assertEquals(BASE + "/storage/v1/object/sign/medical-documents/" + KEY + "?token=abc.def", signed.url());
        assertEquals(900, signed.expiresInSeconds());
        long ttl = Duration.between(before, signed.expiresAt()).getSeconds();
        assertTrue(ttl >= 899 && ttl <= 901, "expiresAt must be ~900s ahead, was " + ttl);

        Call call = calls.get(0);
        assertEquals("POST", call.method());
        assertEquals(BASE + "/storage/v1/object/sign/" + BUCKET + "/" + KEY, call.url());
        assertEquals("{\"expiresIn\":900}", call.body());
        assertEquals("Bearer service-role-test", call.headers().get("Authorization"));
        assertEquals("service-role-test", call.headers().get("apikey"));
        assertFalse(signed.toString().contains("token"), "toString must never expose the signed token");
    }

    @Test
    @DisplayName("TTL mặc định lấy từ cấu hình = 900 giây")
    void ttl_Is900() {
        assertEquals(900, signingService(200, "{}").getSignedUrlTtlSeconds());
        assertEquals(900, new SupabaseStorageService(BASE, "", BUCKET, false, 0, (m, u, h, b) -> null).getSignedUrlTtlSeconds());
    }

    @Test
    @DisplayName("download=true → thêm &download=<tên tệp đã URL-encode>")
    void createSignedUrl_DownloadAppendsEncodedFileName() {
        SupabaseStorageService svc = signingService(200, "{\"signedURL\":\"/object/sign/medical-documents/" + KEY + "?token=abc\"}");

        String url = svc.createSignedUrl(KEY, true, "Kết quả xét nghiệm & máu.pdf").url();

        assertTrue(url.endsWith("?token=abc&download=K%E1%BA%BFt%20qu%E1%BA%A3%20x%C3%A9t%20nghi%E1%BB%87m%20%26%20m%C3%A1u.pdf"), url);
    }

    @Test
    @DisplayName("Supabase báo object không tồn tại (404 hoặc 400 not_found) → 404 FILE_NOT_AVAILABLE")
    void createSignedUrl_ObjectNotFound_Throws404() {
        AppException ex404 = assertThrows(AppException.class,
                () -> signingService(404, "{\"error\":\"not_found\"}").createSignedUrl(KEY, false, "a.pdf"));
        assertEquals(HttpStatus.NOT_FOUND, ex404.getStatus());
        assertEquals("FILE_NOT_AVAILABLE", ex404.getCode());

        AppException ex400 = assertThrows(AppException.class,
                () -> signingService(400, "{\"statusCode\":\"404\",\"error\":\"not_found\",\"message\":\"Object not found\"}")
                        .createSignedUrl(KEY, false, "a.pdf"));
        assertEquals("FILE_NOT_AVAILABLE", ex400.getCode());
    }

    @Test
    @DisplayName("Supabase lỗi 5xx → 503 STORAGE_UNAVAILABLE")
    void createSignedUrl_ServerError_Throws503() {
        AppException ex = assertThrows(AppException.class,
                () -> signingService(500, "{\"error\":\"internal\"}").createSignedUrl(KEY, false, "a.pdf"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("STORAGE_UNAVAILABLE", ex.getCode());
    }

    @Test
    @DisplayName("Supabase timeout → 503 STORAGE_UNAVAILABLE")
    void createSignedUrl_Timeout_Throws503() {
        SupabaseStorageService svc = service("service-role-test", true, (m, u, h, b) -> {
            throw new SocketTimeoutException("timed out");
        });
        AppException ex = assertThrows(AppException.class, () -> svc.createSignedUrl(KEY, false, "a.pdf"));
        assertEquals("STORAGE_UNAVAILABLE", ex.getCode());
    }

    @Test
    @DisplayName("Response thiếu signedURL → 503")
    void createSignedUrl_MissingSignedUrl_Throws503() {
        AppException ex = assertThrows(AppException.class,
                () -> signingService(200, "{\"foo\":1}").createSignedUrl(KEY, false, "a.pdf"));
        assertEquals("STORAGE_UNAVAILABLE", ex.getCode());
    }

    @Test
    @DisplayName("Object Supabase nhưng SUPABASE_KEY rỗng hoặc supabase.enabled=false → 503, không gọi HTTP")
    void createSignedUrl_NotConfigured_Throws503WithoutHttp() {
        SupabaseStorageService.HttpTransport fail = (m, u, h, b) -> { throw new AssertionError("must not call HTTP"); };

        AppException emptyKey = assertThrows(AppException.class,
                () -> service("", true, fail).createSignedUrl(KEY, false, "a.pdf"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, emptyKey.getStatus());
        assertEquals("STORAGE_UNAVAILABLE", emptyKey.getCode());

        AppException disabled = assertThrows(AppException.class,
                () -> service("service-role-test", false, fail).createSignedUrl(KEY, false, "a.pdf"));
        assertEquals("STORAGE_UNAVAILABLE", disabled.getCode());
        assertTrue(calls.isEmpty());
    }

    @Test
    @DisplayName("Upload thành công trả object key patients/{userId}/{random}_{tên}, không trả URL")
    void uploadDocument_ReturnsObjectKey() {
        UUID userId = UUID.randomUUID();
        SupabaseStorageService svc = service("service-role-test", true, (m, u, h, b) -> new SupabaseStorageService.HttpResult(200, "{}"));

        String key = svc.uploadDocument("pdf".getBytes(), "xet nghiem.pdf", "application/pdf", userId);

        assertTrue(key.matches("patients/" + userId + "/[0-9a-f]{8}_xet_nghiem\\.pdf"), key);
        assertFalse(key.startsWith("http"));
        assertEquals(BASE + "/storage/v1/object/" + BUCKET + "/" + key, calls.get(0).url());
    }

    @Test
    @DisplayName("deleteDocument chấp nhận cả object key lẫn URL public kiểu cũ")
    void deleteDocument_AcceptsKeyAndLegacyUrl() {
        SupabaseStorageService svc = service("service-role-test", true, (m, u, h, b) -> new SupabaseStorageService.HttpResult(200, "[]"));

        assertTrue(svc.deleteDocument(KEY));
        assertTrue(svc.deleteDocument(BASE + "/storage/v1/object/public/" + BUCKET + "/" + KEY));

        String expected = BASE + "/storage/v1/object/" + BUCKET + "/" + KEY;
        assertEquals(expected, calls.get(0).url());
        assertEquals(expected, calls.get(1).url());
        assertEquals("DELETE", calls.get(1).method());
    }

    @Test
    @DisplayName("Chuyển URL public / sign / không có 'public/' kiểu cũ thành object key; giữ nguyên /uploads/ và key")
    void toObjectKey_ConvertsLegacyUrls() {
        assertEquals(KEY, SupabaseStorageUrls.toObjectKey(BASE + "/storage/v1/object/public/" + BUCKET + "/" + KEY, BUCKET));
        assertEquals(KEY, SupabaseStorageUrls.toObjectKey(BASE + "/storage/v1/object/" + BUCKET + "/" + KEY, BUCKET));
        assertEquals(KEY, SupabaseStorageUrls.toObjectKey(BASE + "/storage/v1/object/sign/" + BUCKET + "/" + KEY + "?token=x", BUCKET));
        assertEquals(KEY, SupabaseStorageUrls.toObjectKey(KEY, BUCKET));
        assertEquals("/uploads/medical_documents/u1/a.pdf", SupabaseStorageUrls.toObjectKey("/uploads/medical_documents/u1/a.pdf", BUCKET));
    }

    @Test
    @DisplayName("Dựng URL đầy đủ từ signedURL tương đối (có/không có tiền tố /storage/v1)")
    void buildSignedUrl_HandlesPathVariants() {
        assertEquals(BASE + "/storage/v1/object/sign/b/k?token=t",
                SupabaseStorageUrls.buildSignedUrl(BASE + "/", "/object/sign/b/k?token=t", false, null));
        assertEquals(BASE + "/storage/v1/object/sign/b/k?token=t",
                SupabaseStorageUrls.buildSignedUrl(BASE, "/storage/v1/object/sign/b/k?token=t", false, null));
        assertEquals("/object/sign/b/k?token=t", SupabaseStorageUrls.parseSignedUrlPath("{\"signedURL\":\"/object/sign/b/k?token=t\"}"));
        assertNull(SupabaseStorageUrls.parseSignedUrlPath("not-json"));
    }

    @Test
    @DisplayName("Đọc cờ public của bucket để cảnh báo khi khởi động")
    void parseBucketPublic_ReadsFlag() {
        assertEquals(Boolean.TRUE, SupabaseStorageUrls.parseBucketPublic("{\"id\":\"medical-documents\",\"public\":true}"));
        assertEquals(Boolean.FALSE, SupabaseStorageUrls.parseBucketPublic("{\"public\":false}"));
        assertNull(SupabaseStorageUrls.parseBucketPublic("{}"));
    }
}
