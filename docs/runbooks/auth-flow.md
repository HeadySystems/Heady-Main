# Runbook: Authentication Flow & Session Management

**Service:** auth-service (port 3310), authorization-service (port 3311)
**Owner:** Authentication Team
**On-call:** #heady-oncall
**SLA:** p95 latency <1000ms for sign-in, <500ms for session validation

## Authentication Flow Overview

User signs in → Firebase OAuth → Relay iframe → Session cookie → Access to all 9 domains

## Firebase Token Flow

### 1. Initial Sign-In (heady.ai/login)

User submits credentials or clicks "Sign in with Google":

```
User clicks "Sign in with Google"
↓
Firebase authentication handles Google OAuth 2.0 redirect
  (Firebase checks: valid client_id, registered redirect_uri, etc.)
↓
Google OAuth dialog displays
User authorizes Heady to access email + profile
↓
Google redirects to heady.ai with auth code
↓
Firebase exchanges code for tokens (server-side)
↓
Firebase returns:
  - ID token (JWT, valid 1 hour)
  - Refresh token (stored in browser, no expiry)
  - User metadata (uid, email, displayName, photoURL)
↓
Main app (heady.ai) stores refresh token in browser storage
Main app stores ID token in memory
↓
Auth relay iframe notified: ID token ready
```

Firebase token structure (ID token JWT):
```json
{
  "iss": "https://securetoken.google.com/heady-platform",
  "aud": "heady-platform",
  "auth_time": 1741503045,
  "user_id": "abc123def456",
  "sub": "abc123def456",
  "iat": 1741503045,
  "exp": 1741506645,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "google.com": ["118234567890123456789"]
    },
    "sign_in_provider": "google.com"
  }
}
```

### 2. Session Creation on Content Domain (site1.heady.ai)

User navigates to content domain:

```
site1.heady.ai detects no session cookie
↓
site1.heady.ai loads hidden relay iframe (https://heady.ai/relay.html)
↓
Relay iframe uses postMessage to request ID token from main app
↓
Main app posts ID token to relay iframe (origin check: event.origin === "https://site1.heady.ai")
↓
Relay iframe creates hidden fetch to site1.heady.ai/api/auth/validate-token
  POST body: { "idToken": "eyJhbGc..." }
  Headers: Content-Type: application/json
↓
site1.heady.ai backend validates ID token:
  1. Verify JWT signature using Firebase public key
  2. Check exp claim (not expired)
  3. Check aud claim (matches project ID)
  4. Extract user ID and email from sub/email claims
↓
Backend creates session:
  sessionToken = generateRandomToken()  // 32-byte random
  sessionData = {
    userId: user_id,
    email: email,
    createdAt: now(),
    expiresAt: now() + 86400s,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    refreshToken: refreshToken  // Firebase refresh token (encrypted)
  }
  save sessionData to Redis with key session:{sessionToken}
↓
Backend responds with Set-Cookie header:
  Set-Cookie: heady_session={sessionToken};
    Path=/;
    Domain=site1.heady.ai;
    HttpOnly;
    Secure;
    SameSite=Lax;
    Max-Age=86400
↓
Browser stores cookie (httpOnly, domain-specific)
Relay iframe hidden
User fully authenticated on site1.heady.ai
```

## Session Cookie Details

**Cookie name:** `heady_session`

**Cookie structure:**
```
heady_session=eyJ0eXAiOiJKV1QiLCJhbGc...  [random session token]
```

**Cookie attributes:**
- **HttpOnly:** true (JavaScript cannot access; XSS-resistant)
- **Secure:** true (HTTPS only)
- **SameSite:** Lax (protection against CSRF)
- **Domain:** site1.heady.ai (domain-specific; not shared)
- **Path:** /
- **Max-Age:** 86400 seconds (24 hours)

## Session Renewal

When session approaches expiry (< 10 minutes remaining):

```
Client makes request to site1.heady.ai
↓
Backend checks session cookie expiry
↓
If expiry < 10 minutes away:
  1. Refresh Firebase ID token using refresh token (stored in session)
  2. Update session in Redis with new expiry
  3. Send new Set-Cookie header with extended Max-Age
↓
Session extended for another 24 hours
```

Refresh token request (backend-to-backend, invisible to user):
```
POST https://securetoken.google.com/v1/token
  grant_type: refresh_token
  refresh_token: {firebase_refresh_token}
  key: {FIREBASE_API_KEY}
↓
Firebase returns new ID token
```

## Sign Out Flow

User clicks "Sign out":

```
User clicks "Sign out" on any domain
↓
Main app (heady.ai) signs out from Firebase:
  firebase.auth().signOut()
↓
Main app's relay iframe notifies all 9 content domains
  (via stored references to child window objects)
↓
Each content domain clears session cookie:
  Set-Cookie: heady_session=; Max-Age=0; Path=/; Domain=site.heady.ai
↓
Each content domain revokes Firebase refresh token:
  POST backend-call to Firebase API to revoke token
↓
User redirected to login page
All 9 domains now show "Not authenticated"
```

