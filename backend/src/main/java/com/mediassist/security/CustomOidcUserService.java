package com.mediassist.security;

import com.mediassist.model.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * CustomOidcUserService - Xu ly OpenID Connect (OIDC) UserInfo request tu Google.
 *
 * Khi Google OAuth2 su dung scope "openid", Spring Security mac dinh goi OidcUserService
 * thay vi OAuth2UserService. Class nay dam bao User duoc upsert vao PostgreSQL DB
 * va tra ve OAuth2UserPrincipal (implements OidcUser).
 */
@Service
public class CustomOidcUserService extends OidcUserService {

    private static final Logger log = LoggerFactory.getLogger(CustomOidcUserService.class);

    private final CustomOAuth2UserService customOAuth2UserService;

    public CustomOidcUserService(CustomOAuth2UserService customOAuth2UserService) {
        this.customOAuth2UserService = customOAuth2UserService;
    }

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        Map<String, Object> attributes = oidcUser.getAttributes();

        String googleId = (String) attributes.get("sub");
        String email    = (String) attributes.get("email");
        String name     = (String) attributes.get("name");
        String picture  = (String) attributes.get("picture");

        log.debug("OIDC login attempt - googleId: {}, email: {}", googleId, email);

        User user = customOAuth2UserService.findOrCreateUser(googleId, email, name, picture);
        return OAuth2UserPrincipal.create(user, attributes, oidcUser.getIdToken(), oidcUser.getUserInfo());
    }
}
