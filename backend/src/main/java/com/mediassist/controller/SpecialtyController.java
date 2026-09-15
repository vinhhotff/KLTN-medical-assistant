package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.SpecialtyDto;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.service.TwoLayerCacheService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/specialties")
@Tag(name = "Specialties", description = "Medical specialties catalog for doctor matching and triage")
public class SpecialtyController {

    private static final String CACHE_KEY_SPECIALTIES = "specialties:all";

    private final SpecialtyRepository specialtyRepository;
    private final TwoLayerCacheService cacheService;

    public SpecialtyController(SpecialtyRepository specialtyRepository, TwoLayerCacheService cacheService) {
        this.specialtyRepository = specialtyRepository;
        this.cacheService = cacheService;
    }

    @GetMapping
    @Operation(summary = "Get all medical specialties", description = "Returns active clinical specialties available in the platform.")
    public ResponseEntity<ApiResponse<List<SpecialtyDto>>> getSpecialties() {
        SpecialtyDto[] cached = cacheService.get(CACHE_KEY_SPECIALTIES, SpecialtyDto[].class);
        if (cached != null && cached.length > 0) {
            return ResponseEntity.ok(ApiResponse.success(Arrays.asList(cached)));
        }

        List<SpecialtyDto> list = specialtyRepository.findAll().stream()
                .map(SpecialtyDto::fromEntity)
                .collect(Collectors.toList());

        if (!list.isEmpty()) {
            cacheService.set(CACHE_KEY_SPECIALTIES, list.toArray(new SpecialtyDto[0]), 3600); // 1 hour TTL
        }
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
