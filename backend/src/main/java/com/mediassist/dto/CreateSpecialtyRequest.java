package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateSpecialtyRequest {

    @NotBlank(message = "Tên chuyên khoa không được để trống")
    @Size(max = 100, message = "Tên chuyên khoa tối đa 100 ký tự")
    private String name;

    @NotBlank(message = "Mã định danh slug không được để trống")
    @Size(max = 50, message = "Slug tối đa 50 ký tự")
    private String slug;

    private String description;

    public CreateSpecialtyRequest() {}

    public CreateSpecialtyRequest(String name, String slug, String description) {
        this.name = name;
        this.slug = slug;
        this.description = description;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
