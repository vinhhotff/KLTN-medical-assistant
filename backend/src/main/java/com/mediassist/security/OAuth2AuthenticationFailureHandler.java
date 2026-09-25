package com.mediassist.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * OAuth2AuthenticationFailureHandler - Xu ly khi Google xac thuc that bai.
 *
 * Redirect ve Frontend voi error param de hien thi thong bao loi.
 */
@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationFailureHandler.class);

    @Value("${app.oauth2.failure-redirect-uri:http://localhost:5173/login?error=oauth2_failed}")
    private String failureRedirectUri;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        // Log ngu canh callback (khong log gia tri 'code') de chan doan: invalid_request = thieu code/state,
        // authorization_request_not_found = mat session/state (vd. mo lai URL callback cu)
        log.warn("OAuth2 Authentication Failed: {} | uri={}, hasCode={}, hasState={}, providerError={}, providerErrorDescription={}",
                exception.getMessage(),
                request.getRequestURI(),
                request.getParameter("code") != null,
                request.getParameter("state") != null,
                request.getParameter("error"),
                request.getParameter("error_description"));

        String errorMsg = URLEncoder.encode(
                exception.getMessage() != null ? exception.getMessage() : "oauth2_failed",
                StandardCharsets.UTF_8
        );

        String redirectUrl = failureRedirectUri.contains("?")
                ? failureRedirectUri + "&message=" + errorMsg
                : failureRedirectUri + "?message=" + errorMsg;

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}