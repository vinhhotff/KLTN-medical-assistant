package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.TriageRequest;
import com.mediassist.dto.TriageResponse;
import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.User;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.TriageRateLimiterService;
import com.mediassist.service.TriageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/triage")
@Tag(name = "AI Symptom Triage & Semantic Search", description = "Endpoints for symptom triage, red-flag screening, and pgvector doctor matching")
public class TriageController {

    private final TriageService triageService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final TriageRateLimiterService rateLimiterService;
    private final TriageSessionRepository triageSessionRepository;
    private final UserRepository userRepository;

    public TriageController(TriageService triageService,
                            DoctorSemanticSearchService doctorSemanticSearchService,
                            TriageRateLimiterService rateLimiterService,
                            TriageSessionRepository triageSessionRepository,
                            UserRepository userRepository) {
        this.triageService = triageService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.rateLimiterService = rateLimiterService;
        this.triageSessionRepository = triageSessionRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/assess")
    @Operation(summary = "Assess symptoms, screen red flags, and semantically match verified doctors")
    public ResponseEntity<ApiResponse<TriageResponse>> assessSymptoms(
            @Valid @RequestBody TriageRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userEmail = authentication != null ? authentication.getName() : null;
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
    public ResponseEntity<ApiResponse<List<TriageSession>>> getHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
        List<TriageSession> history = triageSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/search/semantic")
    @Operation(summary = "Standalone semantic vector search for verified doctors using pgvector")
    public ResponseEntity<ApiResponse<List<DoctorMatchDto>>> searchDoctorsSemantic(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "5") int limit) {

        List<DoctorMatchDto> results = doctorSemanticSearchService.searchDoctors(query, limit);
        return ResponseEntity.ok(ApiResponse.success(results));
    }
}
