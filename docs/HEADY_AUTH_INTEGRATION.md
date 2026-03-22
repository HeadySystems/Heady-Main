# Heady Auth Service + Personal 3-Tier Storage — Integration Guide

> **HeadySystems Inc.** — Eric Haywood, Founder
> v2.0.0 — 2026-03-22

---

## Deliverable Map

| File | Purpose | Deploy Target |
|------|---------|---------------|
| `heady-auth-service.mjs` | Cloud Run Express — auth, SSO, lead capture, storage API | `auth.headysystems.com` via Cloud Run |
| `002_personal_storage.sql` | Neon migration — personal_storage + storage_quotas tables | Neon Postgres |
| `heady-auth-client.js` | Client lib — relay iframe, lead tracking, storage client | CDN → all 11 sites |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ANY HEADY SITE (headyme.com, headymcp.com, headyfinance.com, ...) │
│                                                                     │
│  heady-auth-client.js (auto-inits)                                 │
│  ├── Injects <iframe src="auth.headysystems.com/relay.html">       │
│  ├── Captures lead → POST /lead/capture → heady_lead cookie        │
│  ├── Listens for postMessage auth state → HeadyAuth.user           │
│  ├── Exposes HeadyAuth.login() / .logout() / .storage.*            │
│  └── Binds [data-heady-auth] DOM elements automatically            │
│                                                                     │
│  Personal Storage Client (HeadyStorage)                            │
│  ├── .set(key, value) → PUT /storage/:key                          │
│  ├── .get(key)        → GET /storage/:key                          │
│  ├── .list(prefix)    → GET /storage?prefix=...                    │
│  ├── .search(query)   → POST /storage/search                      │
│  ├── .setPreference() / .saveBuddyHistory() / .bookmark()          │
│  └── All requests include credentials: 'include' for cookie auth   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS + httpOnly cookie
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AUTH SERVICE (Cloud Run — auth.headysystems.com)                   │
│  heady-auth-service.mjs                                            │
│                                                                     │
│  ┌─ AUTH ROUTES ──────────────────────────────────────────────────┐ │
│  │ POST /auth/login    Firebase ID → session + httpOnly cookie    │ │
│  │ POST /auth/logout   Invalidate session across T0 + T1         │ │
│  │ GET  /auth/session  Return current user (for relay + API)     │ │
│  │ POST /auth/transfer One-time SSO transfer token                │ │
│  │ POST /auth/exchange Consume transfer → set cookie on target   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ LEAD ROUTES ─────────────────────────────────────────────────┐ │
│  │ POST /lead/capture  Anonymous → assign heady_lead cookie       │ │
│  │ POST /lead/event    Track engagement (page views, clicks)      │ │
│  │ GET  /lead/profile  Retrieve lead data for Buddy personalize  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ STORAGE ROUTES (auth required) ──────────────────────────────┐ │
│  │ PUT    /storage/:key   Write to T0 + T1                       │ │
│  │ GET    /storage/:key   Read T0 → T1 → (T2 future)            │ │
│  │ DELETE /storage/:key   Remove from T0 + T1                    │ │
│  │ GET    /storage        List keys with prefix filter            │ │
│  │ POST   /storage/search Fuzzy text search (pg_trgm + pgvector) │ │
│  │ GET    /storage/~stats Usage statistics                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  GET /relay.html   Inline SSO relay page (Firebase + postMessage)  │
│  GET /health       Service health (Neon + Redis checks)            │
└──────────────┬──────────────────┬───────────────────────────────────┘
               │                  │
         ┌─────▼─────┐    ┌──────▼──────┐
         │ T0 REDIS   │    │ T1 NEON     │
         │ (Upstash)  │    │ (Postgres)  │
         │            │    │             │
         │ Hot cache  │    │ Persistent  │
         │ Sessions   │    │ Users       │
         │ Leads      │    │ Sessions    │
         │ Storage    │    │ Storage     │
         │ 21h TTL    │    │ + pgvector  │
         └────────────┘    │ + pg_trgm   │
                           └──────┬──────┘
                                  │ async consolidation
                           ┌──────▼──────┐
                           │ T2 QDRANT   │
                           │ (Cold)      │
                           │ Long-term   │
                           │ Vectors     │
                           │ 144d+ TTL   │
                           └─────────────┘
```

---

## Data Flow: Anonymous → Lead → Authenticated → Storage

```
1. ANONYMOUS VISITOR
   └─ heady-auth-client.js loads
   └─ POST /lead/capture → assigns heady_lead cookie (144-day TTL)
   └─ T0: tenant:lead:{id} hash with firstSeen, site, UTM

2. ENGAGED LEAD (clicks features, interacts with Buddy)
   └─ POST /lead/event → tracks engagement in T0 lead hash
   └─ Buddy widget reads /lead/profile → personalizes suggestions

3. SIGN UP / SIGN IN
   └─ HeadyAuth.login() → redirects to auth.headysystems.com
   └─ Firebase Auth (Google/GitHub/email/27 providers)
   └─ relay.html: Firebase token → POST /auth/login
   └─ Server: verify token → upsert user in Neon → create session
   └─ Lead conversion: T0 lead data → T1 memory_t1 (user_preference)
   └─ httpOnly __Host-heady_session cookie set

4. AUTHENTICATED USER
   └─ All 11 sites see user via relay iframe postMessage
   └─ HeadyAuth.storage.set('preferences/theme', 'dark')
   └─ Writes to T0 (hot, 21h) + T1 (persistent) simultaneously
   └─ HeadyAuth.storage.get('preferences/theme')
   └─ Reads T0 first (fast) → falls back to T1 → promotes to T0

