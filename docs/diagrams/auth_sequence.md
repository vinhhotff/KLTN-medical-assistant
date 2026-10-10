# Authentication Sequence Diagram (Google OAuth 2.0 & JWT Cookie)

```mermaid
sequenceDiagram
    autonumber
    actor User as Patient / Doctor
    participant Client as React SPA (Frontend)
    participant Server as Spring Boot 3.4 API
    participant Google as Google OAuth 2.0 Service
    participant DB as PostgreSQL 16 (pgvector)
    participant Redis as Redis 7 Cache

    User->>Client: Click "Tiếp tục với Google"
    Client->>Server: GET /oauth2/authorization/google
    Server->>Google: Redirect with Client ID & Scopes (openid, profile, email)
    Google-->>User: Present Google Consent Screen
    User->>Google: Approve Consent
    Google->>Server: Callback /login/oauth2/code/google?code=...
    Server->>Google: Exchange Code for OAuth2 Access/ID Token
    Google-->>Server: Return Profile (sub, email, name, picture)
    Server->>DB: CustomOAuth2UserService (Upsert User & PatientProfile)
    DB-->>Server: Return User Entity & Role (PATIENT/DOCTOR)
    Server->>Server: Sign JWT Access Token (15m TTL)
    Server->>Redis: Track Session State & Security Quotas
    Server-->>Client: Set HttpOnly Cookie (access_token) & Redirect to /oauth2/callback
    Client->>Server: GET /api/v1/auth/me (with HttpOnly Cookie / Bearer Token)
    Server->>Server: Verify JWT via JwtAuthenticationFilter
    Server-->>Client: Return ApiResponse with User Profile & Role
    Client->>Client: Update Zustand Auth Store & Navigate to Dashboard
```
