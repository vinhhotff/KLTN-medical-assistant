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
 *   2. Tim User theo googleId -> neu co, cap nhat avatar va tra ve
 *   3. Tim User theo email -> neu co, lien ket googleId va tra ve (login lan dau bang Google)
 *   4. Tao User moi Role.PATIENT + PatientProfile (dang ky tu dong)
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

    private User findOrCreateUser(String googleId, String email, String name, String picture) {
        // Case 1: Da login bang Google truoc do
        Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);
        if (byGoogleId.isPresent()) {
            User existing = byGoogleId.get();
            if (picture != null && !picture.equals(existing.getAvatarUrl())) {
                existing.setAvatarUrl(picture);
                userRepository.save(existing);
            }
            log.info("OAuth2 Login: Existing user by googleId - {}", email);
            return existing;
        }

        // Case 2: Da dang ky bang email/password - lien ket Google lan dau
        Optional<User> byEmail = userRepository.findByEmail(email.toLowerCase().trim());
        if (byEmail.isPresent()) {
            User existing = byEmail.get();
            existing.setGoogleId(googleId);
            if (picture != null) existing.setAvatarUrl(picture);
            userRepository.save(existing);
            log.info("OAuth2: Linked Google to existing user - {}", email);
            return existing;
        }

        // Case 3: Nguoi dung moi - tao tai khoan PATIENT tu dong
        return createNewPatientFromGoogle(googleId, email, name, picture);
    }

    private User createNewPatientFromGoogle(String googleId, String email, String name, String picture) {
        User newUser = User.builder()
                .email(email.toLowerCase().trim())
                .fullName(name != null ? name : email.split("@")[0])
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