// ═══════════════════════════════════════════════════════════════════
// HEADY VAULT SERVICE — Cloud Run Encrypted Secret Store
// ∞ Sacred Geometry :: Vault :: AES-256-GCM ∞
//
// HeadySystems Inc. — Eric Haywood, Founder
// Deploy: auth.headysystems.com or vault.headysystems.com
//
// Encrypted key-value secret store with:
//   - AES-256-GCM encryption at rest
//   - Neon Postgres persistence (T1)
//   - API key + session cookie auth
//   - Audit logging
//   - Namespace isolation per user
//   - Secret rotation & versioning
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import cookieParser from 'cookie-parser';
import pg from 'pg';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════
// §1 — φ CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
const ALGO = 'aes-256-gcm';
const VAULT_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════
// §2 — ENCRYPTION KEY
// ═══════════════════════════════════════════════════════════════════

function getVaultKey() {
  const envKey = process.env.HEADY_VAULT_KEY;
  if (envKey && envKey.length >= 32) return Buffer.from(envKey.slice(0, 32), 'utf8');
  // Derive from stable env-based identifier (prod should always set HEADY_VAULT_KEY)
  const seed = `heady-vault-${process.env.NODE_ENV || 'dev'}-sacred-geometry`;
  return crypto.createHash('sha256').update(seed).digest();
}

const VAULT_KEY = getVaultKey();

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, VAULT_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), encrypted, tag };
}

function decrypt(data) {
  const decipher = crypto.createDecipheriv(ALGO, VAULT_KEY, Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ═══════════════════════════════════════════════════════════════════
// §3 — DATABASE (Neon Postgres T1)
// ═══════════════════════════════════════════════════════════════════

const neonPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: FIB[7], // 13 connections
  idleTimeoutMillis: FIB[8] * 60_000, // 21 minutes
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Auto-create vault tables on startup
async function initDatabase() {
  try {
    await neonPool.query(`
      CREATE TABLE IF NOT EXISTS vault_secrets (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        namespace       TEXT NOT NULL DEFAULT 'global',
        key             TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        iv              TEXT NOT NULL,
        auth_tag        TEXT NOT NULL,
        version         INTEGER DEFAULT 1,
        metadata        JSONB DEFAULT '{}',
        created_by      TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        expires_at      TIMESTAMPTZ,
        revoked         BOOLEAN DEFAULT FALSE,
        UNIQUE(namespace, key, version)
      );

      CREATE INDEX IF NOT EXISTS idx_vault_ns_key ON vault_secrets(namespace, key) WHERE NOT revoked;
      CREATE INDEX IF NOT EXISTS idx_vault_expires ON vault_secrets(expires_at) WHERE expires_at IS NOT NULL AND NOT revoked;

      CREATE TABLE IF NOT EXISTS vault_audit_log (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        namespace   TEXT NOT NULL,
        action      TEXT NOT NULL,
        key         TEXT,
        actor       TEXT,
        ip_address  TEXT,
        details     JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_vault_audit_ns ON vault_audit_log(namespace, created_at);
    `);
    console.log('[heady-vault] ✓ Database tables initialized');
  } catch (err) {
    console.error('[heady-vault] ✗ Database init failed:', err.message);
    console.log('[heady-vault] → Running in memory-only fallback mode');
  }
}

// In-memory fallback if DB unavailable
const memoryVault = new Map();
let dbAvailable = false;

async function checkDb() {
  try {
    await neonPool.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// §4 — VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const SecretKeySchema = z.string().min(1).max(256).regex(/^[a-zA-Z0-9_.\-:\/]+$/);
const NamespaceSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.\-]+$/).default('global');

// ═══════════════════════════════════════════════════════════════════
// §5 — ALLOWED ORIGINS
// ═══════════════════════════════════════════════════════════════════

const HEADY_DOMAINS = [
  'headysystems.com', 'headyme.com', 'headymcp.com',
  'headyconnection.org', 'headyio.com', 'headyfinance.com',
  'headybuddy.com', 'headybot.com', 'headyapi.com',
  'headylens.com', 'headyai.com',
];

const ALLOWED_ORIGINS = new Set([
  ...HEADY_DOMAINS.map(d => `https://${d}`),
  ...HEADY_DOMAINS.map(d => `https://www.${d}`),
  'https://auth.headysystems.com',
  'https://vault.headysystems.com',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3300', 'http://localhost:8090', 'http://127.0.0.1:3300'] : []),
]);

// ═══════════════════════════════════════════════════════════════════
// §6 — EXPRESS APP
// ═══════════════════════════════════════════════════════════════════

const app = express();

// Static frontend
app.use(express.static(join(__dirname, 'public'), { maxAge: '1h', etag: true }));

// Middleware
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.set('trust proxy', true);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Heady-Api-Key, X-Vault-Namespace');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Heady-Service', 'vault-v1');
  next();
});

