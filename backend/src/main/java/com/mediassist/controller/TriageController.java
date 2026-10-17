package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.TriageRequest;
import com.mediassist.dto.TriageResponse;
import com.mediassist.dto.TriageSessionDto;
import com.mediassist.model.entity.User;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.PatientAccessGuard;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.TriageRateLimiterService;
import com.mediassist.service.TriageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/triage")
@Tag(name = "AI Symptom Triage & Semantic Search", description = "Endpoints for symptom triage, red-flag screening, and pgvector doctor matching")
public class TriageController {

    private final TriageService triageService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final TriageRateLimiterService rateLimiterService;
    private final TriageSessionRepository triageSessionRepository;
    private final UserRepository userRepository;
    private final PatientAccessGuard patientAccessGuard;

    public TriageController(TriageService triageService,
                            DoctorSemanticSearchService doctorSemanticSearchService,
                            TriageRateLimiterService rateLimiterService,
                            TriageSessionRepository triageSessionRepository,
                            UserRepository userRepository,
                            PatientAccessGuard patientAccessGuard) {
        this.triageService = triageService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.rateLimiterService = rateLimiterService;
        this.triageSessionRepository = triageSessionRepository;
        this.userRepository = userRepository;
        this.patientAccessGuard = patientAccessGuard;
    }

    @PostMapping("/assess")
    @Operation(summary = "Assess symptoms, screen red flags, and semantically match verified doctors")
    public ResponseEntity<ApiResponse<TriageResponse>> assessSymptoms(
            @Valid @RequestBody TriageRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                    "Vui lòng đăng nhập tài khoản bệnh nhân để sử dụng tính năng Trợ lý Phân luồng Triệu chứng AI.");
        }

        String userEmail = authentication.getName();
        String clientIp = servletRequest.getRemoteAddr();
        String rateLimitKey = userEmail != null ? userEmail : clientIp;

        if (!rateLimiterService.allowRequest(rateLimitKey)) {
            throw new AppException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều yêu cầu tư vấn triệu chứng trong thời gian ngắn. Vui lòng chờ 1 phút trước khi thử lại."
            );
        }

        TriageResponse response = triageService.assessSymptoms(request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/history")
    @Operation(summary = "Get triage consultation history for current patient")
    public ResponseEntity<ApiResponse<List<TriageSessionDto>>> getHistory(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem lịch sử tư vấn.");
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        List<TriageSessionDto> history = triageSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(TriageSessionDto::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/search/semantic")
    @Operation(summary = "Standalone semantic vector search for verified doctors using pgvector")
    public ResponseEntity<ApiResponse<List<DoctorMatchDto>>> searchDoctorsSemantic(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                    "Vui lòng đăng nhập để sử dụng tính năng tìm kiếm bác sĩ theo ngữ nghĩa triệu chứng.");
        }

        List<DoctorMatchDto> results = doctorSemanticSearchService.searchDoctors(query, limit);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Bác sĩ hoặc Quản trị viên xem lịch sử phân luồng Triage AI và tóm tắt SBAR của bệnh nhân")
    public ResponseEntity<ApiResponse<List<TriageSessionDto>>> getPatientTriageHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("patientId") UUID patientId) {
        patientAccessGuard.assertCanAccessPatient(principal.getId(), principal.getRole(), patientId, "triage_sessions/patient/" + patientId);
        List<TriageSessionDto> history = triageSessionRepository.findByUserIdOrderByCreatedAtDesc(patientId)
                .stream().map(TriageSessionDto::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
