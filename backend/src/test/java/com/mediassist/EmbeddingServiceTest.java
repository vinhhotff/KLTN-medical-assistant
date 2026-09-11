package com.mediassist;

import com.mediassist.service.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmbeddingServiceTest {

    private EmbeddingService embeddingService;

    @BeforeEach
    void setUp() {
        embeddingService = new EmbeddingService();
    }

    @Test
    @DisplayName("Should generate 1536-dimensional normalized vector")
    void testEmbeddingDimensionsAndNorm() {
        String text = "Bác sĩ chuyên khoa Tim Mạch điều trị rối loạn nhịp tim và suy tim";
        float[] vector = embeddingService.generateEmbedding(text);

        assertNotNull(vector);
        assertEquals(EmbeddingService.EMBEDDING_DIM, vector.length);

        // Verify L2 Norm is approximately 1.0 (unit sphere)
        float sumSq = 0.0f;
        for (float v : vector) {
            sumSq += v * v;
        }
        assertEquals(1.0f, (float) Math.sqrt(sumSq), 0.001f);
    }

    @Test
    @DisplayName("Should have higher cosine similarity for semantically related medical concepts")
    void testSemanticCosineSimilarity() {
        String query = "Tôi hay bị hồi hộp và đau tức ngực khi tập thể dục";
        String cardioDoctor = "Chuyên gia tim mạch, tầm soát bệnh mạch vành và nhịp tim";
        String dermaDoctor = "Bác sĩ da liễu, điều trị mụn trứng cá và viêm da cơ địa";

        float[] vQuery = embeddingService.generateEmbedding(query);
        float[] vCardio = embeddingService.generateEmbedding(cardioDoctor);
        float[] vDerma = embeddingService.generateEmbedding(dermaDoctor);

        float simCardio = cosineSimilarity(vQuery, vCardio);
        float simDerma = cosineSimilarity(vQuery, vDerma);

        assertTrue(simCardio > simDerma,
                String.format("Expected cardio similarity (%.3f) > derma similarity (%.3f)", simCardio, simDerma));
    }

    @Test
    @DisplayName("Should format vector properly for PostgreSQL CAST(? AS vector)")
    void testToVectorSqlString() {
        float[] vector = new float[]{0.123f, -0.456f, 0.789f};
        String sqlStr = embeddingService.toVectorSqlString(vector);

        assertTrue(sqlStr.startsWith("["));
        assertTrue(sqlStr.endsWith("]"));
        assertTrue(sqlStr.contains("0.123"));
        assertTrue(sqlStr.contains("-0.456"));
    }

    private float cosineSimilarity(float[] v1, float[] v2) {
        float dot = 0.0f;
        for (int i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
        }
        return dot;
    }
}