## Cross-Domain Relay Iframe Implementation

### Relay iframe security

**File:** `heady.ai/relay.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Auth Relay</title>
</head>
<body style="display: none;">
  <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>

  <script>
    // Whitelist of allowed domains (must match origin in child window postMessage)
    const ALLOWED_DOMAINS = [
      'https://site1.heady.ai',
      'https://site2.heady.ai',
      'https://site3.heady.ai',
      'https://site4.heady.ai',
      'https://site5.heady.ai',
      'https://site6.heady.ai',
      'https://site7.heady.ai',
      'https://site8.heady.ai',
      'https://site9.heady.ai',
    ];

    const firebase = window.firebase;
    const auth = firebase.auth();

    // Listen for postMessage requests from content domains
    window.addEventListener('message', async (event) => {
      // CRITICAL SECURITY CHECK: Verify origin
      if (!ALLOWED_DOMAINS.includes(event.origin)) {
        console.error(`Unauthorized postMessage origin: ${event.origin}`);
        return;  // Silently ignore; do NOT post token
      }

      if (event.data.type === 'heady_auth_request') {
        // Child domain requesting current ID token
        const user = auth.currentUser;

        if (!user) {
          event.source.postMessage({
            type: 'heady_auth_response',
            error: 'User not authenticated',
          }, event.origin);
          return;
        }

        try {
          const idToken = await user.getIdToken(false);  // false = don't force refresh

          // POST token to child domain (via secure fetch)
          event.source.postMessage({
            type: 'heady_auth_response',
            idToken: idToken,
            userId: user.uid,
            email: user.email,
          }, event.origin);
        } catch (error) {
          event.source.postMessage({
            type: 'heady_auth_response',
            error: error.message,
          }, event.origin);
        }
      }

      if (event.data.type === 'heady_logout_request') {
        // Sign out from Firebase
        await auth.signOut();

        // Notify child
        event.source.postMessage({
          type: 'heady_logout_response',
          success: true,
        }, event.origin);
      }
    });
  </script>
</body>
</html>
```

### Content domain listener

**Embedded in every content domain page:**

```javascript
// On page load, check if authenticated
async function ensureAuthenticated() {
  // 1. Check if session cookie exists
  const sessionCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('heady_session='))
    ?.split('=')[1];

  if (sessionCookie) {
    // Already have session; no further action needed
    return;
  }

  // 2. No session; attempt to get one from relay iframe
  const relayFrame = document.getElementById('auth-relay');

  return new Promise((resolve, reject) => {
    // Listen for response from relay iframe
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://heady.ai') {
        console.error(`Unexpected origin in auth response: ${event.origin}`);
        reject(new Error('Auth relay security violation'));
        return;
      }

      if (event.data.type === 'heady_auth_response') {
        if (event.data.error) {
          // Not authenticated; show login page
          console.log('Not authenticated: ' + event.data.error);
          reject(new Error(event.data.error));
          return;
        }

        // Have ID token; exchange for session cookie
        validateTokenWithBackend(event.data.idToken)
          .then(() => resolve())
          .catch(reject);
      }
    }, { once: true });

    // Send request to relay iframe
    relayFrame.contentWindow.postMessage({
      type: 'heady_auth_request',
    }, 'https://heady.ai');

    // Timeout: if no response in 2 seconds, assume not authenticated
    setTimeout(() => reject(new Error('Auth relay timeout')), 2000);
  });
}

async function validateTokenWithBackend(idToken) {
  const response = await fetch('/api/auth/validate-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (response.ok) {
    // Backend set heady_session cookie via Set-Cookie header
    return;
  }

  throw new Error('Token validation failed: ' + response.statusText);
}
```

## Backend Token Validation (site1.heady.ai/api/auth/validate-token)

```typescript
import admin from 'firebase-admin';

app.post('/api/auth/validate-token', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'idToken required' });
  }

  try {
    // 1. Verify Firebase ID token signature
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // decodedToken now contains: uid, email, email_verified, etc.

    // 2. Extract user info
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // 3. Optionally: fetch/create user in database
    let user = await db.users.findById(userId);
    if (!user) {
      user = await db.users.create({
        id: userId,
        email: email,
        createdAt: new Date(),
      });
    }

    // 4. Generate session token
    const sessionToken = crypto.randomBytes(16).toString('hex');

    // 5. Store session in Redis
    const sessionData = {
      userId: userId,
      email: email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,  // 24 hours
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      idToken: idToken,  // Store for refresh
    };

    await redis.setex(
      `session:${sessionToken}`,
      86400,  // 24 hours
      JSON.stringify(sessionData)
    );

    // 6. Set httpOnly session cookie
    res.cookie('heady_session', sessionToken, {
      httpOnly: true,
      Secure: true,
      SameSite: 'Lax',
      Domain: '.heady.ai',  // Works for all subdomains
      Path: '/',
      MaxAge: 86400000,
    });

    return res.json({ success: true, userId });
  } catch (error) {
    console.error('Token validation failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Common Failures & Remediation

### Relay iframe not loading (white screen)

**Symptom:** Content domain loads, but relay iframe never posts message back

**Diagnosis:**
```bash
# 1. Check if iframe is loading
# Open DevTools → Network tab → filter for relay.html
# Should see 200 status

