-- ===================================================================
-- MediAssist-AI Flyway Migration: V1__initial_schema.sql
-- PostgreSQL 16 + pgvector (0.7+) Database Schema
-- ===================================================================

-- 1. PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Users Table (Identity & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    avatar_url TEXT,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'DOCTOR', 'PATIENT')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 3. Specialties Table
CREATE TABLE IF NOT EXISTS specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specialties_slug ON specialties(slug);

-- 4. Doctor Profiles Table (Credentials, Hospitals & pgvector Embeddings)
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    license_number VARCHAR(255) UNIQUE,
    license_document_url VARCHAR(255),
    consultation_fee NUMERIC(10, 2) DEFAULT 0.00,
    years_of_experience INT DEFAULT 0,
    academic_title VARCHAR(50),
    hospital_affiliation VARCHAR(150),
    department VARCHAR(150),
    license_issued_by VARCHAR(150),
    rating DOUBLE PRECISION DEFAULT 4.9,
    total_consultations INT DEFAULT 1250,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    bio_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_verified ON doctor_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_doctor_license ON doctor_profiles(license_number);

-- HNSW Vector Index for Cosine Similarity Search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doctor_bio_hnsw'
    ) THEN
        CREATE INDEX idx_doctor_bio_hnsw ON doctor_profiles 
        USING hnsw (bio_embedding vector_cosine_ops);
    END IF;
END $$;

-- 5. Doctor Specialties Junction Table
CREATE TABLE IF NOT EXISTS doctor_specialties (
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    PRIMARY KEY (doctor_profile_id, specialty_id)
);

-- 6. Doctor Schedule Slots Table (Weekly recurring appointment slots)
CREATE TABLE IF NOT EXISTS doctor_schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_lookup 
ON doctor_schedule_slots(doctor_profile_id, day_of_week, is_active);

-- 7. Patient Profiles Table (EMR Medical Passport, BHYT, CCCD, Allergies)
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    citizen_id VARCHAR(20) UNIQUE,
    health_insurance_number VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_group VARCHAR(10),
    address TEXT,
    allergies TEXT,
    medical_history TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_code ON patient_profiles(patient_code);
CREATE INDEX IF NOT EXISTS idx_patient_citizen_id ON patient_profiles(citizen_id);
CREATE INDEX IF NOT EXISTS idx_patient_user_id ON patient_profiles(user_id);

-- 8. Appointments Table (Telehealth & In-Person Clinical Encounters)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_code VARCHAR(30) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID'
        CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
    fee_amount NUMERIC(12, 2) NOT NULL,
    queue_number VARCHAR(50),
    clinic_room VARCHAR(100),
    chief_complaint TEXT,
    vital_signs_json TEXT,
    icd10_code VARCHAR(20),
    icd10_name VARCHAR(255),
    prescription_json TEXT,
    treatment_plan TEXT,
    follow_up_date DATE,
    cancellation_reason TEXT,
    consultation_notes TEXT,
    telehealth_room_id VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON appointments(appointment_code);

-- 9. Triage Sessions Table (Symptom Assessment Sessions)
CREATE TABLE IF NOT EXISTS triage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    symptoms_text TEXT NOT NULL,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    urgency_level VARCHAR(20) NOT NULL CHECK (urgency_level IN ('ROUTINE', 'URGENT', 'EMERGENCY')),
    primary_specialty VARCHAR(100),
    sbar_summary TEXT,
    ai_advice TEXT,
    conversation_history TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_user ON triage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_urgency ON triage_sessions(urgency_level);

-- 10. Medical Documents & Analyses Tables
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
    clinical_summary TEXT NOT NULL,
    plain_language_explanation TEXT NOT NULL,
    abnormal_indicators_json TEXT NOT NULL,
    recommended_specialty_slug VARCHAR(100),
    recommended_specialty_name VARCHAR(255),
    suggested_questions_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_med_doc_user ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_analysis_doc ON document_analyses(document_id);

-- 11. Audit Logs Table (HIPAA & TT 46/2018/TT-BYT Compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 12. AI Token Usage Table (FinOps Monitoring)
CREATE TABLE IF NOT EXISTS ai_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    total_tokens INT NOT NULL,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
