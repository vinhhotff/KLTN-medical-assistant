package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.*;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AdminVettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Administrative operations, doctor vetting, and user management")
public class AdminController {

    private final AdminVettingService adminVettingService;

    public AdminController(AdminVettingService adminVettingService) {
        this.adminVettingService = adminVettingService;
    }

    @GetMapping("/doctors/pending")
    @Operation(summary = "List pending doctor profiles", description = "Returns doctors awaiting medical license verification.")
    public ResponseEntity<ApiResponse<List<DoctorDetailDto>>> getPendingDoctors() {
        return ResponseEntity.ok(ApiResponse.success(adminVettingService.getPendingDoctors()));
    }

    @PostMapping("/doctors/{id}/vet")
    @Operation(summary = "Approve or reject doctor credentials", description = "Vets doctor profile, writes audit trail, and evicts cache.")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> vetDoctor(
            @PathVariable("id") UUID id,
            @Valid @RequestBody VetDoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        DoctorDetailDto result = adminVettingService.vetDoctor(id, request.getApprove(), request.getRejectionReason(), principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/users")
    @Operation(summary = "List all registered users", description = "Returns user account details for admin supervision.")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(adminVettingService.getAllUsers()));
    }

    @PatchMapping("/users/{id}/status")
    @Operation(summary = "Update user account status", description = "Admin can suspend or reactivate a user account.")
    public ResponseEntity<ApiResponse<UserDto>> updateUserStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        UserDto result = adminVettingService.updateUserStatus(id, request.getStatus(), request.getReason(), principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/specialties")
    @Operation(summary = "Create medical specialty", description = "Admin adds a new clinical specialty to the catalog.")
    public ResponseEntity<ApiResponse<SpecialtyDto>> createSpecialty(
            @Valid @RequestBody CreateSpecialtyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        SpecialtyDto result = adminVettingService.createSpecialty(request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
