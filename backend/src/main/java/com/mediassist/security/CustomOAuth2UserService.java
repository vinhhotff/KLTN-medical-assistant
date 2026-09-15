package com.mediassist.security;

import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * CustomOAuth2UserService - Xu ly Upsert User sau khi Google xac thuc thanh cong.
 *
 * Luong Upsert:
 *   1. Google tra ve OAuth2User chua: sub (googleId), email, name, picture
 *   2. Kiem tra tinh hop le cua email & trang thai SUSPENDED cua tai khoan
 *   3. Tim User theo googleId -> neu co, cap nhat avatar va tra ve
 *   4. Tim User theo email -> neu co, lien ket googleId va tra ve (login lan dau bang Google)
 *   5. Tao User moi Role.PATIENT + PatientProfile (dang ky tu dong)
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    private final UserRepository userRepository;
    private final PatientProfileRepository patientProfileRepository;

    public CustomOAuth2UserService(UserRepository userRepository,
                                   PatientProfileRepository patientProfileRepository) {
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        String googleId = (String) attributes.get("sub");
        String email    = (String) attributes.get("email");
        String name     = (String) attributes.get("name");
        String picture  = (String) attributes.get("picture");

        log.debug("OAuth2 login attempt - googleId: {}, email: {}", googleId, email);

        User user = findOrCreateUser(googleId, email, name, picture);
        return OAuth2UserPrincipal.create(user, attributes);
    }

    public User findOrCreateUser(String googleId, String email, String name, String picture) {
        // Validation: Bat buoc phai co email hop le tu Google
        if (email == null || email.isBlank()) {
            log.warn("OAuth2 Login REJECTED: Missing email attribute from Google user profile");
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_email"),
                    "Không thể xác thực: Tài khoản Google không cung cấp địa chỉ email."
            );
        }

        if (googleId == null || googleId.isBlank()) {
            log.warn("OAuth2 Login REJECTED: Missing sub (googleId) attribute from Google user profile");
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_google_id"),
                    "Không thể xác thực: Thiếu mã định danh Google (sub)."
            );
        }

        String normalizedEmail = email.toLowerCase().trim();

        // Case 1: Da login bang Google truoc do
        Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);
        if (byGoogleId.isPresent()) {
            User existing = byGoogleId.get();

            // Zero-Trust Security Guard: Chan dang nhap neu tai khoan bi dinh chi
            if (existing.getStatus() == UserStatus.SUSPENDED) {
                log.warn("OAuth2 Login BLOCKED: User {} (googleId: {}) is SUSPENDED", normalizedEmail, googleId);
                throw new OAuth2AuthenticationException(
                        new OAuth2Error("account_suspended"),
                        "Tài khoản của bạn đã bị đình chỉ hoạt động. Vui lòng liên hệ quản trị viên."
                );
            }

            if (picture != null && !picture.equals(existing.getAvatarUrl())) {
                existing.setAvatarUrl(picture);
                userRepository.save(existing);
            }
            log.info("OAuth2 Login: Existing user by googleId - {}", normalizedEmail);
            return existing;
        }

        // Case 2: Da dang ky bang email/password - lien ket Google lan dau
        Optional<User> byEmail = userRepository.findByEmail(normalizedEmail);
        if (byEmail.isPresent()) {
            User existing = byEmail.get();

            // Zero-Trust Security Guard: Chan lien ket neu tai khoan bi dinh chi
            if (existing.getStatus() == UserStatus.SUSPENDED) {
                log.warn("OAuth2 Link BLOCKED: User {} is SUSPENDED", normalizedEmail);
                throw new OAuth2AuthenticationException(
                        new OAuth2Error("account_suspended"),
                        "Tài khoản của bạn đã bị đình chỉ hoạt động. Vui lòng liên hệ quản trị viên."
                );
            }

            existing.setGoogleId(googleId);
            if (picture != null) existing.setAvatarUrl(picture);
            userRepository.save(existing);
            log.info("OAuth2: Linked Google to existing user - {}", normalizedEmail);
            return existing;
        }

        // Case 3: Nguoi dung moi - tao tai khoan PATIENT tu dong
        return createNewPatientFromGoogle(googleId, normalizedEmail, name, picture);
    }

    private User createNewPatientFromGoogle(String googleId, String email, String name, String picture) {
        String fullName = (name != null && !name.isBlank()) ? name.trim() : email.split("@")[0];

        User newUser = User.builder()
                .email(email)
                .fullName(fullName)
                .avatarUrl(picture)
                .googleId(googleId)
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        User saved = userRepository.save(newUser);

        PatientProfile profile = new PatientProfile();
        profile.setUser(saved);
        profile.setPatientCode("BN-" + java.time.Year.now().getValue()
                + "-" + java.util.UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        patientProfileRepository.save(profile);

        log.info("OAuth2 Register: Created new PATIENT account - {}", email);
        return saved;
    }
}