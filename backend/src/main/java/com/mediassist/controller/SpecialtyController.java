package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.SpecialtyDto;
import com.mediassist.repository.SpecialtyRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/specialties")
@Tag(name = "Specialties", description = "Medical specialties catalog for doctor matching and triage")
public class SpecialtyController {

    private final SpecialtyRepository specialtyRepository;

    public SpecialtyController(SpecialtyRepository specialtyRepository) {
        this.specialtyRepository = specialtyRepository;
    }

    @GetMapping
    @Operation(summary = "Get all medical specialties", description = "Returns active clinical specialties available in the platform.")
    public ResponseEntity<ApiResponse<List<SpecialtyDto>>> getSpecialties() {
        List<SpecialtyDto> list = specialtyRepository.findAll().stream()
                .map(SpecialtyDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
