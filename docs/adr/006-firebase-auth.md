# ADR 006: Firebase Auth with Cross-Domain Relay

**Status:** Accepted

## Context

Heady operates 9 distinct domains (site1.heady.ai, site2.heady.ai, ... site9.heady.ai) plus the main app (heady.ai). Users must:
1. Sign in once and access all 9 domains
2. Maintain separate authentication state per domain for security
3. Not share cookies across domains (security boundary)
4. Support third-party OAuth (Google, GitHub, Microsoft, etc.)

Challenges:
- **No shared cookies:** Browsers enforce same-origin policy; `Set-Cookie: domain=.heady.ai` violates this
- **Cross-domain session:** Each domain needs independent session for CSRF protection
- **Third-party provider:** OAuth provider redirects only to registered domains
- **Performance:** Relay mechanism must not add significant latency

Alternative approaches:
1. **Shared session cookie:** Violates security (CSRF risk, shared cookie domain)
2. **Per-domain credentials:** Users manage separate logins (poor UX)
3. **JWT tokens in localStorage:** Vulnerable to XSS attacks
4. **SAML federation:** Complex setup, overkill for internal usage

## Decision

Firebase Authentication as OAuth provider with **relay iframe** architecture:

Infrastructure:
```
Main App (heady.ai)
  ├─ Firebase Authentication client
  ├─ Sign-in UI (Google OAuth, Email/Password)
  └─ Auth relay iframe (hidden)

Content Domains (site1..9.heady.ai)
  ├─ Relay listener (iframe target)
  └─ httpOnly session cookie (domain-specific)

Firebase (managed service)
  ├─ User accounts (email, OAuth profiles)
  ├─ ID tokens (JWT, signed by Firebase)
  └─ Refresh tokens (stored in browser storage)
```

Authentication flow:
1. **User signs in on main app (heady.ai)**
   ```
   User clicks "Sign in with Google"
   ↓
   Firebase Authentication handles Google OAuth redirect
   ↓
   Firebase generates ID token (JWT) + Refresh token
   ↓
   Main app receives ID token, stores refresh token in browser storage
   ```

2. **User navigates to content domain (site1.heady.ai)**
   ```
   Content domain detects no session cookie
   ↓
   Content domain iframe loads relay (hidden)
   ↓
   Relay iframe (cross-origin) posts ID token to content domain
   ↓
   Content domain validates Firebase ID token signature
   ↓
   Content domain creates httpOnly session cookie (domain=site1.heady.ai)
   ↓
   Relay iframe hidden; content domain fully loaded with session
   ```

3. **Session renewal (periodic)**
   ```
   Content domain checks session cookie expiry (24 hours)
   ↓
   If expired, main app's relay iframe refreshes ID token using refresh token
   ↓
   Relay posts new ID token to content domain
   ↓
   Content domain updates session cookie
   ```

4. **Sign out**
   ```
   User clicks "Sign out"
   ↓
   Main app revokes Firebase refresh token
   ↓
   Main app notifies all 9 content domains via relay iframe
   ↓
   Each content domain clears httpOnly session cookie
   ↓
   User is fully logged out across all domains
   ```

Firebase configuration:
```javascript
// heady-auth-core.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseApp = initializeApp({
  apiKey: env.FIREBASE_API_KEY,
  authDomain: 'heady-auth.firebaseapp.com',
  projectId: 'heady-platform',
});

const auth = getAuth(firebaseApp);
auth.useDeviceLanguage();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
```

Session cookie (httpOnly, Secure, SameSite=Lax):
```javascript
// Set on content domain after Firebase ID token validation
res.cookie('heady_session', sessionToken, {
  httpOnly: true,
  Secure: true,  // HTTPS only
  SameSite: 'Lax',
  Domain: 'site1.heady.ai',
  Path: '/',
  MaxAge: 86400000  // 24 hours
});
```

Relay iframe implementation:
```html
<!-- Main app: heady.ai/relay.html -->
<iframe id="auth-relay" src="https://heady.ai/relay.html" style="display:none;"></iframe>

<script>
function postAuthToChild(childDomain, idToken) {
  const iframe = document.getElementById('auth-relay');
  iframe.contentWindow.postMessage({
    type: 'heady_auth',
    idToken: idToken,
    targetOrigin: childDomain,
  }, childDomain);
}
</script>

<!-- Content domain listener: site1.heady.ai -->
<script>
window.addEventListener('message', async (event) => {
  if (event.origin !== 'https://heady.ai') return;  // Verify origin
  if (event.data.type !== 'heady_auth') return;

  const { idToken } = event.data;

  // Validate Firebase ID token on backend
  const response = await fetch('/api/auth/validate-token', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
    headers: { 'Content-Type': 'application/json' },
  });

  const { sessionCookie } = await response.json();
  // sessionCookie is set via Set-Cookie header (httpOnly)
});
</script>
```

## Consequences

**Positive:**
- **Single sign-on:** User signs in once on main app, automatically authenticated across all 9 domains
- **Security:** Session cookies are httpOnly (XSS-resistant) and domain-specific (prevents cross-domain leakage)
- **Third-party OAuth:** Firebase handles Google, GitHub, Microsoft authentication; no custom OAuth flows
- **Standards-based:** Firebase ID tokens are signed JWTs; verification is standard algorithm
- **Performance:** Relay iframe posts token in <50ms; session creation is local (no round-trip after first load)
- **No shared session state:** Each domain maintains independent session; easier to revoke per-domain access if needed

**Negative:**
- **Iframe dependency:** Content domains must load relay iframe; adds <iframe> tag to every page
- **postMessage complexity:** Cross-origin communication requires careful origin checking (security vulnerability if misconfigured)
- **Firebase cost:** Firebase charges per monthly active user; could be expensive at scale (>100K users)
- **Relay latency:** User must wait for relay iframe to load and post message before accessing content (typical <200ms, but adds to perceived load time)
- **Token expiry handling:** Expired sessions require relay iframe to refresh token; clients must implement retry logic

**Implementation risks:**
- **Cross-Origin Security:** postMessage must validate event.origin strictly; typos here allow token theft
- **Third-party cookies:** Safari ITP (Intelligent Tracking Prevention) blocks third-party cookies; relay iframe may not work in Safari private mode
- **Refresh token storage:** Browser storage (localStorage) is vulnerable to XSS; must ensure token is sent over HTTPS and cleared on logout
- **Clock skew:** Firebase ID token validation uses exp claim; server time must be synchronized with Firebase (NTP)

**Monitoring & operations:**
- Track relay iframe load time; alert if >500ms (indicates latency issue)
- Monitor Firebase ID token validation failures (could indicate clock skew or forged tokens)
- Track httpOnly session cookie creation failures (server-side validation errors)
- Audit logging: all sign-in events logged with Firebase user ID, timestamp, IP, user agent
- Alert on unusual auth patterns: same user signing in from 100+ IPs in 1 minute (account compromise)

## Related Decisions
- [ADR 005: Drupal CMS](./005-drupal-cms.md)
- [ADR 007: Microservice Architecture](./007-microservice-architecture.md)
