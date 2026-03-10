# Heady API Overview

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Design Principles
1. REST for external APIs, gRPC for inter-service communication
2. All endpoints versioned (v1 prefix in production)
3. Rate limited with φ-exponential backoff
4. Authenticated via httpOnly session cookies (external) or mTLS (internal)
5. JSON request/response with strict schema validation

## Authentication Flow
```
Client → POST /api/auth/login (email + password + fingerprint)
       ← Set-Cookie: heady_session (httpOnly, Secure, SameSite=Lax)
       ← Set-Cookie: heady_refresh (httpOnly, Secure, SameSite=Strict)
       ← JSON: { userId, displayName, roles, expiresAt }

Client → GET /api/auth/validate (Cookie: heady_session)
       ← JSON: { userId, roles, tenantId, expiresAt }

Client → POST /api/auth/refresh (Cookie: heady_refresh + fingerprint)
       ← Set-Cookie: heady_session (new)
       ← Set-Cookie: heady_refresh (rotated)
```

## Common Response Format
```json
{
  "status": "success" | "error",
  "data": { ... },
  "error": { "code": "HEADY-AUTH-001", "message": "..." },
  "meta": { "requestId": "uuid", "timestamp": "iso8601" }
}
```

## Rate Limiting Headers
```
X-RateLimit-Limit: 89
X-RateLimit-Remaining: N
X-RateLimit-Reset: unix_timestamp
Retry-After: seconds (when rate limited)
```

## Health Check Standard
Every service exposes:
- `GET /health` — Returns coherence score, uptime, status
- `GET /ready` — Returns readiness probe for orchestrators
