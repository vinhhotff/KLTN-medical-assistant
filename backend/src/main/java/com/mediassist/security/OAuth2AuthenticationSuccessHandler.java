package com.mediassist.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * OAuth2AuthenticationSuccessHandler - Xu ly sau khi Google xac thuc thanh cong.
 *
 * 1. Lay OAuth2UserPrincipal tu Authentication context
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

    @Value("${app.oauth2.success-redirect-uri:http://localhost:5173/oauth2/callback}")
    private String successRedirectUri;

    @Value("${app.jwt.access-token-expiration-ms:900000}")
    private long accessTokenExpirationMs;

    public OAuth2AuthenticationSuccessHandler(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2UserPrincipal principal = (OAuth2UserPrincipal) authentication.getPrincipal();

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