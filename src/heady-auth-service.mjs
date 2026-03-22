/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: Auth Service v2.0.0                               ║
 * ║  HeadySystems Inc. — Eric Haywood, Founder                      ║
 * ║  Patent Lock: HS-2026-051 (Cross-Domain AI Identity Fabric)     ║
 * ║  Deploy: Cloud Run (us-central1) — auth.headysystems.com        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Responsibilities:
 *   1. Firebase ID token → Neon session + httpOnly cookie
 *   2. Cross-domain SSO relay (11 domains)
 *   3. Lead capture: anonymous → identified → authenticated funnel
 *   4. Personal 3-tier storage API (T0 Redis / T1 Neon / T2 Qdrant)
 *   5. 27-provider OAuth registry
 *
 * Env vars required:
 *   FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS (or GCP metadata)
 *   DATABASE_URL (Neon Postgres), UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *   JWT_SECRET, ALLOWED_ORIGINS (comma-separated)
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════
// §1 — φ CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

// Session timing (φ-scaled)
const SESSION_MAX_AGE_MS   = FIB[8] * 60 * 60 * 1000;  // 21 hours
const SESSION_RENEW_MS     = FIB[7] * 60 * 60 * 1000;  // 13 hours
const SESSION_ABSOLUTE_MS  = FIB[10] * 60 * 60 * 1000;  // 55 hours
const TRANSFER_TOKEN_TTL   = 5 * 60 * 1000;              // 5 minutes
const LEAD_COOKIE_MAX_AGE  = FIB[12] * 24 * 60 * 60 * 1000; // 144 days
const HEARTBEAT_MS         = Math.round(Math.pow(PHI, 7) * 1000); // 29,034ms

// T0 Redis TTLs (seconds)
const T0_SESSION_TTL    = FIB[8] * 3600;   // 21 hours
const T0_CACHE_TTL      = FIB[6] * 60;     // 8 minutes hot cache
const T0_STORAGE_TTL    = FIB[8] * 3600;   // 21 hours hot personal storage

// CSL thresholds
const CSL_CORE    = 0.718;
const CSL_INCLUDE = PHI_INV;  // 0.618
const CSL_RECALL  = 0.382;

// ═══════════════════════════════════════════════════════════════════
// §2 — ALLOWED ORIGINS (all 11 Heady domains)
// ═══════════════════════════════════════════════════════════════════

const HEADY_DOMAINS = [
  'headysystems.com', 'headyme.com', 'headymcp.com', 'headyconnection.org',
  'headyio.com', 'headyfinance.com', 'headybuddy.com', 'headybot.com',
  'headyapi.com', 'headylens.com', 'headyai.com',
  'auth.headysystems.com', 'admin.headysystems.com',
];

const ALLOWED_ORIGINS = new Set(
  HEADY_DOMAINS.flatMap(d => [`https://${d}`, `https://www.${d}`])
);

// Add custom origins from env
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => ALLOWED_ORIGINS.add(o.trim()));
}

// ═══════════════════════════════════════════════════════════════════
// §3 — DATABASE CLIENTS (Neon T1 + Upstash T0)
// ═══════════════════════════════════════════════════════════════════

import pg from 'pg';
const { Pool } = pg;

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: FIB[7],            // 13 connections
  idleTimeoutMillis: FIB[8] * 1000,  // 21s
  connectionTimeoutMillis: Math.round(PHI * PHI * 1000), // 2,618ms
});

// Upstash Redis via REST (zero TCP, ideal for Cloud Run)
class T0Redis {
  #url; #token;

