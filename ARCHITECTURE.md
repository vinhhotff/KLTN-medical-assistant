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
   * Maintain a **single well-structured backend codebase** with strict domain boundaries (`src/services/auth`, `src/services/medical`, `src/services/ai`, `src/services/queue`).
   * Modules communicate via clean internal TypeScript interfaces, making future microservice extraction trivial if traffic ever demands it.
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
```typescript
// Standard Graceful Shutdown pattern in src/server.ts
const signals = ['SIGTERM', 'SIGINT'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    
    // 1. Stop accepting new HTTP requests
    server.close(async () => {
      logger.info('HTTP server closed.');
      
      // 2. Close BullMQ workers and pause queues
      await closeQueues();
      
      // 3. Disconnect Redis client
      await redisClient.quit();
      
      // 4. Disconnect Prisma connection pool
      await prisma.$disconnect();
      
      logger.info('All resources released cleanly. Exiting.');
      process.exit(0);
    });

    // Force shutdown if cleanup hangs > 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  });
});
```

### 3.2 Global Error Interception (Process Immunity)
* **Unhandled Rejections & Uncaught Exceptions:** Captured by centralized crash handlers that log diagnostic stack traces with Pino/Winston before attempting controlled recovery, preventing container restart loops.
* **Controller Error Wrapper:** All Express controllers are wrapped with an async error handler (`express-async-errors` or higher-order wrapper) ensuring unhandled Promise rejections always reach the centralized error middleware.

### 3.3 Database Connection Pool Tuning
PostgreSQL connection pooling is managed via Prisma with explicit limits to prevent DB exhaustion under load:
```env
# Connection pool configuration
DATABASE_URL="postgresql://postgres:password@postgres:5432/mediassist?connection_limit=25&pool_timeout=10"
```
* Max connections per node: 25.
* Timeout: 10 seconds (avoids hanging requests indefinitely during DB spikes).

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
│ L1: In-Memory (Node.js Process) │ ─── (HIT, < 1ms) ───► Return Response
│ - Technology: lru-cache         │
│ - Scope: Static reference data  │
│   (Specialties, Configs, Appts) │
│ - TTL: 60s - 300s               │
└────────────────┬────────────────┘
                 │ (MISS)
                 ▼
┌─────────────────────────────────┐
│ L2: Distributed Cache (Redis)   │ ─── (HIT, 1-3ms) ───► Populate L1 ──► Return
│ - Technology: ioredis           │
│ - Scope: Doctor availability,   │
│   User profile, Session tokens  │
│ - TTL: 5m - 30m                 │
└────────────────┬────────────────┘
                 │ (MISS)
                 ▼
┌─────────────────────────────────┐
│ PostgreSQL 16 + pgvector        │ ───► Populate L2 & L1 ──────────────► Return
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
* Model: `text-embedding-3-small` (dimension: 1536).
* Index: HNSW (Hierarchical Navigable Small World) index for fast approximate nearest neighbor search:
  ```sql
  CREATE INDEX doctor_embedding_idx ON "Doctor" 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
  ```
* Distance Metric: Cosine distance (`<=>`).
  $$\text{Relevance Score} = (1 - \text{cosine\_distance}) \times 100\%$$

---

## 7. Load Testing & Performance Benchmark Targets

To satisfy the non-functional requirement of handling **≥ 500 concurrent users with 99% uptime**:

| Metric | Target SLA | Benchmark Strategy |
| :--- | :--- | :--- |
| **Concurrent Users** | $\ge 500$ Virtual Users (VU) | Tested via k6 / Artillery load testing script |
| **Static / L1 Cached APIs** | $p95 < 50\text{ms}$, $p99 < 100\text{ms}$ | Health checks, Specialties list, Public profiles |
| **Database Read APIs** | $p95 < 200\text{ms}$, $p99 < 400\text{ms}$ | Doctor search, Available appointment slots |
| **AI Multimodal Queue** | Processing complete $\le 15\text{s} - 20\text{s}$ | Handled by BullMQ worker in background |
| **System Error Rate** | $< 0.1\%$ under peak load | Zero unhandled exceptions or 500 Internal Server Errors |

---

## 8. Directory & Project Structure Specification

```
resilient-fermi/
├── .github/workflows/          # CI/CD: lint, test, docker build
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf              # Nginx gateway with gzip, rate limit, SSL
├── docker-compose.yml          # Postgres(pgvector) + Redis + Backend + Frontend
├── docs/                       # FPT Capstone SRS, Architecture Design, Diagrams
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database models + pgvector extension
│   │   ├── migrations/
│   │   └── seed.ts             # Seed admin & sample specialties
│   ├── src/
│   │   ├── config/             # Environment, connection pools, constants
│   │   ├── controllers/        # HTTP handlers (Request -> DTO -> Response)
│   │   ├── middlewares/        # auth, rbac, rateLimiter, errorHandler, cache
│   │   ├── routes/             # Route aggregators (v1)
│   │   ├── services/
│   │   │   ├── auth/           # OAuth, JWT, session, password
│   │   │   ├── cache/          # L1 (LRU) + L2 (Redis) 2-tier cache service
│   │   │   ├── medical/        # Doctor, schedule, booking management
│   │   │   ├── ai/             # AI Orchestration, Prompt Guardrails, Fallbacks
│   │   │   ├── storage/        # S3 / Cloudinary Pre-signed URLs
│   │   │   └── queue/          # BullMQ queue & background workers
│   │   ├── utils/              # Logger (Pino), response wrappers, backoff
│   │   └── server.ts           # Server bootstrap & Graceful shutdown
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── load/               # k6 load test scripts (500 VU stress test)
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI, MedicalDisclaimerBanner
│   │   ├── layouts/            # AdminLayout, DoctorLayout, PatientLayout
│   │   ├── pages/              # Role-specific views
│   │   ├── services/           # Axios client with interceptors
│   │   ├── store/              # Zustand global client state
│   │   └── routes/             # Protected Routes with RBAC Guards
│   └── vite.config.ts
├── ARCHITECTURE.md             # This document
├── ROADMAP.md                  # Milestone & Sprint tracker
└── README.md
```
