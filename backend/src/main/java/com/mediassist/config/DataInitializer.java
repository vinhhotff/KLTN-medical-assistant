package com.mediassist.config;

import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin.email:admin@mediassist.local}")
    private String adminEmail;

    @Value("${app.seed.admin.password:Admin@SecurePass2026!}")
    private String adminPassword;

    @Value("${app.seed.admin.name:System Administrator}")
    private String adminName;

    public DataInitializer(UserRepository userRepository, SpecialtyRepository specialtyRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        log.info("🌱 Checking database seed requirements...");

        // 1. Seed Admin User
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .fullName(adminName)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(admin);
            log.info("✅ Admin user seeded: {} with role ADMIN", adminEmail);
        } else {
            log.info("ℹ️ Admin user already exists ({})", adminEmail);
        }

        // 2. Seed Medical Specialties
        seedSpecialties();
    }

    private void seedSpecialties() {
        var specialties = List.of(
                new SpecialtyData("Cardiology (Tim mạch)", "cardiology", "Chuyên khoa chẩn đoán và điều trị các bệnh lý tim và mạch máu."),
                new SpecialtyData("Dermatology (Da liễu)", "dermatology", "Chuyên khoa điều trị các bệnh lý về da, lông, tóc, móng và niêm mạc."),
                new SpecialtyData("Neurology (Thần kinh)", "neurology", "Chẩn đoán và điều trị các rối loạn hệ thần kinh trung ương và ngoại vi."),
                new SpecialtyData("Gastroenterology (Tiêu hóa)", "gastroenterology", "Chuyên khoa điều trị các bệnh về dạ dày, ruột non, đại tràng và gan mật."),
                new SpecialtyData("Pediatrics (Nhi khoa)", "pediatrics", "Chăm sóc sức khỏe y tế chuyên sâu cho trẻ em và trẻ sơ sinh."),
                new SpecialtyData("General Internal Medicine (Nội tổng quát)", "general-internal-medicine", "Khám, chẩn đoán ban đầu và điều trị các bệnh nội khoa phổ biến.")
        );

        for (var data : specialties) {
            if (!specialtyRepository.existsBySlug(data.slug())) {
                Specialty specialty = Specialty.builder()
                        .name(data.name())
                        .slug(data.slug())
                        .description(data.description())
                        .build();
                specialtyRepository.save(specialty);
                log.info("  + Seeded Specialty: {}", data.name());
            }
        }
    }

    private record SpecialtyData(String name, String slug, String description) {}
}
