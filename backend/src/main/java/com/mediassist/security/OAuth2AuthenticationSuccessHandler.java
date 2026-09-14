package com.mediassist.security;

import com.mediassist.model.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

/**
 * OAuth2AuthenticationSuccessHandler - Xu ly sau khi Google xac thuc thanh cong.
 *
 * 1. Lay OAuth2UserPrincipal tu Authentication context (hoac tu dong fallback upsert neu nhan OAuth2User)
 * 2. Sinh JWT Access Token bang JwtTokenProvider
 * 3. Set HttpOnly Cookie "accessToken":
 *    - HttpOnly=true  : Chong XSS
 *    - SameSite=Lax   : Cho phep cross-site redirect tu Google
 *    - MaxAge=900     : 15 phut - khop voi JWT expiration
 * 4. Redirect ve Frontend callback URL
 */
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomOAuth2UserService customOAuth2UserService;

    @Value("${app.oauth2.success-redirect-uri:http://localhost:5173/oauth2/callback}")
    private String successRedirectUri;

    @Value("${app.oauth2.failure-redirect-uri:http://localhost:5173/login?error=oauth2_failed}")
    private String failureRedirectUri;

    @Value("${app.jwt.access-token-expiration-ms:900000}")
    private long accessTokenExpirationMs;

    public OAuth2AuthenticationSuccessHandler(JwtTokenProvider jwtTokenProvider,
                                            CustomOAuth2UserService customOAuth2UserService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customOAuth2UserService = customOAuth2UserService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2UserPrincipal principal;
        Object principalObj = authentication.getPrincipal();

        if (principalObj instanceof OAuth2UserPrincipal oauth2Principal) {
            principal = oauth2Principal;
        } else if (principalObj instanceof OAuth2User oauth2User) {
            // Fallback: trong truong hop Principal la DefaultOidcUser hoac DefaultOAuth2User
            Map<String, Object> attributes = oauth2User.getAttributes();
            String googleId = (String) attributes.get("sub");
            String email    = (String) attributes.get("email");
            String name     = (String) attributes.get("name");
            String picture  = (String) attributes.get("picture");

            User user = customOAuth2UserService.findOrCreateUser(googleId, email, name, picture);
            principal = OAuth2UserPrincipal.create(user, attributes);
        } else {
            log.error("OAuth2 Success: Unknown principal type: {}", principalObj != null ? principalObj.getClass().getName() : "null");
            getRedirectStrategy().sendRedirect(request, response, failureRedirectUri + "&message=unknown_principal");
            return;
        }

        // Sinh JWT Access Token
        String accessToken = jwtTokenProvider.generateAccessToken(principal);

        // Tinh MaxAge cookie tu JWT expiration (ms -> giay)
        int cookieMaxAgeSeconds = (int) (accessTokenExpirationMs / 1000);

        // Set HttpOnly Cookie voi SameSite=Lax (dung Set-Cookie header truc tiep vi
        // Jakarta Cookie API khong ho tro SameSite attribute)
        String cookieValue = String.format(
                "accessToken=%s; HttpOnly; Path=/; Max-Age=%d; SameSite=Lax",
                accessToken, cookieMaxAgeSeconds
        );
        // NOTE: Them "; Secure" khi deploy len HTTPS production
        response.addHeader("Set-Cookie", cookieValue);

        log.info("OAuth2 Success: JWT cookie set for user - {}", principal.getEmail());

        getRedirectStrategy().sendRedirect(request, response, successRedirectUri);
    }
}