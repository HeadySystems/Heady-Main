# ADR-004: Firebase Auth with httpOnly Session Cookies

## Status

Accepted

## Date

2024-09-05

## Context

The Heady™ platform requires authentication across 58 services and 9 sites. Authentication must be:
- Consistent across all services (HeadyAutoContext enrichment)
- Secure against XSS, CSRF, and session replay attacks
- Stateless where possible to avoid session affinity requirements
- Compatible with the concurrent-equals service architecture (no single auth bottleneck)

We evaluated:

1. **Custom JWT implementation**: Self-issued JWTs with symmetric or asymmetric signing
2. **Auth0/Okta**: Managed identity providers with OAuth2/OIDC
3. **Firebase Authentication**: Google's auth platform with Firebase Admin SDK
4. **Passport.js strategies**: Express middleware with various strategy plugins

Key security requirements:
- No client-side token storage (no localStorage, no sessionStorage)
- httpOnly cookies to prevent JavaScript access to session tokens
- SameSite=Strict to prevent CSRF
- Session binding to IP + User-Agent hash for replay prevention
- Cookie prefix `__Host-` for additional browser-enforced security

## Decision

We use Firebase Authentication with the Firebase Admin SDK, combined with httpOnly session cookies managed by the auth-session-server (port 3397).

Authentication flow:
1. Client authenticates with Firebase client SDK (Google Sign-In, email/password, etc.)
2. Client receives a Firebase ID token (short-lived JWT)
3. Client sends ID token to `POST /session/create` on auth-session-server
4. auth-session-server validates the ID token via Firebase Admin SDK
5. auth-session-server creates an httpOnly session cookie (`__Host-heady_session`) with:
   - `httpOnly: true` — no JavaScript access
   - `secure: true` — HTTPS only
   - `sameSite: 'strict'` — no cross-site sending
   - `path: '/'` — available to all paths
   - Session bound to `SHA-256(clientIP + userAgent)` for replay prevention
6. Subsequent requests include the cookie automatically
7. Other services validate sessions via `POST /session/verify` or by calling auth-session-server internally

The `__Host-` cookie prefix is a browser security feature that enforces:
- The cookie must be set with `secure` flag
- The cookie must be set from a secure origin
- The cookie must not have a `domain` attribute
- The cookie path must be `/`

## Consequences

### Benefits
- No localStorage: immune to XSS token theft
- httpOnly cookies: JavaScript cannot read session tokens
- SameSite=Strict: immune to CSRF attacks
- `__Host-` prefix: browser-enforced security constraints
- IP+UA binding: stolen cookies are unusable from different networks/browsers
- Firebase managed auth: Google handles password hashing, MFA, OAuth provider integration
- Firebase Admin SDK: server-side token verification without network calls (uses cached public keys)
- Project ID: gen-lang-client-0920560496 — consistent across all services via environment variable

### Costs
- Firebase dependency: vendor lock-in for authentication
- Cookie-based: doesn't work for non-browser clients (CLI, API) without adaptation
- Session server: auth-session-server becomes a critical path service
- IP binding: users on mobile networks with changing IPs may experience session invalidation

### Mitigations
- Firebase Admin SDK is open-source; tokens can be verified with raw JWT validation if needed
- CLI and API clients use Bearer token header as alternative (verified by same Firebase Admin SDK)
- auth-session-server has Fibonacci circuit breakers (threshold=21, reset=89s) and bulkhead (max=55)
- IP binding uses /24 subnet matching rather than exact IP to accommodate NAT variations
- Session verification responses are cacheable for 13s (Fibonacci) to reduce auth-session-server load
