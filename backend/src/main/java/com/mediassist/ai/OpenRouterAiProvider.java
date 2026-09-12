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

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public OpenRouterAiProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
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

    private ClinicalAiResult executeChatCompletion(String systemPrompt, String userPrompt, String modelId, boolean isTriage) {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenRouter is not configured with an API key.");
        }

        String targetModel = modelId != null && !modelId.isBlank() ? modelId : "google/gemini-2.0-flash-exp:free";
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
        if (cleanJson.startsWith("```")) {
            int firstBrace = cleanJson.indexOf("{");
            int lastBrace = cleanJson.lastIndexOf("}");
            if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }
        }

        try {
            JsonNode node = objectMapper.readTree(cleanJson);
            if (node.has("clinicalSummary")) result.setClinicalSummary(node.get("clinicalSummary").asText());
            if (node.has("plainLanguageExplanation")) result.setPlainLanguageExplanation(node.get("plainLanguageExplanation").asText());
            if (node.has("sbarSummary")) result.setSbarSummary(node.get("sbarSummary").asText());
            if (node.has("aiAdvice")) result.setAiAdvice(node.get("aiAdvice").asText());
            if (node.has("recommendedSpecialtySlug")) result.setRecommendedSpecialtySlug(node.get("recommendedSpecialtySlug").asText());
            if (node.has("recommendedSpecialtyName")) result.setRecommendedSpecialtyName(node.get("recommendedSpecialtyName").asText());
            if (node.has("doctorRecommendationReason")) result.setDoctorRecommendationReason(node.get("doctorRecommendationReason").asText());

            if (node.has("recommendedDoctorId")) {
                try {
                    result.setRecommendedDoctorId(UUID.fromString(node.get("recommendedDoctorId").asText()));
                } catch (Exception ignored) {}
            }

            if (node.has("indicators") && node.get("indicators").isArray()) {
                List<AbnormalIndicatorDto> indicators = new ArrayList<>();
                for (JsonNode indNode : node.get("indicators")) {
                    indicators.add(new AbnormalIndicatorDto(
                            indNode.path("name").asText("Chỉ số sinh hóa"),
                            indNode.path("value").asText("0"),
                            indNode.path("unit").asText(""),
                            indNode.path("referenceRange").asText(""),
                            indNode.path("flag").asText("NORMAL"),
                            indNode.path("clinicalSignificance").asText("")
                    ));
                }
                result.setIndicators(indicators);
            }

            if (node.has("suggestedQuestions") && node.get("suggestedQuestions").isArray()) {
                List<String> questions = new ArrayList<>();
                for (JsonNode qNode : node.get("suggestedQuestions")) {
                    questions.add(qNode.asText());
                }
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
