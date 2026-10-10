# MediAssist-AI System Architecture Document (Single Source of Truth)

> **Version:** 1.1.0 (Enterprise Resilient Edition)  
> **Target Project:** FPT University Capstone Project (SE-AI)  
> **Project Name:** AI-Powered Telehealth Platform for Smart Symptom Triage & Medical Record Summarization  
> **Abbreviation:** MediAssist-AI  
> **Core Principle:** Enterprise-grade reliability, high availability (zero downtime / no crash), pragmatic engineering (Modular Monolith — no premature microservices), and strict medical data privacy.

---

## 1. High-Level System Architecture

MediAssist-AI adopts a **Modular Monolith** pattern with a clean 3-tier architecture, backed by a **Two-Layer Caching Strategy** and an asynchronous background processing engine.

```
                                  [ CLIENTS ]
          (Web Browser / Mobile Web - React Vite SPA + React Query Cache)
                                       │
                                       ▼ (HTTPS / TLS 1.3)
                    ┌──────────────────────────────────────┐
                    │       REVERSE PROXY & GATEWAY        │
                    │      Nginx (SSL Termination, Gzip,   │
                    │     Rate Limiting, Static Assets)    │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼ (Internal Network / Docker Network)
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                            BACKEND APPLICATION LAYER                            │
 │                   Java 21+ / Spring Boot 3.4.x (Enterprise Edition)             │
 │                                                                                 │
 │   [ Middleware & Filter Pipeline ]                                              │
 │   - Security: Spring Security 6 (Stateless JWT, CORS, HttpOnly Cookie)          │
 │   - Resilience: Graceful Shutdown (10s phase timeout), Spring Boot Actuator     │
 │   - Observability: SLF4J / Logback Structured Logging, OpenTelemetry / Metrics   │
 │   - Auth & Guard: JwtAuthenticationFilter, Role-Based Access Control (RBAC)     │
 │                                                                                 │
 │   [ Two-Layer Caching Engine ]                                                  │
 │   ┌────────────────────────────────┐    ┌───────────────────────────────────┐   │
 │   │ L1: In-Memory Cache (Caffeine) │───►│ L2: Distributed Cache (Redis)     │   │
 │   │ (Ultra-hot: specialties, config│miss│ (Schedules, sessions, auth token  │   │
 │   │  system state, permissions)    │    │  blacklist, query results)        │   │
 │   │ Latency: < 1ms                 │    │ Latency: 1 - 3ms                  │   │
 │   └────────────────────────────────┘    └─────────────────┬─────────────────┘   │
 │                                                           │miss                 │
 │   [ Core Domain Services ]                                │                     │
 │   - AuthService & UserService                             ▼                     │
 │   - MedicalService (Doctor, Schedule, Booking)  ┌───────────────────┐           │
 │   - AIOrchestrationService (LLM Guardrails,     │ PostgreSQL 16     │           │
 │     Exponential Backoff, Cost Tracker)          │ + pgvector        │           │
 │                                                 │ (HikariCP Pool)   │           │
 │   [ Async Processing Engine ]                   └───────────────────┘           │
 │   - Spring @Async / ThreadPoolTaskExecutor / Redis PubSub & Queue               │
 │   - Handles: Vision LLM OCR, Medical Summarization, Vector Embeddings           │
 └─────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     EXTERNAL AI SERVICES      │               │   STORAGE & COMMUNICATION     │
│ - OpenAI API (GPT-4o Vision,  │               │ - AWS S3 / Cloudinary Private │
│   text-embedding-3-small)     │               │   (Temporary Pre-signed URLs) │
│ - Google Gemini 1.5 Pro       │               │ - SendGrid / Nodemailer       │
│ - Exponential Backoff Retries │               │   (Transactional Emails)      │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Anti-Overengineering Manifesto & Pragmatic Enterprise Rules

1. **Modular Monolith over Microservices:**
   * Do NOT split into 10 separate microservices with Kubernetes, gRPC, and Kafka. That creates operational chaos, high memory usage, and distributed transaction bugs.
   * Maintain a **single well-structured backend codebase** with strict domain package boundaries (`com.mediassist.controller`, `com.mediassist.service`, `com.mediassist.repository`, `com.mediassist.model`, `com.mediassist.ai`, `com.mediassist.config`).
   * Modules communicate via clean internal Java Service interfaces and DTOs, making future microservice extraction trivial if traffic ever demands it.
2. **Stateless App Servers for Horizontal Scalability:**
   * Backend stores zero session state in local memory (all sessions & tokens in Redis/PostgreSQL).
   * Any instance can be killed, restarted, or multiplied behind a load balancer without dropping active users.
3. **Fail-Safe Defaults & Medical Guardrail:**
   * **Informational Only:** The UI strictly displays the non-negotiable Medical Disclaimer. AI responses are strictly validated against medical schemas.
   * If OpenAI/Gemini fails or times out, the system degrades gracefully with a fallback message rather than crashing the request or returning broken JSON.
4. **Data Privacy by Design:**
   * Medical records (PDFs/Images) NEVER touch public storage. Access is granted strictly via **short-lived Pre-signed URLs (TTL: 15 minutes)**.

---

## 3. High Availability & "Zero-Downtime / No-Crash" Architecture

To guarantee the web application **does not crash or experience unexpected downtime**, the following patterns are strictly mandated:

### 3.1 Process Management & Lifecycle (Graceful Shutdown)
Spring Boot 3.4 embeds a native graceful shutdown lifecycle across embedded Tomcat, JPA, and background executor pools:
```properties
# Graceful Shutdown configuration in application.properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=10s
```

Lifecycle execution:
1. **Dừng tiếp nhận kết nối mới:** Embedded Tomcat từ chối các kết nối HTTP mới và trả về tín hiệu đóng kết nối.
2. **Xử lý trọn vẹn request đang chạy:** Toàn bộ request đang dang dở được dành tối đa 10 giây để hoàn tất giao dịch.
3. **Đóng thread pool ngầm:** Dừng `ThreadPoolTaskExecutor` (bao gồm `medicalOcrExecutor`), xả bộ đệm và dừng an toàn.
4. **Ngắt kết nối bộ nhớ đệm & cơ sở dữ liệu:** Đóng kết nối Spring Data Redis và xả HikariCP Connection Pool cleanly.

### 3.2 Global Error Interception (Process Immunity)
* **Centralized RestControllerAdvice:** Mọi exception (từ validation, SQL, bảo mật đến ngoại vi AI) được chặn bắt tập trung bởi `GlobalExceptionHandler` kế thừa chuẩn `ResponseEntityExceptionHandler`.
* **Chuẩn hóa ApiResponse:** Toàn bộ phản hồi lỗi được bọc trong đối tượng `ApiResponse<T>` với mã lỗi chuẩn mực (`timestamp`, `status`, `message`, `data`), triệt tiêu 100% hiện tượng crash container hoặc lộ stack trace nhạy cảm.

### 3.3 Database Connection Pool Tuning (HikariCP)
Cơ sở dữ liệu PostgreSQL được quản lý thông qua **HikariCP**—bộ connection pool có hiệu năng cao nhất trong hệ sinh thái Java:
```properties
# HikariCP production connection pool configuration
spring.datasource.hikari.maximum-pool-size=25
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.connection-timeout=10000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.pool-name=MediAssistHikariPool
```
* Max connections per node: 25.
* Timeout: 10 giây (ngăn chặn tình trạng treo request vô hạn khi đột biến tải).

### 3.4 Container Restart Policies
In `docker-compose.yml`, all critical containers must specify:
```yaml
restart: unless-stopped
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

