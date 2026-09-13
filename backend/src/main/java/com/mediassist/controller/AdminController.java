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

    @GetMapping("/doctors")
    @Operation(summary = "List all doctor profiles", description = "Returns all registered doctors in the system with credentials and user status.")
    public ResponseEntity<ApiResponse<List<DoctorDetailDto>>> getAllDoctors() {
        return ResponseEntity.ok(ApiResponse.success(adminVettingService.getAllDoctors()));
    }

    @PostMapping("/doctors")
    @Operation(summary = "Create new doctor account & profile", description = "Admin directly onboards a verified or pending doctor with initial vector embedding.")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> createDoctor(
            @Valid @RequestBody AdminCreateDoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        DoctorDetailDto result = adminVettingService.createDoctorByAdmin(request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/doctors/{id}")
    @Operation(summary = "Update doctor profile credentials", description = "Admin edits professional clinical details, hospital, fee, and specialties.")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> updateDoctor(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AdminUpdateDoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        DoctorDetailDto result = adminVettingService.updateDoctorByAdmin(id, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PatchMapping("/doctors/{id}/toggle-status")
    @Operation(summary = "Toggle doctor account status", description = "Switch doctor status between ACTIVE and SUSPENDED.")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> toggleDoctorStatus(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        DoctorDetailDto result = adminVettingService.toggleDoctorStatus(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/doctors/{id}/sync-vector")
    @Operation(summary = "Synchronize AI Vector embedding for a doctor", description = "Recalculates pgvector bio_embedding for semantic matching.")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> syncDoctorVector(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        DoctorDetailDto result = adminVettingService.syncDoctorVector(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/doctors/sync-vectors")
    @Operation(summary = "Batch synchronize all doctor AI vector embeddings", description = "Iterates and recalculates pgvector embeddings for all doctors.")
    public ResponseEntity<ApiResponse<Integer>> syncAllDoctorVectors(
            @AuthenticationPrincipal UserPrincipal principal) {
        int count = adminVettingService.syncAllDoctorVectors(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(count));
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
