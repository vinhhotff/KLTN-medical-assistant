-- ====================================================================
-- Flyway Migration: V9__verify_all_specialties_and_seed_pending_doctors.sql
-- Description:
--   1. Fully verifies the 3 remaining specialty doctors (Neurology, ENT, Endocrinology)
--      so that ALL 12 hospital clinical specialties have verified, active, bookable doctors
--      indexed in pgvector.
--   2. Adds Monday - Friday schedule slots for doctors 19, 20, 21.
--   3. Seeds 2 dedicated pending doctor accounts for Admin Vetting Portal testing.
-- ====================================================================

-- 1. ACTIVATE USERS & UPDATE EMAILS FOR DOCTORS 19, 20, 21
UPDATE users
SET status = 'ACTIVE',
    email = 'dr.long@mediassist.local',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'b0000000-0000-0000-0000-000000000019';

UPDATE users
SET status = 'ACTIVE',
    email = 'dr.khang@mediassist.local',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'b0000000-0000-0000-0000-000000000020';

UPDATE users
SET status = 'ACTIVE',
    email = 'dr.lan@mediassist.local',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'b0000000-0000-0000-0000-000000000021';

-- 2. VERIFY DOCTOR PROFILES 19, 20, 21
UPDATE doctor_profiles
SET is_verified = TRUE,
    verified_at = CURRENT_TIMESTAMP,
    academic_title = 'BS. CKII.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'c0000000-0000-0000-0000-000000000019';

UPDATE doctor_profiles
SET is_verified = TRUE,
    verified_at = CURRENT_TIMESTAMP,
    academic_title = 'ThS. BS.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'c0000000-0000-0000-0000-000000000020';

UPDATE doctor_profiles
SET is_verified = TRUE,
    verified_at = CURRENT_TIMESTAMP,
    academic_title = 'TS. BS.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'c0000000-0000-0000-0000-000000000021';

-- 3. SEED SCHEDULE SLOTS FOR DOCTORS 19, 20, 21 (If not already present)
DO $$
DECLARE
    doc_id UUID;
    d_day TEXT;
    t_start TIME;
BEGIN
    FOR doc_id IN SELECT UNNEST(ARRAY[
        'c0000000-0000-0000-0000-000000000019'::uuid,
        'c0000000-0000-0000-0000-000000000020'::uuid,
        'c0000000-0000-0000-0000-000000000021'::uuid
    ]) LOOP
        FOR d_day IN SELECT UNNEST(ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']) LOOP
            -- Ca sáng (08:00 - 11:30)
            FOR t_start IN SELECT UNNEST(ARRAY['08:00'::time, '08:30'::time, '09:00'::time, '09:30'::time, '10:00'::time, '10:30'::time, '11:00'::time]) LOOP
                INSERT INTO doctor_schedule_slots (id, doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, created_at)
                VALUES (gen_random_uuid(), doc_id, d_day, t_start, t_start + interval '30 minutes', 30, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING;
            END LOOP;
            -- Ca chiều (13:30 - 17:00)
            FOR t_start IN SELECT UNNEST(ARRAY['13:30'::time, '14:00'::time, '14:30'::time, '15:00'::time, '15:30'::time, '16:00'::time, '16:30'::time]) LOOP
                INSERT INTO doctor_schedule_slots (id, doctor_profile_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, created_at)
                VALUES (gen_random_uuid(), doc_id, d_day, t_start, t_start + interval '30 minutes', 30, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- 4. SEED DEDICATED PENDING DOCTORS FOR ADMIN VETTING PORTAL DEMO
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at, updated_at)
VALUES
    ('b0000000-0000-0000-0000-000000000022', 'dr.nam.pending@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Vũ Hoài Nam', '0934567893', 'DOCTOR', 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b0000000-0000-0000-0000-000000000023', 'dr.thao.pending@mediassist.local', '$2a$12$ErVkPe5iK.Gsvi8fMxrON.PDk1716j.PDTPQeI2JwWgOR3dTJJy1G', 'Lê Thị Phương Thảo', '0934567894', 'DOCTOR', 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO doctor_profiles (
    id, user_id, bio, license_number, consultation_fee, years_of_experience,
    academic_title, hospital_affiliation, department, license_issued_by,
    rating, total_consultations, is_verified, verified_at, created_at, updated_at
) VALUES
    ('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000022',
     'Chuyên khoa Chấn thương Chỉnh hình, điều trị gãy xương phức tạp và phục hồi chức năng sau phẫu thuật tại Bệnh viện Việt Đức.',
     '022931/BYT-CCHN', 320000.00, 8, 'ThS. BS.', 'Bệnh viện Hữu Nghị Việt Đức', 'Khoa Phẫu Thuật Chi Trên', 'Bộ Y Tế', 4.80, 520, FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000023',
     'Bác sĩ chuyên khoa Nhi, điều trị sốt xuất huyết Dengue, tay chân miệng và nhiễm khuẩn hô hấp cấp ở trẻ em tại Bệnh viện Nhi Trung Ương.',
     '023412/SYT-CCHN', 270000.00, 6, 'BS. CKI.', 'Bệnh viện Nhi Trung Ương', 'Khoa Truyền Nhiễm Nhi', 'Sở Y Tế Hà Nội', 4.82, 430, FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctor_specialties (doctor_profile_id, specialty_id)
VALUES
    ('c0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000008'), -- Nam: Cơ Xương Khớp
    ('c0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000005')  -- Thao: Nhi Khoa
ON CONFLICT DO NOTHING;
