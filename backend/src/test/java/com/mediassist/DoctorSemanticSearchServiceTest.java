package com.mediassist;

import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
    @DisplayName("searchDoctors hits Caffeine L1 cache on repeated queries and skips DB execution")
    void testSearchDoctors_CaffeineCacheHit_SkipsDatabaseQuery() {
        UUID docId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
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

        // Verify jdbcTemplate.query was called EXACTLY ONCE (No second query!)
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
    @DisplayName("RowMapper parses aggregated specialties_str into List<String> correctly without N+1 query")
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
        assertTrue(doc.getSpecialties().contains("Dị Ứng"));
        assertTrue(doc.getSpecialties().contains("Miễn Dịch"));
    }

    @Test
    @DisplayName("rankDoctors uses bounded Min-Heap to re-rank candidates by multi-criteria and limits output to K")
    void testRankDoctors_WeightedMultiCriteriaAndBoundedMinHeap() {
        // Doc 1: Cosine 0.85, 2 years exp, BS (0.5), no spec match -> lower composite
        DoctorMatchDto doc1 = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Trẻ", "Nội khoa", "L1",
                2, BigDecimal.valueOf(150000), 0.85,
                List.of("Nội Khoa"), "BS.", "BV Đa Khoa"
        );

        // Doc 2: Cosine 0.88, 25 years exp, GS (1.0), matches "tim mach" -> highest composite
        DoctorMatchDto doc2 = new DoctorMatchDto(
                UUID.randomUUID(), "GS.TS. Cao Cấp", "Tim mạch", "L2",
                25, BigDecimal.valueOf(500000), 0.88,
                List.of("Tim Mạch"), "GS.TS.", "BV Chợ Rẫy"
        );

        // Doc 3: Cosine 0.80, 15 years exp, PGS (0.9), matches "tim mach" -> high composite
        DoctorMatchDto doc3 = new DoctorMatchDto(
                UUID.randomUUID(), "PGS.TS. Trung Cấp", "Tim mạch", "L3",
                15, BigDecimal.valueOf(350000), 0.80,
                List.of("Tim Mạch"), "PGS.TS.", "BV Đại Học Y Dược"
        );

        // Doc 4: Cosine 0.30, 1 year exp, BS (0.5) -> pruned
        DoctorMatchDto doc4 = new DoctorMatchDto(
                UUID.randomUUID(), "BS. Yếu", "Da liễu", "L4",
                1, BigDecimal.valueOf(100000), 0.30,
                List.of("Da Liễu"), "BS.", "Phòng khám tư"
        );

        List<DoctorMatchDto> candidates = new java.util.ArrayList<>(List.of(doc1, doc2, doc3, doc4));
        List<DoctorMatchDto> ranked = searchService.rankDoctors(candidates, "bệnh tim mạch đau ngực", 2);

        assertNotNull(ranked);
        assertEquals(2, ranked.size(), "Bounded Min-Heap must restrict output to exactly K=2");

        // Doctor 2 must be #1 with highest composite score
        assertEquals("GS.TS. Cao Cấp", ranked.get(0).getFullName());
        assertTrue(ranked.get(0).isAiRecommended(), "Top doctor with score >= 0.70 must be AI recommended");
        assertNotNull(ranked.get(0).getAiRecommendationReason());

        // Doctor 3 or doc1 next, strictly sorted descending
        assertTrue(ranked.get(0).getSimilarityScore() >= ranked.get(1).getSimilarityScore());
    }

    @Test
    @DisplayName("rankDoctors returns empty list when candidates list is null or empty")
    void testRankDoctors_NullOrEmptyCandidates() {
        assertTrue(searchService.rankDoctors(null, "tim mạch", 5).isEmpty());
        assertTrue(searchService.rankDoctors(Collections.emptyList(), "tim mạch", 5).isEmpty());
    }
}
