# MediAssist-AI Project Directive (GEMINI.md)

This file instructs Antigravity and Gemini CLI agents on project standards, rules, and workflows.

## Mandatory Rules for All AI Sessions:
1. **Always Sync Documentation (`docs/`)**:
   - Schema / Entity changes $\rightarrow$ update `docs/DATABASE_DESIGN.md`.
   - Feature / Endpoint changes $\rightarrow$ update `docs/USE_CASES.md`.
   - Product story / Personas $\rightarrow$ update `docs/STORYTELLING.md`.
   - Defense slides / Q&A $\rightarrow$ update `docs/CAPSTONE_DEFENSE.md`.
2. **Autonomous Execution**:
   - The user is the **Tech Lead**. Always verify builds (`npm run build`, `mvn test`) proactively without asking the user to run manual steps.
3. **Architecture Non-Negotiables**:
   - Java 21 Spring Boot 3.4.x + PostgreSQL 16 `pgvector` + Two-Layer Cache (L1 Caffeine + L2 Redis).
   - Dual-Transport Auth (Bearer + HttpOnly Cookie).
   - Zero-flicker frontend hydration in Zustand.
4. **Team Division**:
   - Tech Lead: 30% code / 50% review & architecture.
   - Core Dev: 80% code / 20% test.
   - Doc & QA: 60% docs & thesis / 25% QA & test / 15% code (fixtures & mocks).
