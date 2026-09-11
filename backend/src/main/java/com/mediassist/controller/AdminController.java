package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.UserDto;
import com.mediassist.dto.VetDoctorRequest;
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
}