5. LONG-TERM CONSOLIDATION (async background job)
   └─ Items accessed ≥5 times, older than 34 days → copy to T2 Qdrant
   └─ T2 provides cross-user knowledge graph (future)
```

---

## Per-Site HTML Integration

Add to every site's `<head>` or before `</body>`:

```html
<!-- Auth client (handles relay iframe, lead capture, storage) -->
<script src="https://cdn.headysystems.com/auth/heady-auth-client.js" defer></script>
```

That's it. The client auto-injects the relay iframe and initializes everything.

### Declarative Auth UI

Use `data-heady-auth` attributes for zero-JS auth UI:

```html
<!-- Show only when authenticated -->
<div data-heady-auth="show-authenticated" hidden>
  <img data-heady-auth="user-avatar" alt="Avatar">
  <span data-heady-auth="user-name"></span>
  <button data-heady-auth="logout-button">Sign Out</button>
</div>

<!-- Show only when anonymous -->
<div data-heady-auth="show-anonymous">
  <button data-heady-auth="login-button">Sign In</button>
</div>
```

### JavaScript API

```javascript
// Wait for auth to be ready
window.addEventListener('heady:auth:ready', async ({ detail: { auth } }) => {
  console.log('Authenticated:', auth.isAuthenticated);
  console.log('User:', auth.user);
  console.log('Lead ID:', auth.leadId);

  // Listen for auth changes
  auth.on('auth:change', ({ user, authenticated }) => {
    console.log('Auth changed:', authenticated, user);
  });

  // Personal storage
  if (auth.isAuthenticated) {
    // Write
    await auth.storage.set('myApp/settings', { darkMode: true, fontSize: 16 });

    // Read (T0 → T1 transparent)
    const settings = await auth.storage.get('myApp/settings');
    console.log(settings.value); // { darkMode: true, fontSize: 16 }

    // List
    const items = await auth.storage.list('myApp/');
    console.log(items);

    // Search
    const results = await auth.storage.search('dark mode settings');
    console.log(results);

    // Convenience helpers
    await auth.storage.setPreference('theme', 'dark');
    await auth.storage.bookmark('https://example.com', 'Example', ['reference']);
    await auth.storage.saveNote('My Note', 'Content here...');
  }
});
```

---

## Deploy Sequence

### 1. Apply database migration

```bash
export DATABASE_URL="postgresql://heady:PASSWORD@ep-cold-snow-aesmiwt9.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
psql "$DATABASE_URL" -f 002_personal_storage.sql
```

### 2. Deploy auth service to Cloud Run

```bash
cd services/heady-auth

# Build container
docker build -t us-central1-docker.pkg.dev/gen-lang-client-0920560496/cloud-run-source-deploy/heady-auth:v2 .

# Push
docker push us-central1-docker.pkg.dev/gen-lang-client-0920560496/cloud-run-source-deploy/heady-auth:v2

# Deploy with φ-stepped canary
gcloud run deploy heady-auth \
  --image=us-central1-docker.pkg.dev/gen-lang-client-0920560496/cloud-run-source-deploy/heady-auth:v2 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=heady-ai" \
  --set-secrets="DATABASE_URL=heady-db-url:latest,UPSTASH_REDIS_REST_URL=upstash-url:latest,UPSTASH_REDIS_REST_TOKEN=upstash-token:latest,FIREBASE_API_KEY=firebase-api-key:latest,JWT_SECRET=jwt-secret:latest" \
  --min-instances=1 \
  --max-instances=13 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --tag=canary
```

### 3. Map domain

```bash
gcloud run domain-mappings create \
  --service=heady-auth \
  --domain=auth.headysystems.com \
  --region=us-central1
```

### 4. Upload client to CDN

```bash
# Upload to Cloudflare R2
wrangler r2 object put heady-cdn/auth/heady-auth-client.js \
  --file=./heady-auth-client.js \
  --content-type="application/javascript"
```

### 5. Add CORS in Cloudflare Worker

The auth service handles CORS dynamically (checks ALLOWED_ORIGINS), but the CDN Worker for `cdn.headysystems.com` needs:

```javascript
// In your CDN worker
const CORS_ORIGINS = new Set([
  'https://headysystems.com', 'https://headyme.com', 'https://headymcp.com',
  'https://headyconnection.org', 'https://headyio.com', 'https://headyfinance.com',
  'https://headybuddy.com', 'https://headybot.com', 'https://headyapi.com',
  'https://headylens.com', 'https://headyai.com', 'https://auth.headysystems.com',
]);
```

---

## Storage Quotas

| Tier | Max Items | Max Size | Vector Dim | Search |
|------|-----------|----------|------------|--------|
| Free | 1,000 | 50 MB | 384D | pg_trgm fuzzy |
| Pro | 13,000 | 500 MB | 1536D | pgvector HNSW |
| Enterprise | Unlimited | Unlimited | 1536D + custom | pgvector + Qdrant T2 |

---

## Session Timing (φ-scaled)

| Parameter | Value | Formula |
|-----------|-------|---------|
| Session max age | 21 hours | `fib(8) × 1h` |
| Renew after | 13 hours | `fib(7) × 1h` |
| Absolute max | 55 hours | `fib(10) × 1h` |
| Transfer token TTL | 5 minutes | Fixed (security) |
| Lead cookie TTL | 144 days | `fib(12) × 1d` |
| T0 session cache | 21 hours | `fib(8) × 1h` |
| T0 storage cache | 21 hours | `fib(8) × 1h` |
| Token verify cache | 21 minutes | `fib(8) × 1m` |
| Heartbeat interval | 29,034ms | `φ⁷ × 1000ms` |

---

*Sacred Geometry Architecture · Organic Systems · Breathing Interfaces · φ*
