package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
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
        String statusStr = body.get("status");
        String notes = body.get("notes");
        AppointmentStatus newStatus = AppointmentStatus.valueOf(statusStr);

        AppointmentDto dto = appointmentService.updateAppointmentStatus(id, principal.getId(), principal.getRole(), newStatus, notes);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/{id}/complete-clinical")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Bác sĩ hoàn tất ca khám lâm sàng với Sinh hiệu, Chẩn đoán ICD-10 và Đơn thuốc điện tử")
    public ResponseEntity<ApiResponse<AppointmentDto>> completeClinical(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody com.mediassist.dto.ClinicalEncounterRequest request) {
        AppointmentDto dto = appointmentService.completeClinicalEncounter(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
