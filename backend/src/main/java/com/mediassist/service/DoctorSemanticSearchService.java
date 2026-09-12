package com.mediassist.service;

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
import java.util.stream.Collectors;

@Service
public class DoctorSemanticSearchService {

    private static final Logger log = LoggerFactory.getLogger(DoctorSemanticSearchService.class);

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final DoctorProfileRepository doctorProfileRepository;

    public DoctorSemanticSearchService(JdbcTemplate jdbcTemplate,
                                       EmbeddingService embeddingService,
                                       DoctorProfileRepository doctorProfileRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingService = embeddingService;
        this.doctorProfileRepository = doctorProfileRepository;
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
        log.info("✅ Synced vector embeddings for {} doctors", profiles.size());
    }

    /**
     * Performs pgvector Cosine Similarity search over verified doctors.
     */
    public List<DoctorMatchDto> searchDoctors(String queryText, int limit) {
        if (queryText == null || queryText.isBlank()) {
            return Collections.emptyList();
        }

        float[] queryVector = embeddingService.generateEmbedding(queryText);
        String vectorSql = embeddingService.toVectorSqlString(queryVector);

        String sql = """
            SELECT u.id AS doctor_user_id, dp.id AS doctor_profile_id, u.full_name, dp.bio, dp.license_number,
                   dp.years_of_experience, dp.consultation_fee,
                   dp.academic_title, dp.hospital_affiliation,
                   1 - (dp.bio_embedding <=> CAST(? AS vector)) AS similarity_score
            FROM doctor_profiles dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.is_verified = true AND dp.bio_embedding IS NOT NULL
            ORDER BY dp.bio_embedding <=> CAST(? AS vector) ASC
            LIMIT ?
            """;

        try {
            return jdbcTemplate.query(
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

                        // Fetch specialties
                        List<String> specs = jdbcTemplate.query(
                                """
                                SELECT s.name FROM specialties s
                                JOIN doctor_specialties ds ON s.id = ds.specialty_id
                                WHERE ds.doctor_profile_id = ?
                                """,
                                (rsSpec, idx) -> rsSpec.getString("name"),
                                profileId
                        );

                        return new DoctorMatchDto(docUserId, fullName, bio, license, exp, fee, score, specs, academicTitle, hospitalAffiliation);
                    },
                    vectorSql, vectorSql, limit
            );
        } catch (Exception e) {
            log.error("❌ pgvector semantic search query error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
