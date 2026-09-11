-- ===================================================================
-- MediAssist-AI Flyway Migration: V2__seed_rich_hospital_data.sql
-- Enterprise Hospital Data Seed (12 Specialties, 12 Doctors, 5 Patients, 8 Appointments, Schedule Slots)
-- ===================================================================

-- 0. CLEAN UP OLD MOCK DATA TO ESTABLISH DETERMINISTIC ENTERPRISE BASELINE
TRUNCATE TABLE appointments, doctor_schedule_slots, doctor_specialties, patient_profiles, doctor_profiles, document_analyses, medical_documents, triage_sessions, audit_logs, specialties, users CASCADE;

-- 1. SEED SPECIALTIES (12 Medical Specialties)
INSERT INTO specialties (id, name, slug, description, created_at, updated_at) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Cardiology (Tim mạch)', 'cardiology', 'Chuyên khoa chẩn đoán và điều trị các bệnh lý tim và mạch máu.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000002', 'Neurology (Thần kinh)', 'neurology', 'Chẩn đoán và điều trị các rối loạn hệ thần kinh trung ương và ngoại vi.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000003', 'Gastroenterology (Tiêu hóa - Gan mật)', 'gastroenterology', 'Chuyên khoa điều trị các bệnh về thực quản, dạ dày, ruột non, đại tràng và gan mật tụy.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000004', 'Dermatology (Da liễu)', 'dermatology', 'Chuyên khoa điều trị các bệnh lý về da, lông, tóc, móng và niêm mạc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000005', 'Pediatrics (Nhi khoa)', 'pediatrics', 'Chăm sóc và điều trị các bệnh lý y tế chuyên sâu cho trẻ sơ sinh và trẻ em.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000006', 'General Internal Medicine (Nội tổng quát)', 'general-internal-medicine', 'Khám, chẩn đoán ban đầu và điều trị các bệnh nội khoa tổng quát phổ biến.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000007', 'Pulmonology (Hô hấp & Phổi)', 'pulmonology', 'Chẩn đoán và điều trị các bệnh lý đường hô hấp, hen suyễn, viêm phế quản và bệnh phổi tắc nghẽn.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000008', 'Orthopedics (Cơ Xương Khớp)', 'orthopedics', 'Điều trị các bệnh lý thoái hóa khớp, cột sống, chấn thương thể thao và bệnh cơ xương khớp.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000009', 'Nephrology (Thận & Tiết niệu)', 'nephrology', 'Chẩn đoán và điều trị suy thận, sỏi tiết niệu, viêm cầu thận và lọc máu chu kỳ.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000010', 'Obstetrics & Gynecology (Sản Phụ Khoa)', 'obstetrics-gynecology', 'Chăm sóc sức khỏe sinh sản, quản lý thai kỳ, tầm soát và điều trị các bệnh phụ khoa.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000011', 'Endocrinology (Nội tiết & Đái tháo đường)', 'endocrinology', 'Chuyên sâu điều trị đái tháo đường, rối loạn tuyến giáp, suy tuyến thượng thận và rối loạn chuyển hóa.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-0000-0000-000000000012', 'Otolaryngology (Tai Mũi Họng)', 'ent', 'Khám và điều trị các bệnh lý xoang, viêm họng, viêm amidan, thanh quản và các bệnh tai mũi họng.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. SEED SYSTEM ADMIN
-- Password: Admin@SecurePass2026! ($2a$12$JiBed66YKZvdc79pDlhc1ej2Q87KC9BfuxTbtuw2qmd.QUeM8/Pda)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at, updated_at) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'admin@mediassist.local', '$2a$12$JiBed66YKZvdc79pDlhc1ej2Q87KC9BfuxTbtuw2qmd.QUeM8/Pda', 'System Administrator', '0901000001', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. SEED 12 HOSPITAL DOCTORS (9 Verified & 3 Pending)
-- Common Doctor Password: Doctor@SecurePass2026! ($2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at, updated_at) VALUES
    -- Doc 1: Tim Mạch (BV ĐH Y Dược)
    ('b0000000-0000-0000-0000-000000000010', 'doctor@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Nguyễn Văn An', '0912345678', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 2: Hô Hấp (BV Bạch Mai)
    ('b0000000-0000-0000-0000-000000000011', 'dr.huong@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Trần Thị Mai Hương', '0912345679', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 3: Tiêu Hóa (BV Chợ Rẫy)
    ('b0000000-0000-0000-0000-000000000012', 'dr.tuan@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Phạm Quốc Tuấn', '0912345680', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 4: Da Liễu (BV Da Liễu Trung Ương)
    ('b0000000-0000-0000-0000-000000000013', 'dr.thao@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Đỗ Bích Thảo', '0912345681', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 5: Cơ Xương Khớp (BV Việt Đức)
    ('b0000000-0000-0000-0000-000000000014', 'dr.toan@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Vũ Đức Toàn', '0912345682', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 6: Thận - Tiết Niệu (BV Bình Dân)
    ('b0000000-0000-0000-0000-000000000015', 'dr.duc@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Hoàng Minh Đức', '0912345683', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 7: Nhi Khoa (BV Nhi Đồng 1)
    ('b0000000-0000-0000-0000-000000000016', 'dr.tam@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Nguyễn Thanh Tâm', '0912345684', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 8: Sản Phụ Khoa (BV Từ Dũ)
    ('b0000000-0000-0000-0000-000000000017', 'dr.yen@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Trịnh Hải Yến', '0912345685', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 9: Nội Tổng Quát (BV Nhân Dân 115)
    ('b0000000-0000-0000-0000-000000000018', 'dr.huy@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Bùi Quang Huy', '0912345686', 'DOCTOR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 10 (Pending): Thần Kinh (BV Chợ Rẫy)
    ('b0000000-0000-0000-0000-000000000019', 'doctor.pending@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Lê Hoàng Long', '0934567890', 'DOCTOR', 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 11 (Pending): Tai Mũi Họng (BV Tai Mũi Họng TP.HCM)
    ('b0000000-0000-0000-0000-000000000020', 'dr.khang.pending@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Nguyễn Tuấn Khang', '0934567891', 'DOCTOR', 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Doc 12 (Pending): Nội Tiết (BV Nội Tiết Trung Ương)
    ('b0000000-0000-0000-0000-000000000021', 'dr.lan.pending@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Đỗ Phương Lan', '0934567892', 'DOCTOR', 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. SEED DOCTOR PROFILES
INSERT INTO doctor_profiles (
    id, user_id, bio, license_number, consultation_fee, years_of_experience,
    academic_title, hospital_affiliation, department, license_issued_by,
    rating, total_consultations, is_verified, verified_at, created_at, updated_at
) VALUES
    ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010',
     'Hơn 22 năm kinh nghiệm trong lĩnh vực can thiệp mạch vành, điều trị suy tim và rối loạn nhịp phức tạp tại Bệnh viện Đại Học Y Dược TP.HCM.',
     '008921/BYT-CCHN', 450000.00, 22, 'GS.TS. BS.', 'Bệnh viện Đại Học Y Dược TP.HCM', 'Khoa Can Thiệp Tim Mạch & Hồi Sức Cấp Cứu', 'Cục Quản Lý Khám Chữa Bệnh - Bộ Y Tế', 4.98, 3420, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011',
     'Chuyên gia đầu ngành về bệnh phổi tắc nghẽn mạn tính (COPD), hen phế quản khó trị và các bệnh lý nhiễm trùng đường hô hấp tại Bệnh viện Bạch Mai.',
     '004312/BYT-CCHN', 400000.00, 18, 'PGS.TS. BS.', 'Bệnh viện Bạch Mai Hà Nội', 'Trung Tâm Hô Hấp Quốc Gia', 'Bộ Y Tế', 4.95, 2810, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012',
     'Chuyên sâu nội soi can thiệp tiêu hóa, tầm soát ung thư sớm đường tiêu hóa và điều trị viêm loét dạ dày - tá tràng tại Bệnh viện Chợ Rẫy.',
     '011284/BYT-CCHN', 350000.00, 16, 'BS. CKII.', 'Bệnh viện Chợ Rẫy TP.HCM', 'Khoa Nội Tiêu Hóa & Nội Soi Can Thiệp', 'Sở Y Tế TP. Hồ Chí Minh', 4.92, 2150, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013',
     'Hơn 14 năm kinh nghiệm laser thẩm mỹ da, điều trị mụn trứng cá nặng, viêm da cơ địa và các bệnh tự miễn ngoài da tại Bệnh viện Da Liễu Trung Ương.',
     '009472/BYT-CCHN', 350000.00, 14, 'TS. BS.', 'Bệnh viện Da Liễu Trung Ương', 'Khoa Laser & Phẫu Thuật Tạo Hình Da', 'Bộ Y Tế', 4.94, 1980, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000014',
     'Phẫu thuật nội soi khớp gối, khớp vai, điều trị thoái hóa cột sống thắt lưng và chấn thương thể thao tại Bệnh viện Hữu Nghị Việt Đức.',
     '013891/BYT-CCHN', 300000.00, 12, 'ThS. BS.', 'Bệnh viện Hữu Nghị Việt Đức', 'Khoa Phẫu Thuật Khớp & Y Học Thể Thao', 'Bộ Y Tế', 4.89, 1640, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000015',
     'Chuyên gia tán sỏi thận qua da, phẫu thuật nội soi tiết niệu và quản lý bệnh thận mạn giai đoạn tiến triển tại Bệnh viện Bình Dân TP.HCM.',
     '007623/BYT-CCHN', 380000.00, 15, 'TS. BS.', 'Bệnh viện Bình Dân TP.HCM', 'Khoa Niệu A & Ghép Thận', 'Sở Y Tế TP. Hồ Chí Minh', 4.91, 2290, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000016',
     'Chuyên khoa Nhi tổng quát, khám và điều trị các bệnh hô hấp sơ sinh, sốt phát ban, tiêu chảy nhiễm trùng và tư vấn tiêm chủng tại Bệnh viện Nhi Đồng 1.',
     '016729/SYT-CCHN', 250000.00, 10, 'BS. CKI.', 'Bệnh viện Nhi Đồng 1 TP.HCM', 'Khoa Hồi Sức Sơ Sinh & Nhi Tổng Quát', 'Sở Y Tế TP. Hồ Chí Minh', 4.96, 1750, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000017',
     'Hơn 20 năm kinh nghiệm quản lý thai kỳ nguy cơ cao, sàng lọc tiền sản và điều trị u xơ tử cung, u nang buồng trứng tại Bệnh viện Từ Dũ TP.HCM.',
     '003891/BYT-CCHN', 450000.00, 20, 'PGS.TS. BS.', 'Bệnh viện Từ Dũ TP.HCM', 'Khoa Sản Bệnh & Chăm Sóc Tiền Sản', 'Bộ Y Tế', 4.97, 3100, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000018',
     'Khám và tầm soát toàn diện các bệnh lý nội khoa, tăng huyết áp, rối loạn chuyển hóa lipid và hội chứng mệt mỏi mạn tính tại Bệnh viện Nhân Dân 115.',
     '018342/SYT-CCHN', 250000.00, 11, 'BS. CKI.', 'Bệnh viện Nhân Dân 115 TP.HCM', 'Khoa Khám Bệnh & Tầm Soát Đa Khoa', 'Sở Y Tế TP. Hồ Chí Minh', 4.88, 1420, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- PENDING DOCTORS (Chờ duyệt)
    ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000019',
     'Chuyên khoa Thần kinh, điều trị đau đầu mạn tính, hội chứng tiền đình, đột quỵ thiếu máu não thoáng qua tại Bệnh viện Chợ Rẫy TP.HCM.',
     '015482/BYT-CCHN', 300000.00, 9, 'BS. CKII.', 'Bệnh viện Chợ Rẫy TP.HCM', 'Khoa Thần Kinh & Đột Quỵ', 'Sở Y Tế TP. Hồ Chí Minh', 4.88, 960, FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000020',
     'Phẫu thuật nội soi xoang mũi, cắt amidan bằng Coblator, điều trị viêm tai giữa cấp và mạn tính tại Bệnh viện Tai Mũi Họng TP.HCM.',
     '020419/SYT-CCHN', 300000.00, 8, 'ThS. BS.', 'Bệnh viện Tai Mũi Họng TP.HCM', 'Khoa Mũi Xoang', 'Sở Y Tế TP. Hồ Chí Minh', 4.85, 780, FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000021',
     'Tầm soát và điều trị đái tháo đường thai kỳ, suy giáp Hashimoto và bướu cổ nhân tại Bệnh viện Nội Tiết Trung Ương.',
     '019385/BYT-CCHN', 280000.00, 7, 'BS.', 'Bệnh viện Nội Tiết Trung Ương', 'Khoa Đái Tháo Đường & Rối Loạn Chuyển Hóa', 'Bộ Y Tế', 4.82, 620, FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. LINK DOCTOR SPECIALTIES
INSERT INTO doctor_specialties (doctor_profile_id, specialty_id) VALUES
    ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001'), -- An: Tim Mạch
    ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000007'), -- Huong: Hô Hấp
    ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003'), -- Tuan: Tiêu Hóa
    ('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004'), -- Thao: Da Liễu
    ('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000008'), -- Toan: Cơ Xương Khớp
    ('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000009'), -- Duc: Thận - Tiết Niệu
    ('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000005'), -- Tam: Nhi Khoa
    ('c0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000010'), -- Yen: Sản Phụ Khoa
    ('c0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000006'), -- Huy: Nội Tổng Quát
    ('c0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002'), -- Long: Thần Kinh
    ('c0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000012'), -- Khang: Tai Mũi Họng
    ('c0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011'); -- Lan: Nội Tiết

-- 6. SEED DOCTOR SCHEDULE SLOTS (For all verified doctors, Monday - Friday)
-- Ca Sáng: 08:00 - 11:30 | Ca Chiều: 13:30 - 17:00 (Mỗi slot 30 phút)
DO $$
DECLARE
    doc_rec RECORD;
    d_day TEXT;
    t_start TIME;
BEGIN
    FOR doc_rec IN SELECT id FROM doctor_profiles WHERE is_verified = TRUE LOOP
        FOR d_day IN SELECT UNNEST(ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']) LOOP
            -- Ca sáng (7 slots)
            FOR t_start IN SELECT UNNEST(ARRAY['08:00'::time, '08:30'::time, '09:00'::time, '09:30'::time, '10:00'::time, '10:30'::time, '11:00'::time]) LOOP
                INSERT INTO doctor_schedule_slots (id, doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, created_at)
                VALUES (gen_random_uuid(), doc_rec.id, d_day, t_start, t_start + interval '30 minutes', 30, TRUE, CURRENT_TIMESTAMP);
            END LOOP;

            -- Ca chiều (7 slots)
            FOR t_start IN SELECT UNNEST(ARRAY['13:30'::time, '14:00'::time, '14:30'::time, '15:00'::time, '15:30'::time, '16:00'::time, '16:30'::time]) LOOP
                INSERT INTO doctor_schedule_slots (id, doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, created_at)
                VALUES (gen_random_uuid(), doc_rec.id, d_day, t_start, t_start + interval '30 minutes', 30, TRUE, CURRENT_TIMESTAMP);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- 7. SEED 5 PATIENT USERS & EMR MEDICAL PASSPORTS
-- Common Patient Password: Patient@SecurePass2026! ($2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at, updated_at) VALUES
    ('b0000000-0000-0000-0000-000000000031', 'patient@mediassist.local', '$2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu', 'Trần Thị Bình', '0987654321', 'PATIENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000032', 'patient2@mediassist.local', '$2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu', 'Lê Minh Trí', '0987654322', 'PATIENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000033', 'patient3@mediassist.local', '$2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu', 'Phạm Thị Ngọc Ánh', '0987654323', 'PATIENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000034', 'patient4@mediassist.local', '$2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu', 'Nguyễn Hoàng Nam', '0987654324', 'PATIENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000035', 'patient5@mediassist.local', '$2a$12$PpuWvIoc6vc/0zJIEqLc5O2/0K50xj4Zqz1FbiaOBc/GLGimGfjdu', 'Vũ Thị Cẩm Tú', '0987654325', 'PATIENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Patient Profiles
INSERT INTO patient_profiles (
    id, user_id, patient_code, citizen_id, health_insurance_number,
    date_of_birth, gender, blood_group, address, allergies, medical_history,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    created_at, updated_at
) VALUES
    ('d0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000031',
     'BN-2026-08492', '079188002931', 'DN4791234567890',
     '1988-10-15', 'FEMALE', 'O+', 'Số 128 Nguyễn Tri Phương, Phường 9, Quận 5, TP. Hồ Chí Minh',
     'Dị ứng nhóm kháng sinh Beta-lactam (Penicillin, Amoxicillin), Tôm cua biển',
     'Tăng huyết áp nguyên phát 3 năm (đang kiểm soát), Tiền sử gia đình có bố bị đột quỵ não',
     'Trần Văn Hùng', '0909123888', 'Chồng', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('d0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000032',
     'BN-2026-01583', '001072004819', 'GD4018273645192',
     '1972-04-20', 'MALE', 'A+', 'Số 45 Phố Huế, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội',
     'Dị ứng Aspirin & NSAIDs (nguy cơ co thắt phế quản, hen suyễn do aspirin)',
     'Hen phế quản độ 2 từ năm 2018, Đái tháo đường type 2 đang dùng Metformin 500mg',
     'Lê Minh Tuấn', '0918234999', 'Con trai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('d0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000033',
     'BN-2026-04921', '048195003821', 'DN4481928374610',
     '1997-08-12', 'FEMALE', 'B+', 'Số 210 Lê Duẩn, Phường Tân Chính, Quận Thanh Khê, TP. Đà Nẵng',
     'Không ghi nhận tiền sử dị ứng thuốc hay thức ăn',
     'Viêm dạ dày trào ngược (GERD), Thường xuyên đau thượng vị khi căng thẳng công việc',
     'Nguyễn Thị Mai', '0905123456', 'Mẹ ruột', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('d0000000-0000-0000-0000-000000000034', 'b0000000-0000-0000-0000-000000000034',
     'BN-2026-07312', '092084001924', 'QN4920192837461',
     '1984-11-05', 'MALE', 'AB+', 'Số 15 Đại lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ',
     'Dị ứng kháng sinh Cefalosporin thế hệ 2, Dị ứng phấn hoa',
     'Tăng acid uric máu (Gout mạn), Sỏi đài thận dưới 4mm đã tán sỏi năm 2024',
     'Phan Thùy Trang', '0939123789', 'Vợ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('d0000000-0000-0000-0000-000000000035', 'b0000000-0000-0000-0000-000000000035',
     'BN-2026-09145', '079191008273', 'TE4790192837465',
     '1991-03-25', 'FEMALE', 'O-', 'Số 88 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
     'Dị ứng Paracetamol (nổi mày đay cấp tính), Dị ứng thời tiết lạnh',
     'Viêm da cơ địa dị ứng, Viêm mũi xoang xuất tiết tái phát',
     'Vũ Quang Huy', '0903888999', 'Anh trai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. SEED CLINICAL ENCOUNTERS & APPOINTMENTS (Completed & Upcoming)
INSERT INTO appointments (
    id, appointment_code, patient_id, doctor_id,
    scheduled_start, scheduled_end, status, payment_status, fee_amount,
    queue_number, clinic_room, chief_complaint, vital_signs_json,
    icd10code, icd10name, prescription_json, treatment_plan,
    follow_up_date, consultation_notes, created_at, updated_at, version
) VALUES
    -- Ca 1: Bệnh nhân Bình khám Tim mạch GS An (ĐÃ HOÀN TẤT)
    ('e0000000-0000-0000-0000-000000000001', 'AP-20260910-CLIN01',
     'b0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000010',
     CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '30 minutes',
     'COMPLETED', 'PAID', 450000.00,
     'STT 08', 'Phòng Khám 204 - Khoa Can Thiệp Tim Mạch',
     'Đau thắt ngực trái âm ỉ khi gắng sức, hồi hộp trống ngực 1 tuần nay',
     '{"bloodPressure":"135/85","heartRate":78,"temperature":36.8,"respiratoryRate":18,"height":165,"weight":58,"bmi":21.3,"spO2":98}',
     'I20.9', 'Cơn đau thắt ngực, không xác định (Angina pectoris, unspecified)',
     '[{"drugName":"Lipitor 20mg","activeIngredient":"Atorvastatin","dosage":"Uống 1 viên vào buổi tối sau ăn","quantity":30,"unit":"viên","days":30},{"drugName":"Aspirin 81mg","activeIngredient":"Aspirin","dosage":"Uống 1 viên vào buổi sáng sau ăn no","quantity":30,"unit":"viên","days":30},{"drugName":"Betaloc ZOK 25mg","activeIngredient":"Metoprolol succinate","dosage":"Uống 1 viên vào buổi sáng","quantity":30,"unit":"viên","days":30}]',
     'Kiểm soát LDL-C < 1.8 mmol/L, duy trì huyết áp < 130/80 mmHg. Hạn chế mỡ động vật, đi bộ 30 phút/ngày.',
     CURRENT_DATE + INTERVAL '14 days',
     'Bệnh nhân tỉnh táo, tiếp xúc tốt. Điện tâm đồ ghi nhận nhịp xoang đều tần số 78 l/p. Duy trì phác đồ hạ lipid máu và tái khám đúng hẹn.',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 2: Bệnh nhân Trí khám Hô Hấp PGS Hương (ĐÃ HOÀN TẤT)
    ('e0000000-0000-0000-0000-000000000002', 'AP-20260909-RESP02',
     'b0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000011',
     CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '30 minutes',
     'COMPLETED', 'PAID', 400000.00,
     'STT 03', 'Phòng Khám 108 - Trung Tâm Hô Hấp Quốc Gia',
     'Khó thở về đêm, khò khè kèm ho khan dai dẳng sau cảm cúm',
     '{"bloodPressure":"128/80","heartRate":82,"temperature":36.7,"respiratoryRate":22,"height":168,"weight":64,"bmi":22.7,"spO2":96}',
     'J45.9', 'Bệnh hen suyễn, không xác định (Asthma, unspecified)',
     '[{"drugName":"Symbicort Turbuhaler 160/4.5mcg","activeIngredient":"Budesonide/Formoterol","dosage":"Hít 1 nhát sáng, 1 nhát tối, súc miệng sau hít","quantity":1,"unit":"bình","days":30},{"drugName":"Singulair 10mg","activeIngredient":"Montelukast","dosage":"Uống 1 viên vào buổi tối trước khi đi ngủ","quantity":30,"unit":"viên","days":30}]',
     'Tránh tiếp xúc khói thuốc lá, lông thú cưng, giữ ấm cổ ngực mùa lạnh. Tái khám sau 1 tháng đo lại hô hấp ký.',
     CURRENT_DATE + INTERVAL '30 days',
     'Phổi nghe rải rác rale rít và rale ngáy hai phế trường. FEV1/FVC đạt 72%. Đã hướng dẫn kỹ thuật hít Symbicort đúng cách.',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 3: Bệnh nhân Ánh khám Tiêu Hóa BS Tuấn (ĐÃ HOÀN TẤT)
    ('e0000000-0000-0000-0000-000000000003', 'AP-20260908-GAST03',
     'b0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000012',
     CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '30 minutes',
     'COMPLETED', 'PAID', 350000.00,
     'STT 12', 'Phòng Khám 312 - Khoa Nội Tiêu Hóa',
     'Nóng rát vùng thượng vị lan lên sau xương ức, ợ chua, buồn nôn sau khi ăn no',
     '{"bloodPressure":"115/75","heartRate":72,"temperature":36.6,"respiratoryRate":17,"height":158,"weight":48,"bmi":19.2,"spO2":99}',
     'K21.0', 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản (GERD with esophagitis)',
     '[{"drugName":"Nexium 40mg","activeIngredient":"Esomeprazole","dosage":"Uống 1 viên trước bữa ăn sáng 30 phút","quantity":28,"unit":"viên","days":28},{"drugName":"Gaviscon Dual Action","activeIngredient":"Sodium alginate / Antacid","dosage":"Uống 1 gói sau bữa ăn và trước khi đi ngủ khi có triệu chứng","quantity":20,"unit":"gói","days":10}]',
     'Không nằm ngay sau ăn tối thiểu 2 giờ, chia nhỏ bữa ăn, kiêng bia rượu, cà phê và đồ cay nóng.',
     CURRENT_DATE + INTERVAL '28 days',
     'Bụng mềm, ấn đau tức nhẹ điểm thượng vị, không có đề kháng thành bụng. Nội soi thấy niêm mạc thực quản đoạn 1/3 dưới phù nề độ A (Los Angeles).',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 4: Bệnh nhân Nam khám Thận BS Đức (ĐÃ HOÀN TẤT)
    ('e0000000-0000-0000-0000-000000000004', 'AP-20260907-NEPH04',
     'b0000000-0000-0000-0000-000000000034', 'b0000000-0000-0000-0000-000000000015',
     CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '30 minutes',
     'COMPLETED', 'PAID', 380000.00,
     'STT 05', 'Phòng Khám 405 - Khoa Niệu & Ghép Thận',
     'Đau mỏi thắt lưng hai bên từng cơn, tiểu buốt nhẹ cuối bãi, tiền sử sỏi thận',
     '{"bloodPressure":"130/82","heartRate":75,"temperature":36.8,"respiratoryRate":18,"height":172,"weight":73,"bmi":24.7,"spO2":98}',
     'N20.0', 'Sỏi thận (Calculus of kidney)',
     '[{"drugName":"Feburic 40mg","activeIngredient":"Febuxostat","dosage":"Uống 1 viên vào buổi sáng","quantity":30,"unit":"viên","days":30},{"drugName":"Rowatinex","activeIngredient":"Tinh dầu thảo dược","dosage":"Uống 2 viên/lần x 3 lần/ngày trước bữa ăn","quantity":90,"unit":"viên","days":15}]',
     'Uống đủ 2.5 - 3 lít nước lọc mỗi ngày, hạn chế ăn phủ tạng động vật, thịt đỏ và hải sản giàu purin.',
     CURRENT_DATE + INTERVAL '21 days',
     'Siêu âm hệ tiết niệu thấy sỏi đài dưới thận phải 4.2mm, không ứ nước đài bể thận. Acid uric huyết thanh 485 umol/L.',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 5: Bệnh nhân Bình có lịch khám sắp tới với BS Thảo (ĐÃ TIẾP NHẬN XẾP LỊCH)
    ('e0000000-0000-0000-0000-000000000005', 'AP-20260912-DERM05',
     'b0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000013',
     CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '30 minutes',
     'SCHEDULED', 'PAID', 350000.00,
     'STT 06', 'Phòng Khám 102 - Khoa Laser & Thẩm Mỹ Da',
     'Mẩn đỏ ngứa rát vùng cổ và hai cẳng tay nghi dị ứng thời tiết', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 6: Bệnh nhân Tú có lịch khám sắp tới với BS Tâm (ĐÃ TIẾP NHẬN XẾP LỊCH)
    ('e0000000-0000-0000-0000-000000000006', 'AP-20260913-PEDI06',
     'b0000000-0000-0000-0000-000000000035', 'b0000000-0000-0000-0000-000000000016',
     CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '30 minutes',
     'SCHEDULED', 'UNPAID', 250000.00,
     'STT 11', 'Phòng Khám 201 - Khoa Nhi Tổng Quát',
     'Khám tư vấn dinh dưỡng và theo dõi tăng trưởng định kỳ cho bé 2 tuổi', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 7: Bệnh nhân Trí có lịch khám sắp tới với BS Toàn (ĐÃ TIẾP NHẬN XẾP LỊCH)
    ('e0000000-0000-0000-0000-000000000007', 'AP-20260914-ORTH07',
     'b0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000014',
     CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '30 minutes',
     'SCHEDULED', 'PAID', 300000.00,
     'STT 04', 'Phòng Khám 305 - Khoa Phẫu Thuật Khớp & Thể Thao',
     'Đau nhức khớp gối phải khi lên xuống cầu thang, cứng khớp buổi sáng khoảng 15 phút', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),

    -- Ca 8: Bệnh nhân Ánh có lịch khám sắp tới với BS Yến (ĐÃ TIẾP NHẬN XẾP LỊCH)
    ('e0000000-0000-0000-0000-000000000008', 'AP-20260915-OBGY08',
     'b0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000017',
     CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '30 minutes',
     'SCHEDULED', 'PAID', 450000.00,
     'STT 09', 'Phòng Khám 208 - Khoa Sản Phụ Khoa',
     'Khám phụ khoa định kỳ và tư vấn tiền mang thai', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- 9. SEED AUDIT LOGS
INSERT INTO audit_logs (id, action, resource, metadata, user_id, created_at) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'SYSTEM_INITIALIZATION', 'DATABASE', 'Flyway baseline and enterprise hospital dataset migration successfully applied.', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000002', 'VET_DOCTOR_APPROVED', 'doctor_profiles/c0000000-0000-0000-0000-000000000010', 'Phê duyệt hồ sơ GS.TS. BS. Nguyễn Văn An (008921/BYT-CCHN).', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000003', 'CLINICAL_ENCOUNTER_COMPLETED', 'appointments/e0000000-0000-0000-0000-000000000001', 'Hoàn tất ca khám lâm sàng AP-20260910-CLIN01 với chẩn đoán ICD-10 I20.9.', 'b0000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP);
