package com.mediassist.security;

import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth2UserPrincipal - Bridge class giua Spring Security OAuth2 va JWT system.
 *
 * Implement ca UserDetails (cho JwtAuthenticationFilter) va OAuth2User (cho OAuth2 flow).
 * Duoc tao boi CustomOAuth2UserService va su dung boi OAuth2AuthenticationSuccessHandler.
 */
public class OAuth2UserPrincipal extends UserPrincipal implements OAuth2User {

    private final Map<String, Object> attributes;

    public OAuth2UserPrincipal(UUID id, String email, String password,
                               Role role, UserStatus status,
                               Collection<? extends GrantedAuthority> authorities,
                               Map<String, Object> attributes) {
        super(id, email, password, role, status, authorities);
        this.attributes = attributes;
    }

    /**
     * Factory method: tao OAuth2UserPrincipal tu User entity + Google attributes.
     */
    public static OAuth2UserPrincipal create(User user, Map<String, Object> attributes) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
        return new OAuth2UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getStatus(),
                authorities,
                attributes
        );
    }

    /** OAuth2User interface - tra ve Google attributes (sub, email, name, picture...) */
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    /** OAuth2User interface - ten dinh danh chinh (Spring yeu cau) */
    @Override
    public String getName() {
        return getEmail();
    }
}