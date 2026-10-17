package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.common.ClientRequestInfo;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.RegisterRequest;
import com.mediassist.dto.UserDto;
import com.mediassist.event.PasswordChangedEvent;
import com.mediassist.event.PasswordResetRequestedEvent;
import com.mediassist.mail.MailFormat;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.PasswordResetToken;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.PasswordResetTokenRepository;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import com.mediassist.security.SecureTokens;
import com.mediassist.security.UserPrincipal;
import org.slf4j.Logger;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final Duration PASSWORD_RESET_TTL = Duration.ofMinutes(30);

    private final UserRepository userRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    public AuthService(UserRepository userRepository,
                       PatientProfileRepository patientProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       AuditLogRepository auditLogRepository,
                       ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        boolean enableAlias = "true".equalsIgnoreCase(System.getProperty("app.dev.email-alias.enabled", "true"));
        if (enableAlias) {
            if ("dr.an@mediassist.local".equals(email)) {
                email = "doctor@mediassist.local";
            } else if ("patient.nam@mediassist.local".equals(email)) {
                email = "patient@mediassist.local";
            }
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
        String patientCode;
        int attempts = 0;
        do {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            patientCode = "BN-2026-" + suffix;
            attempts++;
            if (attempts > 15) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "CODE_GEN_FAILED", "Không thể tạo mã hồ sơ bệnh nhân.");
            }
        } while (patientProfileRepository.existsByPatientCode(patientCode));

        profile.setPatientCode(patientCode);
        profile.setGender(request.getGender());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setBloodGroup(null);
        profile.setAddress(request.getAddress() != null ? request.getAddress().trim() : "Việt Nam");
        patientProfileRepository.save(profile);

        log.info("🎉 Registered new patient {} with code {}", user.getEmail(), profile.getPatientCode());

        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateAccessToken(principal);

        return new AuthResponse(UserDto.from(user), token);
    }

    /**
     * Tao lien ket dat lai mat khau va phat event gui email.
     * Email khong ton tai: khong lam gi (controller luon tra cung mot thong bao de chong do tim email).
     * Tai khoan SUSPENDED: khong gui email (van ghi audit).
     */
    @Transactional
    public void requestPasswordReset(String email) {
        if (email == null || email.isBlank()) return;
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
            if (user.getStatus() == UserStatus.SUSPENDED) {
                recordAudit(user.getId(), "PASSWORD_RESET_REQUESTED", "Email sent: false (account SUSPENDED)");
                log.info("Password reset skipped for suspended account {}", MailFormat.maskEmail(user.getEmail()));
                return;
            }

            // Tao token moi thi vo hieu moi token cu
            passwordResetTokenRepository.deleteByUserId(user.getId());
            String rawToken = SecureTokens.generate();
            passwordResetTokenRepository.save(new PasswordResetToken(
                    user, SecureTokens.sha256Hex(rawToken), LocalDateTime.now().plus(PASSWORD_RESET_TTL)));

            recordAudit(user.getId(), "PASSWORD_RESET_REQUESTED", "Email sent: true, TtlMinutes: " + PASSWORD_RESET_TTL.toMinutes());
            eventPublisher.publishEvent(new PasswordResetRequestedEvent(user.getEmail(), user.getFullName(), rawToken));
            log.info("Password reset link issued for {}", MailFormat.maskEmail(user.getEmail()));
        });
    }

    /** Kiem tra som lien ket dat lai mat khau con dung duoc (de trang reset bao "Lien ket da het han"). */
    @Transactional(readOnly = true)
    public boolean isPasswordResetTokenValid(String rawToken) {
        return findUsableResetToken(rawToken).isPresent();
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ.");
        }
        PasswordResetToken prt = passwordResetTokenRepository.findByTokenHash(SecureTokens.sha256Hex(rawToken.trim()))
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN",
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới."));

        if (!prt.isUsable(LocalDateTime.now()) || prt.getUser().getStatus() == UserStatus.SUSPENDED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "TOKEN_EXPIRED",
                    "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
        }

        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new AppException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD",
                    "Mật khẩu phải có ít nhất " + MIN_PASSWORD_LENGTH + " ký tự.");
        }

        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);
        passwordResetTokenRepository.deleteByUserIdAndIdNot(user.getId(), prt.getId());

        recordAudit(user.getId(), "PASSWORD_RESET_COMPLETED", null);
        eventPublisher.publishEvent(new PasswordChangedEvent(user.getEmail(), user.getFullName(), LocalDateTime.now()));
        log.info("Password reset completed for {}", MailFormat.maskEmail(user.getEmail()));
    }

    private Optional<PasswordResetToken> findUsableResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return Optional.empty();
        LocalDateTime now = LocalDateTime.now();
        return passwordResetTokenRepository.findByTokenHash(SecureTokens.sha256Hex(rawToken.trim()))
                .filter(t -> t.isUsable(now))
                .filter(t -> t.getUser().getStatus() != UserStatus.SUSPENDED);
    }

    private void recordAudit(UUID userId, String action, String metadata) {
        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction(action);
        audit.setResource("users/" + userId);
        audit.setMetadata(metadata);
        HttpServletRequest request = ClientRequestInfo.currentRequest();
        audit.setIpAddress(ClientRequestInfo.clientIp(request));
        audit.setUserAgent(ClientRequestInfo.userAgent(request));
        auditLogRepository.save(audit);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        return UserDto.from(user);
    }
}
