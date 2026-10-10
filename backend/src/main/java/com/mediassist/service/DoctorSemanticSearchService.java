package com.mediassist.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;
import com.mediassist.repository.DoctorProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Enterprise Clinical Doctor Semantic Search Service.
 * Implements SOTA Hybrid Retrieval Architecture:
 * 1. Clinical Query Expansion: Normalizes layman complaints into medical ontology synonyms.
 * 2. Enriched Clinical Persona Vector: Embeds full clinical competencies, ICD-10 conditions, and symptoms.
 * 3. Hybrid Search: Dense Vector Cosine Similarity (pgvector) fused with Lexical Pattern Matching.
 * 4. WHRF Multi-Criteria Re-Ranking: Bounded Min-Heap O(M log K) with credibility damping and academic weights.
 */
@Service
public class DoctorSemanticSearchService {

    private static final Logger log = LoggerFactory.getLogger(DoctorSemanticSearchService.class);
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final DoctorProfileRepository doctorProfileRepository;

    /**
     * High-speed L1 In-Memory Cache for frequent symptom/specialty doctor semantic queries.
     * Prevents redundant pgvector HNSW scans for identical clinical query texts.
     */
    private final Cache<String, List<DoctorMatchDto>> doctorSearchCache = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(2_000)
            .build();

