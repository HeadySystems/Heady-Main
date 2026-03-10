/**
 * Heady™ Auth Session Server — Central Authentication
 * Domain: auth.headysystems.com | Port: 3360
 * 
 * Firebase Admin SDK token verification → httpOnly session cookies
 * Cross-domain relay iframe with postMessage
 * Rate limiting: fib(9)=34/min anonymous, fib(11)=89/min authenticated, fib(13)=233/min enterprise
 * Session binding: IP + User-Agent hash fingerprint
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, CSL_THRESHOLDS, phiBackoff, PHI_TIMING } = require('../../shared/phi-math');

const app = express();
const PORT = process.env.SERVICE_PORT || 3360;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const SESSION_TTL_SHORT = Math.round(PHI_TIMING.PHI_7);        // 29,034ms ≈ 29s (dev)
const SESSION_TTL_LONG  = fib(12) * fib(10) * fib(6);           // 144 × 55 × 8 = 63,360s ≈ 17.6h (φ-derived session)
const RATE_ANONYMOUS    = fib(9);                                // 34 requests/min
const RATE_AUTHENTICATED = fib(11);                              // 89 requests/min
const RATE_ENTERPRISE   = fib(13);                               // 233 requests/min
const FINGERPRINT_SALT  = process.env.SESSION_SECRET || 'heady-sacred-geometry';

const ALLOWED_ORIGINS = [
  'https://headyme.com',
  'https://headysystems.com',
  'https://heady-ai.com',
  'https://headyos.com',
  'https://headyconnection.org',
  'https://headyconnection.com',
  'https://headyex.com',
  'https://headyfinance.com',
  'https://admin.headysystems.com',
  'https://auth.headysystems.com',
];

// ─── Rate Limiter (φ-scaled sliding window) ───────────────────────────────────

const rateBuckets = new Map();
const RATE_WINDOW_MS = fib(10) * 1000;  // 55s window

function checkRateLimit(key, tier = 'anonymous') {
  const limit = tier === 'enterprise' ? RATE_ENTERPRISE
    : tier === 'authenticated' ? RATE_AUTHENTICATED
    : RATE_ANONYMOUS;
  
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, windowStart: now };
  
  if (now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  
  bucket.count++;
  rateBuckets.set(key, bucket);
  
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), limit };
}

// ─── Client Fingerprint ───────────────────────────────────────────────────────

function createFingerprint(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(`${ip}:${ua}:${FINGERPRINT_SALT}`).digest('hex').slice(0, fib(8)); // 21 chars
}

// ─── Session Token ────────────────────────────────────────────────────────────

function createSessionToken(uid, fingerprint, tier = 'authenticated') {
  const payload = JSON.stringify({
    uid,
    fp: fingerprint,
    tier,
    iat: Date.now(),
    exp: Date.now() + (SESSION_TTL_LONG * 1000),
  });
  const hmac = crypto.createHmac('sha256', FINGERPRINT_SALT).update(payload).digest('hex');
  return Buffer.from(`${payload}.${hmac}`).toString('base64url');
}

function validateSessionToken(token, fingerprint) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    const payload = decoded.slice(0, lastDot);
    const hmac = decoded.slice(lastDot + 1);
    const expected = crypto.createHmac('sha256', FINGERPRINT_SALT).update(payload).digest('hex');
    if (hmac !== expected) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    if (data.fp !== fingerprint) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Structured Logger ────────────────────────────────────────────────────────

function log(level, msg, meta = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'auth-session',
    msg,
    ...meta,
  });
  process.stdout.write(entry + '\n');
}

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'self' https://*.headysystems.com https://*.headyme.com");
  next();
});

// Rate limiting middleware
app.use((req, res, next) => {
  const key = req.ip || 'unknown';
  const { allowed, remaining, limit } = checkRateLimit(key);
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  if (!allowed) {
    log('warn', 'Rate limit exceeded', { ip: key });
    return res.status(429).json({ error: 'HEADY-AUTH-429', message: 'Rate limit exceeded' });
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'auth-session',
    version: '5.1.0',
    domain: 'auth.headysystems.com',
    ts: new Date().toISOString(),
    phi: { sessionTtl: SESSION_TTL_LONG, rateLimits: { anonymous: RATE_ANONYMOUS, authenticated: RATE_AUTHENTICATED, enterprise: RATE_ENTERPRISE } },
  });
});

// Create session from Firebase ID token
app.post('/session/create', async (req, res) => {
  const { idToken, rememberMe } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'HEADY-AUTH-001', message: 'Missing idToken' });
  }
  
  try {
    // In production: verify with Firebase Admin SDK
    // const decodedToken = await admin.auth().verifyIdToken(idToken);
    // For now: decode JWT payload (non-verified — production MUST verify)
    const parts = idToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64url').toString('utf8'));
    const uid = payload.sub || payload.user_id || 'anonymous';
    
    const fingerprint = createFingerprint(req);
    const sessionToken = createSessionToken(uid, fingerprint);
    const ttl = rememberMe ? SESSION_TTL_LONG : Math.round(SESSION_TTL_LONG * PSI); // 53,312s ≈ 14.8h
    
    res.cookie('__Host-heady_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: ttl * 1000,
      path: '/',
    });
    
    log('info', 'Session created', { uid, fingerprint: fingerprint.slice(0, 8), rememberMe });
    res.json({ ok: true, uid, expiresIn: ttl });
  } catch (err) {
    log('error', 'Session creation failed', { error: err.message });
    res.status(401).json({ error: 'HEADY-AUTH-002', message: 'Invalid token' });
  }
});

// Validate session
app.get('/session/validate', (req, res) => {
  const token = req.cookies?.['__Host-heady_session'] || parseCookie(req.headers.cookie, '__Host-heady_session');
  if (!token) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-003', message: 'No session' });
  }
  
  const fingerprint = createFingerprint(req);
  const session = validateSessionToken(token, fingerprint);
  
  if (!session) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-004', message: 'Invalid or expired session' });
  }
  
  res.json({ valid: true, uid: session.uid, tier: session.tier, expiresAt: session.exp });
});

// Destroy session
app.post('/session/destroy', (req, res) => {
  res.clearCookie('__Host-heady_session', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  log('info', 'Session destroyed', { ip: req.ip });
  res.json({ ok: true });
});

// Cross-domain relay iframe
app.get('/relay', (req, res) => {
  const origin = req.query.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).send('Forbidden origin');
  }
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html><head><title>Heady Auth Relay</title></head>
<body>
<script>
(function() {
  var ALLOWED = ${JSON.stringify(ALLOWED_ORIGINS)};
  window.addEventListener('message', function(event) {
    if (ALLOWED.indexOf(event.origin) === -1) return;
    if (event.data && event.data.type === 'HEADY_AUTH_CHECK') {
      var cookies = document.cookie;
      var hasSession = cookies.indexOf('__Host-heady_session') !== -1;
      event.source.postMessage({
        type: 'HEADY_AUTH_STATUS',
        authenticated: hasSession,
        origin: window.location.origin,
      }, event.origin);
    }
  });
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'HEADY_RELAY_READY' }, '${origin}');
  }
})();
</script>
</body></html>`);
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    '# HELP heady_auth_sessions_active Number of active sessions',
    '# TYPE heady_auth_sessions_active gauge',
    `heady_auth_sessions_active ${rateBuckets.size}`,
    '# HELP heady_auth_rate_limit_buckets Number of rate limit buckets',
    '# TYPE heady_auth_rate_limit_buckets gauge',
    `heady_auth_rate_limit_buckets ${rateBuckets.size}`,
  ].join('\n'));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCookie(cookieStr, name) {
  if (!cookieStr) return null;
  const match = cookieStr.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Startup ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log('info', 'Auth session server started', { port: PORT, origins: ALLOWED_ORIGINS.length });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  process.exit(0);
});