---

## 4. Two-Layer Caching Strategy (L1 + L2)

To withstand heavy traffic spikes and maintain sub-50ms read latencies, a multi-tier caching model is enforced:

```
[ Incoming Read Request ]
          │
          ▼
┌─────────────────────────────────┐
│ L1: In-Memory (Caffeine Cache)  │ ─── (HIT, < 1ms) ───► Return Response
│ - Technology: Caffeine Cache    │
│ - Scope: Static reference data  │
│   (Specialties, Configs, Appts) │
│ - TTL: 60s - 300s               │
└────────────────┬────────────────┘
                 │ (MISS)
                 ▼
┌─────────────────────────────────┐
│ L2: Distributed Cache (Redis)   │ ─── (HIT, 1-3ms) ───► Populate L1 ──► Return
│ - Technology: Spring Data Redis │
│ - Scope: Doctor availability,   │
│   User profile, Session tokens  │
│ - TTL: 5m - 30m                 │
└────────────────┬────────────────┘
                 │ (MISS)
                 ▼
┌─────────────────────────────────┐
│ PostgreSQL 16 + pgvector        │ ───► Populate L2 & L1 ──────────────► Return
│ (HikariCP Connection Pool)      │
└─────────────────────────────────┘
```

### 4.1 Cache Invalidation Rules
* **Write-Through / Event-Based Invalidation:** When a doctor updates their working hours or a patient books a slot, the system immediately evicts the corresponding Redis key and emits a local cache invalidation event.
* **Cache Stampede Protection:** Redis keys use Mutex locks or `stale-while-revalidate` pattern to ensure a database is never hammered by 100 concurrent requests for the same missing key.

