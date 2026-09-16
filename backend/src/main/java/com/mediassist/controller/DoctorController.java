package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.*;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.DoctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
@Tag(name = "Doctors", description = "Medical provider search, scheduling, and profile management")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping
    @Operation(summary = "Get all verified doctors", description = "Returns all approved clinical providers with specialties and fees.")
    public ResponseEntity<ApiResponse<List<DoctorDetailDto>>> getDoctors() {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getVerifiedDoctors()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get doctor details by ID")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> getDoctorById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorById(id)));
    }

    @GetMapping("/{id}/slots")
    @Operation(summary = "Get available appointment slots for a specific date")
    public ResponseEntity<ApiResponse<List<DoctorSlotDto>>> getDoctorSlots(
            @PathVariable("id") UUID id,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getAvailableSlots(id, date)));
    }

    @PutMapping("/me/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Update current doctor's professional profile")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateDoctorProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.updateDoctorProfile(principal.getId(), request)));
    }

    @GetMapping("/me/stats")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get current doctor workstation real-time stats and KPIs")
    public ResponseEntity<ApiResponse<DoctorStatsDto>> getMyStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorStats(principal.getId())));
    }

    @GetMapping("/me/schedules")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get current doctor working hours and schedule slots")
    public ResponseEntity<ApiResponse<List<DoctorScheduleConfigDto>>> getMySchedules(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorSchedules(principal.getId())));
    }

    @PutMapping("/me/schedules")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Update current doctor working hours and schedule slots")
    public ResponseEntity<ApiResponse<List<DoctorScheduleConfigDto>>> updateMySchedules(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateDoctorScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.updateDoctorSchedules(principal.getId(), request)));
    }

    @GetMapping("/me/patients")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get list of all patients who have visited or booked with the doctor")
    public ResponseEntity<ApiResponse<List<DoctorPatientItemDto>>> getMyPatients(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorPatients(principal.getId())));
    }

    @PostMapping("/me/call-next")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Call next patient in today's queue: transitions earliest SCHEDULED to IN_PROGRESS")
    public ResponseEntity<ApiResponse<AppointmentDto>> callNextPatient(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.callNextPatient(principal.getId())));
    }
}
