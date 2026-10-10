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
    @DisplayName("Should have higher cosine similarity for semantically related medical concepts (Cardio vs Derma)")
    void testSemanticCosineSimilarity_CardioVsDerma() {
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
    @DisplayName("Should discriminate Gastroenterology from Pulmonology accurately")
    void testSemanticCosineSimilarity_GastroVsPulmo() {
        String query = "Bị đau vùng thượng vị dạ dày, ợ chua và trào ngược thức ăn sau khi ăn";
        String gastroDoctor = "Bác sĩ Tiêu hóa - Gan mật, điều trị viêm loét dạ dày tá tràng và vi khuẩn HP";
        String pulmoDoctor = "Bác sĩ Hô hấp - Phổi, điều trị hen suyễn, COPD và viêm phế quản";

        float[] vQuery = embeddingService.generateEmbedding(query);
        float[] vGastro = embeddingService.generateEmbedding(gastroDoctor);
        float[] vPulmo = embeddingService.generateEmbedding(pulmoDoctor);

        float simGastro = cosineSimilarity(vQuery, vGastro);
        float simPulmo = cosineSimilarity(vQuery, vPulmo);

        assertTrue(simGastro > simPulmo,
                String.format("Expected gastro similarity (%.3f) > pulmo similarity (%.3f)", simGastro, simPulmo));
    }

    @Test
    @DisplayName("Should discriminate Nephrology from ENT accurately on lab tests")
    void testSemanticCosineSimilarity_NephroVsEnt() {
        String query = "Xét nghiệm chỉ số Creatinine máu tăng cao 180 umol/L, tiểu đêm nhiều lần và phù chân";
        String nephroDoctor = "Chuyên gia Thận - Tiết niệu, suy thận mạn và sỏi tiết niệu";
        String entDoctor = "Bác sĩ Tai Mũi Họng, viêm xoang mũi và viêm amidan họng hạt";

        float[] vQuery = embeddingService.generateEmbedding(query);
        float[] vNephro = embeddingService.generateEmbedding(nephroDoctor);
        float[] vEnt = embeddingService.generateEmbedding(entDoctor);

        float simNephro = cosineSimilarity(vQuery, vNephro);
        float simEnt = cosineSimilarity(vQuery, vEnt);

        assertTrue(simNephro > simEnt,
                String.format("Expected nephro similarity (%.3f) > ent similarity (%.3f)", simNephro, simEnt));
    }

    @Test
    @DisplayName("Should discriminate Neurology from Orthopedics accurately")
    void testSemanticCosineSimilarity_NeuroVsOrtho() {
        String query = "Hay bị hoa mắt chóng mặt, rối loạn tiền đình, đau nửa đầu và mất ngủ kéo dài";
        String neuroDoctor = "Bác sĩ Thần kinh, điều trị đau nửa đầu migraine, tai biến mạch máu não và sa sút trí tuệ";
        String orthoDoctor = "Bác sĩ Cơ xương khớp, thoái hóa khớp gối và thoát vị đĩa đệm cột sống thắt lưng";

        float[] vQuery = embeddingService.generateEmbedding(query);
        float[] vNeuro = embeddingService.generateEmbedding(neuroDoctor);
        float[] vOrtho = embeddingService.generateEmbedding(orthoDoctor);

        float simNeuro = cosineSimilarity(vQuery, vNeuro);
        float simOrtho = cosineSimilarity(vQuery, vOrtho);

        assertTrue(simNeuro > simOrtho,
                String.format("Expected neuro similarity (%.3f) > ortho similarity (%.3f)", simNeuro, simOrtho));
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

    @Test
    @DisplayName("Should support interactive toggle between Online Neural and Offline Simulation modes")
    void testForceOfflineSimulationToggle() {
        assertFalse(embeddingService.isForceOfflineSimulation());

        // Toggle to offline simulation
        embeddingService.setForceOfflineSimulation(true);
        assertTrue(embeddingService.isForceOfflineSimulation());
        assertTrue(embeddingService.getActiveEngineDescription().contains("Tắt API Key"));

        float[] offlineVec = embeddingService.generateEmbedding("bị đau đầu mất ngủ");
        assertNotNull(offlineVec);
        assertEquals(EmbeddingService.EMBEDDING_DIM, offlineVec.length);

        // Toggle back to online mode
        embeddingService.setForceOfflineSimulation(false);
        assertFalse(embeddingService.isForceOfflineSimulation());
    }

    private float cosineSimilarity(float[] v1, float[] v2) {
        float dot = 0.0f;
        for (int i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
        }
        return dot;
    }
}
