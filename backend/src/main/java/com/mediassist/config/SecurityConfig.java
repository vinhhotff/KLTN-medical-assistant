package com.mediassist.config;

import com.mediassist.security.CustomOAuth2UserService;
import com.mediassist.security.CustomOidcUserService;
import com.mediassist.security.JwtAuthenticationFilter;
import com.mediassist.security.OAuth2AuthenticationFailureHandler;
import com.mediassist.security.OAuth2AuthenticationSuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomOidcUserService customOidcUserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2FailureHandler;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CustomOAuth2UserService customOAuth2UserService,
                          CustomOidcUserService customOidcUserService,
                          OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler,
                          OAuth2AuthenticationFailureHandler oAuth2FailureHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.customOAuth2UserService = customOAuth2UserService;
        this.customOidcUserService = customOidcUserService;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
        this.oAuth2FailureHandler = oAuth2FailureHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/health/**", "/health/**", "/actuator/**",
                                "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/register/doctor",
                                "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/reset-password/validate", "/api/v1/auth/verify-email",
                                "/api/v1/auth/google/**",
                                "/api/docs/**", "/swagger-ui/**", "/swagger-ui.html"
                        ).permitAll()
                        // OAuth2 endpoints: phai permit all de Spring Security xu ly duoc
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/system/ai-mode").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/payments/packages").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/clinical/ontology/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/specialties/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/doctors", "/api/v1/doctors/{id}", "/api/v1/doctors/{id}/slots", "/api/v1/doctors/{id}/reviews").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/documents/analyze-preview").permitAll()
                        // Public Sample Random PDF Generator (Meddies Dataset)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/documents/sample-random-pdf").permitAll()
                        // Public Medical PII De-identification Testing (Decree 13/2023/ND-CP & HIPAA)
                        .requestMatchers("/api/v1/pii/**").permitAll()
                        // Public Webhook listener for Stripe Payment Gateway (HMAC Signature Verified)
                        .requestMatchers("/api/v1/payments/webhook/**").permitAll()

                        // ZERO-TRUST MANDATE: AI Triage, pgvector semantic search & OCR Lab PDF analysis strictly require authentication
                        .requestMatchers("/api/v1/system/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/triage/**").authenticated()
                        .requestMatchers("/api/v1/documents/**").authenticated()
                        .requestMatchers("/api/v1/appointments/**").authenticated()
                        .requestMatchers("/api/v1/payments/**").authenticated()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/doctors/me/**").hasRole("DOCTOR")
                        .requestMatchers("/api/v1/doctor/**").hasRole("DOCTOR")
                        .requestMatchers("/api/v1/patient/**").hasAnyRole("PATIENT", "DOCTOR", "ADMIN")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            String path = request.getRequestURI();
                            if (path.startsWith("/oauth2") || path.startsWith("/login/oauth2")) {
                                response.sendRedirect("/login");
                                return;
                            }
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Vui long dang nhap de su dung tinh nang nay.\"}}");
                        })
                )
                // OAuth2 Login Configuration (Ho tro ca standard OAuth2 va OpenID Connect OIDC)
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(auth -> auth.baseUri("/oauth2/authorization"))
                        .redirectionEndpoint(redirect -> redirect.baseUri("/login/oauth2/code/*"))
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService)
                                .oidcUserService(customOidcUserService)
                        )
                        .successHandler(oAuth2SuccessHandler)
                        .failureHandler(oAuth2FailureHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> patterns = new java.util.ArrayList<>();
        for (String origin : allowedOrigins.split(",")) {
            String trimmed = origin.trim();
            if (!trimmed.isEmpty()) {
                patterns.add(trimmed);
            }
        }
        // Ho tro ca localhost va cac dai IP mang noi bo / VPN cho khao sat da may (LAN 192.168.x, 10.x, 172.x, Radmin 26.x)
        patterns.add("http://localhost:[*]");
        patterns.add("https://localhost:[*]");
        patterns.add("http://127.0.0.1:[*]");
        patterns.add("https://127.0.0.1:[*]");
        patterns.add("http://192.168.*:[*]");
        patterns.add("https://192.168.*:[*]");
        patterns.add("http://10.*:[*]");
        patterns.add("https://10.*:[*]");
        patterns.add("http://172.*:[*]");
        patterns.add("https://172.*:[*]");
        patterns.add("http://26.*:[*]");
        patterns.add("https://26.*:[*]");
        configuration.setAllowedOriginPatterns(patterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "x-request-id", "X-Requested-With", "Origin", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}