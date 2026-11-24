package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.*;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.DoctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
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

    @GetMapping("/me/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get current doctor's professional profile", description = "Returns full profile including CCHN vetting status and credentials")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getMyProfile(principal.getId())));
    }

    @PutMapping("/me/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Update current doctor's professional profile")
    public ResponseEntity<ApiResponse<DoctorDetailDto>> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateDoctorProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.updateDoctorProfile(principal.getId(), request)));
    }

    @PostMapping(value = "/me/license-document", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Upload medical practice license scan (CCHN) to private Supabase Storage",
               description = "Accepts PDF or Image (JPEG/PNG/WEBP), stores in private bucket, and prepares for admin vetting.")
    public ResponseEntity<ApiResponse<DoctorLicenseUploadResponseDto>> uploadLicenseDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        DoctorLicenseUploadResponseDto response = doctorService.uploadDoctorLicense(principal.getId(), file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/me/license-document/view")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get short-lived signed URL to view uploaded license scan")
    public ResponseEntity<ApiResponse<DocumentFileAccessDto>> getMyLicenseDocumentAccess(
            @AuthenticationPrincipal UserPrincipal principal) {
        DocumentFileAccessDto access = doctorService.getDoctorLicenseAccess(principal.getId());
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(ApiResponse.success(access));
    }

    @GetMapping("/me/license-document/file")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Stream local doctor license scan file (fallback dev mode)")
    public ResponseEntity<byte[]> viewMyLicenseLocalFile(
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] bytes = doctorService.readDoctorLicenseLocalFile(principal.getId());
        if (bytes == null || bytes.length == 0) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_AVAILABLE", "Tệp giấy phép hành nghề không tồn tại.");
        }
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
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

    @GetMapping("/me/schedule-config")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get full doctor schedule bundle (slot duration, buffer time, weekly shifts, and date exceptions)")
    public ResponseEntity<ApiResponse<DoctorScheduleBundleDto>> getMyScheduleConfig(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorScheduleBundle(principal.getId())));
    }

    @PutMapping("/me/schedule-config")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Update doctor schedule configuration with overlap validation and conflict detection")
    public ResponseEntity<ApiResponse<DoctorScheduleBundleDto>> updateMyScheduleConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateDoctorScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.updateDoctorScheduleBundle(principal.getId(), request)));
    }

    @GetMapping("/me/schedules/exceptions")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "List doctor schedule exceptions (day-off or custom hours overrides)")
    public ResponseEntity<ApiResponse<List<ScheduleExceptionDto>>> getMyScheduleExceptions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(value = "includePast", defaultValue = "false") boolean includePast) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorScheduleExceptions(principal.getId(), includePast)));
    }

    @PostMapping("/me/schedules/exceptions")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Create or update a schedule exception for a specific date")
    public ResponseEntity<ApiResponse<ScheduleExceptionDto>> upsertScheduleException(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpsertScheduleExceptionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.upsertScheduleException(principal.getId(), request)));
    }

    @DeleteMapping("/me/schedules/exceptions/{exceptionId}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Remove a schedule exception and revert that date to the weekly schedule")
    public ResponseEntity<ApiResponse<Void>> deleteScheduleException(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("exceptionId") UUID exceptionId) {
        doctorService.deleteScheduleException(principal.getId(), exceptionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa ngày ngoại lệ và khôi phục lịch hằng tuần."));
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
