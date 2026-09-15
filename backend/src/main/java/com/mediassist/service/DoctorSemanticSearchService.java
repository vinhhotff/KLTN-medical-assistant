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
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class DoctorSemanticSearchService {

    private static final Logger log = LoggerFactory.getLogger(DoctorSemanticSearchService.class);

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
        List<DoctorProfile> profiles = doctorProfileRepository.findAll();
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
     * Performs pgvector Cosine Similarity search over verified doctors.
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
            List<DoctorMatchDto> results = jdbcTemplate.query(
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
                    vectorSql, vectorSql, effectiveLimit
            );

            if (results != null && !results.isEmpty()) {
                doctorSearchCache.put(cacheKey, results);
            }
            return results != null ? results : Collections.emptyList();
        } catch (Exception e) {
            log.error("❌ pgvector semantic search query error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
