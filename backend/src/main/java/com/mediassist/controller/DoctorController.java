package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.DoctorSlotDto;
import com.mediassist.dto.UpdateDoctorProfileRequest;
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
}
