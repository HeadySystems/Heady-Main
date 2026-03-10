# Runbook: auth-session-server (Port 3397)

> Heady™ Platform — Central Authentication Service
> Domain: security | All services are concurrent equals.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

## Service Overview

auth-session-server is the central authentication service for the Heady™ platform. It validates Firebase ID tokens, creates httpOnly session cookies (`__Host-heady_session`), and provides session verification for all 58 services. Every authenticated request across all 9 sites depends on this service.

- **Port**: 3397
- **Health**: `http://localhost:3397/health`
- **Readiness**: `http://localhost:3397/readiness`
- **Domain**: security
- **Dependencies**: Firebase Admin SDK (external), PostgreSQL (:5432) for session store
- **Cookie name**: `__Host-heady_session`
- **Cookie attributes**: httpOnly, secure, SameSite=Strict, path=/

---

## Authentication Flow

```
Client → Firebase SDK → ID Token → POST /session/create → httpOnly Cookie
                                                             ↓
Client → Any Service → Cookie → POST /session/verify → Session Data
                                                             ↓
Client → POST /session/revoke → Cookie Cleared
```

---

## Symptom: Users Cannot Log In (Session Creation Fails)

### Diagnosis

```bash
# 1. Check service health
curl -s http://localhost:3397/health | jq .

# 2. Check circuit breaker state
curl -s http://localhost:3397/health | jq '.circuitBreaker'

# 3. Test session creation with a sample ID token
curl -s -X POST http://localhost:3397/session/create \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test_token"}' | jq .

# 4. Check Firebase connectivity
# Verify FIREBASE_PROJECT_ID is set
docker compose exec auth-session-server env | grep FIREBASE

# 5. Check logs for Firebase errors
docker compose logs auth-session-server --tail=89 | jq 'select(.level == "error")'
```

### Fix

```bash
# If Firebase Admin SDK fails to initialize
# Check that FIREBASE_PROJECT_ID=gen-lang-client-0920560496 is set in .env
grep FIREBASE_PROJECT_ID .env

# If network connectivity to Firebase is blocked
# Test from inside the container
docker compose exec auth-session-server wget -qO- https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo 2>&1 | head -5

# Restart the service
docker compose restart auth-session-server
```

---

## Symptom: Session Verification Fails (All Services Return 401)

This is a high-impact issue — affects all 58 services and all 9 sites.

### Diagnosis

```bash
# 1. Verify auth-session-server is running
curl -s http://localhost:3397/health | jq .

# 2. Check active sessions count
curl -s http://localhost:3397/health | jq '.activeSessions'

# 3. Test session verification directly
curl -s -X POST http://localhost:3397/session/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-heady_session=<session_value>" | jq .

# 4. Check if session store has entries
docker compose logs auth-session-server --tail=89 | jq 'select(.message | contains("session"))'

# 5. Check downstream services' auth requests
docker compose logs heady-brain --tail=34 | jq 'select(.message | contains("auth"))'
```

### Fix

```bash
# If session store is empty (service restarted and lost in-memory sessions)
# All users will need to re-authenticate — this is expected behavior for in-memory store
# Log message: "Session not found" is normal after restart

# If HMAC validation fails (session tampering)
# Check logs for "HMAC verification failed" or "Session replay detected"
docker compose logs auth-session-server --tail=233 | jq 'select(.message | contains("replay\|HMAC\|tamper"))'

# If IP+UA binding is rejecting legitimate users (mobile network)
# The service uses /24 subnet matching — check if user IP changed dramatically
docker compose logs auth-session-server | jq 'select(.message | contains("fingerprint mismatch"))'
```

---

## Symptom: Session Replay Detected (403)

### Diagnosis

```bash
# Check for replay detection events
docker compose logs auth-session-server --tail=89 | jq 'select(.message | contains("replay"))'

# The service binds sessions to SHA-256(clientIP + userAgent)
# Check if legitimate users are being flagged
docker compose logs auth-session-server | jq 'select(.level == "warn" and (.message | contains("fingerprint")))'
```

### Fix

```bash
# If VPN/proxy users are being flagged
# This is expected behavior — session cookies are bound to network fingerprint
# Users must re-authenticate after significant network changes

# If many users affected simultaneously
# Check if a reverse proxy is stripping X-Forwarded-For headers
# The service should use the original client IP, not the proxy IP
```

---

## Symptom: Cookie Not Set in Browser

### Diagnosis

```bash
# Check that the response includes Set-Cookie header
curl -v -X POST http://localhost:3397/session/create \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<valid_token>"}' 2>&1 | grep -i "set-cookie"

# Verify cookie attributes
# Expected: __Host-heady_session=<value>; HttpOnly; Secure; SameSite=Strict; Path=/

# Check if HTTPS is required
# __Host- prefix requires secure context — HTTP will not work in production
```

### Fix

```bash
# If cookie not visible in browser DevTools
# 1. httpOnly cookies are NOT visible in document.cookie — this is by design
# 2. Check Application > Cookies in DevTools instead
# 3. Verify the domain matches (no domain attribute with __Host- prefix)

# If SameSite=Strict blocking cross-site requests
# This is by design — cookies are only sent on same-site requests
# For cross-site auth, use a different mechanism (Bearer token header)

# If running locally without HTTPS
# __Host- prefix requires secure context
# In development, the service may need to use __Secure- prefix instead
# Or use localhost (browsers treat localhost as secure)
```

---

## Log Locations

```bash
# All auth logs
docker compose logs auth-session-server

# Session creation events
docker compose logs auth-session-server | jq 'select(.message | contains("Session created"))'

# Failed verifications
docker compose logs auth-session-server | jq 'select(.message | contains("verification failed"))'

# Replay detection
docker compose logs auth-session-server | jq 'select(.message | contains("replay"))'

# By correlation ID
docker compose logs auth-session-server | jq 'select(.correlationId == "<id>")'
```

---

## Performance Tuning

```bash
# Check bulkhead saturation (max concurrent: 55)
curl -s http://localhost:3397/health | jq '.bulkhead'

# Session verification should be < 5ms for cached sessions
# If slow, check session store size
curl -s http://localhost:3397/health | jq '.activeSessions'

# If session store is very large (> FIB[12] = 233), old sessions should auto-expire
```

---

## Escalation Path

1. **On-call engineer**: Follow diagnosis steps above
2. **Security team**: If session tampering, replay attacks, or mass unauthorized access detected
3. **Platform team**: If auth-session-server outage affects all services
4. **Eric Haywood (founder)**: If security breach suspected

---

## Known Issues

1. **In-memory session store**: Sessions are lost on service restart — users must re-authenticate
2. **__Host- prefix in development**: Requires HTTPS or localhost; may not work with custom dev domains
3. **Fibonacci session expiry**: Sessions expire after Fibonacci-derived intervals, which may seem arbitrary to users
4. **Mobile IP changes**: Users on cellular networks may trigger replay detection when IP changes
