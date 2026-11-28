package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Zalo Official Account (OA) v3 Gateway.
 * Supports:
 * - REAL mode: sends customer service / clinical reminder messages via https://openapi.zalo.me/v3.0/oa/message/cs
 *   with automatic OAuth v4 access_token refresh when expired.
 * - MOCK mode: sandbox simulation when ZALO_OA_ACCESS_TOKEN is not yet configured.
 */
@Component
public class ZaloOaGateway {

    private static final Logger log = LoggerFactory.getLogger(ZaloOaGateway.class);
    private static final String ZALO_SEND_CS_URL = "https://openapi.zalo.me/v3.0/oa/message/cs";
    private static final String ZALO_REFRESH_URL = "https://oauth.zaloapp.com/v4/oa/access_token";

    private final boolean enabled;
    private final String configuredMode;
    private final String appId;
    private final String appSecret;
    private final String oaId;
    private final String oaQrUrl;
    private final AtomicReference<String> accessTokenRef;
    private final AtomicReference<String> refreshTokenRef;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public ZaloOaGateway(
            @Value("${app.zalo.enabled:true}") boolean enabled,
            @Value("${app.zalo.mode:auto}") String configuredMode,
            @Value("${app.zalo.app-id:}") String appId,
            @Value("${app.zalo.app-secret:}") String appSecret,
            @Value("${app.zalo.oa-id:}") String oaId,
            @Value("${app.zalo.oa-qr-url:}") String oaQrUrl,
            @Value("${app.zalo.access-token:}") String accessToken,
            @Value("${app.zalo.refresh-token:}") String refreshToken,
            ObjectMapper objectMapper
    ) {
        this.enabled = enabled;
        this.configuredMode = configuredMode != null ? configuredMode.trim().toLowerCase() : "auto";
        this.appId = appId != null ? appId.trim() : "";
        this.appSecret = appSecret != null ? appSecret.trim() : "";
        this.oaId = oaId != null ? oaId.trim() : "";
        this.oaQrUrl = oaQrUrl != null ? oaQrUrl.trim() : "";
        this.accessTokenRef = new AtomicReference<>(accessToken != null ? accessToken.trim() : "");
        this.refreshTokenRef = new AtomicReference<>(refreshToken != null ? refreshToken.trim() : "");
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    public String getMode() {
        if (!enabled) return "DISABLED";
        if ("mock".equals(configuredMode)) return "MOCK";
        String token = accessTokenRef.get();
        if ("real".equals(configuredMode) || (token != null && !token.isBlank())) {
            return "REAL";
        }
        return "MOCK";
    }

    public String getOaId() { return oaId; }
    public String getOaQrUrl() { return oaQrUrl; }
    public boolean isRealMode() { return "REAL".equals(getMode()); }

    public record SendResult(boolean success, String mode, String messageId, String error) {}

    public SendResult sendTextMessage(String zaloUserId, String text) {
        if (!enabled) {
            return new SendResult(false, "DISABLED", null, "Zalo integration is disabled");
        }
        if (zaloUserId == null || zaloUserId.isBlank()) {
            return new SendResult(false, getMode(), null, "Missing zaloUserId");
        }
        if (!isRealMode()) {
            String mockId = "ZALO_MOCK_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            log.info("📱 [ZALO OA SANDBOX] To zaloUserId={} | msgId={}\n{}", zaloUserId, mockId, text);
            return new SendResult(true, "MOCK", mockId, null);
        }

        SendResult attempt = doSendReal(zaloUserId, text);
        // Zalo error -216 / -124: access_token invalid or expired -> attempt refresh once
        if (!attempt.success() && attempt.error() != null
                && (attempt.error().contains("-216") || attempt.error().contains("-124") || attempt.error().contains("expired"))
                && refreshAccessToken()) {
            attempt = doSendReal(zaloUserId, text);
        }
        return attempt;
    }

    private SendResult doSendReal(String zaloUserId, String text) {
        try {
            Map<String, Object> payload = Map.of(
                    "recipient", Map.of("user_id", zaloUserId),
                    "message", Map.of("text", text)
            );
            String responseBody = restClient.post()
                    .uri(ZALO_SEND_CS_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("access_token", accessTokenRef.get())
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            int errorCode = root.path("error").asInt(-1);
            if (errorCode == 0) {
                String msgId = root.path("data").path("message_id").asText("ZALO_SENT");
                log.info("✅ [ZALO OA REAL] Sent reminder to zaloUserId={} | msgId={}", zaloUserId, msgId);
                return new SendResult(true, "REAL", msgId, null);
            }
            String errMsg = "Zalo error " + errorCode + ": " + root.path("message").asText("Unknown error");
            log.warn("⚠️ [ZALO OA REAL] Failed for zaloUserId={}: {}", zaloUserId, errMsg);
            return new SendResult(false, "REAL", null, errMsg);
        } catch (Exception e) {
            log.error("❌ [ZALO OA REAL] Exception sending to zaloUserId={}: {}", zaloUserId, e.getMessage());
            return new SendResult(false, "REAL", null, e.getMessage());
        }
    }

    public boolean refreshAccessToken() {
        String rt = refreshTokenRef.get();
        if (rt == null || rt.isBlank() || appId.isBlank() || appSecret.isBlank()) {
            return false;
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("refresh_token", rt);
            form.add("app_id", appId);
            form.add("grant_type", "refresh_token");

            String body = restClient.post()
                    .uri(ZALO_REFRESH_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .header("secret_key", appSecret)
                    .body(form)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(body);
            String newAccess = root.path("access_token").asText("");
            String newRefresh = root.path("refresh_token").asText("");
            if (!newAccess.isBlank()) {
                accessTokenRef.set(newAccess);
                if (!newRefresh.isBlank()) {
                    refreshTokenRef.set(newRefresh);
                }
                log.info("🔄 [ZALO OA] Refreshed Zalo OA access_token successfully.");
                return true;
            }
            log.warn("⚠️ [ZALO OA] Refresh token response did not include access_token: {}", body);
            return false;
        } catch (Exception e) {
            log.error("❌ [ZALO OA] Failed to refresh access_token: {}", e.getMessage());
            return false;
        }
    }
}