    // Comprehensive Clinical Knowledge Domain Mapping for Persona Enrichment
    private static final Map<String, String> SPECIALTY_COMPETENCY_DICTIONARY = Map.ofEntries(
            Map.entry("cardiology", "Chẩn đoán và điều trị chuyên sâu bệnh mạch vành, nhồi máu cơ tim, suy tim, tăng huyết áp, rối loạn nhịp tim, rung nhĩ, ngoại tâm thu, hở hẹp van tim, xơ vữa động mạch, suy giãn tĩnh mạch. Triệu chứng: đau thắt ngực, nặng ngực, hồi hộp, đánh trống ngực, khó thở khi gắng sức, phù chân. Cận lâm sàng: Troponin T, ECG, siêu âm tim, Holter, chụp mạch vành."),
            Map.entry("endocrinology", "Chẩn đoán và điều trị đái tháo đường (tiểu đường type 1, type 2), bệnh lý tuyến giáp (bướu cổ, suy giáp, cường giáp, Basedow, nhân tuyến giáp), u tuyến yên, suy tuyến thượng thận, hội chứng Cushing, rối loạn chuyển hóa lipid. Triệu chứng: khát nước, sụt cân, tiểu nhiều, run tay, mắt lồi, mệt mỏi vô cớ. Cận lâm sàng: Glucose, HbA1c, TSH, FT4, Anti-TPO, Cortisol."),
            Map.entry("nephrology", "Chẩn đoán và điều trị suy thận cấp và mạn, viêm cầu thận, hội chứng thận hư, sỏi thận, sỏi tiết niệu, nhiễm trùng đường tiểu, viêm bàng quang, phì đại tuyến tiền liệt. Triệu chứng: tiểu buốt, tiểu rắt, tiểu máu, tiểu đêm nhiều lần, nước tiểu sẫm màu, đau hông lưng, phù mặt và chân. Cận lâm sàng: Creatinine, Ure, eGFR, Acid Uric, Protein niệu, siêu âm hệ tiết niệu."),
            Map.entry("gastroenterology", "Chẩn đoán và điều trị viêm loét dạ dày tá tràng, trào ngược dạ dày thực quản (GERD), nhiễm vi khuẩn HP (Helicobacter pylori), viêm đại tràng, hội chứng ruột kích thích (IBS), viêm gan B, viêm gan C, xơ gan, gan nhiễm mỡ, sỏi mật, viêm tụy. Triệu chứng: đau thượng vị, ợ chua, ợ nóng, đầy hơi, khó tiêu, buồn nôn, tiêu chảy, táo bón, vàng da vàng mắt. Cận lâm sàng: ALT, AST, GGT, Bilirubin, nội soi dạ dày, đại tràng."),
            Map.entry("pulmonology", "Chẩn đoán và điều trị viêm phế quản, viêm phổi, hen phế quản (hen suyễn), bệnh phổi tắc nghẽn mạn tính (COPD), giãn phế quản, lao phổi, tràn dịch màng phổi. Triệu chứng: ho khan, ho có đờm, ho ra máu, khó thở, thở rít, thở khò khè, hụt hơi, đau tức ngực khi thở sâu. Cận lâm sàng: X-quang phổi, CT ngực, đo chức năng hô hấp, SpO2, khí máu động mạch."),
            Map.entry("neurology", "Chẩn đoán và điều trị đau đầu, đau nửa đầu (Migraine), rối loạn tiền đình, chóng mặt, mất thăng bằng, mất ngủ kéo dài, suy nhược thần kinh, đột quỵ, tai biến mạch máu não, nhồi máu não, động kinh, co giật, Parkinson, suy giảm trí nhớ (Alzheimer). Triệu chứng: đau đầu, hoa mắt, tê bì tay chân, yếu liệt nửa người, méo miệng, nói ngọng, run tay chân. Cận lâm sàng: MRI sọ não, CT não, điện não đồ (EEG)."),
            Map.entry("dermatology", "Chẩn đoán và điều trị mụn trứng cá, mụn viêm, viêm da cơ địa, chàm (eczema), vảy nến, mề đay, dị ứng da, zona thần kinh, thủy đậu, nấm da, hắc lào, lang ben, viêm nang lông, rụng tóc, nấm móng, nám da, tàn nhang. Triệu chứng: ngứa ngáy, phát ban đỏ, sẩn ngứa, mụn nước, bong tróc da, loét da. Cận lâm sàng: soi nấm da, sinh thiết da, test áp dị nguyên."),
            Map.entry("orthopedics", "Chẩn đoán và điều trị thoái hóa khớp gối, thoái hóa cột sống, thoát vị đĩa đệm, đau lưng, đau vai gáy, viêm khớp dạng thấp, bệnh Gút (Gout), loãng xương, gai cột sống, đứt dây chằng chéo, rách sụn chêm, gãy xương, trật khớp. Triệu chứng: đau nhức xương khớp, cứng khớp buổi sáng, sưng nóng đỏ khớp, hạn chế vận động, đau thần kinh tọa. Cận lâm sàng: X-quang khớp, MRI khớp, đo mật độ xương (DEXA), Acid Uric, CRP, RF."),
            Map.entry("pediatrics", "Khám và điều trị toàn diện bệnh lý trẻ em và trẻ sơ sinh: sốt cao, co giật do sốt, viêm tiểu phế quản, viêm phổi trẻ em, tiêu chảy cấp, mất nước, tay chân miệng, sởi, sốt xuất huyết ở trẻ, biếng ăn, chậm lớn, suy dinh dưỡng, còi xương, tư vấn tiêm chủng vắc xin và phát triển thể chất tinh thần."),
            Map.entry("obstetrics-gynecology", "Khám thai định kỳ, theo dõi thai nghén, nghén nặng, dọa sảy thai, đái tháo đường thai kỳ, siêu âm thai sản; điều trị u xơ tử cung, u nang buồng trứng, lạc nội mạc tử cung, buồng trứng đa nang (PCOS), viêm âm đạo, viêm lộ tuyến cổ tử cung, rong kinh, đau bụng kinh, rối loạn kinh nguyệt, tầm soát ung thư cổ tử cung (Pap smear, HPV)."),
            Map.entry("ent", "Chẩn đoán và điều trị viêm amidan, viêm xoang mũi mạn tính, polyp mũi, ngạt mũi kéo dài, viêm tai giữa, thủng màng nhĩ, chảy mủ tai, ù tai, nghe kém, viêm họng hạt, viêm thanh quản, khàn tiếng kéo dài, mất tiếng, nuốt vướng, nuốt đau, chảy máu cam, ngủ ngáy. Cận lâm sàng: nội soi tai mũi họng vi thể, đo thính lực."),
            Map.entry("general-internal-medicine", "Khám sức khỏe tổng quát, tầm soát bệnh lý mạn tính và ung thư sớm, mệt mỏi suy nhược cơ thể, sốt kéo dài không rõ nguyên nhân, sốt xuất huyết, thiếu máu, sụt cân không rõ lý do, chán ăn, kiểm tra chức năng gan thận chuyển hóa toàn diện, tư vấn sức khỏe tiền hôn nhân và định hướng chuyên khoa.")
    );

    public DoctorSemanticSearchService(JdbcTemplate jdbcTemplate,
                                       EmbeddingService embeddingService,
                                       DoctorProfileRepository doctorProfileRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingService = embeddingService;
        this.doctorProfileRepository = doctorProfileRepository;
    }

