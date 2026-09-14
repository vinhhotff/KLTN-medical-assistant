package com.mediassist.security;

import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth2UserPrincipal - Bridge class giua Spring Security OAuth2/OIDC va JWT system.
 *
 * Implement ca UserDetails, OAuth2User va OidcUser.
 * Tuong thich hoan hao ca luong OAuth2 tieu chuan va OpenID Connect (OIDC) voi Google.
 */
public class OAuth2UserPrincipal extends UserPrincipal implements OidcUser {

    private final Map<String, Object> attributes;
    private final OidcIdToken idToken;
    private final OidcUserInfo userInfo;
    private final Map<String, Object> claims;

    public OAuth2UserPrincipal(UUID id, String email, String password,
                               Role role, UserStatus status,
                               Collection<? extends GrantedAuthority> authorities,
                               Map<String, Object> attributes,
                               OidcIdToken idToken,
                               OidcUserInfo userInfo) {
        super(id, email, password, role, status, authorities);
        this.attributes = attributes;
        this.idToken = idToken;
        this.userInfo = userInfo;
        this.claims = idToken != null ? idToken.getClaims() : attributes;
    }

    public static OAuth2UserPrincipal create(User user, Map<String, Object> attributes) {
        return create(user, attributes, null, null);
    }

    public static OAuth2UserPrincipal create(User user, Map<String, Object> attributes,
                                             OidcIdToken idToken, OidcUserInfo userInfo) {
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
                attributes,
                idToken,
                userInfo
        );
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getName() {
        return getEmail();
    }

    @Override
    public Map<String, Object> getClaims() {
        return claims;
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return userInfo;
    }

    @Override
    public OidcIdToken getIdToken() {
        return idToken;
    }
}