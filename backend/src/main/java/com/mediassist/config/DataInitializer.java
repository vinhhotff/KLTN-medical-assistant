package com.mediassist.config;

import com.mediassist.model.entity.*;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.mediassist.service.DoctorSemanticSearchService doctorSemanticSearchService;

    @Value("${app.seed.admin.email:admin@mediassist.local}")
    private String adminEmail;

    @Value("${app.seed.admin.password:Admin@SecurePass2026!}")
    private String adminPassword;

    @Value("${app.seed.admin.name:System Administrator}")
    private String adminName;

    public DataInitializer(UserRepository userRepository,
                           SpecialtyRepository specialtyRepository,
                           DoctorProfileRepository doctorProfileRepository,
                           PasswordEncoder passwordEncoder,
                           com.mediassist.service.DoctorSemanticSearchService doctorSemanticSearchService) {
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
    }

    @Override
    public void run(String... args) {
        log.info("🌱 Checking database seed requirements for Milestone 1 & 2...");

        // 1. Seed Specialties
        seedSpecialties();

        // 2. Seed Admin User
        seedAdmin();

        // 3. Seed Demo Doctors
        seedDoctor();

        // 4. Seed Demo Patient
        seedPatient();

        // 5. Sync pgvector Embeddings for Doctors
        try {
            doctorSemanticSearchService.syncAllDoctorEmbeddings();
        } catch (Exception e) {
            log.warn("Could not sync vector embeddings during boot: {}", e.getMessage());
        }
    }

    private void seedAdmin() {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .fullName(adminName)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(admin);
            log.info("✅ Seeded Admin: {}", adminEmail);
        }
    }

    private void seedDoctor() {
        String docEmail = "doctor@mediassist.local";
        if (!userRepository.existsByEmail(docEmail)) {
            User docUser = User.builder()
                    .email(docEmail)
                    .fullName("TS. BS. Nguyễn Văn An")
                    .phone("0912345678")
                    .passwordHash(passwordEncoder.encode("Doctor@SecurePass2026!"))
                    .role(Role.DOCTOR)
                    .status(UserStatus.ACTIVE)
                    .build();
            docUser = userRepository.save(docUser);

            var cardio = specialtyRepository.findBySlug("cardiology");
            DoctorProfile profile = new DoctorProfile();
            profile.setUser(docUser);
            profile.setBio("Hơn 15 năm kinh nghiệm tầm soát và điều trị rối loạn nhịp tim, bệnh mạch vành can thiệp tại BV Đại Học Y Dược TP.HCM.");
            profile.setLicenseNumber("008921/BYT-CCHN");
            profile.setYearsOfExperience(15);
            profile.setConsultationFee(new BigDecimal("350000.00"));
            profile.setVerified(true);
            profile.setVerifiedAt(LocalDateTime.now());
            if (cardio.isPresent()) {
                profile.setSpecialties(new HashSet<>(Set.of(cardio.get())));
            }
            doctorProfileRepository.save(profile);
            log.info("✅ Seeded Doctor: {} (License: 008921/BYT-CCHN)", docEmail);
        }

        String pendingDocEmail = "doctor.pending@mediassist.local";
        if (!userRepository.existsByEmail(pendingDocEmail)) {
            User pendingDocUser = User.builder()
                    .email(pendingDocEmail)
                    .fullName("BS. CKI Lê Hoàng Long")
                    .phone("0934567890")
                    .passwordHash(passwordEncoder.encode("Doctor@SecurePass2026!"))
                    .role(Role.DOCTOR)
                    .status(UserStatus.ACTIVE)
                    .build();
            pendingDocUser = userRepository.save(pendingDocUser);

            var neuro = specialtyRepository.findBySlug("neurology");
            DoctorProfile pendingProfile = new DoctorProfile();
            pendingProfile.setUser(pendingDocUser);
            pendingProfile.setBio("Chuyên khoa Thần kinh, điều trị đau đầu mãn tính, rối loạn tiền đình và thoái hóa thần kinh.");
            pendingProfile.setLicenseNumber("015482/BYT-CCHN");
            pendingProfile.setYearsOfExperience(8);
            pendingProfile.setConsultationFee(new BigDecimal("300000.00"));
            pendingProfile.setVerified(false);
            if (neuro.isPresent()) {
                pendingProfile.setSpecialties(new HashSet<>(Set.of(neuro.get())));
            }
            doctorProfileRepository.save(pendingProfile);
            log.info("✅ Seeded Pending Doctor: {} (License: 015482/BYT-CCHN, unverified)", pendingDocEmail);
        }
    }

    private void seedPatient() {
        String patientEmail = "patient@mediassist.local";
        if (!userRepository.existsByEmail(patientEmail)) {
            User patientUser = User.builder()
                    .email(patientEmail)
                    .fullName("Trần Thị Bình")
                    .phone("0987654321")
                    .passwordHash(passwordEncoder.encode("Patient@SecurePass2026!"))
                    .role(Role.PATIENT)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(patientUser);
            log.info("✅ Seeded Patient: {}", patientEmail);
        }
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
