package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.RegisterRequest;
import com.mediassist.dto.UserDto;
import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import com.mediassist.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    private final UserRepository userRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       PatientProfileRepository patientProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if ("dr.an@mediassist.local".equals(email)) {
            email = "doctor@mediassist.local";
        } else if ("patient.nam@mediassist.local".equals(email)) {
            email = "patient@mediassist.local";
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác"));

        // 1. Check account lockout status (Brute-force protection)
        if (user.getLockedUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getLockedUntil())) {
                long minutesRemaining = Duration.between(LocalDateTime.now(), user.getLockedUntil()).toMinutes() + 1;
                log.warn("🔒 Locked user {} attempted to login. Lockout active for {} more minutes.", email, minutesRemaining);
                throw new AppException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                        "Tài khoản của bạn tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau " + minutesRemaining + " phút.");
            } else {
                // Lockout period has elapsed, clear lockout automatically
                user.setLockedUntil(null);
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
            }
        }

        // 2. Verify password match
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int newAttempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(newAttempts);

            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                userRepository.save(user);
                log.warn("🚨 [BRUTE-FORCE DETECTED] Account {} locked for {} minutes due to {} failed attempts.",
                        email, LOCKOUT_DURATION_MINUTES, newAttempts);
                throw new AppException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                        "Tài khoản của bạn đã bị khóa " + LOCKOUT_DURATION_MINUTES + " phút do nhập sai mật khẩu " + MAX_FAILED_ATTEMPTS + " lần liên tiếp.");
            } else {
                userRepository.save(user);
                int remaining = MAX_FAILED_ATTEMPTS - newAttempts;
                throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Email hoặc mật khẩu không chính xác. Bạn còn " + remaining + " lần thử trước khi tài khoản bị khóa.");
            }
        }

        // 3. Reset failed login attempts on successful login
        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        // 4. Check account lifecycle status
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new AppException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "Tài khoản của bạn đã bị đình chỉ hoạt động. Vui lòng liên hệ quản trị viên.");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION && user.getRole() == Role.DOCTOR) {
            throw new AppException(HttpStatus.FORBIDDEN, "DOCTOR_PENDING_VERIFICATION", "Hồ sơ bác sĩ của bạn đang chờ quản trị viên thẩm định chứng chỉ hành nghề.");
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateAccessToken(principal);

        log.info("✅ User {} successfully logged in with role {}", user.getEmail(), user.getRole());
        return new AuthResponse(UserDto.from(user), token);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new AppException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email '" + email + "' đã được sử dụng trên hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.");
        }

        // 1. Create Patient User
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhone(request.getPhone().trim());
        }
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user = userRepository.save(user);

        // 2. Automatically Create Patient EMR Profile
        PatientProfile profile = new PatientProfile();
        profile.setUser(user);
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        profile.setPatientCode("BN-2026-" + uniqueSuffix);
        profile.setGender(request.getGender() != null ? request.getGender() : "OTHER");
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setBloodGroup("O+");
        profile.setAddress(request.getAddress() != null ? request.getAddress().trim() : "Việt Nam");
        patientProfileRepository.save(profile);

        log.info("🎉 Registered new patient {} with code {}", user.getEmail(), profile.getPatientCode());

        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateAccessToken(principal);

        return new AuthResponse(UserDto.from(user), token);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        return UserDto.from(user);
    }
}