    public void invalidateCache() {
        doctorSearchCache.invalidateAll();
        log.info("🧹 In-memory doctor semantic search cache invalidated.");
    }

    /**
     * Updates or computes vector embedding for a single doctor profile.
     */
    @Transactional
    public void updateDoctorEmbedding(UUID profileId, String content) {
        float[] embedding = embeddingService.generateEmbedding(content);
        String vectorStr = embeddingService.toVectorSqlString(embedding);

        jdbcTemplate.update(
                "UPDATE doctor_profiles SET bio_embedding = CAST(? AS vector) WHERE id = ?",
                vectorStr, profileId
        );
        invalidateCache();
        log.info("🧠 Updated bio_embedding vector for doctor profile ID: {}", profileId);
    }

    /**
     * Synchronizes and calculates enriched persona vector embeddings for all doctors.
     * Incorporates full clinical competency keywords, treated conditions, and diagnostic tests.
     */
    @Transactional
    public void syncAllDoctorEmbeddings() {
        List<DoctorProfile> profiles = doctorProfileRepository.findAllWithUserAndSpecialties();
        for (DoctorProfile dp : profiles) {
            String enrichedText = buildEnrichedDoctorEmbeddingText(dp);
            updateDoctorEmbedding(dp.getId(), enrichedText);
        }
        invalidateCache();
        log.info("✅ Synced enriched clinical vector embeddings for {} doctors", profiles.size());
    }

    /**
     * Builds comprehensive clinical persona text representation for vector projection.
     */
    public String buildEnrichedDoctorEmbeddingText(DoctorProfile dp) {
        String specialtyNames = dp.getSpecialties().stream()
                .map(Specialty::getName)
                .collect(Collectors.joining(", "));

        StringBuilder competencyBuilder = new StringBuilder();
        for (Specialty s : dp.getSpecialties()) {
            if (s.getSlug() != null && SPECIALTY_COMPETENCY_DICTIONARY.containsKey(s.getSlug())) {
                competencyBuilder.append(" ").append(SPECIALTY_COMPETENCY_DICTIONARY.get(s.getSlug()));
            }
        }

        return String.format(
                "Bác sĩ: %s %s. Chuyên khoa chính: %s. Cơ sở công tác: %s - %s. Kinh nghiệm: %d năm. " +
                "Tiểu sử và năng lực lâm sàng: %s. " +
                "Danh mục bệnh lý điều trị và phạm vi chuyên môn sâu: %s",
                dp.getAcademicTitle() != null ? dp.getAcademicTitle() : "Bác sĩ",
                dp.getUser() != null ? dp.getUser().getFullName() : "",
                specialtyNames,
                dp.getHospitalAffiliation() != null ? dp.getHospitalAffiliation() : "Bệnh viện Đa Khoa MediAssist",
                dp.getDepartment() != null ? dp.getDepartment() : "Khoa Khám Bệnh",
                dp.getYearsOfExperience(),
                dp.getBio() != null ? dp.getBio() : "",
                competencyBuilder.toString().trim()
        );
    }

