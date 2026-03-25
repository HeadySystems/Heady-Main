# Auth Service Boundaries

> Canonical reference for the two internal auth services behind the **HeadyKey** public product.

## Overview

**HeadyKey** (headykey.com) is the public-facing identity & access product.
It is backed by two complementary internal microservices whose names remain stable:

| Internal Service | Repo | Port | Platform | Role |
|-----------------|------|------|----------|------|
| **auth-service** (HeadyAuth v5.0) | `HeadyMe/heady-production` | 3309 | GCP Cloud Run | Primary auth — email/password, JWT, API keys, RBAC, onboarding |
| **auth-session-server** | `HeadySystems/Heady-Main` | 3310 | GCP Cloud Run | Cross-domain SSO — Firebase token exchange, relay iframe, session cookies |

## auth-service (HeadyAuth v5.0)

**DNS:** auth.headysystems.com
**Database:** Neon PostgreSQL (6 tables + pgvector HNSW index)
**Token model:** JWT HS256 access (1h) + refresh (30d) + session cookie (8h)
**API key format:** `hdy_` prefix, SHA-256 hashed in DB

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/refresh` | Refresh JWT access token |
| POST | `/api/auth/logout` | Destroy session cookie |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/verify` | JWT/API key verification (service-to-service) |
| POST | `/api/session/start` | Auth widget alias (email+pass or OAuth redirect) |
| POST | `/api/provider/start` | OAuth provider flow entry |
| POST | `/onboarding/complete` | Save onboarding data, issue first API key |
| GET | `/onboarding/status` | Check onboarding progress |
| POST | `/api/auth/api-keys` | Generate new API key |
| GET | `/api/auth/api-keys` | List user API keys |
| DELETE | `/api/auth/api-keys/:id` | Revoke API key |
| GET | `/api/admin/users` | Admin: list users (role level 4 required) |
| GET | `/health/live`, `/health/ready`, `/health/startup` | Health triad |

### RBAC Levels

| Level | Role |
|-------|------|
| 1 | guest |
| 2 | user |
| 3 | operator |
| 4 | admin |

### Required Secrets

- `heady-jwt-secret` (GCP Secret Manager)
- `neon-database-url` (GCP Secret Manager)

## auth-session-server

**Database:** Firebase Auth (Google) via Admin SDK
**Session cookie:** `__Host-heady_session` — httpOnly, Secure, SameSite=Strict
**Rate limiting:** Fibonacci-scaled (34/89/233 req/min)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/session` | Create session from Firebase token |
| POST | `/api/auth/verify` | Verify session cookie |
| POST | `/api/auth/revoke` | Revoke session |
| POST | `/api/auth/user` | Get current user |
| GET | `/api/auth/relay` | Relay iframe for cross-domain SSO |
| GET | `/api/auth/health` | Health check |

### Required Secrets

- `FIREBASE_SERVICE_ACCOUNT` (Firebase Admin SDK credentials)
- `SESSION_SIGNING_KEY`

## Service Boundary

```
End User / Browser
       |
       ├── headykey.com (product site)
       |
       ├── auth.headysystems.com (auth-service, port 3309)
       │     - Registration, login, JWT issuance, API keys, RBAC
       │     - Used by: API consumers, CLI users, service-to-service
       │
       └── auth-session-server (port 3310)
             - Firebase token exchange, cross-domain SSO relay
             - Used by: Browser sessions across ~60 Heady domains
             - Relay iframe (postMessage, 8 message types)
```

### Handoff Pattern

1. Browser-based logins on Heady domains use **auth-session-server** for
   Firebase OAuth and cross-domain cookie relay.
2. API consumers, CLI tools, and service-to-service calls use **auth-service**
   for JWT/API-key authentication.
3. Both services share the same RBAC model conceptually, but maintain
   separate session stores (Neon DB vs Firebase).

## Known Discrepancies

- **Port:** ADR-004 says auth-session-server runs on port 3397; MANIFEST.md
  and START_HERE.md say 3310. Docker examples use 3310. Production should
  use 3310; ADR-004 should be updated.
- **Sentry:** auth-session-server has no Sentry DSN wired yet (see
  heady-production issue #13).

## Deploy Prerequisites

Both services require GitHub Actions secrets and GCP credentials to deploy:

| Secret | Service | Purpose |
|--------|---------|---------|
| `GCP_SERVICE_ACCOUNT` | Both | Cloud Run deployment |
| `GCP_WORKLOAD_IDENTITY` | Both | Workload identity federation |
| `heady-jwt-secret` | auth-service | JWT signing |
| `neon-database-url` | auth-service | PostgreSQL connection |
| `FIREBASE_SERVICE_ACCOUNT` | auth-session-server | Firebase Admin SDK |

See `heady-production/auth-service/DEPLOY.md` for the full auth-service deploy guide.