---

## 5. Security & Rate Limiting (DDoS Defense)

### 5.1 Multi-Tier Rate Limiting
1. **Global Tier:** 100 requests per IP per minute (managed in Redis).
2. **Auth Tier (Brute Force Protection):** 5 failed login attempts per IP per 15 minutes.
3. **AI Triage & OCR Tier (Cost Protection):** 10 requests per user per hour to prevent API budget depletion.

### 5.2 Token Management
* **Access Token:** Short-lived JWT (TTL: 15 minutes), delivered in secure `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
* **Refresh Token:** Long-lived (TTL: 7 days), stored encrypted in PostgreSQL / Redis, revoked on logout.

---

## 6. AI Orchestration Engine & Vector Search

### 6.1 Resilience & Circuit Breaker Pattern
* **Exponential Backoff:** If OpenAI returns `429` (Rate Limit) or `503`, the AI client automatically retries with jitter:
  $$t_{\text{wait}} = 2^{\text{attempt}} \times 1000\text{ms} + \text{random}(0, 500)\text{ms}$$
  Maximum 3 attempts.
* **Fallback Provider:** If OpenAI fails permanently, the system transparently routes the request to Google Gemini 1.5 Pro.
* **JSON Schema Enforcement:** System prompts use strict JSON schemas (`response_format: { type: "json_object" }`). Raw text strings that fail JSON parsing are trapped and sanitized.

### 6.2 Semantic Doctor Matching (`pgvector`)
* Model: `text-embedding-3-small` (1536 chiều, kết hợp True Neural Transformer & Dynamic Text Extraction từ CSDL).
* Index: HNSW (Hierarchical Navigable Small World) index kết hợp Partial Indexing cho bác sĩ đã xác minh (Flyway V1, V10, V19):
  ```sql
  CREATE INDEX idx_doctor_bio_hnsw ON doctor_profiles 
  USING hnsw (bio_embedding vector_cosine_ops) 
  WITH (m = 24, ef_construction = 128);
  ```
* Distance Metric: Cosine distance (`<=>`).
  $$\text{Relevance Score} = (1 - \text{cosine\_distance}) \times 100\%$$

### 6.3 Enterprise Proprietary Algorithms Suite
To transition from a simple API wrapper to an enterprise-grade resilient digital health platform, the system incorporates a specialized proprietary algorithm suite documented in detail at [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md):
1. **Hedged Requests & Speculative Failover:** Racing Gemini and fallback engines at $P95$ ($1.2\text{s}$) to eliminate tail latency $P99$ ($25.4\text{s} \rightarrow 1.8\text{s}$).
2. **Progressive AI Sieve & Semantic Router:** 4-tier funnel filtering hierarchy cutting $85\% - 92\%$ of cloud AI token costs.
3. **Dynamic Two-Sided Clinical Queue Balancing:** Real-time multi-objective doctor-patient queue dispatching reducing patient wait time from $45\text{ mins} \rightarrow 12\text{ mins}$.
4. **XFetch Probabilistic Cache Renewal:** Mathematically eliminating cache stampede under $100.000\text{ CCU}$.
5. **Bi-directional Medical Knowledge Grounding & Ontology Validator:** LOINC & ICD-10 physiological bound checks eliminating clinical hallucination.
6. **True Neural Embedding 1536-d & WHRF Min-Heap:** Xếp hạng đa tiêu chí $O(M \log K)$ với Credibility Damper chống rating ảo.

---

## 7. Load Testing & Performance Benchmark Targets

To satisfy the non-functional requirement of handling **≥ 500 concurrent users with 99% uptime**:

| Metric | Target SLA | Benchmark Strategy |
| :--- | :--- | :--- |
| **Concurrent Users** | $\ge 500$ Virtual Users (VU) | Tested via k6 high load testing script (`tests/k6/high_load_test.js`) |
| **Static / L1 Cached APIs** | $p95 < 50\text{ms}$, $p99 < 100\text{ms}$ | Health checks, Specialties list, Public profiles |
| **Database Read APIs** | $p95 < 200\text{ms}$, $p99 < 400\text{ms}$ | Doctor search, Available appointment slots |
| **AI Multimodal Processing** | Processing complete $\le 15\text{s} - 20\text{s}$ | Handled by `medicalOcrExecutor` ThreadPoolTaskExecutor with Semaphore(5) |
| **System Error Rate** | $< 0.1\%$ under peak load | Zero unhandled exceptions or 500 Internal Server Errors |

---

## 8. Directory & Project Structure Specification

```
KLTN/
├── .github/workflows/          # CI/CD: lint, test, docker build
├── docker-compose.yml          # Postgres 16 (pgvector) + Redis 7
├── docker-compose.prod.yml     # Production stack (Nginx + Backend + Frontend + DB + Redis)
├── nginx/                      # Nginx reverse proxy configuration & SSL
├── docs/                       # FPT Capstone SRS, Architecture Design, Diagrams
│   ├── MASTER_TRACEABILITY_INDEX.md
│   ├── ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md
│   ├── DATABASE_DESIGN.md
│   ├── USE_CASES.md
│   ├── CAPSTONE_DEFENSE.md
│   └── ...
├── backend/                    # Spring Boot 3.4.x (Java 21 LTS)
│   ├── pom.xml                 # Maven build dependencies & plugins
│   ├── Dockerfile
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mediassist/
│   │   │   │   ├── ai/         # AiModelRouter, GeminiAiProvider, OpenRouter, Fallback
│   │   │   │   ├── config/     # SecurityConfig, RedisConfig, CacheConfig, AsyncConfig
│   │   │   │   ├── controller/ # REST Endpoints (Auth, Triage, Doctor, Appointment...)
│   │   │   │   ├── dto/        # Request/Response Data Transfer Objects
│   │   │   │   ├── model/      # JPA Entities & Enums (User, DoctorProfile, Appointment...)
│   │   │   │   ├── repository/ # Spring Data JPA Repositories
│   │   │   │   ├── service/    # Domain Services, TwoLayerCacheService, PII...
│   │   │   │   └── exception/  # GlobalExceptionHandler, Custom Exceptions
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       ├── application-dev.properties
│   │   │       └── db/migration/  # Flyway SQL migrations (V1 -> V19)
│   │   └── test/               # JUnit 5 & Mockito test suites (144+ tests)
├── frontend/                   # React 18 (Vite + TypeScript + TailwindCSS)
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/         # Reusable UI, MedicalDisclaimerBanner, Modals
│   │   ├── layouts/            # Role-specific layouts (Admin, Doctor, Patient)
│   │   ├── pages/              # Role-specific views (Triage, Search, EMR, FinOps)
│   │   ├── services/           # Axios API client & interceptors
│   │   ├── store/              # Zustand global client state
│   │   └── utils/              # Helper utilities & clinical staging
│   └── e2e/                    # Playwright E2E test suites (5 suites)
├── tests/
│   └── k6/                     # k6 Load & Benchmark scripts (500 VU stress test)
├── ARCHITECTURE.md             # This document
├── ROADMAP.md                  # Milestone & Sprint tracker
└── README.md
```
