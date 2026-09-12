package com.mediassist.config;

import com.mediassist.security.JwtAuthenticationFilter;
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

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Hardening HTTP Security Headers (Anti-Clickjacking, Anti-XSS, Anti-MIME sniffing)
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(Customizer.withDefaults())
                        .xssProtection(Customizer.withDefaults())
                )
                .authorizeHttpRequests(auth -> auth
                        // Public Endpoints
                        .requestMatchers(
                                "/api/v1/health/**",
                                "/health/**",
                                "/actuator/**",
                                "/api/v1/auth/login",
                                "/api/v1/auth/register",
                                "/api/v1/auth/google/**",
                                "/api/docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        // Public Catalog Preview (Specialties & Doctor directory overview)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/specialties/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/doctors").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/doctors/{id}").permitAll()
                        // Public Instant Document Validation Preview (Landing Page Real Testing)
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/documents/analyze-preview").permitAll()

                        // ZERO-TRUST MANDATE: AI Triage, pgvector semantic search & OCR Lab PDF analysis strictly require authentication
                        .requestMatchers("/api/v1/triage/**").authenticated()
                        .requestMatchers("/api/v1/documents/**").authenticated()

                        // Appointments (Booking & History)
                        .requestMatchers("/api/v1/appointments/**").authenticated()

                        // Admin Protected
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // Doctor Protected
                        .requestMatchers("/api/v1/doctors/me/**").hasRole("DOCTOR")
                        .requestMatchers("/api/v1/doctor/**").hasRole("DOCTOR")

                        // Patient & Clinical EMR Access
                        .requestMatchers("/api/v1/patient/**").hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        // Any other request must be authenticated
                        .anyRequest().authenticated()
                )
                // Return clean JSON 401 on unauthorized access
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Vui lòng đăng nhập tài khoản để sử dụng tính năng này.\"}}");
                        })
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "x-request-id", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