    /**
     * Clinical Query Expansion Engine:
     * Enriches layman symptoms with clinical synonyms to maximize vector cosine alignment.
     */
    public String expandClinicalQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return "";
        }
        String normalized = stripAccents(rawQuery.toLowerCase());
        StringBuilder expanded = new StringBuilder(rawQuery.trim());

        // Expansion Rules
        if (normalized.contains("nguc") || normalized.contains("tim") || normalized.contains("mach") || normalized.contains("huyet ap")) {
            expanded.append(" tim mach dau that nguc mach vanh tang huyet ap hoi hop loan nhip tim");
        }
        if (normalized.contains("tho") || normalized.contains("phoi") || normalized.contains("ho") || normalized.contains("dom")) {
            expanded.append(" ho hap viem phoi phe quan hen suyen copd ho khan ho dom");
        }
        if (normalized.contains("dau dau") || normalized.contains("chong mat") || normalized.contains("tien dinh") || normalized.contains("mat ngu")) {
            expanded.append(" than kinh roi loan tien dinh dau nua dau migraine tai bien dot quy mat ngu");
        }
        if (normalized.contains("bung") || normalized.contains("da day") || normalized.contains("gan") || normalized.contains("tieu hoa") || normalized.contains("o chua")) {
            expanded.append(" tieu hoa gan mat viem loet da day trao nguoc gerd dai trang men gan cao");
        }
        if (normalized.contains("tieu duong") || normalized.contains("duong huyet") || normalized.contains("tuyen giap") || normalized.contains("buou co")) {
            expanded.append(" noi tiet dai thao duong glucose hba1c suy giap cuong giap basedow");
        }
        if (normalized.contains("than") || normalized.contains("tieu buot") || normalized.contains("tieu dem") || normalized.contains("soi than")) {
            expanded.append(" than tiet nieu suy than soi nieu creatinine protein nieu viem bang quang");
        }
        if (normalized.contains("khop") || normalized.contains("xuong") || normalized.contains("lung") || normalized.contains("gay") || normalized.contains("gout")) {
            expanded.append(" co xuong khop thoai hoa khop cot song thoat vi dia dem benh gut viem khop");
        }
        if (normalized.contains("da") || normalized.contains("ngua") || normalized.contains("mun") || normalized.contains("di ung")) {
            expanded.append(" da lieu viem da co dia cham vay nen me day phat ban nam da");
        }
        if (normalized.contains("tai") || normalized.contains("mui") || normalized.contains("hong") || normalized.contains("xoang") || normalized.contains("khan")) {
            expanded.append(" tai mui hong viem xoang viem amidan viem hong hat u tai");
        }
        if (normalized.contains("thai") || normalized.contains("phu khoa") || normalized.contains("kinh nguyet") || normalized.contains("u xo")) {
            expanded.append(" san phu khoa kham thai u xo tu cung buong trung viem phu khoa");
        }
        if (normalized.contains("be") || normalized.contains("con") || normalized.contains("tre") || normalized.contains("so sinh")) {
            expanded.append(" nhi khoa tre em sot co giat bieng an tieu chay");
        }

        return expanded.toString().trim();
    }

    /**
     * Performs SOTA Hybrid Search over verified doctors:
     * - Vector Dense Retrieval: 1536-d cosine distance on enriched persona embedding.
     * - Lexical Sparse Matching: Tokenized full-text match on doctor name, hospital, and specialties.
     * - Hybrid Fusion Score: 0.75 * VectorSimilarity + 0.25 * LexicalMatch.
     * - WHRF Multi-Criteria Re-Ranking: Bounded Min-Heap O(M log K).
     */
    public List<DoctorMatchDto> searchDoctors(String queryText, int limit) {
        if (queryText == null || queryText.isBlank()) {
            return Collections.emptyList();
        }

        int effectiveLimit = Math.max(1, Math.min(20, limit));
        String cacheKey = queryText.trim().toLowerCase() + "::limit=" + effectiveLimit;
        List<DoctorMatchDto> cached = doctorSearchCache.getIfPresent(cacheKey);
        if (cached != null) {
            log.debug("⚡ [L1 CACHE HIT] Doctor semantic search for query: '{}'", queryText);
            return cached;
        }

        // 1. Expand query with medical synonyms
        String expandedQuery = expandClinicalQuery(queryText);
        float[] queryVector = embeddingService.generateEmbedding(expandedQuery);
        String vectorSql = embeddingService.toVectorSqlString(queryVector);

        // Candidate pool for Hybrid WHRF Re-Ranking
        int candidateLimit = Math.max(effectiveLimit, Math.min(30, effectiveLimit * 3));

        String rawWildcard = "%" + queryText.trim().toLowerCase() + "%";

        // Hybrid SQL: Cosine Similarity + Multi-Field Lexical Match Fusion
        String sql = """
            SELECT u.id AS doctor_user_id, dp.id AS doctor_profile_id, u.full_name, dp.bio, dp.license_number,
                   dp.years_of_experience, dp.consultation_fee,
                   dp.academic_title, dp.hospital_affiliation,
                   dp.rating, dp.review_count,
                   (1 - (dp.bio_embedding <=> CAST(? AS vector))) AS raw_vector_score,
                   (
                       CASE
                           WHEN LOWER(u.full_name) ILIKE ? THEN 1.0
                           WHEN LOWER(COALESCE(dp.hospital_affiliation, '')) ILIKE ? THEN 0.8
                           WHEN EXISTS (
                               SELECT 1 FROM doctor_specialties ds2
                               JOIN specialties s2 ON ds2.specialty_id = s2.id
                               WHERE ds2.doctor_profile_id = dp.id AND LOWER(s2.name) ILIKE ?
                           ) THEN 0.95
                           WHEN LOWER(COALESCE(dp.bio, '')) ILIKE ? THEN 0.6
                           ELSE 0.0
                       END
                   ) AS lexical_score,
                   COALESCE((
                       SELECT string_agg(s.name, ', ')
                       FROM doctor_specialties ds
                       JOIN specialties s ON ds.specialty_id = s.id
                       WHERE ds.doctor_profile_id = dp.id
                   ), '') AS specialties_str
            FROM doctor_profiles dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.is_verified = true AND dp.bio_embedding IS NOT NULL
            ORDER BY (
                0.75 * (1 - (dp.bio_embedding <=> CAST(? AS vector))) +
                0.25 * (
                    CASE
                        WHEN LOWER(u.full_name) ILIKE ? THEN 1.0
                        WHEN LOWER(COALESCE(dp.hospital_affiliation, '')) ILIKE ? THEN 0.8
                        WHEN EXISTS (
                            SELECT 1 FROM doctor_specialties ds3
                            JOIN specialties s3 ON ds3.specialty_id = s3.id
                            WHERE ds3.doctor_profile_id = dp.id AND LOWER(s3.name) ILIKE ?
                        ) THEN 0.95
                        WHEN LOWER(COALESCE(dp.bio, '')) ILIKE ? THEN 0.6
                        ELSE 0.0
                    END
                )
            ) DESC
            LIMIT ?
            """;

        try {
            List<DoctorMatchDto> candidates = jdbcTemplate.query(
                    sql,
                    (rs, rowNum) -> {
                        UUID docUserId = UUID.fromString(rs.getString("doctor_user_id"));
                        UUID profileId = UUID.fromString(rs.getString("doctor_profile_id"));
                        String fullName = rs.getString("full_name");
                        String bio = rs.getString("bio");
                        String license = rs.getString("license_number");
                        int exp = rs.getInt("years_of_experience");
                        BigDecimal fee = rs.getBigDecimal("consultation_fee");
                        String academicTitle = rs.getString("academic_title");
                        String hospitalAffiliation = rs.getString("hospital_affiliation");
                        double docRating = rs.getObject("rating") != null ? rs.getDouble("rating") : 4.9;
                        int reviewCount = rs.getInt("review_count");

                        double vectorScore = Math.max(0.0, Math.min(1.0, rs.getDouble("raw_vector_score")));
                        double lexicalScore = rs.getDouble("lexical_score");

                        // Hybrid Fusion Score: 75% Neural Vector + 25% Exact Keyword Match
                        double fusedScore = (0.75 * vectorScore) + (0.25 * lexicalScore);

                        String specialtiesStr = rs.getString("specialties_str");
                        List<String> specs = (specialtiesStr != null && !specialtiesStr.isBlank())
                                ? Arrays.stream(specialtiesStr.split(","))
                                        .map(String::trim)
                                        .filter(s -> !s.isBlank())
                                        .collect(Collectors.toList())
                                : Collections.emptyList();

                        return new DoctorMatchDto(docUserId, fullName, bio, license, exp, fee, fusedScore, specs, academicTitle, hospitalAffiliation, docRating, reviewCount);
                    },
                    vectorSql, rawWildcard, rawWildcard, rawWildcard, rawWildcard,
                    vectorSql, rawWildcard, rawWildcard, rawWildcard, rawWildcard,
                    candidateLimit
            );

            List<DoctorMatchDto> results = rankDoctors(candidates, queryText, effectiveLimit);

            if (results != null && !results.isEmpty()) {
                doctorSearchCache.put(cacheKey, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            log.error("❌ SOTA Hybrid search query error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Weighted Multi-Criteria Hybrid Re-Ranking (WHRF) using Bounded Min-Heap PriorityQueue.
     * Time Complexity: O(M log K) where M is candidate pool size and K is effectiveLimit.
     *
     * Composite Score Formula:
     * CompositeScore = 0.50 * FusedSim + 0.20 * RatingScore + 0.15 * ExpScore + 0.15 * AcademicScore + SpecialtyBonus (0.08)
     */
    public List<DoctorMatchDto> rankDoctors(List<DoctorMatchDto> candidates, String queryText, int limit) {
        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyList();
        }
        int effectiveLimit = Math.max(1, limit);
        String normalizedQuery = stripAccents(queryText != null ? queryText.toLowerCase() : "");

        // Bounded Min-Heap PriorityQueue: stores at most effectiveLimit candidates
        PriorityQueue<DoctorMatchDto> minHeap = new PriorityQueue<>(
                effectiveLimit,
                Comparator.comparingDouble(DoctorMatchDto::getSimilarityScore)
        );

        for (DoctorMatchDto candidate : candidates) {
            double compositeScore = calculateCompositeScore(candidate, normalizedQuery);
            candidate.setSimilarityScore(Math.round(compositeScore * 1000.0) / 1000.0);

            if (minHeap.size() < effectiveLimit) {
                minHeap.offer(candidate);
            } else if (candidate.getSimilarityScore() > minHeap.peek().getSimilarityScore()) {
                minHeap.poll();
                minHeap.offer(candidate);
            }
        }

        // Extract elements from Min-Heap and sort in descending order (O(K log K))
        List<DoctorMatchDto> ranked = new ArrayList<>(minHeap);
        ranked.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));

        // Assign AI recommendation to top doctor if score is sufficiently high (>= 0.65)
        if (!ranked.isEmpty() && ranked.get(0).getSimilarityScore() >= 0.65) {
            ranked.get(0).setAiRecommended(true);
            ranked.get(0).setAiRecommendationReason("Bác sĩ được đề xuất hàng đầu dựa trên sự tương thích chuyên môn sâu và kinh nghiệm lâm sàng.");
        }

        return ranked;
    }

    private double calculateCompositeScore(DoctorMatchDto doc, String normalizedQuery) {
        double fusedSim = doc.getSimilarityScore();
        double expScore = Math.min(1.0, Math.max(0, doc.getYearsOfExperience()) / 25.0);
        double academicScore = computeAcademicScore(doc.getAcademicTitle());

        // Patient Rating & Clinical Trust Score (20% weight in WHRF)
        double ratingVal = doc.getRating() != null ? doc.getRating() : 4.5;
        double ratingScore = Math.max(0.0, Math.min(1.0, ratingVal / 5.0));

        // Credibility damper: doctors with fewer reviews slightly blended with neutral baseline
        int reviews = doc.getReviewCount();
        double credibility = reviews >= 5 ? 1.0 : (0.70 + 0.06 * reviews);
        double adjustedRating = ratingScore * credibility;

        double specialtyBonus = computeSpecialtyBonus(doc.getSpecialties(), normalizedQuery);

        double composite = (0.50 * fusedSim) + (0.20 * adjustedRating) + (0.15 * expScore) + (0.15 * academicScore) + specialtyBonus;
        return Math.min(1.0, Math.max(0.0, composite));
    }

    private double computeAcademicScore(String title) {
        if (title == null || title.isBlank()) {
            return 0.5;
        }
        String upper = title.toUpperCase();
        if (upper.contains("PGS") || upper.contains("PHÓ GIÁO SƯ") || upper.contains("PHO GIAO SU")) {
            return 0.9;
        }
        if (upper.contains("GS") || upper.contains("GIÁO SƯ") || upper.contains("GIAO SU")) {
            return 1.0;
        }
        if (upper.contains("THS") || upper.contains("THẠC SĨ") || upper.contains("THAC SI")) {
            return 0.7;
        }
        if (upper.contains("TS") || upper.contains("TIẾN SĨ") || upper.contains("TIEN SI") || upper.contains("CKII") || upper.contains("CK2")) {
            return 0.8;
        }
        if (upper.contains("CKI") || upper.contains("CK1")) {
            return 0.6;
        }
        return 0.5;
    }

    private double computeSpecialtyBonus(List<String> specialties, String normalizedQuery) {
        if (specialties == null || specialties.isEmpty() || normalizedQuery == null || normalizedQuery.isBlank()) {
            return 0.0;
        }
        for (String spec : specialties) {
            if (spec != null && !spec.isBlank()) {
                String normSpec = stripAccents(spec.toLowerCase());
                if (normalizedQuery.contains(normSpec)) {
                    return 0.08;
                }
                for (String part : normSpec.split("\\s+")) {
                    if (part.length() >= 3 && normalizedQuery.contains(part)) {
                        return 0.08;
                    }
                }
            }
        }
        return 0.0;
    }

    private String stripAccents(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'd');
    }
}
