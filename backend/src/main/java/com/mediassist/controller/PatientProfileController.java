package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.PatientProfileDto;
import com.mediassist.service.PatientProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patient/profile")
@Tag(name = "Patient Profile & Medical Passport", description = "Quản lý hồ sơ bệnh án điện tử, BHYT, CCCD và tiền sử dị ứng")
public class PatientProfileController {

    private final PatientProfileService patientProfileService;

    public PatientProfileController(PatientProfileService patientProfileService) {
        this.patientProfileService = patientProfileService;
    }

    @GetMapping
    @Operation(summary = "Lấy hồ sơ căn cước y tế của bệnh nhân đang đăng nhập")
    public ResponseEntity<ApiResponse<PatientProfileDto>> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Vui lòng đăng nhập để truy cập hồ sơ"));
        }
        PatientProfileDto dto = patientProfileService.getOrCreateProfileForUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PutMapping
    @Operation(summary = "Cập nhật hồ sơ bệnh án, BHYT, CCCD và cảnh báo dị ứng")
    public ResponseEntity<ApiResponse<PatientProfileDto>> updateMyProfile(@AuthenticationPrincipal UserDetails userDetails,
                                                                         @RequestBody PatientProfileDto request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Vui lòng đăng nhập để cập nhật hồ sơ"));
        }
        PatientProfileDto updated = patientProfileService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Bác sĩ hoặc Quản trị viên xem hồ sơ bệnh án của bệnh nhân theo User ID")
    public ResponseEntity<ApiResponse<PatientProfileDto>> getProfileByUserId(@PathVariable UUID userId) {
        PatientProfileDto dto = patientProfileService.getProfileByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
