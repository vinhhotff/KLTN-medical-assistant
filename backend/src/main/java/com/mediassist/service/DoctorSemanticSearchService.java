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
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .maximumSize(1_000)
            .build();

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
     * Updates or computes vector embedding for a single doctor.
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
     * Synchronizes and calculates embeddings for all doctors who don't have one yet.
     */
    @Transactional
    public void syncAllDoctorEmbeddings() {
        List<DoctorProfile> profiles = doctorProfileRepository.findAllWithUserAndSpecialties();
        for (DoctorProfile dp : profiles) {
            String specialtyNames = dp.getSpecialties().stream()
                    .map(Specialty::getName)
                    .collect(Collectors.joining(", "));

            String doctorText = String.format("%s %s. %s - %s. %s. Chuyên khoa: %s. Kinh nghiệm: %d năm.",
                    dp.getAcademicTitle() != null ? dp.getAcademicTitle() : "",
                    dp.getUser() != null ? dp.getUser().getFullName() : "",
                    dp.getHospitalAffiliation() != null ? dp.getHospitalAffiliation() : "",
                    dp.getDepartment() != null ? dp.getDepartment() : "",
                    dp.getBio() != null ? dp.getBio() : "",
                    specialtyNames,
                    dp.getYearsOfExperience());

            updateDoctorEmbedding(dp.getId(), doctorText);
        }
        invalidateCache();
        log.info("✅ Synced vector embeddings for {} doctors", profiles.size());
    }

    /**
     * Performs pgvector Cosine Similarity search over verified doctors, followed by
     * Weighted Multi-Criteria Hybrid Re-Ranking (WHRF) using a bounded Min-Heap PriorityQueue.
     * Uses L1 Caffeine In-Memory Cache and single SQL query with correlated subquery string_agg
     * to eliminate N+1 database roundtrips.
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

        float[] queryVector = embeddingService.generateEmbedding(queryText);
        String vectorSql = embeddingService.toVectorSqlString(queryVector);

        // Fetch candidate pool up to min(30, effectiveLimit * 3) for Multi-Criteria Re-Ranking
        int candidateLimit = Math.max(effectiveLimit, Math.min(30, effectiveLimit * 3));

        // High-Performance Single Query with COALESCE subquery to eliminate N+1 DB roundtrips
        String sql = """
            SELECT u.id AS doctor_user_id, dp.id AS doctor_profile_id, u.full_name, dp.bio, dp.license_number,
                   dp.years_of_experience, dp.consultation_fee,
                   dp.academic_title, dp.hospital_affiliation,
                   1 - (dp.bio_embedding <=> CAST(? AS vector)) AS similarity_score,
                   COALESCE((
                       SELECT string_agg(s.name, ', ')
                       FROM doctor_specialties ds
                       JOIN specialties s ON ds.specialty_id = s.id
                       WHERE ds.doctor_profile_id = dp.id
                   ), '') AS specialties_str
            FROM doctor_profiles dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.is_verified = true AND dp.bio_embedding IS NOT NULL
            ORDER BY dp.bio_embedding <=> CAST(? AS vector) ASC
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
                        double score = Math.max(0.0, Math.min(1.0, rs.getDouble("similarity_score")));

                        String specialtiesStr = rs.getString("specialties_str");
                        List<String> specs = (specialtiesStr != null && !specialtiesStr.isBlank())
                                ? Arrays.stream(specialtiesStr.split(","))
                                        .map(String::trim)
                                        .filter(s -> !s.isBlank())
                                        .collect(Collectors.toList())
                                : Collections.emptyList();

                        return new DoctorMatchDto(docUserId, fullName, bio, license, exp, fee, score, specs, academicTitle, hospitalAffiliation);
                    },
                    vectorSql, vectorSql, candidateLimit
            );

            List<DoctorMatchDto> results = rankDoctors(candidates, queryText, effectiveLimit);

            if (results != null && !results.isEmpty()) {
                doctorSearchCache.put(cacheKey, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            log.error("❌ pgvector semantic search query error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Weighted Multi-Criteria Hybrid Re-Ranking (WHRF) using Bounded Min-Heap PriorityQueue.
     * Time Complexity: O(M log K) where M is candidate pool size and K is effectiveLimit.
     *
     * Composite Score Formula:
     * CompositeScore = 0.65 * CosineSim + 0.20 * min(1.0, exp / 25) + 0.15 * AcademicScore + SpecialtyBonus (0.08)
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

        // Assign AI recommendation to top doctor if score is sufficiently high (>= 0.70)
        if (!ranked.isEmpty() && ranked.get(0).getSimilarityScore() >= 0.70) {
            ranked.get(0).setAiRecommended(true);
            ranked.get(0).setAiRecommendationReason("Bác sĩ được đề xuất hàng đầu dựa trên sự tương thích chuyên môn và kinh nghiệm lâm sàng.");
        }

        return ranked;
    }

    private double calculateCompositeScore(DoctorMatchDto doc, String normalizedQuery) {
        double cosineSim = doc.getSimilarityScore();
        double expScore = Math.min(1.0, Math.max(0, doc.getYearsOfExperience()) / 25.0);
        double academicScore = computeAcademicScore(doc.getAcademicTitle());
        double specialtyBonus = computeSpecialtyBonus(doc.getSpecialties(), normalizedQuery);

        double composite = (0.65 * cosineSim) + (0.20 * expScore) + (0.15 * academicScore) + specialtyBonus;
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