# 2. Check browser console for errors
# Open DevTools → Console
# Look for CORS errors, Firebase initialization errors, etc.
```

**Fix:**
```javascript
// In relay.html, add logging
window.addEventListener('message', (event) => {
  console.log('Relay iframe received postMessage:', event.data.type);
  // ... rest of handler
});

// In content domain, add timeout logging
setTimeout(() => {
  console.log('Auth relay timeout after 2 seconds');
}, 2000);
```

### CORS rejection (relay to child domain)

**Symptom:** Browser console error: "blocked by CORS policy"

**Root cause:** Browser blocks postMessage because origins don't match

**Fix:**
```javascript
// In relay iframe, MUST verify origin in ALLOWED_DOMAINS list
if (!ALLOWED_DOMAINS.includes(event.origin)) {
  return;  // Silently ignore cross-origin requests
}

// In content domain, MUST ensure relay.html is on correct origin
const relayFrame = document.getElementById('auth-relay');
relayFrame.contentWindow.postMessage({...}, 'https://heady.ai');  // Must specify target origin
```

### Session cookie not being set

**Symptom:** Backend returns 200, but heady_session cookie not in browser

**Root causes:**
1. **Set-Cookie header stripped by proxy:** Backend sets cookie, but proxy (CDN, load balancer) removes it
2. **Secure flag on non-HTTPS:** Cookie has Secure=true but page is served over HTTP
3. **Wrong domain:** Cookie set for site2.heady.ai, but page is site1.heady.ai

**Diagnosis:**
```bash
# 1. Check network response headers
# DevTools → Network → click /api/auth/validate-token request
# Look for Set-Cookie header in Response Headers

# 2. Check cookie jar
# DevTools → Application → Cookies → site1.heady.ai
# Should see heady_session cookie listed
```

**Fix:**
```typescript
// Verify Set-Cookie is correct
res.cookie('heady_session', sessionToken, {
  httpOnly: true,
  Secure: process.env.NODE_ENV === 'production',  // true in prod, false in dev
  SameSite: 'Lax',
  Domain: process.env.COOKIE_DOMAIN,  // Must match current domain (.heady.ai for shared cookie)
  Path: '/',
  MaxAge: 86400000,
});

// Log that cookie was set
console.log(`Set cookie for domain=${process.env.COOKIE_DOMAIN}, maxAge=86400000`);
```

### Expired token (MFA challenge)

**Symptom:** Session requires MFA, user must complete challenge

**Flow:**
```
Backend returns 401 { mfaRequired: true, mfaChallenge: { id, method } }
↓
Frontend displays MFA UI
User enters TOTP code or SMS code
↓
Frontend sends /api/auth/mfa-verify with mfaToken + code
↓
Backend verifies code, creates session if valid
```

**Debug MFA:**
```bash
# Check MFA is enabled for user
curl -H "Authorization: Bearer {idToken}" \
  http://localhost:3310/api/user/mfa-status

# Verify MFA secret is set up
# User should have backup codes stored securely
```

## Debugging Cross-Domain Auth Issues

### Trace request through relay

```javascript
// Add correlation ID to trace
const correlationId = Date.now().toString(36);

// In relay iframe
window.addEventListener('message', (event) => {
  console.log(`[${correlationId}] Relay received request:`, event.data.type);
  // ...
  event.source.postMessage({
    ...response,
    correlationId,  // Include in response
  }, event.origin);
});

// In content domain
window.addEventListener('message', (event) => {
  console.log(`[${event.data.correlationId}] Got auth response`);
});
```

### Verify origin restrictions

```javascript
// Test that non-whitelisted origins are rejected
const evilFrame = window.open('https://evil.com/frame.html', 'evil');
// This should NOT receive auth token from relay iframe
```

## Monitoring & Alerts

### Key metrics

```promql
# Sign-in latency (target < 1000ms p95)
histogram_quantile(0.95, rate(auth_signin_duration_seconds_bucket[5m]))

# Token validation latency (target < 500ms p95)
histogram_quantile(0.95, rate(auth_token_validation_duration_seconds_bucket[5m]))

# Session creation errors
rate(auth_session_creation_errors_total[5m])

# MFA challenge attempts
rate(auth_mfa_challenge_attempts_total[5m])

# Session expiry rate
rate(auth_session_expired_total[5m])
```

### Alert rules

- **SEV2:** Sign-in latency p95 > 1000ms
- **SEV2:** Token validation errors > 1% of requests
- **SEV3:** Session creation latency > 500ms
- **SEV3:** MFA challenge failure rate > 5%

## Related Documentation

- [ADR 006: Firebase Auth](../adr/006-firebase-auth.md)
- [DEBUG.md](../DEBUG.md)
- [Incident Response](incident-response.md)
