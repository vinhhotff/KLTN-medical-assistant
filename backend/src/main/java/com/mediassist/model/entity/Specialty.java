package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "specialties", indexes = {
        @Index(name = "idx_specialty_slug", columnList = "slug", unique = true)
})
public class Specialty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Specialty() {}

    public Specialty(UUID id, String name, String slug, String description) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
    }

    public static SpecialtyBuilder builder() {
        return new SpecialtyBuilder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public static class SpecialtyBuilder {
        private UUID id;
        private String name;
        private String slug;
        private String description;

        public SpecialtyBuilder id(UUID id) { this.id = id; return this; }
        public SpecialtyBuilder name(String name) { this.name = name; return this; }
        public SpecialtyBuilder slug(String slug) { this.slug = slug; return this; }
        public SpecialtyBuilder description(String description) { this.description = description; return this; }

        public Specialty build() {
            return new Specialty(id, name, slug, description);
        }
    }
}
