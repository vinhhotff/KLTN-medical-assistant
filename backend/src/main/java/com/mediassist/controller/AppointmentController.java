package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.CreateAppointmentRequest;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
@Tag(name = "Appointments", description = "Telehealth appointment booking and status workflow")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    @Operation(summary = "Book an appointment slot with concurrency collision prevention")
    public ResponseEntity<ApiResponse<AppointmentDto>> bookAppointment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateAppointmentRequest request) {
        AppointmentDto dto = appointmentService.bookAppointment(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's appointment history (Doctor or Patient)")
    public ResponseEntity<ApiResponse<List<AppointmentDto>>> getMyAppointments(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<AppointmentDto> list = appointmentService.getMyAppointments(principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update appointment status (e.g., COMPLETED, CANCELLED)")
    public ResponseEntity<ApiResponse<AppointmentDto>> updateStatus(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        if (body == null || body.get("status") == null || body.get("status").isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Vui lòng cung cấp trạng thái cuộc hẹn hợp lệ.");
        }
        String statusStr = body.get("status").trim().toUpperCase();
        String notes = body.get("notes");
        AppointmentStatus newStatus;
        try {
            newStatus = AppointmentStatus.valueOf(statusStr);
        } catch (IllegalArgumentException ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Trạng thái '" + statusStr + "' không hợp lệ.");
        }

        AppointmentDto dto = appointmentService.updateAppointmentStatus(id, principal.getId(), principal.getRole(), newStatus, notes);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Đổi lịch hẹn sang khung giờ mới (Reschedule)")
    public ResponseEntity<ApiResponse<AppointmentDto>> rescheduleAppointment(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.mediassist.dto.RescheduleAppointmentRequest request) {
        AppointmentDto dto = appointmentService.rescheduleAppointment(id, principal.getId(), principal.getRole(), request);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/{id}/complete-clinical")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Bác sĩ hoàn tất ca khám lâm sàng với Sinh hiệu, Chẩn đoán ICD-10 và Đơn thuốc điện tử")
    public ResponseEntity<ApiResponse<AppointmentDto>> completeClinical(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.mediassist.dto.ClinicalEncounterRequest request) {
        AppointmentDto dto = appointmentService.completeClinicalEncounter(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Bác sĩ hoặc Quản trị viên tra cứu toàn bộ lịch sử ca khám của một bệnh nhân")
    public ResponseEntity<ApiResponse<List<AppointmentDto>>> getPatientHistory(
            @PathVariable("patientId") UUID patientId) {
        List<AppointmentDto> list = appointmentService.getPatientAppointmentHistory(patientId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/follow-up")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Bác sĩ trực tiếp lên lịch hẹn tái khám cho bệnh nhân ngay trên trạm lâm sàng")
    public ResponseEntity<ApiResponse<AppointmentDto>> createFollowUp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.mediassist.dto.FollowUpAppointmentRequest request) {
        AppointmentDto dto = appointmentService.createFollowUpAppointment(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }
}
