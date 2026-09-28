package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.DoctorReviewDto;
import com.mediassist.dto.DoctorReviewRequest;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.DoctorReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Doctor Reviews", description = "Đánh giá & Chấm sao Bác sĩ sau ca khám lâm sàng")
public class DoctorReviewController {

    private final DoctorReviewService doctorReviewService;

    public DoctorReviewController(DoctorReviewService doctorReviewService) {
        this.doctorReviewService = doctorReviewService;
    }

    @PostMapping("/appointments/{id}/review")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Bệnh nhân gửi đánh giá và chấm sao cho ca khám đã hoàn tất")
    public ResponseEntity<ApiResponse<DoctorReviewDto>> submitReview(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DoctorReviewRequest request) {
        DoctorReviewDto dto = doctorReviewService.submitReview(id, principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(dto, "Gửi đánh giá bác sĩ thành công."));
    }

    @GetMapping("/appointments/{id}/review")
    @Operation(summary = "Lấy thông tin đánh giá của một ca khám cụ thể")
    public ResponseEntity<ApiResponse<DoctorReviewDto>> getAppointmentReview(@PathVariable UUID id) {
        DoctorReviewDto dto = doctorReviewService.getReviewByAppointmentId(id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/doctors/{doctorId}/reviews")
    @Operation(summary = "Lấy danh sách đánh giá của một bác sĩ (Công khai)")
    public ResponseEntity<ApiResponse<List<DoctorReviewDto>>> getDoctorReviews(@PathVariable UUID doctorId) {
        List<DoctorReviewDto> list = doctorReviewService.getReviewsForDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/reviews/my")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Lấy danh sách các đánh giá do bệnh nhân hiện tại đã gửi")
    public ResponseEntity<ApiResponse<List<DoctorReviewDto>>> getMyReviews(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<DoctorReviewDto> list = doctorReviewService.getMyReviews(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