// ═══════════════════════════════════════════════════════════════════
// §7 — AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

const API_KEY = process.env.HEADY_API_KEY || process.env.HEADY_VAULT_API_KEY;

function requireAuth(req, res, next) {
  // Check API key header
  const apiKey = req.headers['x-heady-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (API_KEY && apiKey) {
    const keyBuf = Buffer.from(String(apiKey));
    const expectedBuf = Buffer.from(String(API_KEY));
    if (keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf)) {
      req.actor = 'api-key';
      return next();
    }
  }

  // Check session cookie (from HeadyAuth)
  const sessionToken = req.cookies?.['__Host-heady_session'] || req.cookies?.['heady_session'];
  if (sessionToken) {
    req.actor = `session:${sessionToken.slice(0, 8)}…`;
    return next();
  }

  // Dev mode: allow unauthenticated access
  if (process.env.NODE_ENV !== 'production') {
    req.actor = 'dev-access';
    return next();
  }

  res.status(401).json({ error: 'Authentication required', code: 'VAULT-AUTH-001' });
}

function getNamespace(req) {
  return req.headers['x-vault-namespace'] || req.query?.namespace || 'global';
}

// ═══════════════════════════════════════════════════════════════════
// §8 — AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════

async function auditLog(namespace, action, key, req, details = {}) {
  try {
    if (dbAvailable) {
      await neonPool.query(
        `INSERT INTO vault_audit_log (namespace, action, key, actor, ip_address, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [namespace, action, key, req.actor || 'unknown', req.ip, JSON.stringify(details)]
      );
    }
  } catch { /* audit is non-blocking */ }
}

// ═══════════════════════════════════════════════════════════════════
// §9 — VAULT ROUTES
// ═══════════════════════════════════════════════════════════════════

// ─── GET /vault/status ─────────────────────────────────────────
app.get('/vault/status', (req, res) => {
  res.json({
    ok: true,
    service: 'heady-vault',
    version: VAULT_VERSION,
    encryption: ALGO,
    storage: dbAvailable ? 'neon-postgres' : 'memory-fallback',
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /vault/store ─────────────────────────────────────────
// Store a secret (encrypted at rest)
app.post('/vault/store', requireAuth, async (req, res) => {
  try {
    const { id, value, metadata, ttlHours } = req.body;
    if (!id || value === undefined) {
      return res.status(400).json({ error: 'id and value required' });
    }

    const key = SecretKeySchema.parse(id);
    const ns = getNamespace(req);
    const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
    const { iv, encrypted, tag } = encrypt(plaintext);
    const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 3600_000) : null;

    if (dbAvailable) {
      // Get current max version
      const { rows: existing } = await neonPool.query(
        `SELECT COALESCE(MAX(version), 0) AS max_ver FROM vault_secrets WHERE namespace = $1 AND key = $2 AND NOT revoked`,
        [ns, key]
      );
      const nextVersion = (existing[0]?.max_ver || 0) + 1;

      await neonPool.query(
        `INSERT INTO vault_secrets (namespace, key, encrypted_value, iv, auth_tag, version, metadata, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [ns, key, encrypted, iv, tag, nextVersion, JSON.stringify(metadata || {}), req.actor, expiresAt]
      );

      await auditLog(ns, 'store', key, req, { version: nextVersion });
      res.json({ ok: true, id: key, namespace: ns, version: nextVersion, stored: true, encrypted: true, ts: new Date().toISOString() });
    } else {
      // Memory fallback
      const memKey = `${ns}:${key}`;
      const existing = memoryVault.get(memKey);
      const version = (existing?.version || 0) + 1;
      memoryVault.set(memKey, { iv, encrypted, tag, version, metadata, expiresAt, storedAt: new Date().toISOString() });
      res.json({ ok: true, id: key, namespace: ns, version, stored: true, encrypted: true, storage: 'memory', ts: new Date().toISOString() });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /vault/retrieve/:id ───────────────────────────────────
// Retrieve and decrypt a secret
app.get('/vault/retrieve/:id', requireAuth, async (req, res) => {
  try {
    const key = SecretKeySchema.parse(req.params.id);
    const ns = getNamespace(req);
    const version = req.query.version ? parseInt(req.query.version) : null;

    let entry;

    if (dbAvailable) {
      const versionClause = version ? 'AND version = $3' : '';
      const params = version ? [ns, key, version] : [ns, key];
      const { rows } = await neonPool.query(
        `SELECT encrypted_value, iv, auth_tag, version, metadata, created_at, expires_at
         FROM vault_secrets
         WHERE namespace = $1 AND key = $2 AND NOT revoked
           ${versionClause}
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY version DESC LIMIT 1`,
        params
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: `Secret '${key}' not found`, code: 'VAULT-404' });
      }

      entry = rows[0];
      const decrypted = decrypt({
        iv: entry.iv,
        encrypted: entry.encrypted_value,
        tag: entry.auth_tag,
      });

      await auditLog(ns, 'retrieve', key, req, { version: entry.version });

      // Try to parse as JSON, fallback to string
      let value;
      try { value = JSON.parse(decrypted); } catch { value = decrypted; }

      res.json({
        ok: true,
        id: key,
        namespace: ns,
        value,
        version: entry.version,
        metadata: entry.metadata,
        createdAt: entry.created_at,
        retrievedAt: new Date().toISOString(),
      });
    } else {
      // Memory fallback
      const memKey = `${ns}:${key}`;
      const stored = memoryVault.get(memKey);
      if (!stored) return res.status(404).json({ error: `Secret '${key}' not found`, code: 'VAULT-404' });

      if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
        memoryVault.delete(memKey);
        return res.status(404).json({ error: `Secret '${key}' expired`, code: 'VAULT-EXPIRED' });
      }

      const decrypted = decrypt(stored);
      let value;
      try { value = JSON.parse(decrypted); } catch { value = decrypted; }

      res.json({ ok: true, id: key, namespace: ns, value, version: stored.version, retrievedAt: new Date().toISOString() });
    }
  } catch (err) {
    if (err.message?.includes('Unsupported state') || err.message?.includes('Unable to authenticate')) {
      return res.status(500).json({ error: 'Decryption failed — vault key may have changed', code: 'VAULT-DECRYPT-FAIL' });
    }
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /vault/keys ───────────────────────────────────────────
// List all secret keys in a namespace
app.get('/vault/keys', requireAuth, async (req, res) => {
  try {
    const ns = getNamespace(req);

    if (dbAvailable) {
      const { rows } = await neonPool.query(
        `SELECT key, MAX(version) AS version, MAX(created_at) AS created_at, MAX(updated_at) AS updated_at
         FROM vault_secrets
         WHERE namespace = $1 AND NOT revoked AND (expires_at IS NULL OR expires_at > NOW())
         GROUP BY key ORDER BY key`,
        [ns]
      );

      await auditLog(ns, 'list', null, req);
      res.json({ ok: true, namespace: ns, keys: rows, count: rows.length, ts: new Date().toISOString() });
    } else {
      const prefix = `${ns}:`;
      const keys = [...memoryVault.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
      res.json({ ok: true, namespace: ns, keys: keys.map(k => ({ key: k })), count: keys.length, storage: 'memory', ts: new Date().toISOString() });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /vault/revoke/:id ──────────────────────────────────
// Revoke (soft-delete) a secret
app.delete('/vault/revoke/:id', requireAuth, async (req, res) => {
  try {
    const key = SecretKeySchema.parse(req.params.id);
    const ns = getNamespace(req);

    if (dbAvailable) {
      const { rowCount } = await neonPool.query(
        `UPDATE vault_secrets SET revoked = TRUE, updated_at = NOW() WHERE namespace = $1 AND key = $2 AND NOT revoked`,
        [ns, key]
      );

      if (rowCount === 0) return res.status(404).json({ error: `Secret '${key}' not found`, code: 'VAULT-404' });

      await auditLog(ns, 'revoke', key, req, { versionsRevoked: rowCount });
      res.json({ ok: true, id: key, namespace: ns, revoked: true, versionsRevoked: rowCount, ts: new Date().toISOString() });
    } else {
      const memKey = `${ns}:${key}`;
      const existed = memoryVault.delete(memKey);
      if (!existed) return res.status(404).json({ error: `Secret '${key}' not found`, code: 'VAULT-404' });
      res.json({ ok: true, id: key, namespace: ns, revoked: true, ts: new Date().toISOString() });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /vault/rotate/:id ───────────────────────────────────
// Rotate a secret (store new version, revoke old)
app.post('/vault/rotate/:id', requireAuth, async (req, res) => {
  try {
    const key = SecretKeySchema.parse(req.params.id);
    const ns = getNamespace(req);
    const { value, metadata } = req.body;

    if (value === undefined) return res.status(400).json({ error: 'value required for rotation' });

    const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
    const { iv, encrypted, tag } = encrypt(plaintext);

    if (dbAvailable) {
      // Get current version
      const { rows: existing } = await neonPool.query(
        `SELECT MAX(version) AS max_ver FROM vault_secrets WHERE namespace = $1 AND key = $2 AND NOT revoked`,
        [ns, key]
      );

      if (!existing[0]?.max_ver) {
        return res.status(404).json({ error: `Secret '${key}' not found — cannot rotate`, code: 'VAULT-404' });
      }

      const nextVersion = existing[0].max_ver + 1;

      // Revoke old versions
      await neonPool.query(
        `UPDATE vault_secrets SET revoked = TRUE, updated_at = NOW() WHERE namespace = $1 AND key = $2 AND NOT revoked`,
        [ns, key]
      );

      // Store new version
      await neonPool.query(
        `INSERT INTO vault_secrets (namespace, key, encrypted_value, iv, auth_tag, version, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ns, key, encrypted, iv, tag, nextVersion, JSON.stringify(metadata || {}), req.actor]
      );

      await auditLog(ns, 'rotate', key, req, { previousVersion: existing[0].max_ver, newVersion: nextVersion });
      res.json({ ok: true, id: key, namespace: ns, rotated: true, previousVersion: existing[0].max_ver, version: nextVersion, ts: new Date().toISOString() });
    } else {
      const memKey = `${ns}:${key}`;
      const old = memoryVault.get(memKey);
      if (!old) return res.status(404).json({ error: `Secret '${key}' not found`, code: 'VAULT-404' });
      const newVersion = (old.version || 1) + 1;
      memoryVault.set(memKey, { iv, encrypted, tag, version: newVersion, metadata, storedAt: new Date().toISOString() });
      res.json({ ok: true, id: key, namespace: ns, rotated: true, version: newVersion, ts: new Date().toISOString() });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /vault/audit ──────────────────────────────────────────
// View audit log for a namespace
app.get('/vault/audit', requireAuth, async (req, res) => {
  try {
    const ns = getNamespace(req);
    const limit = Math.min(parseInt(req.query.limit) || FIB[7], FIB[8]);

    if (dbAvailable) {
      const { rows } = await neonPool.query(
        `SELECT action, key, actor, ip_address, details, created_at FROM vault_audit_log
         WHERE namespace = $1 ORDER BY created_at DESC LIMIT $2`,
        [ns, limit]
      );
      res.json({ ok: true, namespace: ns, audit: rows, count: rows.length });
    } else {
      res.json({ ok: true, namespace: ns, audit: [], count: 0, note: 'Audit unavailable in memory mode' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// §10 — HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', async (req, res) => {
  await checkDb();
  res.json({
    service: 'heady-vault',
    version: VAULT_VERSION,
    status: dbAvailable ? 'healthy' : 'degraded',
    encryption: ALGO,
    storage: dbAvailable ? 'neon' : 'memory',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════
// §11 — SERVER START
// ═══════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || '8080', 10);

async function start() {
  await checkDb();
  if (dbAvailable) await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[heady-vault] ✓ Vault service v${VAULT_VERSION} listening on :${PORT}`);
    console.log(`[heady-vault] ✓ Encryption: ${ALGO}`);
    console.log(`[heady-vault] ✓ Storage: ${dbAvailable ? 'Neon Postgres' : 'In-Memory Fallback'}`);
    console.log(`[heady-vault] ✓ Auth: ${API_KEY ? 'API key configured' : 'Dev mode (open)'}`);
  });
}

start().catch(err => {
  console.error('[heady-vault] Fatal:', err);
  process.exit(1);
});

export default app;