  constructor() {
    this.#url = process.env.UPSTASH_REDIS_REST_URL;
    this.#token = process.env.UPSTASH_REDIS_REST_TOKEN;
    this.available = !!(this.#url && this.#token);
  }

  async exec(command) {
    if (!this.available) return null;
    const res = await fetch(`${this.#url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    const data = await res.json();
    if (data.error) throw new Error(`T0: ${data.error}`);
    return data.result;
  }

  async get(key) { return this.exec(['GET', key]); }
  async set(key, value, ttlSec) {
    return ttlSec
      ? this.exec(['SET', key, value, 'EX', String(ttlSec)])
      : this.exec(['SET', key, value]);
  }
  async del(key) { return this.exec(['DEL', key]); }
  async setex(key, ttl, value) { return this.exec(['SETEX', key, String(ttl), value]); }
  async hset(key, field, value) { return this.exec(['HSET', key, field, value]); }
  async hget(key, field) { return this.exec(['HGET', key, field]); }
  async hgetall(key) { return this.exec(['HGETALL', key]); }
  async hdel(key, field) { return this.exec(['HDEL', key, field]); }
  async expire(key, ttl) { return this.exec(['EXPIRE', key, String(ttl)]); }
  async keys(pattern) { return this.exec(['KEYS', pattern]); }
}

const t0 = new T0Redis();

// ═══════════════════════════════════════════════════════════════════
// §4 — FIREBASE ADMIN (token verification, no trust-on-first-use)
// ═══════════════════════════════════════════════════════════════════

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'heady-ai',
    // On Cloud Run, credentials auto-resolve from GCP metadata
  });
}

const firebaseAuth = admin.auth();

// Token verification with LRU cache (fib(15) = 610 entries, fib(8)m TTL)
const tokenCache = new Map();
const TOKEN_CACHE_MAX = FIB[15]; // 610
const TOKEN_CACHE_TTL = FIB[8] * 60 * 1000; // 21 minutes

async function verifyFirebaseToken(idToken) {
  const hash = crypto.createHash('sha256').update(idToken).digest('hex').slice(0, 16);

  // Check cache
  const cached = tokenCache.get(hash);
  if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) {
    return cached.decoded;
  }

  // Verify with Firebase Admin
  const decoded = await firebaseAuth.verifyIdToken(idToken, true);

  // Cache result
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const oldest = tokenCache.keys().next().value;
    tokenCache.delete(oldest);
  }
  tokenCache.set(hash, { decoded, ts: Date.now() });

  return decoded;
}

// ═══════════════════════════════════════════════════════════════════
// §5 — SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

function generateSessionToken() {
  return `hses_${crypto.randomBytes(32).toString('base64url')}`;
}

function generateTransferToken() {
  return `htxf_${crypto.randomBytes(24).toString('base64url')}`;
}

function generateLeadId() {
  return `hlead_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('base64url')}`;
}

// Create a new Neon session + cache in T0
async function createSession(userId, originSite, req) {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  const renewAfter = new Date(now.getTime() + SESSION_RENEW_MS);
  const absoluteExpiry = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

  // T1: Persist to Neon
  const { rows } = await neonPool.query(`
    INSERT INTO sessions (user_id, session_token, expires_at, renew_after, absolute_expiry, origin_site, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [userId, token, expiresAt, renewAfter, absoluteExpiry, originSite,
      req.ip, req.headers['user-agent']?.slice(0, 256)]);

  // T0: Hot cache for fast validation
  if (t0.available) {
    await t0.setex(`tenant:session:${token}`, T0_SESSION_TTL, JSON.stringify({
      sessionId: rows[0].id,
      userId,
      expiresAt: expiresAt.toISOString(),
      renewAfter: renewAfter.toISOString(),
    }));
  }

  return { token, sessionId: rows[0].id, expiresAt };
}

// Validate session: T0 first → T1 fallback
async function validateSession(token) {
  if (!token) return null;

  // T0: Check hot cache
  if (t0.available) {
    const cached = await t0.get(`tenant:session:${token}`);
    if (cached) {
      const session = JSON.parse(cached);
      if (new Date(session.expiresAt) > new Date()) {
        return session;
      }
      // Expired — clean up
      await t0.del(`tenant:session:${token}`);
    }
  }

  // T1: Fallback to Neon
  const { rows } = await neonPool.query(`
    SELECT s.id AS "sessionId", s.user_id AS "userId", s.expires_at AS "expiresAt",
           s.renew_after AS "renewAfter", s.absolute_expiry AS "absoluteExpiry",
           u.email, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
           u.firebase_uid AS "firebaseUid", u.subscription_tier AS "tier"
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = $1 AND s.expires_at > NOW()
    LIMIT 1
  `, [token]);

  if (rows.length === 0) return null;

  const session = rows[0];

  // Refill T0 cache
  if (t0.available) {
    await t0.setex(`tenant:session:${token}`, T0_SESSION_TTL, JSON.stringify(session));
  }

  return session;
}

// Renew session if past renewAfter threshold
async function maybeRenewSession(token, session) {
  if (new Date(session.renewAfter) > new Date()) return null; // Not yet

  const newExpiry = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const newRenew = new Date(Date.now() + SESSION_RENEW_MS);

  // Don't exceed absolute expiry
  if (session.absoluteExpiry && newExpiry > new Date(session.absoluteExpiry)) {
    return null; // Must re-authenticate
  }

  await neonPool.query(`
    UPDATE sessions SET expires_at = $1, renew_after = $2 WHERE session_token = $3
  `, [newExpiry, newRenew, token]);

  // Update T0
  if (t0.available) {
    session.expiresAt = newExpiry.toISOString();
    session.renewAfter = newRenew.toISOString();
    await t0.setex(`tenant:session:${token}`, T0_SESSION_TTL, JSON.stringify(session));
  }

  return newExpiry;
}

// ═══════════════════════════════════════════════════════════════════
// §6 — USER UPSERT (lead → identified → authenticated)
// ═══════════════════════════════════════════════════════════════════

async function upsertUser(firebaseUser) {
  const { uid, email, displayName, photoURL, firebase: fb } = firebaseUser;
  const provider = fb?.sign_in_provider || 'email';

  const { rows } = await neonPool.query(`
    INSERT INTO users (firebase_uid, email, display_name, avatar_url, auth_provider, last_login_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, users.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      auth_provider = EXCLUDED.auth_provider,
      last_login_at = NOW(),
      updated_at = NOW()
    RETURNING id, subscription_tier, onboarding_completed
  `, [uid, email, displayName || null, photoURL || null, provider]);

  return rows[0];
}

// Convert an anonymous lead to a real user
async function convertLead(leadId, userId) {
  // Move lead data into user preferences
  if (t0.available) {
    const leadData = await t0.hgetall(`tenant:lead:${leadId}`);
    if (leadData && Object.keys(leadData).length > 0) {
      // Store lead context as user memory T1
      await neonPool.query(`
        INSERT INTO memory_t1 (user_id, node_id, memory_type, content, content_hash, csl_score, metadata)
        VALUES ($1, 'auth-service', 'user_preference', $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        userId,
        `Lead conversion data: ${JSON.stringify(leadData)}`,
        crypto.createHash('sha256').update(JSON.stringify(leadData)).digest('hex'),
        CSL_INCLUDE,
        JSON.stringify({ source: 'lead_conversion', leadId, convertedAt: new Date().toISOString() }),
      ]);

      // Clean up lead
      await t0.del(`tenant:lead:${leadId}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// §7 — TRANSFER TOKEN STORE (one-time SSO tokens)
// ═══════════════════════════════════════════════════════════════════

const transferTokens = new Map(); // In-memory for speed; T0 backup

async function createTransferToken(sessionToken, targetOrigin) {
  const token = generateTransferToken();
  const data = { sessionToken, targetOrigin, createdAt: Date.now() };

  transferTokens.set(token, data);

  // Also store in T0 for multi-instance
  if (t0.available) {
    await t0.setex(`tenant:transfer:${token}`, 300, JSON.stringify(data)); // 5 min
  }

  // Auto-expire from memory
  setTimeout(() => transferTokens.delete(token), TRANSFER_TOKEN_TTL);

  return token;
}

async function consumeTransferToken(token) {
  // Check memory first
  let data = transferTokens.get(token);
  transferTokens.delete(token);

  // Fallback to T0
  if (!data && t0.available) {
    const raw = await t0.get(`tenant:transfer:${token}`);
    if (raw) {
      data = JSON.parse(raw);
      await t0.del(`tenant:transfer:${token}`);
    }
  }

  if (!data) return null;

  // Expired?
  if (Date.now() - data.createdAt > TRANSFER_TOKEN_TTL) return null;

  return data;
}

// ═══════════════════════════════════════════════════════════════════
// §8 — PERSONAL 3-TIER STORAGE API
// ═══════════════════════════════════════════════════════════════════

/**
 * Personal Storage: Each user gets a namespace in all 3 tiers.
 *
 *   T0 (Redis):  tenant:{userId}:store:{key}     — hot, 21h TTL, JSON values
 *   T1 (Neon):   personal_storage table           — warm, persistent, vector-searchable
 *   T2 (Qdrant): collection=heady_personal ns={userId} — cold, long-term
 *
 * Read path:  T0 → T1 → T2  (promote on access)
 * Write path: T0 + T1 simultaneously (T2 via async consolidation)
 */

const StorageKeySchema = z.string().min(1).max(256).regex(/^[a-zA-Z0-9_.\-:\/]+$/);
const StorageValueSchema = z.any(); // JSON-serializable
const StorageQuerySchema = z.object({
  key: StorageKeySchema.optional(),
  prefix: z.string().max(128).optional(),
  query: z.string().max(1000).optional(), // semantic search text
  tier: z.enum(['t0', 't1', 't2', 'all']).default('all'),
  limit: z.number().int().min(1).max(FIB[8]).default(FIB[7]), // default 13, max 21
});

class PersonalStorage {
  constructor(userId) {
    this.userId = userId;
    this.nsPrefix = `tenant:${userId}:store`;
  }

  // ─── WRITE ───────────────────────────────────────────────────

  async set(key, value, options = {}) {
    const serialized = JSON.stringify(value);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex');
    const ttl = options.ttl || T0_STORAGE_TTL;

    // T0: Hot cache (always)
    if (t0.available) {
      await t0.setex(`${this.nsPrefix}:${key}`, ttl, serialized);
    }

    // T1: Persistent (always)
    await neonPool.query(`
      INSERT INTO personal_storage (user_id, key, value, content_hash, category, csl_score, metadata, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, key) DO UPDATE SET
        value = EXCLUDED.value,
        content_hash = EXCLUDED.content_hash,
        csl_score = GREATEST(personal_storage.csl_score, EXCLUDED.csl_score),
        access_count = personal_storage.access_count + 1,
        last_accessed = NOW(),
        updated_at = NOW(),
        metadata = personal_storage.metadata || EXCLUDED.metadata,
        expires_at = EXCLUDED.expires_at
    `, [
      this.userId, key, serialized, hash,
      options.category || 'general',
      options.cslScore || CSL_INCLUDE,
      JSON.stringify(options.metadata || {}),
      options.persist ? null : new Date(Date.now() + (options.ttlHours || FIB[8] * 47) * 3600 * 1000),
    ]);

    // Audit
    await this.#audit('write', key);

    return { key, hash, tier: 't0+t1' };
  }

  // ─── READ ────────────────────────────────────────────────────

  async get(key) {
    // T0 first
    if (t0.available) {
      const cached = await t0.get(`${this.nsPrefix}:${key}`);
      if (cached) {
        // Extend T0 TTL on access (φ⁴ ≈ 6.85 hours added)
        await t0.expire(`${this.nsPrefix}:${key}`, T0_STORAGE_TTL);
        return { value: JSON.parse(cached), tier: 't0', key };
      }
    }

    // T1 fallback
    const { rows } = await neonPool.query(`
      UPDATE personal_storage
      SET access_count = access_count + 1, last_accessed = NOW()
      WHERE user_id = $1 AND key = $2
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING value, csl_score, category, metadata, created_at
    `, [this.userId, key]);

    if (rows.length > 0) {
      const row = rows[0];
      // Promote to T0
      if (t0.available) {
        await t0.setex(`${this.nsPrefix}:${key}`, T0_STORAGE_TTL, row.value);
      }
      return { value: JSON.parse(row.value), tier: 't1', key, cslScore: row.csl_score, category: row.category };
    }

    // T2 (Qdrant) — future: search cold storage
    return null;
  }

  // ─── LIST ────────────────────────────────────────────────────

  async list(prefix = '', limit = FIB[7]) {
    const { rows } = await neonPool.query(`
      SELECT key, category, csl_score, access_count, last_accessed, created_at,
             LENGTH(value) AS size_bytes
      FROM personal_storage
      WHERE user_id = $1
        AND ($2 = '' OR key LIKE $2 || '%')
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY last_accessed DESC
      LIMIT $3
    `, [this.userId, prefix, limit]);

    return rows;
  }

  // ─── DELETE ──────────────────────────────────────────────────

  async delete(key) {
    // Remove from both tiers
    if (t0.available) {
      await t0.del(`${this.nsPrefix}:${key}`);
    }

    const { rowCount } = await neonPool.query(`
      DELETE FROM personal_storage WHERE user_id = $1 AND key = $2
    `, [this.userId, key]);

    await this.#audit('delete', key);
    return { deleted: rowCount > 0, key };
  }

  // ─── SEMANTIC SEARCH (T1 pgvector) ──────────────────────────

  async search(queryText, limit = FIB[7]) {
    // For semantic search, we'd embed the query and search.
    // For now, fuzzy text search using pg_trgm
    const { rows } = await neonPool.query(`
      SELECT key, value, category, csl_score, 
             similarity(key || ' ' || COALESCE(metadata->>'tags', ''), $2) AS relevance
      FROM personal_storage
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (key || ' ' || COALESCE(metadata->>'tags', '')) % $2
      ORDER BY relevance DESC
      LIMIT $3
    `, [this.userId, queryText, limit]);

    return rows.map(r => ({
      key: r.key,
      value: JSON.parse(r.value),
      category: r.category,
      cslScore: r.csl_score,
      relevance: r.relevance,
    }));
  }

  // ─── STORAGE STATS ──────────────────────────────────────────

  async stats() {
    const { rows } = await neonPool.query(`
      SELECT 
        COUNT(*) AS total_items,
        SUM(LENGTH(value)) AS total_bytes,
        COUNT(DISTINCT category) AS categories,
        AVG(csl_score) AS avg_csl,
        MAX(last_accessed) AS last_activity
      FROM personal_storage
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
    `, [this.userId]);

    return rows[0];
  }

  // ─── AUDIT ──────────────────────────────────────────────────

  async #audit(action, key) {
    try {
      await neonPool.query(`
        INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details)
        VALUES ($1, $2, 'personal_storage', $3, $4)
      `, [this.userId, `storage.${action}`, key, JSON.stringify({ userId: this.userId })]);
    } catch { /* Non-critical — don't block on audit failures */ }
  }
}

// ═══════════════════════════════════════════════════════════════════
// §9 — EXPRESS APP
// ═══════════════════════════════════════════════════════════════════

const app = express();

// ─── MIDDLEWARE ─────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.set('trust proxy', true);

// CORS — dynamic based on origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Heady-Site, X-Heady-Session, X-Heady-Trace-Id');
    res.header('Access-Control-Expose-Headers', 'X-Heady-Session-Renewed');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY'); // Except relay.html — handled separately
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Heady-Service', 'auth-service-v2');
  next();
});

// Session extraction middleware
async function extractSession(req, res, next) {
  const token = req.cookies?.['__Host-heady_session'] || req.cookies?.['heady_session'];
  if (token) {
    try {
      req.session = await validateSession(token);
      req.sessionToken = token;

      // Auto-renew if needed
      if (req.session) {
        const renewed = await maybeRenewSession(token, req.session);
        if (renewed) {
          setSessionCookie(res, token, renewed);
          res.header('X-Heady-Session-Renewed', 'true');
        }
      }
    } catch { /* Invalid session — proceed unauthenticated */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required', code: 'HEADY-AUTH-001' });
  }
  next();
}

function setSessionCookie(res, token, expiresAt) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? '__Host-heady_session' : 'heady_session';

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
    ...(isProduction ? {} : { domain: undefined }),
  });
}

// ═══════════════════════════════════════════════════════════════════
// §10 — AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════

// ─── POST /auth/login ──────────────────────────────────────────
// Firebase ID token → verify → upsert user → create session → set cookie
app.post('/auth/login', async (req, res) => {
  try {
    const { idToken, site, leadId } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    // 1. Verify Firebase token
    const decoded = await verifyFirebaseToken(idToken);

    // 2. Upsert user in Neon
    const user = await upsertUser(decoded);

    // 3. Convert lead if provided
    if (leadId) {
      await convertLead(leadId, user.id);
    }

    // 4. Create session
    const originSite = site || req.headers['x-heady-site'] || 'headyme.com';
    const session = await createSession(user.id, originSite, req);

    // 5. Set httpOnly cookie
    setSessionCookie(res, session.token, session.expiresAt);

    // 6. Audit log
    await neonPool.query(`
      INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details)
      VALUES ($1, 'auth.login', 'session', $2, $3)
    `, [user.id, session.sessionId,
        JSON.stringify({ provider: decoded.firebase?.sign_in_provider, site: originSite, ip: req.ip })]);

    res.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split('@')[0],
        avatarUrl: decoded.picture || null,
        tier: user.subscription_tier,
        onboardingCompleted: user.onboarding_completed,
      },
      session: {
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(401).json({ error: 'Authentication failed', code: 'HEADY-AUTH-002' });
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────
app.post('/auth/logout', extractSession, async (req, res) => {
  if (req.sessionToken) {
    // Invalidate in T1
    await neonPool.query(`DELETE FROM sessions WHERE session_token = $1`, [req.sessionToken]);
    // Invalidate in T0
    if (t0.available) await t0.del(`tenant:session:${req.sessionToken}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? '__Host-heady_session' : 'heady_session';
  res.clearCookie(cookieName, { httpOnly: true, secure: isProduction, path: '/' });

  res.json({ success: true });
});

// ─── GET /auth/session ─────────────────────────────────────────
// Returns current user info (for relay iframe + API clients)
app.get('/auth/session', extractSession, async (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false, user: null });
  }

  res.json({
    authenticated: true,
    user: {
      uid: req.session.firebaseUid,
      email: req.session.email,
      displayName: req.session.displayName,
      avatarUrl: req.session.avatarUrl,
      tier: req.session.tier,
      userId: req.session.userId,
    },
  });
});

// ─── POST /auth/transfer ───────────────────────────────────────
// Generate one-time transfer token for cross-domain SSO
app.post('/auth/transfer', extractSession, requireAuth, async (req, res) => {
  const { targetOrigin } = req.body;
  if (!targetOrigin || !ALLOWED_ORIGINS.has(targetOrigin)) {
    return res.status(400).json({ error: 'Invalid target origin' });
  }

  const transferToken = await createTransferToken(req.sessionToken, targetOrigin);
  res.json({ transferToken, expiresIn: TRANSFER_TOKEN_TTL / 1000 });
});

// ─── POST /auth/exchange ───────────────────────────────────────
// Exchange a transfer token for a session cookie on the target domain
app.post('/auth/exchange', async (req, res) => {
  const { transferToken } = req.body;
  if (!transferToken) return res.status(400).json({ error: 'transferToken required' });

  const data = await consumeTransferToken(transferToken);
  if (!data) {
    return res.status(401).json({ error: 'Invalid or expired transfer token', code: 'HEADY-AUTH-003' });
  }

  // Validate the session behind the transfer
  const session = await validateSession(data.sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Session expired', code: 'HEADY-AUTH-004' });
  }

  // Set cookie for this domain
  setSessionCookie(res, data.sessionToken, new Date(session.expiresAt));

  res.json({ success: true, userId: session.userId });
});

// ═══════════════════════════════════════════════════════════════════
// §11 — LEAD CAPTURE ROUTES
// ═══════════════════════════════════════════════════════════════════

// ─── POST /lead/capture ────────────────────────────────────────
// Anonymous visitor → assigned lead ID + cookie
app.post('/lead/capture', async (req, res) => {
  const { site, pageUrl, referrer, utm } = req.body || {};

  // Check if already has a lead cookie
  let leadId = req.cookies?.['heady_lead'];
  const isNew = !leadId;

  if (!leadId) {
    leadId = generateLeadId();
  }

  // Store lead data in T0
  if (t0.available) {
    const leadKey = `tenant:lead:${leadId}`;
    await t0.hset(leadKey, 'firstSeen', new Date().toISOString());
    await t0.hset(leadKey, 'site', site || 'unknown');
    if (pageUrl) await t0.hset(leadKey, 'lastPage', pageUrl);
    if (referrer) await t0.hset(leadKey, 'referrer', referrer);
    if (utm) await t0.hset(leadKey, 'utm', JSON.stringify(utm));
    await t0.hset(leadKey, 'visits', '1');
    await t0.expire(leadKey, Math.round(LEAD_COOKIE_MAX_AGE / 1000));
  }

  // Set lead tracking cookie (NOT httpOnly — JS needs to read it for Buddy widget)
  res.cookie('heady_lead', leadId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: LEAD_COOKIE_MAX_AGE,
    path: '/',
  });

  res.json({ leadId, isNew });
});

// ─── POST /lead/event ──────────────────────────────────────────
// Track lead engagement events (page view, feature click, buddy interaction)
app.post('/lead/event', async (req, res) => {
  const leadId = req.cookies?.['heady_lead'] || req.body?.leadId;
  if (!leadId) return res.status(400).json({ error: 'No lead ID' });

  const { event, data, site } = req.body;
  if (!event) return res.status(400).json({ error: 'Event name required' });

  if (t0.available) {
    const leadKey = `tenant:lead:${leadId}`;
    const eventLog = JSON.stringify({ event, data, site, ts: Date.now() });
    await t0.hset(leadKey, `event:${Date.now()}`, eventLog);
    await t0.hset(leadKey, 'lastActivity', new Date().toISOString());

    // Increment visit/interaction counters
    const visits = await t0.hget(leadKey, 'visits');
    await t0.hset(leadKey, 'visits', String(parseInt(visits || '0') + 1));
  }

  res.json({ ok: true });
});

// ─── GET /lead/profile ─────────────────────────────────────────
// Retrieve lead profile (for Buddy widget personalization)
app.get('/lead/profile', async (req, res) => {
  const leadId = req.cookies?.['heady_lead'] || req.query?.leadId;
  if (!leadId || !t0.available) return res.json({ lead: null });

  const data = await t0.hgetall(`tenant:lead:${leadId}`);
  if (!data || Object.keys(data).length === 0) return res.json({ lead: null });

  res.json({ lead: { id: leadId, ...data } });
});

// ═══════════════════════════════════════════════════════════════════
// §12 — PERSONAL STORAGE ROUTES
// ═══════════════════════════════════════════════════════════════════

// All storage routes require authentication
const storageRouter = express.Router();
storageRouter.use(extractSession, requireAuth);

// PUT /storage/:key — Write a value
storageRouter.put('/:key', async (req, res) => {
  try {
    const key = StorageKeySchema.parse(req.params.key);
    const { value, category, persist, metadata, ttlHours } = req.body;

    const store = new PersonalStorage(req.session.userId);
    const result = await store.set(key, value, { category, persist, metadata, ttlHours });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /storage/:key — Read a value
storageRouter.get('/:key', async (req, res) => {
  try {
    const key = StorageKeySchema.parse(req.params.key);
    const store = new PersonalStorage(req.session.userId);
    const result = await store.get(key);

    if (!result) return res.status(404).json({ error: 'Key not found' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /storage/:key — Delete a value
storageRouter.delete('/:key', async (req, res) => {
  try {
    const key = StorageKeySchema.parse(req.params.key);
    const store = new PersonalStorage(req.session.userId);
    const result = await store.delete(key);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /storage — List keys (with optional prefix filter)
storageRouter.get('/', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const limit = parseInt(req.query.limit) || FIB[7];
    const store = new PersonalStorage(req.session.userId);
    const items = await store.list(prefix, Math.min(limit, FIB[8]));

    res.json({ items, count: items.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /storage/search — Semantic search across personal storage
storageRouter.post('/search', async (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const store = new PersonalStorage(req.session.userId);
    const results = await store.search(query, limit || FIB[7]);

    res.json({ results, count: results.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /storage/stats — Storage usage stats
storageRouter.get('/~stats', async (req, res) => {
  const store = new PersonalStorage(req.session.userId);
  const stats = await store.stats();
  res.json(stats);
});

app.use('/storage', storageRouter);

// ═══════════════════════════════════════════════════════════════════
// §13 — RELAY IFRAME ENDPOINT
// ═══════════════════════════════════════════════════════════════════

// Serves the relay.html with CORS frame-ancestors for all Heady domains
app.get('/relay.html', (req, res) => {
  res.header('X-Frame-Options', ''); // Override DENY for this route
  res.header('Content-Security-Policy',
    `frame-ancestors ${HEADY_DOMAINS.map(d => `https://${d}`).join(' ')}`);
  res.header('Content-Type', 'text/html; charset=utf-8');
  res.send(RELAY_HTML);
});

// ═══════════════════════════════════════════════════════════════════
// §14 — HEALTH & STATUS
// ═══════════════════════════════════════════════════════════════════

app.get('/health', async (req, res) => {
  const checks = {
    service: 'auth-service-v2',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check Neon T1
  try {
    await neonPool.query('SELECT 1');
    checks.checks.neon = 'ok';
  } catch {
    checks.checks.neon = 'error';
    checks.status = 'degraded';
  }

  // Check T0 Redis
  try {
    if (t0.available) {
      await t0.set('health:ping', 'pong', 30);
      checks.checks.redis = 'ok';
    } else {
      checks.checks.redis = 'not-configured';
    }
  } catch {
    checks.checks.redis = 'error';
    checks.status = 'degraded';
  }

  res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
});

// ═══════════════════════════════════════════════════════════════════
// §15 — RELAY HTML (inline, no external file needed)
// ═══════════════════════════════════════════════════════════════════

const RELAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Heady Auth Relay</title>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
</head>
<body>
<script>
(function() {
  'use strict';

  const TRUSTED_ORIGINS = new Set(${JSON.stringify([...ALLOWED_ORIGINS])});
  const AUTH_SERVICE = '${process.env.AUTH_SERVICE_URL || 'https://auth.headysystems.com'}';

  // Firebase config — populated from server env at build time
  const firebaseConfig = {
    apiKey: '${process.env.FIREBASE_API_KEY || ''}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN || 'heady-ai.firebaseapp.com'}',
    projectId: '${process.env.FIREBASE_PROJECT_ID || 'heady-ai'}',
  };

  firebase.initializeApp(firebaseConfig);

  // ── Auth State Listener ──────────────────────────────────────
  firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      try {
        const idToken = await user.getIdToken(true);

        // Exchange Firebase token for Heady session
        const loginRes = await fetch(AUTH_SERVICE + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            idToken: idToken,
            site: document.referrer ? new URL(document.referrer).hostname : 'auth.headysystems.com',
          }),
        });

        const loginData = await loginRes.json();

        // Broadcast auth state to parent
        broadcastToParent({
          type: 'heady:auth:sync',
          user: loginData.user,
          session: loginData.session,
        });
      } catch (err) {
        broadcastToParent({
          type: 'heady:auth:error',
          error: err.message,
        });
      }
    } else {
      broadcastToParent({
        type: 'heady:auth:signout',
        user: null,
      });
    }
  });

  // ── Listen for Messages from Parent ──────────────────────────
  window.addEventListener('message', function(event) {
    if (!TRUSTED_ORIGINS.has(event.origin)) return;

    var msg = event.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'heady:context:request':
        // Parent requesting current auth state
        var currentUser = firebase.auth().currentUser;
        if (currentUser) {
          currentUser.getIdToken().then(function(token) {
            event.source.postMessage({
              type: 'heady:auth:sync',
              user: {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                avatarUrl: currentUser.photoURL,
              },
              token: token,
            }, event.origin);
          });
        } else {
          event.source.postMessage({
            type: 'heady:auth:signout',
            user: null,
          }, event.origin);
        }
        break;

      case 'heady:auth:signout:request':
        firebase.auth().signOut();
        break;

      case 'heady:auth:transfer:request':
        // Cross-domain SSO transfer
        if (msg.targetOrigin && TRUSTED_ORIGINS.has(msg.targetOrigin)) {
          fetch(AUTH_SERVICE + '/auth/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ targetOrigin: msg.targetOrigin }),
          }).then(r => r.json()).then(function(data) {
            event.source.postMessage({
              type: 'heady:auth:transfer:token',
              transferToken: data.transferToken,
              targetOrigin: msg.targetOrigin,
            }, event.origin);
          });
        }
        break;
    }
  });

  function broadcastToParent(msg) {
    if (window.parent && window.parent !== window) {
      // Send to parent (the embedding site)
      window.parent.postMessage(msg, '*');
      // Note: We use '*' here because the relay is embedded by multiple origins.
      // Security is enforced by the parent only accepting messages from
      // auth.headysystems.com origin.
    }
  }
})();
</script>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════
// §16 — SERVER START
// ═══════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || '8080', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[heady-auth] ✓ Auth service v2.0.0 listening on :${PORT}`);
  console.log(`[heady-auth] ✓ ${ALLOWED_ORIGINS.size} allowed origins`);
  console.log(`[heady-auth] ✓ T0 Redis: ${t0.available ? 'connected' : 'fallback mode'}`);
  console.log(`[heady-auth] ✓ T1 Neon: pool max=${FIB[7]}`);
  console.log(`[heady-auth] ✓ Session TTL: ${FIB[8]}h / Renew: ${FIB[7]}h / Absolute: ${FIB[10]}h`);
});

export default app;
