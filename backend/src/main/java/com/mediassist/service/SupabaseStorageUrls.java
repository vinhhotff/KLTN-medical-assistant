package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Các hàm thuần (không I/O) để dựng URL Supabase Storage và đọc response, tách riêng để unit test.
 */
final class SupabaseStorageUrls {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private SupabaseStorageUrls() {}

    static String trimBase(String supabaseUrl) {
        String base = supabaseUrl == null ? "" : supabaseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    /** POST {supabase.url}/storage/v1/object/{bucket}/{key} */
    static String uploadEndpoint(String supabaseUrl, String bucket, String objectKey) {
        return trimBase(supabaseUrl) + "/storage/v1/object/" + bucket + "/" + objectKey;
    }

    /** POST {supabase.url}/storage/v1/object/sign/{bucket}/{key} */
    static String signEndpoint(String supabaseUrl, String bucket, String objectKey) {
        return trimBase(supabaseUrl) + "/storage/v1/object/sign/" + bucket + "/" + objectKey;
    }

    /** GET {supabase.url}/storage/v1/bucket/{bucket} */
    static String bucketEndpoint(String supabaseUrl, String bucket) {
        return trimBase(supabaseUrl) + "/storage/v1/bucket/" + bucket;
    }

    static String signRequestBody(int expiresInSeconds) {
        return "{\"expiresIn\":" + expiresInSeconds + "}";
    }

    /**
     * Đọc field "signedURL" (đường dẫn tương đối) từ response của API sign.
     *
     * @return signedURL hoặc null nếu body không hợp lệ
     */
    static String parseSignedUrlPath(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) return null;
        try {
            JsonNode node = MAPPER.readTree(responseBody);
            JsonNode signed = node.get("signedURL");
            if (signed == null || signed.isNull()) signed = node.get("signedUrl");
            if (signed == null || signed.isNull() || signed.asText().isBlank()) return null;
            return signed.asText();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * URL đầy đủ = {supabase.url}/storage/v1 + signedURL; khi tải về thì thêm download=&lt;tên tệp đã URL-encode&gt;.
     */
    static String buildSignedUrl(String supabaseUrl, String signedUrlPath, boolean download, String downloadFileName) {
        String url;
        if (signedUrlPath.startsWith("http://") || signedUrlPath.startsWith("https://")) {
            url = signedUrlPath;
        } else if (signedUrlPath.startsWith("/storage/v1/")) {
            url = trimBase(supabaseUrl) + signedUrlPath;
        } else {
            url = trimBase(supabaseUrl) + "/storage/v1" + (signedUrlPath.startsWith("/") ? "" : "/") + signedUrlPath;
        }
        if (download) {
            String name = downloadFileName != null ? downloadFileName : "";
            url += (url.contains("?") ? "&" : "?") + "download=" + encode(name);
        }
        return url;
    }

    /** Đọc field "public" từ response GET bucket; null nếu không xác định. */
    static Boolean parseBucketPublic(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) return null;
        try {
            JsonNode publicNode = MAPPER.readTree(responseBody).get("public");
            return publicNode != null && publicNode.isBoolean() ? publicNode.asBoolean() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Supabase trả 404, hoặc (bản cũ) 400 kèm body {"statusCode":"404","error":"not_found"} khi object không tồn tại.
     */
    static boolean isObjectNotFound(int httpStatus, String responseBody) {
        if (httpStatus == 404) return true;
        if (httpStatus == 400 && responseBody != null) {
            String lower = responseBody.toLowerCase();
            return lower.contains("not_found") || lower.contains("object not found") || lower.contains("\"statuscode\":\"404\"");
        }
        return false;
    }

    /**
     * Chuyển giá trị lưu trữ (kể cả URL public/sign kiểu cũ) về object key trong bucket.
     * Giá trị local "/uploads/..." và object key được giữ nguyên.
     */
    static String toObjectKey(String storagePath, String bucket) {
        if (storagePath == null) return null;
        String value = storagePath.trim();
        if (!(value.startsWith("http://") || value.startsWith("https://"))) {
            return value;
        }
        int q = value.indexOf('?');
        if (q >= 0) value = value.substring(0, q);
        String[] markers = {
                "/storage/v1/object/public/" + bucket + "/",
                "/storage/v1/object/sign/" + bucket + "/",
                "/storage/v1/object/authenticated/" + bucket + "/",
                "/storage/v1/object/" + bucket + "/"
        };
        for (String marker : markers) {
            int idx = value.indexOf(marker);
            if (idx >= 0) {
                return value.substring(idx + marker.length());
            }
        }
        return value;
    }

    static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
