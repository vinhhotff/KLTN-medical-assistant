package com.mediassist.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.AbnormalIndicatorDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.*;

@Component
public class OpenRouterAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenRouterAiProvider.class);

    @Value("${app.ai.openrouter.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${app.ai.openrouter.api-key:}")
    private String apiKey;

    @Value("${app.ai.openrouter.enabled:true}")
    private boolean enabled;

    @Value("${app.ai.openrouter.vision-models:inclusionai/ling-3.0-flash-vl:free,nex-agi/nex-n2.5-pro:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free}")
    private String visionModelsConfig;

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public OpenRouterAiProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        var requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(java.time.Duration.ofSeconds(5));
        requestFactory.setReadTimeout(java.time.Duration.ofSeconds(20));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public String getProviderName() {
        return "OpenRouter";
    }

    @Override
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public ClinicalAiResult generateClinicalAnalysis(String systemPrompt, String userPrompt, String modelId) {
        return executeChatCompletion(systemPrompt, userPrompt, modelId, false);
    }

    @Override
    public ClinicalAiResult generateTriageAnalysis(String systemPrompt, String userPrompt, String modelId) {
        return executeChatCompletion(systemPrompt, userPrompt, modelId, true);
    }

    /**
     * Extracts text and clinical indicators from a medical image using resilient Multimodal Vision LLMs.
     * Implements automatic fallback rotation across healthy free vision models:
     * 1. inclusionai/ling-3.0-flash-vl:free
     * 2. nex-agi/nex-n2.5-pro:free
     * 3. nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
     *
     * If the image is non-medical, returns empty string to trigger gatekeeper rejection.
     */
    public String extractTextWithVision(byte[] imageBytes, String contentType, String fileName) {
        if (!isAvailable() || imageBytes == null || imageBytes.length == 0) {
            return "";
        }

        List<String> visionModels = parseVisionModels();
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String mime = (contentType != null && !contentType.isBlank()) ? contentType : "image/jpeg";

        String ocrSystemPrompt = """
                Bạn là chuyên gia OCR & Vision y tế lâm sàng cao cấp của nền tảng MediAssist-AI.
                Nhiệm vụ của bạn là đọc hình ảnh phiếu xét nghiệm / hồ sơ bệnh án và bóc tách toàn bộ dữ liệu văn bản sang tiếng Việt:
                1. Đọc cẩn thận từng chi tiết, kể cả khi ảnh chụp bị mờ, góc chụp nghiêng, thiếu sáng hoặc độ phân giải thấp.
                2. Bóc tách thông tin hành chính: Họ tên bệnh nhân, tuổi, giới tính, khoa, chẩn đoán, ngày giờ làm xét nghiệm.
                3. Bóc tách bảng kết quả: Tên xét nghiệm, Trị số đo được (Kết quả), Đơn vị đo, Trị số bình thường (Khoảng tham chiếu).
                4. ĐẶC BIỆT LƯU Ý: Nếu phiếu xét nghiệm là phiếu trắng, phiếu chỉ định chưa điền kết quả (toàn bộ cột 'Kết quả' đang để trống), bạn BẮT BUỘC ghi rõ ở đầu bản dịch:
                   '[LƯU Ý LÂM SÀNG: Phiếu xét nghiệm trắng / chưa điền kết quả đo lường, cột kết quả đang để trống]'.
                5. QUY TẮC AN TOÀN TUYỆT ĐỐI: Nếu bức ảnh hoàn toàn KHÔNG phải là tài liệu y tế hoặc phiếu xét nghiệm (ví dụ ảnh selfie, meme, phong cảnh, thú cưng, đồ vật ngẫu nhiên), bạn CHỈ ĐƯỢC trả về duy nhất một dòng chữ: KHONG_PHAI_TAI_LIEU_Y_TE.
                """;

        for (String targetModel : visionModels) {
            log.info("🔍 [VISION OCR] Invoking model '{}' for file '{}' ({} bytes)...", targetModel, fileName, imageBytes.length);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", targetModel);
            requestBody.put("temperature", 0.1);

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", ocrSystemPrompt));

            List<Map<String, Object>> userContent = new ArrayList<>();
            userContent.add(Map.of("type", "text", "text", "Trích xuất toàn bộ văn bản từ hình ảnh phiếu xét nghiệm này:"));
            userContent.add(Map.of("type", "image_url", "image_url", Map.of("url", "data:" + mime + ";base64," + base64Image)));

            messages.add(Map.of("role", "user", "content", userContent));
            requestBody.put("messages", messages);

            try {
                String responseJson = restClient.post()
                        .uri(baseUrl + "/chat/completions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey.trim())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .header("HTTP-Referer", "http://localhost:5173")
                        .header("X-Title", "MediAssist-AI Telehealth")
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                if (responseJson != null && !responseJson.isBlank()) {
                    JsonNode root = objectMapper.readTree(responseJson);
                    JsonNode choices = root.path("choices");
                    if (choices.isArray() && !choices.isEmpty()) {
                        String content = choices.get(0).path("message").path("content").asText();
                        if (content != null && content.contains("KHONG_PHAI_TAI_LIEU_Y_TE")) {
                            log.warn("🚨 Multimodal Vision classified image '{}' as NON-MEDICAL by model '{}'.", fileName, targetModel);
                            return "";
                        }
                        if (content != null && !content.isBlank()) {
                            log.info("✅ Multimodal Vision model '{}' successfully extracted {} characters from '{}'", targetModel, content.length(), fileName);
                            return content;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Vision model '{}' failed for '{}': {}. Rotating to next vision model...", targetModel, fileName, e.getMessage());
            }
        }

        log.error("❌ All vision models in fallback pool failed to extract text from image '{}'", fileName);
        return "";
    }

    private List<String> parseVisionModels() {
        if (visionModelsConfig == null || visionModelsConfig.isBlank()) {
            return List.of("inclusionai/ling-3.0-flash-vl:free", "nex-agi/nex-n2.5-pro:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
        }
        return Arrays.stream(visionModelsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    private ClinicalAiResult executeChatCompletion(String systemPrompt, String userPrompt, String modelId, boolean isTriage) {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenRouter is not configured with an API key.");
        }

        String targetModel = modelId != null && !modelId.isBlank() ? modelId : "openrouter/free";
        log.info("Invoking OpenRouter model: {}", targetModel);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", targetModel);
        requestBody.put("temperature", 0.2);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userPrompt));
        requestBody.put("messages", messages);

        try {
            String responseJson = restClient.post()
                    .uri(baseUrl + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey.trim())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header("HTTP-Referer", "http://localhost:5173")
                    .header("X-Title", "MediAssist-AI Telehealth")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (responseJson == null || responseJson.isBlank()) {
                throw new AiProviderOverloadedException("OpenRouter", targetModel, 500, "Empty response from OpenRouter API");
            }

            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new AiProviderOverloadedException("OpenRouter", targetModel, 500, "No completion choices returned");
            }

            String content = choices.get(0).path("message").path("content").asText();
            log.info("Received response from model {} (length: {} chars)", targetModel, content.length());

            return parseModelJsonOutput(content, targetModel, isTriage);

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Model {} returned 429 Too Many Requests. Rotating model.", targetModel);
            throw new AiProviderOverloadedException("OpenRouter", targetModel, 429, e.getMessage());
        } catch (HttpServerErrorException.ServiceUnavailable e) {
            log.warn("Model {} returned 503 Service Unavailable. Rotating model.", targetModel);
            throw new AiProviderOverloadedException("OpenRouter", targetModel, 503, e.getMessage());
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.warn("Model {} timed out after 15s. Rotating to next model in pool.", targetModel);
            throw new AiProviderOverloadedException("OpenRouter", targetModel, 408, "Timeout: " + e.getMessage());
        } catch (HttpClientErrorException e) {
            int code = e.getStatusCode().value();
            if (code == 429) {
                throw new AiProviderOverloadedException("OpenRouter", targetModel, 429, e.getMessage());
            }
            log.error("OpenRouter HTTP error {}: {}", code, e.getResponseBodyAsString());
            throw new RuntimeException("OpenRouter HTTP Error " + code + ": " + e.getMessage(), e);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("429") || msg.contains("rate limit") || msg.contains("overloaded") || msg.contains("busy")) {
                throw new AiProviderOverloadedException("OpenRouter", targetModel, 429, e.getMessage());
            }
            log.error("OpenRouter call failed for {}: {}", targetModel, e.getMessage());
            throw new RuntimeException("OpenRouter call failed: " + e.getMessage(), e);
        }
    }

    private ClinicalAiResult parseModelJsonOutput(String rawText, String modelUsed, boolean isTriage) {
        ClinicalAiResult result = new ClinicalAiResult();
        result.setModelUsed(modelUsed);
        result.setProvider("OpenRouter");

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
            log.warn("Could not parse as pure JSON. Using text fallback: {}", e.getMessage());
            result.setClinicalSummary(rawText.length() > 300 ? rawText.substring(0, 300) + "..." : rawText);
            result.setPlainLanguageExplanation(rawText);
            result.setDoctorRecommendationReason("Phân tích lâm sàng được khởi tạo bởi mô hình AI: " + modelUsed);
            return result;
        }
    }
}
