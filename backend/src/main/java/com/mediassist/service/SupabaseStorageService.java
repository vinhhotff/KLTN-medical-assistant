package com.mediassist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class SupabaseStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    @Value("${supabase.url:https://your-project.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.key:mock-service-role-key}")
    private String supabaseKey;

    @Value("${supabase.bucket:medical-documents}")
    private String supabaseBucket;

    @Value("${supabase.enabled:false}")
    private boolean supabaseEnabled;

    @Override
    public String uploadDocument(byte[] fileBytes, String fileName, String contentType, UUID userId) {
        String sanitizedName = fileName != null ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_") : "doc.pdf";
        String userPrefix = userId != null ? userId.toString() : "anonymous";
        String uniquePath = "patients/" + userPrefix + "/" + UUID.randomUUID().toString().substring(0, 8) + "_" + sanitizedName;

        // 1. Attempt upload to Supabase Storage if configured and enabled
        if (supabaseEnabled && supabaseKey != null && !supabaseKey.isBlank() && !supabaseKey.contains("mock")) {
            try {
                String targetUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, supabaseBucket, uniquePath);
                log.info("☁️ Uploading document to Supabase Storage: {}", targetUrl);

                URL url = URI.create(targetUrl).toURL();
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + supabaseKey);
                conn.setRequestProperty("apikey", supabaseKey);
                conn.setRequestProperty("Content-Type", contentType != null ? contentType : "application/octet-stream");
                conn.setDoOutput(true);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(10000);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(fileBytes);
                    os.flush();
                }

                int responseCode = conn.getResponseCode();
                if (responseCode == 200 || responseCode == 201) {
                    String publicUrl = String.format("%s/storage/v1/object/public/%s/%s", supabaseUrl, supabaseBucket, uniquePath);
                    log.info("✅ Document successfully stored on Supabase Cloud: {}", publicUrl);
                    return publicUrl;
                } else {
                    String errorBody = "";
                    try (java.io.InputStream es = conn.getErrorStream()) {
                        if (es != null) {
                            errorBody = new String(es.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                        }
                    } catch (Exception ignored) {}
                    log.warn("⚠️ Supabase Storage returned HTTP {}: {}. Falling back to resilient local storage.", responseCode, errorBody);
                    if (responseCode == 400 || responseCode == 404) {
                        log.warn("💡 HƯỚNG DẪN TECH LEAD: Hãy tạo bucket '{}' trên Supabase Dashboard (Menu Storage -> New bucket -> Tên: '{}' -> Bật Public bucket -> Save)!", supabaseBucket, supabaseBucket);
                    }
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

            String localUrl = "/uploads/medical_documents/" + userPrefix + "/" + uniqueFileName;
            log.info("💾 Document securely saved to resilient local EMR storage: {}", localUrl);
            return localUrl;
        } catch (Exception e) {
            log.error("❌ Failed to save document to local storage: {}", e.getMessage());
            return "/uploads/medical_documents/default_emr.pdf";
        }
    }

    @Override
    public boolean deleteDocument(String storageUrl) {
        if (storageUrl == null || storageUrl.isBlank()) {
            return false;
        }

        log.info("🗑️ Deleting storage document: {}", storageUrl);

        // 1. Supabase Storage Object Deletion
        if (storageUrl.contains("/storage/v1/object/public/") || storageUrl.contains(supabaseBucket)) {
            try {
                String objectPath = storageUrl;
                String marker = "/" + supabaseBucket + "/";
                int idx = storageUrl.indexOf(marker);
                if (idx != -1) {
                    objectPath = storageUrl.substring(idx + marker.length());
                }

                String targetUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, supabaseBucket, objectPath);
                log.info("☁️ Sending DELETE to Supabase Storage: {}", targetUrl);

                URL url = URI.create(targetUrl).toURL();
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("DELETE");
                conn.setRequestProperty("Authorization", "Bearer " + supabaseKey);
                conn.setRequestProperty("apikey", supabaseKey);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                int responseCode = conn.getResponseCode();
                log.info("Supabase DELETE response code: {}", responseCode);
                return responseCode >= 200 && responseCode < 300;
            } catch (Exception e) {
                log.warn("⚠️ Failed to delete object from Supabase: {}", e.getMessage());
                return false;
            }
        }

        // 2. Local Storage File Deletion (Protected against Path Traversal)
        if (storageUrl.startsWith("/uploads/")) {
            try {
                String relPath = storageUrl.startsWith("/") ? storageUrl.substring(1) : storageUrl;
                Path baseUploadDir = Paths.get("uploads").toAbsolutePath().normalize();
                Path localPath = Paths.get(relPath).toAbsolutePath().normalize();

                if (!localPath.startsWith(baseUploadDir)) {
                    log.warn("🚨 [SECURITY - PATH TRAVERSAL DETECTED] Attempted deletion outside uploads directory: {}", storageUrl);
                    return false;
                }

                boolean deleted = Files.deleteIfExists(localPath);
                log.info("💾 Local file deletion result for '{}': {}", localPath, deleted);
                return deleted;
            } catch (Exception e) {
                log.warn("⚠️ Failed to delete local file '{}': {}", storageUrl, e.getMessage());
                return false;
            }
        }

        return false;
    }
}
