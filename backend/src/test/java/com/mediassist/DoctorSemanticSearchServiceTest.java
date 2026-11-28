package com.mediassist;

import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DoctorSemanticSearchServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private EmbeddingService embeddingService;

    @Mock
    private DoctorProfileRepository doctorProfileRepository;

    private DoctorSemanticSearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new DoctorSemanticSearchService(jdbcTemplate, embeddingService, doctorProfileRepository);
        lenient().when(embeddingService.generateEmbedding(anyString())).thenReturn(new float[1536]);
        lenient().when(embeddingService.toVectorSqlString(any())).thenReturn("[0.0,0.0]");
    }

    @Test
    @DisplayName("searchDoctors returns empty list on null or blank query")
    void testSearchDoctors_NullOrBlankQuery_ReturnsEmpty() {
        assertTrue(searchService.searchDoctors(null, 4).isEmpty());
        assertTrue(searchService.searchDoctors("", 4).isEmpty());
        assertTrue(searchService.searchDoctors("   ", 4).isEmpty());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    @DisplayName("cleanseClinicalQuery strips conversational filler noise while preserving medical complaints")
    void testCleanseClinicalQuery_PreservesMedicalComplaints() {
        String noisyQuery = "Dạ thưa bác sĩ cho em hỏi dạo này em hay bị đau tức ngực khi tập thể dục nhờ bác sĩ tư vấn giúp em với ạ";
        String cleansed = searchService.cleanseClinicalQuery(noisyQuery);
        assertNotNull(cleansed);
        assertFalse(cleansed.toLowerCase().startsWith("dạ thưa bác sĩ cho em hỏi"));
        assertTrue(cleansed.contains("đau tức ngực"));

        String cleanQuery = "đau nửa đầu hoa mắt chóng mặt";
        assertEquals(cleanQuery, searchService.cleanseClinicalQuery(cleanQuery));
    }

    @Test
    @DisplayName("buildDoctorEmbeddingText constructs clinical text strictly from relational database fields")
    void testBuildDoctorEmbeddingText_FromDatabaseAttributes() {
        User user = new User();
        user.setFullName("GS.TS.BS Nguyễn Văn An");

        Specialty cardio = new Specialty();
        cardio.setName("Tim Mạch");
        cardio.setSlug("cardiology");
        cardio.setDescription("Chuyên khoa Tim mạch chẩn đoán và điều trị bệnh mạch vành, nhồi máu cơ tim và suy tim");

        DoctorProfile profile = new DoctorProfile();
        profile.setUser(user);
        profile.setAcademicTitle("GS.TS.BS");
        profile.setHospitalAffiliation("Bệnh viện Chợ Rẫy");
        profile.setDepartment("Khoa Tim Mạch Can Thiệp");
        profile.setYearsOfExperience(25);
        profile.setBio("Chuyên gia tim mạch hàng đầu");
        profile.setSpecialties(Set.of(cardio));

        String text = searchService.buildDoctorEmbeddingText(profile);
        assertNotNull(text);
        assertTrue(text.contains("Nguyễn Văn An"));
        assertTrue(text.contains("Tim Mạch"));
        assertTrue(text.contains("Chuyên khoa Tim mạch chẩn đoán và điều trị bệnh mạch vành"));
        assertTrue(text.contains("Bệnh viện Chợ Rẫy"));
    }

    @Test
    @DisplayName("searchDoctors hits Caffeine L1 cache on repeated queries and skips DB execution")
    void testSearchDoctors_CaffeineCacheHit_SkipsDatabaseQuery() {
        UUID docId = UUID.randomUUID();
        DoctorMatchDto doctor = new DoctorMatchDto(
                docId, "BS. Nguyễn Văn A", "Bác sĩ tim mạch", "LIC123",
                15, BigDecimal.valueOf(300000), 0.92,
                List.of("Tim Mạch", "Huyết Áp"), "TS. BS.", "Bệnh viện Chợ Rẫy"
        );

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(doctor));

        // First call - should query database
        List<DoctorMatchDto> result1 = searchService.searchDoctors("đau thắt ngực tim mạch", 4);
        assertNotNull(result1);
        assertEquals(1, result1.size());
        assertEquals("BS. Nguyễn Văn A", result1.get(0).getFullName());

        // Second call with same query - should hit Caffeine L1 cache
        List<DoctorMatchDto> result2 = searchService.searchDoctors("đau thắt ngực tim mạch", 4);
        assertNotNull(result2);
        assertEquals(1, result2.size());
        assertSame(result1, result2); // Same cached instance

        // Verify jdbcTemplate.query was called EXACTLY ONCE
        verify(jdbcTemplate, times(1)).query(anyString(), any(RowMapper.class), any(), any(), any());
    }

    @Test
    @DisplayName("invalidateCache evicts cached items and forces re-querying database")
    void testInvalidateCache_EvictsCachedItems() {
        DoctorMatchDto doctor = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Trần B", "Nội tiết", "LIC456",
                10, BigDecimal.valueOf(250000), 0.88,
                List.of("Nội Tiết"), "ThS. BS.", "Bệnh viện Bạch Mai"
        );

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(doctor));

        searchService.searchDoctors("glucose tiểu đường", 4);
        verify(jdbcTemplate, times(1)).query(anyString(), any(RowMapper.class), any(), any(), any());

        // Invalidate cache
        searchService.invalidateCache();

        // Query again - must re-query database
        searchService.searchDoctors("glucose tiểu đường", 4);
        verify(jdbcTemplate, times(2)).query(anyString(), any(RowMapper.class), any(), any(), any());
    }

    @Test
    @DisplayName("updateDoctorEmbedding invalidates cache so subsequent searches reflect updates")
    void testUpdateDoctorEmbedding_InvalidatesCache() {
        DoctorMatchDto doctor = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Lê C", "Tiêu hóa", "LIC789",
                12, BigDecimal.valueOf(280000), 0.85,
                List.of("Tiêu Hóa"), "BS. CKII.", "Bệnh viện ĐHYD"
        );

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(doctor));

        searchService.searchDoctors("men gan cao", 4);
        verify(jdbcTemplate, times(1)).query(anyString(), any(RowMapper.class), any(), any(), any());

        // Update doctor embedding
        UUID targetProfileId = UUID.randomUUID();
        searchService.updateDoctorEmbedding(targetProfileId, "Thông tin bác sĩ tiêu hóa mới");
        verify(jdbcTemplate).update(anyString(), eq("[0.0,0.0]"), eq(targetProfileId));

        // Query again - cache was invalidated by update
        searchService.searchDoctors("men gan cao", 4);
        verify(jdbcTemplate, times(2)).query(anyString(), any(RowMapper.class), any(), any(), any());
    }

    @Test
    @DisplayName("RowMapper parses aggregated specialties and maps pgvector similarity score correctly")
    @SuppressWarnings("unchecked")
    void testRowMapper_ParsesAggregatedSpecialtiesStringCorrectly() throws Exception {
        UUID docUserId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();

        // Capture RowMapper passed to jdbcTemplate.query
        doAnswer(invocation -> {
            RowMapper<DoctorMatchDto> rowMapper = invocation.getArgument(1);

            ResultSet rs = mock(ResultSet.class);
            when(rs.getString("doctor_user_id")).thenReturn(docUserId.toString());
            when(rs.getString("doctor_profile_id")).thenReturn(profileId.toString());
            when(rs.getString("full_name")).thenReturn("BS. Hoàng D");
            when(rs.getString("bio")).thenReturn("Chuyên khoa Hô hấp");
            when(rs.getString("license_number")).thenReturn("LIC999");
            when(rs.getInt("years_of_experience")).thenReturn(8);
            when(rs.getBigDecimal("consultation_fee")).thenReturn(BigDecimal.valueOf(200000));
            when(rs.getString("academic_title")).thenReturn("BS.");
            when(rs.getString("hospital_affiliation")).thenReturn("Bệnh viện Phổi TW");
            when(rs.getDouble("similarity_score")).thenReturn(0.89);
            when(rs.getString("specialties_str")).thenReturn("Hô Hấp, Dị Ứng, Miễn Dịch");

            DoctorMatchDto mapped = rowMapper.mapRow(rs, 1);
            return List.of(mapped);
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), any());

        List<DoctorMatchDto> doctors = searchService.searchDoctors("ho kéo dài khó thở", 4);
        assertNotNull(doctors);
        assertEquals(1, doctors.size());

        DoctorMatchDto doc = doctors.get(0);
        assertEquals("BS. Hoàng D", doc.getFullName());
        assertEquals(3, doc.getSpecialties().size());
        assertTrue(doc.getSpecialties().contains("Hô Hấp"));
    }

    @Test
    @DisplayName("searchDoctors flags Red-Flag emergency and attaches warning instructions to top recommendation")
    @SuppressWarnings("unchecked")
    void testSearchDoctors_EmergencyRedFlag_FlagsDoctorAndAddsWarning() {
        DoctorMatchDto doctor = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Cấp Cứu", "Chuyên khoa Cấp cứu", "LIC115",
                12, BigDecimal.valueOf(350000), 0.95,
                List.of("Cấp Cứu"), "TS. BS.", "BV Chợ Rẫy"
        );
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(doctor));

        List<DoctorMatchDto> results = searchService.searchDoctors("bệnh nhân nôn ra máu và ngất xỉu", 4);
        assertNotNull(results);
        assertFalse(results.isEmpty());

        DoctorMatchDto top = results.get(0);
        assertTrue(top.isEmergencyRedFlag());
        assertNotNull(top.getEmergencyWarning());
        assertTrue(top.getEmergencyWarning().contains("115"));
        assertTrue(top.isAiRecommended());
        assertTrue(top.getAiRecommendationReason().contains("CẢNH BÁO CẤP CỨU"));
    }

    @Test
    @DisplayName("searchDoctors normalizes slang and handles Vietnamese NegEx in clinical search")
    @SuppressWarnings("unchecked")
    void testSearchDoctors_SlangAndNegEx_SanitizesQuery() {
        DoctorMatchDto doctor = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Tiêu Hóa", "Chuyên khoa Tiêu Hóa", "LIC777",
                10, BigDecimal.valueOf(250000), 0.90,
                List.of("Tiêu Hóa"), "ThS. BS.", "BV Đại Học Y Dược"
        );
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(doctor));

        List<DoctorMatchDto> results = searchService.searchDoctors("bs oi em bi dau da day quan nhung khong sot", 4);
        assertNotNull(results);
        assertFalse(results.isEmpty());

        DoctorMatchDto top = results.get(0);
        assertNotNull(top.getNormalizedClinicalQuery());
        assertTrue(top.getNormalizedClinicalQuery().contains("đau dạ dày"));
        assertNotNull(top.getNegatedSymptoms());
        assertTrue(top.getNegatedSymptoms().stream().anyMatch(s -> s.contains("không sốt") || s.contains("khong sot")));
    }

    @Test
    @DisplayName("calculateCompositeScore enforces sharp contrastive separation between true specialty and unrelated specialties")
    void testContrastiveSpecialtyRanking_SharpSeparationBetweenNeurologyAndUnrelatedSpecialties() {
        String triageQuery = "Bác sĩ chuyên khoa Thần Kinh. neurology. Triệu chứng: Tôi thường xuyên bị đau đầu âm ỉ kèm chóng mặt và mất ngủ. Tư vấn chẩn đoán và điều trị chuyên khoa neurology.";

        DoctorMatchDto doctorNeuro = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Lê Hoàng Long", "Chuyên khoa Thần kinh, điều trị đau đầu mạn tính, hội chứng tiền đình",
                "LIC-NEURO", 9, BigDecimal.valueOf(350000), 0.60,
                List.of("Neurology (Thần kinh)"), "BS. CKII", "Bệnh viện Chợ Rẫy", 4.88, 28
        );

        DoctorMatchDto doctorObGyn = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Trịnh Hải Yến", "Hơn 20 năm kinh nghiệm quản lý thai kỳ nguy cơ cao, điều trị u xơ tử cung",
                "LIC-OBGYN", 20, BigDecimal.valueOf(400000), 0.40,
                List.of("Obstetrics & Gynecology (Sản Phụ Khoa)"), "TS. BS", "Bệnh viện Từ Dũ", 4.97, 48
        );

        DoctorMatchDto doctorGeneralInternal = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Bùi Quang Huy", "Khám và tầm soát toàn diện các bệnh lý nội khoa, tăng huyết áp",
                "LIC-INTERNAL", 11, BigDecimal.valueOf(300000), 0.48,
                List.of("General Internal Medicine (Nội tổng quát)"), "ThS. BS", "Bệnh viện Nhân Dân 115", 4.88, 19
        );

        double scoreNeuro = searchService.calculateCompositeScore(doctorNeuro, triageQuery);
        double scoreObGyn = searchService.calculateCompositeScore(doctorObGyn, triageQuery);
        double scoreInternal = searchService.calculateCompositeScore(doctorGeneralInternal, triageQuery);

        // 1. Doctor in aligned specialty achieves high clinical match (>= 85%)
        assertTrue(scoreNeuro >= 0.85, "Neurology doctor score should be >= 0.85, got: " + scoreNeuro);

        // 2. Doctor in unrelated divergent specialty is severely penalized (< 25%)
        assertTrue(scoreObGyn < 0.25, "Ob/Gyn doctor score should be < 0.25 for neurology complaint, got: " + scoreObGyn);

        // 3. Clear contrastive gap of at least 60% between specialty match and divergent doctor
        assertTrue(scoreNeuro - scoreObGyn > 0.60, "Gap between Neuro and Ob/Gyn should be > 0.60, got: " + (scoreNeuro - scoreObGyn));

        // 4. General Internal Medicine acts as a reasonable secondary option (~40% - 65%)
        assertTrue(scoreInternal >= 0.40 && scoreInternal < scoreNeuro, "General internal should be a valid secondary option, got: " + scoreInternal);
    }

    @Test
    @DisplayName("calculateCompositeScore treats allied specialties (Cardiopulmonary) neutrally while penalizing divergent specialties")
    void testAlliedSpecialtyCardiopulmonaryAlignment_NeutralAlliedAndPenalizedDivergent() {
        String triageQuery = "Bác sĩ chuyên khoa Hô hấp & Phổi. pulmonology. Triệu chứng: ho kéo dài kèm tức ngực khó thở khi gắng sức. Tư vấn chẩn đoán và điều trị chuyên khoa pulmonology.";

        DoctorMatchDto doctorPulmo = new DoctorMatchDto(
                UUID.randomUUID(), "PGS.TS.BS Trần Thị Mai Hương", "Chuyên khoa Hô hấp & Bệnh phổi tắc nghẽn mạn tính COPD, hen suyễn",
                "LIC-PULMO", 18, BigDecimal.valueOf(400000), 0.62,
                List.of("Pulmonology (Hô hấp & Phổi)"), "PGS.TS. BS", "Bệnh viện Phổi Trung Ương", 4.95, 34
        );

        DoctorMatchDto doctorCardio = new DoctorMatchDto(
                UUID.randomUUID(), "GS.TS.BS Nguyễn Văn An", "Chuyên gia tim mạch hàng đầu, can thiệp mạch vành và suy tim",
                "LIC-CARDIO", 22, BigDecimal.valueOf(500000), 0.55,
                List.of("Cardiology (Tim mạch)"), "GS.TS. BS", "Bệnh viện Chợ Rẫy", 4.98, 65
        );

        DoctorMatchDto doctorObGyn = new DoctorMatchDto(
                UUID.randomUUID(), "PGS.TS.BS Trịnh Hải Yến", "Hơn 20 năm quản lý thai kỳ và phẫu thuật sản phụ khoa",
                "LIC-OBGYN", 20, BigDecimal.valueOf(400000), 0.38,
                List.of("Obstetrics & Gynecology (Sản Phụ Khoa)"), "PGS.TS. BS", "Bệnh viện Từ Dũ", 4.97, 48
        );

        double scorePulmo = searchService.calculateCompositeScore(doctorPulmo, triageQuery);
        double scoreCardio = searchService.calculateCompositeScore(doctorCardio, triageQuery);
        double scoreObGyn = searchService.calculateCompositeScore(doctorObGyn, triageQuery);

        // 1. Direct targeted specialist gets top score (>= 85%)
        assertTrue(scorePulmo >= 0.85, "Pulmonologist should score >= 0.85, got: " + scorePulmo);

        // 2. Allied specialist (Cardiology) is NOT penalized -0.35, remains a viable clinical neighbor (~40% - 60%)
        assertTrue(scoreCardio >= 0.40 && scoreCardio < scorePulmo, "Cardiologist should be allied without -0.35 penalty, got: " + scoreCardio);

        // 3. Completely divergent specialist (Ob/Gyn) is penalized (-0.35) and stays < 25%
        assertTrue(scoreObGyn < 0.25, "Ob/Gyn should be severely penalized for respiratory complaint, got: " + scoreObGyn);

        // 4. Distinction gap between true specialist and divergent doctor > 60%
        assertTrue(scorePulmo - scoreObGyn > 0.60, "Gap between Pulmonology and Ob/Gyn should exceed 0.60, got: " + (scorePulmo - scoreObGyn));
    }

    @Test
    @DisplayName("calculateCompositeScore infers correct specialty from raw symptom query without explicit target")
    void testRawSymptomMatching_InfersTopSpecialtyWithoutExplicitTarget() {
        String rawQuery = "tôi thường xuyên đau đầu âm ỉ kèm chóng mặt và mất ngủ";

        DoctorMatchDto doctorNeuro = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Lê Hoàng Long", "Chuyên khoa Thần kinh, điều trị đau đầu mạn tính, rối loạn tiền đình",
                "LIC-NEURO", 9, BigDecimal.valueOf(350000), 0.58,
                List.of("Neurology (Thần kinh)"), "BS. CKII", "Bệnh viện Chợ Rẫy", 4.88, 28
        );

        DoctorMatchDto doctorObGyn = new DoctorMatchDto(
                UUID.randomUUID(), "PGS.TS.BS Trịnh Hải Yến", "Quản lý thai kỳ nguy cơ cao, phụ khoa",
                "LIC-OBGYN", 20, BigDecimal.valueOf(400000), 0.40,
                List.of("Obstetrics & Gynecology (Sản Phụ Khoa)"), "PGS.TS. BS", "Bệnh viện Từ Dũ", 4.97, 48
        );

        double scoreNeuro = searchService.calculateCompositeScore(doctorNeuro, rawQuery);
        double scoreObGyn = searchService.calculateCompositeScore(doctorObGyn, rawQuery);

        assertTrue(scoreNeuro >= 0.75, "Neuro doctor should score >= 0.75 for raw neurological symptoms, got: " + scoreNeuro);
        assertTrue(scoreObGyn < 0.30, "Ob/Gyn doctor should score < 0.30 for raw neurological symptoms, got: " + scoreObGyn);
        assertTrue(scoreNeuro - scoreObGyn > 0.45, "Gap should exceed 0.45, got: " + (scoreNeuro - scoreObGyn));
    }

    @Test
    @DisplayName("Clinical-First Proximity Ranking: nearby matching specialty ranks 1st, farther matching 2nd, nearby mismatch NEVER beats matching")
    void testClinicalFirstProximityRanking_NearbyMatchingFirst_FartherMatchingSecond_MismatchLast() {
        String query = "đau thắt ngực khó thở hồi hộp tim mạch";

        DoctorMatchDto farCardio = new DoctorMatchDto(
                UUID.randomUUID(), "GS.TS.BS Hà Nội Tim Mạch", "Chuyên khoa Tim mạch can thiệp",
                "LIC-HN-CARDIO", 20, BigDecimal.valueOf(500000), 0.88,
                List.of("Cardiology (Tim mạch)"), "GS.TS. BS", "Bệnh viện Bạch Mai", 4.98, 90
        );
        farCardio.setCity("Hà Nội");
        farCardio.setLatitude(21.0023);
        farCardio.setLongitude(105.8412);

        DoctorMatchDto nearCardio = new DoctorMatchDto(
                UUID.randomUUID(), "ThS.BS Sài Gòn Tim Mạch", "Chuyên khoa Tim mạch nội khoa",
                "LIC-HCM-CARDIO", 10, BigDecimal.valueOf(350000), 0.80,
                List.of("Cardiology (Tim mạch)"), "ThS. BS", "Bệnh viện Chợ Rẫy", 4.85, 30
        );
        nearCardio.setCity("TP. Hồ Chí Minh");
        nearCardio.setLatitude(10.7574);
        nearCardio.setLongitude(106.6596);

        DoctorMatchDto rightNextDoorDerm = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Da Liễu Ngay Sát Nhà", "Chuyên khoa Da liễu thẩm mỹ",
                "LIC-HCM-DERM", 15, BigDecimal.valueOf(300000), 0.65,
                List.of("Dermatology (Da liễu)"), "BS. CKI", "Phòng khám Quận 1", 4.95, 50
        );
        rightNextDoorDerm.setCity("TP. Hồ Chí Minh");
        rightNextDoorDerm.setLatitude(10.7769);
        rightNextDoorDerm.setLongitude(106.7009);

        // Patient is in District 1, TP.HCM (10.7769, 106.7009)
        List<DoctorMatchDto> ranked = searchService.rankDoctors(
                List.of(farCardio, rightNextDoorDerm, nearCardio),
                query, 3, 10.7769, 106.7009, null
        );

        assertEquals(3, ranked.size());
        assertEquals("ThS.BS Sài Gòn Tim Mạch", ranked.get(0).getFullName(), "Nearby matching specialist must rank 1st");
        assertEquals("GS.TS.BS Hà Nội Tim Mạch", ranked.get(1).getFullName(), "Farther matching specialist must rank 2nd");
        assertEquals("BS. Da Liễu Ngay Sát Nhà", ranked.get(2).getFullName(), "Unrelated specialty right next door must rank last");
        assertTrue(ranked.get(0).getDistanceKm() < 10.0);
        assertTrue(ranked.get(1).getDistanceKm() > 1000.0);
        assertTrue(ranked.get(0).isAiRecommended());
    }

    @Test
    @DisplayName("Clinical-First Proximity Ranking infers coordinates from Vietnamese city name when GPS is omitted")
    void testClinicalFirstProximityRanking_InfersCityCoordinates() {
        String query = "đau đầu chóng mặt mất ngủ thần kinh";

        DoctorMatchDto hcmNeuro = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Thần Kinh HCM", "Chuyên khoa Thần kinh",
                "LIC-HCM-NEURO", 14, BigDecimal.valueOf(350000), 0.85,
                List.of("Neurology (Thần kinh)"), "BS. CKII", "Bệnh viện Chợ Rẫy", 4.90, 40
        );
        hcmNeuro.setCity("TP. Hồ Chí Minh");
        hcmNeuro.setLatitude(10.7574);
        hcmNeuro.setLongitude(106.6596);

        DoctorMatchDto hnNeuro = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Thần Kinh Hà Nội", "Chuyên khoa Thần kinh",
                "LIC-HN-NEURO", 10, BigDecimal.valueOf(350000), 0.80,
                List.of("Neurology (Thần kinh)"), "ThS. BS", "Bệnh viện Bạch Mai", 4.85, 25
        );
        hnNeuro.setCity("Hà Nội");
        hnNeuro.setLatitude(21.0023);
        hnNeuro.setLongitude(105.8412);

        List<DoctorMatchDto> ranked = searchService.rankDoctors(
                List.of(hcmNeuro, hnNeuro), query, 2, null, null, "Hà Nội"
        );

        assertEquals(2, ranked.size());
        assertEquals("BS. Thần Kinh Hà Nội", ranked.get(0).getFullName());
        assertNotNull(ranked.get(0).getDistanceKm());
        assertTrue(ranked.get(0).getDistanceKm() < 10.0);
    }
}
