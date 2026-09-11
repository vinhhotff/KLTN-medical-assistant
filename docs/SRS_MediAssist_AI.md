# Software Requirement Specification (SRS) - MediAssist-AI

> **Document Code:** FPT-CAPSTONE-SRS-MEDASSIST-01  
> **Project:** MediAssist-AI (Telehealth Platform for Smart Symptom Triage & Medical Record Summarization)  
> **Major:** Software Engineering - Artificial Intelligence (SE-AI)  
> **Status:** Draft (Milestone 1 Baseline)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the **MediAssist-AI** telehealth platform. It provides a definitive reference for developers, quality assurance engineers, project supervisors, and evaluation committee members.

### 1.2 Project Scope & Medical Disclaimer Constraint
MediAssist-AI bridges the communication gap between patients and healthcare providers by combining modern web architectures with commercial multimodal LLM APIs (OpenAI GPT-4o Vision, Google Gemini 1.5 Pro).
* **Core Limitation:** The platform acts strictly as an **informational assistant and document translation tool**. It does **NOT** provide definitive medical diagnoses, nor does it train machine learning models from scratch.
* **Mandatory Medical Disclaimer:** A legal disclaimer must be visible permanently on all patient-facing interfaces.

---

## 2. Overall System Description

### 2.1 User Roles (Actors)
1. **Admin (System Administrator):**
   * Manages user accounts (Activate / Suspend).
   * Verifies Doctor credentials and medical licenses before making profiles publicly visible.
   * Manages medical specialty categories.
   * Monitors AI API token consumption, estimated financial costs, and audit logs.
2. **Doctor (Healthcare Provider):**
   * Configures professional profile, specialties, consultation fee, and available schedule slots.
   * Reviews AI-generated patient symptom summaries and lab reports before appointments.
   * Conducts consultations and updates appointment statuses (*Scheduled → In Progress → Completed / Cancelled*).
3. **Patient (End-User):**
   * Chats with the AI Symptom Triage assistant to describe symptoms in natural language.
   * Uploads medical lab documents (PDFs, JPEG/PNG images) for plain-language interpretation.
   * Receives ranked doctor recommendations based on vector similarity matching (`pgvector`).
   * Books appointment time slots and receives automated notifications.

### 2.2 System Non-Functional Requirements (SLA)
* **High Availability & Concurrency:** Must comfortably handle $\ge 500$ simultaneous active users without service degradation.
* **Response Latencies:**
  * L1/L2 Cached reads: $p95 < 50\text{ms}$.
  * Database queries: $p95 < 200\text{ms}$.
  * Asynchronous multimodal processing: $\le 15 - 20\text{s}$ with progress indicator.
* **Security & Privacy:**
  * Passwords hashed via Bcrypt (cost factor = 12).
  * JWT access tokens stored in `HttpOnly`, `SameSite`, `Secure` cookies.
  * Medical documents accessible only via time-limited Pre-signed URLs (TTL: 15 minutes).
  * Enforced HTTPS for all client-server communications.

---

## 3. Milestone 1 Functional Baseline

| Req ID | Feature | Actor | Description |
| :--- | :--- | :--- | :--- |
| **FR-AUTH-01** | Seeded Admin Login | Admin | Authenticate using seeded credentials via `POST /api/v1/auth/login`. |
| **FR-AUTH-02** | JWT Token Issuance | All | System issues short-lived Access Token in HttpOnly cookie upon valid login. |
| **FR-AUTH-03** | RBAC Enforcement | System | Restrict API endpoints based on role (`ADMIN`, `DOCTOR`, `PATIENT`). |
| **FR-HLTH-01** | Liveness Probe | DevOps | `GET /api/health/live` returns process uptime and status. |
| **FR-HLTH-02** | Readiness Probe | DevOps | `GET /api/health/ready` verifies PostgreSQL connection pool and Redis status. |
| **FR-CCHE-01** | Two-Layer Cache | System | Transparent L1 (In-Memory LRU) + L2 (Redis) read-through caching. |
| **FR-UI-01** | Role Layouts | All | Distinct interface frames for Admin, Doctor, and Patient. |
| **FR-UI-02** | Medical Disclaimer | Patient | Permanent warning banner rendered across patient routes. |
