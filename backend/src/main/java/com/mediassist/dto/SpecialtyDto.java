package com.mediassist.dto;

import com.mediassist.model.entity.Specialty;

import java.util.UUID;

public class SpecialtyDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;

    public SpecialtyDto() {}

    public SpecialtyDto(UUID id, String name, String slug, String description) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
    }

    public static SpecialtyDto fromEntity(Specialty s) {
        return new SpecialtyDto(s.getId(), s.getName(), s.getSlug(), s.getDescription());
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getDescription() { return description; }
}
