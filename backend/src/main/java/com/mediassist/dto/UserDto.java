package com.mediassist.dto;

import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;

import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;
    private String fullName;
    private Role role;
    private UserStatus status;
    private String avatarUrl;

    public UserDto() {}

    public UserDto(UUID id, String email, String fullName, Role role, UserStatus status, String avatarUrl) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.status = status;
        this.avatarUrl = avatarUrl;
    }

    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.getAvatarUrl()
        );
    }

    public static UserDto fromEntity(User user) {
        return from(user);
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public String getAvatarUrl() { return avatarUrl; }
}
