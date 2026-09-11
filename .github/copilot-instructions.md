# GitHub Copilot Custom Instructions for MediAssist-AI

## Project Overview
MediAssist-AI is an enterprise-grade Telehealth platform built with Java 21 / Spring Boot 3.4.x backend and React (Vite + TypeScript + Tailwind) frontend, featuring a Two-Layer Cache (Caffeine + Redis) and PostgreSQL with `pgvector` for semantic doctor search.

## AI Guardrails & Instructions:
1. **Mandatory Documentation Synchronization**:
   - Any database table/column changes MUST be documented in `docs/DATABASE_DESIGN.md`.
   - Any new REST endpoint or business flow MUST be documented in `docs/USE_CASES.md`.
   - Any clinical UI change or ethical AI constraint MUST update `docs/STORYTELLING.md` and `docs/CAPSTONE_DEFENSE.md`.
2. **Medical Safety**:
   - Never allow LLM to suggest diagnoses without a disclaimer.
   - Maintain the permanent `MedicalDisclaimerBanner` on patient routes.
   - Emergency symptoms must trigger the hard rule-based red-flag triage alert.
3. **Enterprise Reliability**:
   - Use Two-Layer Cache (Caffeine L1 + Redis L2) for read-heavy resources.
   - Implement optimistic locking and unique partial indexing to prevent appointment booking race conditions.
