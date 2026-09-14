package com.mediassist.config;

import com.mediassist.model.entity.*;
import com.mediassist.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    private final PatientProfileRepository patientProfileRepository;
    private final AppointmentRepository appointmentRepository;

    @Value("${app.seed.admin.email:admin@mediassist.local}")
    private String adminEmail;

    @Value("${app.seed.admin.password:Admin@SecurePass2026!}")
    private String adminPassword;

    @Value("${app.seed.admin.name:System Administrator}")
    private String adminName;

    public DataInitializer(UserRepository userRepository,
                           SpecialtyRepository specialtyRepository,
                           DoctorProfileRepository doctorProfileRepository,
                           PatientProfileRepository patientProfileRepository,
                           AppointmentRepository appointmentRepository,
                           PasswordEncoder passwordEncoder,
                           com.mediassist.service.DoctorSemanticSearchService doctorSemanticSearchService) {
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
    }

    @Override
    @Transactional
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
            profile.setAcademicTitle("TS. BS.");
            profile.setHospitalAffiliation("Bệnh viện Đại Học Y Dược TP.HCM");
            profile.setDepartment("Khoa Can Thiệp Tim Mạch & Hồi Sức Cấp Cứu");
            profile.setLicenseIssuedBy("Cục Quản Lý Khám Chữa Bệnh - Bộ Y Tế");
            profile.setRating(4.95);
            profile.setTotalConsultations(1820);
            if (cardio.isPresent()) {
                profile.setSpecialties(new HashSet<>(Set.of(cardio.get())));
            }
            doctorProfileRepository.save(profile);
            log.info("✅ Seeded Doctor: {} (License: 008921/BYT-CCHN, Academic: TS. BS.)", docEmail);
        }

        String pendingDocEmail = "doctor.pending@mediassist.local";
        if (!userRepository.existsByEmail(pendingDocEmail) && !userRepository.existsByPhone("0934567890")) {
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
            pendingProfile.setAcademicTitle("BS. CKI");
            pendingProfile.setHospitalAffiliation("Bệnh viện Chợ Rẫy TP.HCM");
            pendingProfile.setDepartment("Khoa Thần Kinh & Rối Loạn Tiền Đình");
            pendingProfile.setLicenseIssuedBy("Sở Y Tế TP. Hồ Chí Minh");
            pendingProfile.setRating(4.88);
            pendingProfile.setTotalConsultations(960);
            if (neuro.isPresent()) {
                pendingProfile.setSpecialties(new HashSet<>(Set.of(neuro.get())));
            }
            doctorProfileRepository.save(pendingProfile);
            log.info("✅ Seeded Pending Doctor: {} (License: 015482/BYT-CCHN, unverified)", pendingDocEmail);
        }

        // Backfill existing doctor profiles if academicTitle is null
        doctorProfileRepository.findAll().forEach(p -> {
            if (p.getAcademicTitle() == null) {
                if (p.getUser() != null && p.getUser().getFullName() != null && p.getUser().getFullName().contains("Nguyễn Văn An")) {
                    p.setAcademicTitle("TS. BS.");
                    p.setHospitalAffiliation("Bệnh viện Đại Học Y Dược TP.HCM");
                    p.setDepartment("Khoa Can Thiệp Tim Mạch & Hồi Sức Cấp Cứu");
                    p.setLicenseIssuedBy("Cục Quản Lý Khám Chữa Bệnh - Bộ Y Tế");
                    p.setRating(4.95);
                    p.setTotalConsultations(1820);
                    doctorProfileRepository.save(p);
                } else if (p.getUser() != null && p.getUser().getFullName() != null && p.getUser().getFullName().contains("Lê Hoàng Long")) {
                    p.setAcademicTitle("BS. CKI");
                    p.setHospitalAffiliation("Bệnh viện Chợ Rẫy TP.HCM");
                    p.setDepartment("Khoa Thần Kinh & Rối Loạn Tiền Đình");
                    p.setLicenseIssuedBy("Sở Y Tế TP. Hồ Chí Minh");
                    p.setRating(4.88);
                    p.setTotalConsultations(960);
                    doctorProfileRepository.save(p);
                }
            }
        });
    }

    private void seedPatient() {
        String patientEmail = "patient@mediassist.local";
        User patientUser;
        if (!userRepository.existsByEmail(patientEmail)) {
            patientUser = User.builder()
                    .email(patientEmail)
                    .fullName("Trần Thị Bình")
                    .phone("0987654321")
                    .passwordHash(passwordEncoder.encode("Patient@SecurePass2026!"))
                    .role(Role.PATIENT)
                    .status(UserStatus.ACTIVE)
                    .build();
            patientUser = userRepository.save(patientUser);
            log.info("✅ Seeded Patient: {}", patientEmail);
        } else {
            patientUser = userRepository.findByEmail(patientEmail).orElse(null);
        }

        if (patientUser != null) {
            if (patientProfileRepository.findByUser(patientUser).isEmpty()) {
                PatientProfile pp = new PatientProfile();
                pp.setUser(patientUser);
                pp.setPatientCode("BN-2026-08492");
                pp.setCitizenId("079188002931");
                pp.setHealthInsuranceNumber("DN4791234567890");
                pp.setDateOfBirth(LocalDate.of(1988, 10, 15));
                pp.setGender("FEMALE");
                pp.setBloodGroup("O+");
                pp.setAddress("Số 128 Nguyễn Tri Phương, Phường 9, Quận 5, TP. Hồ Chí Minh");
                pp.setAllergies("Dị ứng nhóm kháng sinh Beta-lactam (Penicillin, Amoxicillin), Tôm cua biển");
                pp.setMedicalHistory("Tăng huyết áp nguyên phát 3 năm (đang kiểm soát), Tiền sử gia đình có bố bị đột quỵ não");
                pp.setEmergencyContactName("Trần Văn Hùng");
                pp.setEmergencyContactPhone("0909123888");
                pp.setEmergencyContactRelationship("Chồng");
                patientProfileRepository.save(pp);
                log.info("✅ Seeded Hospital PatientProfile for code: {}", pp.getPatientCode());
            }

            // Seed a realistic completed clinical encounter
            String demoAppCode = "AP-20260910-CLIN01";
            if (!appointmentRepository.existsByAppointmentCode(demoAppCode)) {
                User doc = userRepository.findByEmail("doctor@mediassist.local").orElse(null);
                if (doc != null) {
                    Appointment clinicalApp = new Appointment();
                    clinicalApp.setAppointmentCode(demoAppCode);
                    clinicalApp.setPatient(patientUser);
                    clinicalApp.setDoctor(doc);
                    clinicalApp.setScheduledStart(LocalDateTime.now().minusDays(1).withHour(9).withMinute(0));
                    clinicalApp.setScheduledEnd(LocalDateTime.now().minusDays(1).withHour(9).withMinute(30));
                    clinicalApp.setStatus(AppointmentStatus.COMPLETED);
                    clinicalApp.setPaymentStatus(PaymentStatus.PAID);
                    clinicalApp.setFeeAmount(new BigDecimal("350000.00"));
                    clinicalApp.setQueueNumber("STT 08");
                    clinicalApp.setClinicRoom("Phòng Khám 204 - Khoa Tim Mạch Can Thiệp");
                    clinicalApp.setChiefComplaint("Đau thắt ngực trái âm ỉ khi gắng sức, hồi hộp trống ngực 1 tuần nay");
                    clinicalApp.setVitalSignsJson("{\"bloodPressure\":\"135/85\",\"heartRate\":78,\"temperature\":36.8,\"respiratoryRate\":18,\"height\":165,\"weight\":58,\"bmi\":21.3,\"spO2\":98}");
                    clinicalApp.setIcd10Code("I20.9");
                    clinicalApp.setIcd10Name("Cơn đau thắt ngực, không xác định (Angina pectoris, unspecified)");
                    clinicalApp.setPrescriptionJson("[{\"drugName\":\"Lipitor 20mg\",\"activeIngredient\":\"Atorvastatin\",\"dosage\":\"Uống 1 viên vào buổi tối sau ăn\",\"quantity\":30,\"unit\":\"viên\",\"days\":30},{\"drugName\":\"Aspirin 81mg\",\"activeIngredient\":\"Aspirin\",\"dosage\":\"Uống 1 viên vào buổi sáng sau ăn no\",\"quantity\":30,\"unit\":\"viên\",\"days\":30},{\"drugName\":\"Betaloc ZOK 25mg\",\"activeIngredient\":\"Metoprolol succinate\",\"dosage\":\"Uống 1 viên vào buổi sáng\",\"quantity\":30,\"unit\":\"viên\",\"days\":30}]");
                    clinicalApp.setTreatmentPlan("Kiểm soát chỉ số mỡ máu LDL-C < 1.8 mmol/L, duy trì huyết áp < 130/80 mmHg. Hạn chế mỡ động vật, tăng cường rau xanh, đi bộ nhẹ nhàng 30 phút/ngày.");
                    clinicalApp.setConsultationNotes("Bệnh nhân tỉnh táo, tiếp xúc tốt. Tim đều, chưa nghe tiếng thổi bất thường. Điện tâm đồ ghi nhận nhịp xoang đều tần số 78 l/p. Bệnh nhân cần tiếp tục duy trì phác đồ hạ lipid máu và tái khám đúng hẹn.");
                    clinicalApp.setFollowUpDate(LocalDate.now().plusDays(14));
                    appointmentRepository.save(clinicalApp);
                    log.info("✅ Seeded Hospital Clinical Encounter Appointment: {}", demoAppCode);
                }
            }
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
