package com.mediassist.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.AbnormalIndicatorDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Component
public class GeminiAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiProvider.class);

    @Value("${app.ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    @Value("${app.ai.gemini.api-key:${GEMINI_API_KEY:}}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-3.6-flash}")
    private String defaultModel;

    @Value("${app.ai.gemini.enabled:true}")
    private boolean enabled;

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GeminiAiProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        var requestFactory = new org.springframework.http.client.JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(35));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public String getProviderName() {
        return "Google Gemini";
    }

    @Override
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.trim().isBlank();
    }

    @Override
    public ClinicalAiResult generateClinicalAnalysis(String systemPrompt, String userPrompt, String modelId) {
        return executeGeminiGeneration(systemPrompt, userPrompt, modelId, false);
    }

    @Override
    public ClinicalAiResult generateTriageAnalysis(String systemPrompt, String userPrompt, String modelId) {
        return executeGeminiGeneration(systemPrompt, userPrompt, modelId, true);
    }

    public String extractTextWithVision(byte[] imageBytes, String contentType, String fileName) {
        if (!isAvailable() || imageBytes == null || imageBytes.length == 0) {
            return "";
        }

        String targetModel = (defaultModel != null && !defaultModel.isBlank()) ? defaultModel : "gemini-3.6-flash";
        log.info("🔍 [GEMINI VISION OCR] Invoking model '{}' for file '{}' ({} bytes)...", targetModel, fileName, imageBytes.length);

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String mime = (contentType != null && !contentType.isBlank()) ? contentType : "image/jpeg";

        String ocrSystemPrompt = """
                Bạn là chuyên gia OCR & Vision y tế lâm sàng cao cấp của nền tảng MediAssist-AI.
                Nhiệm vụ của bạn là đọc hình ảnh phiếu xét nghiệm / hồ sơ bệnh án và bóc tách toàn bộ dữ liệu văn bản sang tiếng Việt:
                1. Đọc cẩn thận từng chi tiết, kể cả khi ảnh chụp bị mờ, góc chụp nghiêng, thiếu sáng hoặc độ phân giải thấp.
                2. Bóc tách thông tin hành chính: Tên bệnh viện / cơ sở y tế, Bác sĩ chỉ định, Mã xét nghiệm (SID/Mã BN), Họ tên bệnh nhân, tuổi, giới tính, khoa, ngày giờ tiếp nhận.
                3. Bóc tách bảng kết quả cận lâm sàng đầy đủ: Tên xét nghiệm, Trị số đo được (Kết quả), Đơn vị đo, Trị số bình thường (Khoảng tham chiếu).
                4. ĐẶC BIỆT LƯU Ý: Nếu phiếu xét nghiệm là phiếu trắng, phiếu chỉ định chưa điền kết quả (toàn bộ cột 'Kết quả' đang để trống), bạn BẮT BUỘC ghi rõ ở đầu:
                   '[LƯU Ý LÂM SÀNG: Phiếu xét nghiệm trắng / chưa điền kết quả đo lường, cột kết quả đang để trống]'.
                5. QUY TẮC AN TOÀN TUYỆT ĐỐI: Nếu bức ảnh hoàn toàn KHÔNG phải là tài liệu y tế hoặc phiếu xét nghiệm (ví dụ ảnh selfie, meme, phong cảnh, thú cưng, đồ vật ngẫu nhiên), bạn CHỈ ĐƯỢC trả về duy nhất một dòng chữ: KHONG_PHAI_TAI_LIEU_Y_TE.
                """;

        try {
            Map<String, Object> requestBody = new HashMap<>();

            // System instruction
            requestBody.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", ocrSystemPrompt))
            ));

            // Contents
            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(Map.of("text", "Trích xuất toàn bộ văn bản và bảng chỉ số từ hình ảnh phiếu xét nghiệm này:"));
            parts.add(Map.of("inline_data", Map.of(
                    "mime_type", mime,
                    "data", base64Image
            )));

            requestBody.put("contents", List.of(Map.of(
                    "role", "user",
                    "parts", parts
            )));

            requestBody.put("generationConfig", Map.of(
                    "temperature", 0.1
            ));

            String url = String.format("%s/models/%s:generateContent", baseUrl, targetModel);

            byte[] responseBytes = restClient.post()
                    .uri(url)
                    .header("x-goog-api-key", apiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                    .body(requestBody)
                    .retrieve()
                    .body(byte[].class);

            if (responseBytes == null || responseBytes.length == 0) {
                return "";
            }

            String responseJson = new String(responseBytes, StandardCharsets.UTF_8);

            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            String extracted = textNode.asText("");

            if (extracted.trim().equalsIgnoreCase("KHONG_PHAI_TAI_LIEU_Y_TE")) {
                log.warn("🚨 [GEMINI VISION GATEKEEPER] Non-medical document detected for '{}'", fileName);
                return "KHONG_PHAI_TAI_LIEU_Y_TE";
            }

            log.info("✅ [GEMINI VISION OCR] Successfully extracted {} characters from '{}'", extracted.length(), fileName);
            return extracted.trim();

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Gemini Vision 429 Rate Limit hit: {}", e.getMessage());
            throw new AiProviderOverloadedException("Google Gemini", targetModel, 429, e.getMessage());
        } catch (Exception e) {
            log.warn("Gemini Vision failed for '{}': {}", fileName, e.getMessage());
            return "";
        }
    }

    private ClinicalAiResult executeGeminiGeneration(String systemPrompt, String userPrompt, String modelId, boolean isTriage) {
        if (!isAvailable()) {
            throw new IllegalStateException("Google Gemini is not configured or disabled.");
        }

        String targetModel = (modelId != null && !modelId.isBlank() && !modelId.contains("/")) ? modelId : defaultModel;
        if (targetModel == null || targetModel.isBlank()) {
            targetModel = "gemini-3.6-flash";
        }

        try {
            Map<String, Object> requestBody = new HashMap<>();

            requestBody.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", systemPrompt))
            ));

            requestBody.put("contents", List.of(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", userPrompt))
            )));

            Map<String, Object> genConfig = new HashMap<>();
            genConfig.put("temperature", 0.15);
            genConfig.put("response_mime_type", "application/json");
            requestBody.put("generationConfig", genConfig);

            String url = String.format("%s/models/%s:generateContent", baseUrl, targetModel);

            byte[] responseBytes = restClient.post()
                    .uri(url)
                    .header("x-goog-api-key", apiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                    .body(requestBody)
                    .retrieve()
                    .body(byte[].class);

            if (responseBytes == null || responseBytes.length == 0) {
                throw new RuntimeException("Gemini returned empty response body");
            }

            String responseJson = new String(responseBytes, StandardCharsets.UTF_8);

            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            String content = textNode.asText("");

            if (content.isBlank()) {
                throw new RuntimeException("No text candidates returned from Gemini");
            }

            return parseModelJsonOutput(content, targetModel, isTriage);

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Gemini returned 429 Too Many Requests: {}", e.getMessage());
            throw new AiProviderOverloadedException("Google Gemini", targetModel, 429, e.getMessage());
        } catch (HttpServerErrorException.ServiceUnavailable e) {
            log.warn("Gemini returned 503 Service Unavailable: {}", e.getMessage());
            throw new AiProviderOverloadedException("Google Gemini", targetModel, 503, e.getMessage());
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.warn("Gemini timed out: {}", e.getMessage());
            throw new AiProviderOverloadedException("Google Gemini", targetModel, 408, "Timeout: " + e.getMessage());
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("429") || msg.contains("rate limit") || msg.contains("quota")) {
                throw new AiProviderOverloadedException("Google Gemini", targetModel, 429, e.getMessage());
            }
            log.error("Gemini call failed for {}: {}", targetModel, e.getMessage());
            throw new RuntimeException("Gemini call failed: " + e.getMessage(), e);
        }
    }

    public ClinicalAiResult parseModelJsonOutput(String rawText, String modelUsed, boolean isTriage) {
        ClinicalAiResult result = new ClinicalAiResult();
        result.setModelUsed(modelUsed);
        result.setProvider("Google Gemini");

        String cleanJson = rawText.trim();
        int firstBrace = cleanJson.indexOf("{");
        int lastBrace = cleanJson.lastIndexOf("}");
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        try {
            JsonNode node = objectMapper.readTree(cleanJson);
            if (node.has("isMedicalRelated")) {
                result.setMedicalRelated(node.get("isMedicalRelated").asBoolean(true));
            } else if (node.has("medicalRelated")) {
                result.setMedicalRelated(node.get("medicalRelated").asBoolean(true));
            }
            if (node.has("clinicalSummary")) result.setClinicalSummary(node.get("clinicalSummary").asText());
            if (node.has("plainLanguageExplanation")) result.setPlainLanguageExplanation(node.get("plainLanguageExplanation").asText());
            if (node.has("sbarSummary")) result.setSbarSummary(node.get("sbarSummary").asText());
            if (node.has("aiAdvice")) result.setAiAdvice(node.get("aiAdvice").asText());

            if (node.has("primarySpecialtySlug") && !node.get("primarySpecialtySlug").asText().isBlank()) {
                result.setRecommendedSpecialtySlug(node.get("primarySpecialtySlug").asText().trim());
            } else if (node.has("recommendedSpecialtySlug") && !node.get("recommendedSpecialtySlug").asText().isBlank()) {
                result.setRecommendedSpecialtySlug(node.get("recommendedSpecialtySlug").asText().trim());
            }

            if (node.has("primarySpecialtyName") && !node.get("primarySpecialtyName").asText().isBlank()) {
                result.setRecommendedSpecialtyName(node.get("primarySpecialtyName").asText().trim());
            } else if (node.has("recommendedSpecialtyName") && !node.get("recommendedSpecialtyName").asText().isBlank()) {
                result.setRecommendedSpecialtyName(node.get("recommendedSpecialtyName").asText().trim());
            }

            if (node.has("urgencyLevel") && !node.get("urgencyLevel").asText().isBlank()) {
                result.setUrgencyLevel(node.get("urgencyLevel").asText().trim());
            }

            if (node.has("doctorRecommendationReason")) result.setDoctorRecommendationReason(node.get("doctorRecommendationReason").asText());

            if (node.has("recommendedDoctorId")) {
                try {
                    result.setRecommendedDoctorId(UUID.fromString(node.get("recommendedDoctorId").asText()));
                } catch (Exception ignored) {}
            }

            // Dynamic Metadata Extraction
            JsonNode meta = node.has("metadata") ? node.get("metadata") : node;
            if (meta.has("hospitalName") && !meta.get("hospitalName").asText().isBlank()) {
                result.setHospitalName(meta.get("hospitalName").asText().trim());
            }
            if (meta.has("departmentName") && !meta.get("departmentName").asText().isBlank()) {
                result.setDepartmentName(meta.get("departmentName").asText().trim());
            }
            if (meta.has("orderingDoctor") && !meta.get("orderingDoctor").asText().isBlank()) {
                result.setOrderingDoctor(meta.get("orderingDoctor").asText().trim());
            }
            if (meta.has("testDate") && !meta.get("testDate").asText().isBlank()) {
                result.setTestDate(meta.get("testDate").asText().trim());
            }
            if (meta.has("sidCode") && !meta.get("sidCode").asText().isBlank()) {
                result.setSidCode(meta.get("sidCode").asText().trim());
            }
            if (meta.has("patientName") && !meta.get("patientName").asText().isBlank()) {
                result.setPatientName(meta.get("patientName").asText().trim());
            }
            if (meta.has("patientAge") && !meta.get("patientAge").asText().isBlank()) {
                result.setPatientAge(meta.get("patientAge").asText().trim());
            }
            if (meta.has("patientGender") && !meta.get("patientGender").asText().isBlank()) {
                result.setPatientGender(meta.get("patientGender").asText().trim());
            }
            if (meta.has("deviceModel") && !meta.get("deviceModel").asText().isBlank()) {
                result.setDeviceModel(meta.get("deviceModel").asText().trim());
            }

            // Lab Indicators Array
            if (node.has("indicators") && node.get("indicators").isArray()) {
                List<AbnormalIndicatorDto> indicators = new ArrayList<>();
                for (JsonNode indNode : node.get("indicators")) {
                    String status = "NORMAL";
                    if (indNode.has("status") && !indNode.get("status").asText().isBlank()) {
                        status = indNode.get("status").asText().toUpperCase();
                    } else if (indNode.has("flag") && !indNode.get("flag").asText().isBlank()) {
                        status = indNode.get("flag").asText().toUpperCase();
                    }
                    if ("HIGH".equals(status)) {
                        status = "ELEVATED";
                    }

                    String sig = indNode.has("clinicalSignificance")
                            ? indNode.get("clinicalSignificance").asText()
                            : indNode.path("significance").asText("");

                    indicators.add(new AbnormalIndicatorDto(
                            indNode.path("name").asText("Chỉ số xét nghiệm"),
                            indNode.path("value").asText(""),
                            indNode.path("unit").asText(""),
                            indNode.path("referenceRange").asText(""),
                            status,
                            sig
                    ));
                }
                result.setIndicators(indicators);
            }

            List<String> questions = new ArrayList<>();
            if (node.has("clarifyingQuestions") && node.get("clarifyingQuestions").isArray()) {
                for (JsonNode qNode : node.get("clarifyingQuestions")) {
                    questions.add(qNode.asText());
                }
                result.setClarifyingQuestions(questions);
            }
            if (node.has("suggestedQuestions") && node.get("suggestedQuestions").isArray()) {
                List<String> suggested = new ArrayList<>();
                for (JsonNode qNode : node.get("suggestedQuestions")) {
                    suggested.add(qNode.asText());
                }
                result.setSuggestedQuestions(suggested);
                if (questions.isEmpty()) {
                    result.setClarifyingQuestions(suggested);
                }
            } else if (!questions.isEmpty() && result.getSuggestedQuestions().isEmpty()) {
                result.setSuggestedQuestions(questions);
            }

            return result;

        } catch (Exception e) {
            log.warn("Could not parse as pure JSON from Gemini. Using text fallback: {}", e.getMessage());
            result.setClinicalSummary(rawText.length() > 300 ? rawText.substring(0, 300) + "..." : rawText);
            result.setPlainLanguageExplanation(rawText);
            result.setDoctorRecommendationReason("Phân tích lâm sàng được khởi tạo bởi mô hình AI: " + modelUsed);
            return result;
        }
    }
}
