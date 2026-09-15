package com.mediassist;

import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;

import java.io.IOException;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2SecurityTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PatientProfileRepository patientProfileRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private Authentication authentication;

    private CustomOAuth2UserService customOAuth2UserService;
    private OAuth2AuthenticationSuccessHandler successHandler;
    private OAuth2AuthenticationFailureHandler failureHandler;

    @BeforeEach
    void setUp() throws Exception {
        customOAuth2UserService = new CustomOAuth2UserService(userRepository, patientProfileRepository);
        successHandler = new OAuth2AuthenticationSuccessHandler(jwtTokenProvider, customOAuth2UserService);
        failureHandler = new OAuth2AuthenticationFailureHandler();

        lenient().when(response.encodeRedirectURL(anyString())).thenAnswer(inv -> inv.getArgument(0));

        setField(successHandler, "successRedirectUri", "http://localhost:5173/oauth2/callback");
        setField(successHandler, "failureRedirectUri", "http://localhost:5173/login?error=oauth2_failed");
        setField(successHandler, "accessTokenExpirationMs", 900000L);
        setField(successHandler, "cookieSecure", false);

        setField(failureHandler, "failureRedirectUri", "http://localhost:5173/login?error=oauth2_failed");
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    @DisplayName("findOrCreateUser: Tra ve existing user khi tim thay theo googleId va cap nhat avatar")
    void testFindOrCreateUser_ExistingByGoogleId_UpdatesAvatar() {
        User existing = User.builder()
                .id(UUID.randomUUID())
                .email("test.google@gmail.com")
                .fullName("Google User")
                .googleId("google-sub-123456")
                .avatarUrl("http://old-avatar.com/pic.jpg")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findByGoogleId("google-sub-123456")).thenReturn(Optional.of(existing));

        User result = customOAuth2UserService.findOrCreateUser(
                "google-sub-123456", "test.google@gmail.com", "Google User", "http://new-avatar.com/pic.jpg"
        );

        assertNotNull(result);
        assertEquals("http://new-avatar.com/pic.jpg", result.getAvatarUrl());
        verify(userRepository).save(existing);
        verify(patientProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("findOrCreateUser: Lien ket googleId khi tim thay user theo email (lan dau login Google)")
    void testFindOrCreateUser_ExistingByEmail_LinksGoogleId() {
        User existing = User.builder()
                .id(UUID.randomUUID())
                .email("email.only@mediassist.local")
                .fullName("Regular User")
                .googleId(null)
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findByGoogleId("google-new-789")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("email.only@mediassist.local")).thenReturn(Optional.of(existing));

        User result = customOAuth2UserService.findOrCreateUser(
                "google-new-789", "email.only@mediassist.local", "Regular User", "http://avatar.com/pic.jpg"
        );

        assertNotNull(result);
        assertEquals("google-new-789", result.getGoogleId());
        assertEquals("http://avatar.com/pic.jpg", result.getAvatarUrl());
        verify(userRepository).save(existing);
        verify(patientProfileRepository, never()).save(any());
    }

    @Test
    @DisplayName("findOrCreateUser: Tu dong tao PATIENT moi va PatientProfile khi la nguoi dung moi")
    void testFindOrCreateUser_NewUser_CreatesPatientAndProfile() {
        when(userRepository.findByGoogleId("google-brand-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("brand.new@gmail.com")).thenReturn(Optional.empty());

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User result = customOAuth2UserService.findOrCreateUser(
                "google-brand-new", "brand.new@gmail.com", "Brand New", "http://avatar.com/new.jpg"
        );

        assertNotNull(result);
        assertEquals("brand.new@gmail.com", result.getEmail());
        assertEquals("Brand New", result.getFullName());
        assertEquals(Role.PATIENT, result.getRole());
        assertEquals(UserStatus.ACTIVE, result.getStatus());

        ArgumentCaptor<PatientProfile> profileCaptor = ArgumentCaptor.forClass(PatientProfile.class);
        verify(patientProfileRepository).save(profileCaptor.capture());
        PatientProfile capturedProfile = profileCaptor.getValue();
        assertNotNull(capturedProfile);
        assertTrue(capturedProfile.getPatientCode().startsWith("BN-"));
    }

    @Test
    @DisplayName("findOrCreateUser: Nem OAuth2AuthenticationException khi email bi thieu/rong")
    void testFindOrCreateUser_MissingEmail_ThrowsException() {
        OAuth2AuthenticationException ex = assertThrows(
                OAuth2AuthenticationException.class,
                () -> customOAuth2UserService.findOrCreateUser("google-123", null, "No Email", null)
        );
        assertEquals("invalid_email", ex.getError().getErrorCode());

        OAuth2AuthenticationException exBlank = assertThrows(
                OAuth2AuthenticationException.class,
                () -> customOAuth2UserService.findOrCreateUser("google-123", "   ", "Blank Email", null)
        );
        assertEquals("invalid_email", exBlank.getError().getErrorCode());
    }

    @Test
    @DisplayName("findOrCreateUser: Nem OAuth2AuthenticationException khi googleId bi thieu/rong")
    void testFindOrCreateUser_MissingGoogleId_ThrowsException() {
        OAuth2AuthenticationException ex = assertThrows(
                OAuth2AuthenticationException.class,
                () -> customOAuth2UserService.findOrCreateUser(null, "valid@email.com", "User", null)
        );
        assertEquals("invalid_google_id", ex.getError().getErrorCode());
    }

    @Test
    @DisplayName("findOrCreateUser: Zero-Trust Guard - Chan dang nhap khi tai khoan bi SUSPENDED (theo googleId)")
    void testFindOrCreateUser_SuspendedUserByGoogleId_ThrowsException() {
        User suspendedUser = User.builder()
                .id(UUID.randomUUID())
                .email("hacker@malicious.com")
                .fullName("Suspended User")
                .googleId("google-hacker-666")
                .role(Role.PATIENT)
                .status(UserStatus.SUSPENDED)
                .build();

        when(userRepository.findByGoogleId("google-hacker-666")).thenReturn(Optional.of(suspendedUser));

        OAuth2AuthenticationException ex = assertThrows(
                OAuth2AuthenticationException.class,
                () -> customOAuth2UserService.findOrCreateUser("google-hacker-666", "hacker@malicious.com", "Suspended User", null)
        );
        assertEquals("account_suspended", ex.getError().getErrorCode());
        assertTrue(ex.getMessage().contains("đã bị đình chỉ"));
    }

    @Test
    @DisplayName("findOrCreateUser: Zero-Trust Guard - Chan lien ket khi tai khoan bi SUSPENDED (theo email)")
    void testFindOrCreateUser_SuspendedUserByEmail_ThrowsException() {
        User suspendedUser = User.builder()
                .id(UUID.randomUUID())
                .email("banned@target.local")
                .fullName("Banned User")
                .googleId(null)
                .role(Role.PATIENT)
                .status(UserStatus.SUSPENDED)
                .build();

        when(userRepository.findByGoogleId("google-link-try")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("banned@target.local")).thenReturn(Optional.of(suspendedUser));

        OAuth2AuthenticationException ex = assertThrows(
                OAuth2AuthenticationException.class,
                () -> customOAuth2UserService.findOrCreateUser("google-link-try", "banned@target.local", "Banned User", null)
        );
        assertEquals("account_suspended", ex.getError().getErrorCode());
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Thanh cong - cap phat JWT cookie HttpOnly va redirect toi /oauth2/callback")
    void testOnAuthenticationSuccess_ValidUser_SetsCookieAndRedirects() throws IOException {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("patient.verified@gmail.com")
                .fullName("Nguyen Van A")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        OAuth2UserPrincipal principal = OAuth2UserPrincipal.create(user, Map.of("sub", "g-123", "email", user.getEmail()));
        when(authentication.getPrincipal()).thenReturn(principal);
        when(jwtTokenProvider.generateAccessToken(principal)).thenReturn("mocked.jwt.token.value");

        ArgumentCaptor<String> headerCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> redirectCaptor = ArgumentCaptor.forClass(String.class);

        successHandler.onAuthenticationSuccess(request, response, authentication);

        verify(response).addHeader(eq("Set-Cookie"), headerCaptor.capture());
        String cookieHeader = headerCaptor.getValue();
        assertNotNull(cookieHeader);
        assertTrue(cookieHeader.contains("accessToken=mocked.jwt.token.value"));
        assertTrue(cookieHeader.contains("HttpOnly"));
        assertTrue(cookieHeader.contains("SameSite=Lax"));
        assertTrue(cookieHeader.contains("Path=/"));

        verify(response).sendRedirect(redirectCaptor.capture());
        assertEquals("http://localhost:5173/oauth2/callback", redirectCaptor.getValue());
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Chan cap token khi tai khoan SUSPENDED va redirect ve failure URL")
    void testOnAuthenticationSuccess_SuspendedUser_BlocksAndRedirectsToFailure() throws IOException {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("suspended@target.com")
                .fullName("Suspended Target")
                .role(Role.PATIENT)
                .status(UserStatus.SUSPENDED)
                .build();

        OAuth2UserPrincipal principal = OAuth2UserPrincipal.create(user, Map.of("sub", "g-sus", "email", user.getEmail()));
        when(authentication.getPrincipal()).thenReturn(principal);

        ArgumentCaptor<String> redirectCaptor = ArgumentCaptor.forClass(String.class);

        successHandler.onAuthenticationSuccess(request, response, authentication);

        verify(jwtTokenProvider, never()).generateAccessToken(any());
        verify(response, never()).addHeader(eq("Set-Cookie"), anyString());

        verify(response).sendRedirect(redirectCaptor.capture());
        String redirectUrl = redirectCaptor.getValue();
        assertTrue(redirectUrl.startsWith("http://localhost:5173/login?error=oauth2_failed"));
        assertTrue(redirectUrl.contains("message="));
    }

    @Test
    @DisplayName("onAuthenticationFailure: Ma hoa thong bao loi UTF-8 va chuyen huong ve failureRedirectUri")
    void testOnAuthenticationFailure_RedirectsWithEncodedMessage() throws IOException {
        AuthenticationException authEx = new AuthenticationException("Google authentication failed: access_denied") {};
        ArgumentCaptor<String> redirectCaptor = ArgumentCaptor.forClass(String.class);

        failureHandler.onAuthenticationFailure(request, response, authEx);

        verify(response).sendRedirect(redirectCaptor.capture());
        String redirectUrl = redirectCaptor.getValue();
        assertTrue(redirectUrl.contains("error=oauth2_failed"));
        assertTrue(redirectUrl.contains("message=Google+authentication+failed"));
    }

    @Test
    @DisplayName("OAuth2UserPrincipal: Khoi tao day du voi OIDC IdToken va UserInfo")
    void testOAuth2UserPrincipal_OidcIntegration() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("doctor.oidc@mediassist.local")
                .fullName("TS. BS. Oidc")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();

        OidcIdToken idToken = new OidcIdToken(
                "mock-id-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("sub", "oidc-sub-999", "email", user.getEmail(), "email_verified", true)
        );

        OidcUserInfo userInfo = new OidcUserInfo(
                Map.of("sub", "oidc-sub-999", "name", "TS. BS. Oidc", "picture", "http://photo.jpg")
        );

        OAuth2UserPrincipal principal = OAuth2UserPrincipal.create(
                user,
                Map.of("sub", "oidc-sub-999", "email", user.getEmail()),
                idToken,
                userInfo
        );

        assertNotNull(principal);
        assertEquals(user.getEmail(), principal.getName());
        assertEquals(user.getEmail(), principal.getEmail());
        assertEquals("ROLE_DOCTOR", principal.getAuthorities().iterator().next().getAuthority());
        assertEquals(idToken, principal.getIdToken());
        assertEquals(userInfo, principal.getUserInfo());
        assertEquals("oidc-sub-999", principal.getClaims().get("sub"));
        assertTrue(principal.isEnabled());
        assertTrue(principal.isAccountNonLocked());
    }
}
