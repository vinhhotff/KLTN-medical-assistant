package com.mediassist.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Enterprise Clinical Vector Embedding Service.
 * Produces 1536-dimensional L2-normalized continuous vectors compatible with PostgreSQL pgvector (<=>).
 * Architecture (100% Zero-Hardcode Dictionary):
 * 1. Online Neural Mode: Calls state-of-the-art Transformer Neural Embedding API (text-embedding-3-small) with L1 Cache.
 * 2. Unsupervised Feature Hashing Engine: Mathematical Character N-gram Hashing Trick (Weinberger et al. ICML)
 *    for morphological root dispersion without manual word lists.
 * 3. Interactive Testing Toggle: Supports runtime simulation of Online vs Offline mode via API/UI.
 */
@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);
    public static final int EMBEDDING_DIM = 1536;

    @Value("${app.ai.openai.api-key:${OPENAI_API_KEY:}}")
    private String openAiApiKey;

    @Value("${app.ai.openrouter.api-key:${OPENROUTER_API_KEY:}}")
    private String openRouterApiKey;

    @Value("${app.ai.openrouter.base-url:https://openrouter.ai/api/v1}")
    private String openRouterBaseUrl;

    @Value("${app.ai.embedding.model:openai/text-embedding-3-small}")
    private String embeddingModel;

    @Value("${app.ai.embedding.online.enabled:true}")
    private boolean onlineEmbeddingEnabled;

    /**
     * Runtime Interactive Toggle to simulate turning OFF API Key for live demo / testing.
     */
    private volatile boolean forceOfflineSimulation = false;

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    /**
     * In-Memory L1 Cache for frequent query embeddings.
     * Yields < 0.1ms latency and 0 API cost for repeated queries.
     */
    private final Cache<String, float[]> embeddingCache = Caffeine.newBuilder()
            .maximumSize(2_000)
            .expireAfterWrite(24, TimeUnit.HOURS)
            .build();

    public EmbeddingService() {
        this(new ObjectMapper());
    }

    public EmbeddingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        var requestFactory = new org.springframework.http.client.JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public boolean isForceOfflineSimulation() {
        return forceOfflineSimulation;
    }

    public void setForceOfflineSimulation(boolean forceOffline) {
        this.forceOfflineSimulation = forceOffline;
        invalidateCache();
        log.info("🔀 [VECTOR AI TOGGLE] Forced offline simulation set to: {}", forceOffline);
    }

    public void invalidateCache() {
        embeddingCache.invalidateAll();
        log.info("🧹 In-memory embedding cache cleared.");
    }

    public boolean isOnlineNeuralActive() {
        return !forceOfflineSimulation
                && onlineEmbeddingEnabled
                && ((openRouterApiKey != null && !openRouterApiKey.isBlank())
                || (openAiApiKey != null && !openAiApiKey.isBlank()));
    }

    public String getActiveEngineDescription() {
        if (forceOfflineSimulation) {
            return "Giả Lập Tắt API Key (Unsupervised Character N-gram Hashing 1536-d)";
        }
        if (isOnlineNeuralActive()) {
            return "Mạng Nơ-ron Transformer Trực Tuyến (" + embeddingModel + " 1536-d)";
        }
        return "Cục Bộ Unsupervised Feature Hashing (Không Dùng Từ Điển Tĩnh 1536-d)";
    }

    /**
     * Generates a 1536-dimensional normalized vector embedding.
     * Strategy:
     * 1. Query L1 In-Memory Cache (0ms, 0đ).
     * 2. If online mode is active: Call neural embedding API (text-embedding-3-small).
     * 3. Fallback / Offline Test: Unsupervised Sub-word Character N-gram Hashing Trick (Zero Hardcoded Dictionary).
     */
    public float[] generateEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return new float[EMBEDDING_DIM];
        }

        String normalizedKey = stripAccents(text.trim().toLowerCase());
        float[] cached = embeddingCache.getIfPresent(normalizedKey);
        if (cached != null) {
            return cached;
        }

        float[] embedding = null;

        // Check if user forced offline mode for testing
        if (forceOfflineSimulation) {
            log.debug("🔌 [VECTOR AI] Running in Forced Offline Simulation Mode (Unsupervised Hashing Trick)");
            embedding = generateUnsupervisedHashingEmbedding(text);
        } else {
            // Priority 1: Remote Neural Embedding API if keys are provided
            if (isOnlineNeuralActive()) {
                embedding = generateRemoteNeuralEmbedding(text);
            }

            // Priority 2 / Fallback: Unsupervised Sub-word Feature Hashing
            if (embedding == null || embedding.length != EMBEDDING_DIM) {
                embedding = generateUnsupervisedHashingEmbedding(text);
            }
        }

        if (embedding != null && embedding.length == EMBEDDING_DIM) {
            embeddingCache.put(normalizedKey, embedding);
        }

        return embedding;
    }

    /**
     * Calls OpenAI or OpenRouter REST API for text-embedding-3-small (1536 dimensions).
     */
    private float[] generateRemoteNeuralEmbedding(String text) {
        try {
            String apiKey = (openRouterApiKey != null && !openRouterApiKey.isBlank()) ? openRouterApiKey : openAiApiKey;
            String url = (openRouterApiKey != null && !openRouterApiKey.isBlank())
                    ? openRouterBaseUrl + "/embeddings"
                    : "https://api.openai.com/v1/embeddings";

            String model = (openRouterApiKey != null && !openRouterApiKey.isBlank())
                    ? embeddingModel
                    : "text-embedding-3-small";

            Map<String, Object> req = Map.of(
                    "model", model,
                    "input", text.length() > 2000 ? text.substring(0, 2000) : text
            );

            log.info("🧠 [NEURAL EMBEDDING API] Invoking model '{}' via {} (text len: {})", model, url, text.length());

            byte[] responseBytes = restClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(byte[].class);

            if (responseBytes != null && responseBytes.length > 0) {
                JsonNode root = objectMapper.readTree(responseBytes);
                JsonNode dataNode = root.path("data").path(0).path("embedding");
                if (dataNode.isArray() && dataNode.size() == EMBEDDING_DIM) {
                    float[] vec = new float[EMBEDDING_DIM];
                    for (int i = 0; i < EMBEDDING_DIM; i++) {
                        vec[i] = (float) dataNode.get(i).asDouble();
                    }
                    normalizeL2(vec);
                    log.info("✅ Successfully generated 1536-d neural embedding via {}", model);
                    return vec;
                }
            }
        } catch (Exception ex) {
            log.warn("⚠️ Remote neural embedding failed ({}), activating Unsupervised Hashing Fallback: {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
        }
        return null;
    }

    /**
     * Unsupervised Sub-word Character N-gram Hashing Trick & Random Projection Engine.
     * Mathematical Foundation: Weinberger et al. (ICML) Feature Hashing / Vowpal Wabbit.
     * ZERO Hardcoded Keywords or Specialty Dictionaries.
     *
     * How it works:
     * 1. Text is normalized and split into word tokens.
     * 2. Each token is decomposed into character n-grams of lengths 2..5 (capturing morphological roots and compounding).
     * 3. Each n-gram is hashed via 64-bit FNV-1a double hashing:
     *    - Dimension index: abs(hash1) % 1536
     *    - Sign projection: (abs(hash2) % 2 == 0) ? +1.0 : -1.0
     * 4. Sub-words with identical roots naturally cluster along continuous dimensions without manual dictionaries.
     * 5. Strict L2 unit normalization: ||v|| = 1.0.
     */
    public float[] generateUnsupervisedHashingEmbedding(String text) {
        float[] vector = new float[EMBEDDING_DIM];
        if (text == null || text.isBlank()) {
            return vector;
        }
        String normalized = stripAccents(text.toLowerCase());
        String[] words = normalized.split("[^a-z0-9]+");

        for (String word : words) {
            if (word.isBlank()) continue;

            // 1. Token-level hash dispersion
            long tokenHash = fnv1a64(word, 0xcbf29ce484222325L);
            int tokenDim = (int) (Math.abs(tokenHash) % EMBEDDING_DIM);
            float tokenSign = ((tokenHash >> 32) % 2 == 0) ? 1.0f : -1.0f;
            vector[tokenDim] += tokenSign * 1.5f;

            // 2. Sub-word character n-grams (lengths 2 to 5) capturing morphology
            int len = word.length();
            for (int n = 2; n <= Math.min(5, len); n++) {
                for (int i = 0; i <= len - n; i++) {
                    String ngram = word.substring(i, i + n);
                    long h1 = fnv1a64(ngram, 0x811c9dc5 ^ n);
                    long h2 = fnv1a64(ngram, 0x1000193 ^ (n * 31L));

                    int dim = (int) (Math.abs(h1) % EMBEDDING_DIM);
                    float sign = (Math.abs(h2) % 2 == 0) ? 1.0f : -1.0f;
                    float weight = 0.5f + (n * 0.15f);
                    vector[dim] += sign * weight;
                }
            }
        }

        // Strict L2 Normalization (Cosine distance requires unit vectors: ||v|| = 1.0)
        normalizeL2(vector);

        return vector;
    }

    private long fnv1a64(String str, long seed) {
        long hash = seed;
        for (int i = 0; i < str.length(); i++) {
            hash ^= str.charAt(i);
            hash *= 0x100000001b3L;
        }
        return hash;
    }

    private void normalizeL2(float[] vector) {
        float norm = 0.0f;
        for (float v : vector) {
            norm += v * v;
        }
        norm = (float) Math.sqrt(norm);

        if (norm > 0.000001f) {
            for (int i = 0; i < EMBEDDING_DIM; i++) {
                vector[i] /= norm;
            }
        } else {
            float uniform = (float) (1.0 / Math.sqrt(EMBEDDING_DIM));
            Arrays.fill(vector, uniform);
        }
    }

    /**
     * Converts float[] embedding to PostgreSQL vector literal: "[0.1234,0.5678,...]"
     */
    public String toVectorSqlString(float[] vector) {
        StringBuilder sb = new StringBuilder(vector.length * 9);
        sb.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format(Locale.US, "%.6f", vector[i]));
        }
        sb.append(']');
        return sb.toString();
    }

    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    public String stripAccents(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
