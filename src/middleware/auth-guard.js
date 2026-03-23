// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/middleware/auth-guard.js
// LAYER: middleware/security
// Auth Guard Middleware — JWT + API Key validation
// HEADY_BRAND:END

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Structured logger (graceful fallback)
let log;
try {
  const { createLogger } = require('../../packages/structured-logger');
  log = createLogger('auth-guard', 'security');
} catch {
  log = { warn: console.warn, info: console.info, error: console.error };
}

// Timing-safe comparison (Coding Standard: Security Mandate)
function safeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do comparison to prevent timing attacks on length
    const padded = Buffer.alloc(bufA.length);
    bufB.copy(padded);
    crypto.timingSafeEqual(bufA, padded);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// API Key tier lookup from prefix
const TIER_LIMITS = {
  'hdy_int_': { rpm: Infinity, tier: 'internal', scopes: ['read', 'write', 'admin', 'deploy'] },
  'hdy_plt_': { rpm: 10000,    tier: 'pilot',    scopes: ['read', 'write', 'deploy'] },
  'hdy_pub_': { rpm: 1000,     tier: 'public',   scopes: ['read', 'write'] },
  'hdy_trl_': { rpm: 100,      tier: 'trial',    scopes: ['read'] },
  'hdy_fre_': { rpm: 34,       tier: 'free',     scopes: ['read'] },           // FIB[8]
  'hdy_pro_': { rpm: 5000,     tier: 'pro',      scopes: ['read', 'write', 'deploy'] },
  'hdy_ent_': { rpm: 50000,    tier: 'enterprise', scopes: ['read', 'write', 'admin', 'deploy'] },
};

// Rate limit tracking (in-memory, swap for Redis in production)
const rateLimitStore = new Map();

function checkRateLimit(keyPrefix, rpm) {
  if (rpm === Infinity) return true;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const key = `rl:${keyPrefix}`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  const entry = rateLimitStore.get(key);
  if (now - entry.windowStart > windowMs) {
    entry.count = 1;
    entry.windowStart = now;
    return true;
  }

  entry.count++;
  return entry.count <= rpm;
}

/**
 * Auth Guard Middleware
 * @param {Object} opts
 * @param {boolean} opts.optional - Allow unauthenticated requests
 * @param {boolean} opts.allowAdmin - Allow admin token auth
 * @param {string[]} opts.requiredScopes - Required scopes (e.g. ['write', 'deploy'])
 */
function authGuard(opts = {}) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-heady-api-key'];
    const authHeader = req.headers.authorization;

    // ── Path 1: API Key Authentication ──────────────────
    if (apiKey) {
      const prefix = apiKey.substring(0, 8);
      const tierInfo = TIER_LIMITS[prefix];

      if (!tierInfo) {
        log.warn('Invalid API key prefix', { node: 'SENTINEL', prefix, ip: req.ip });
        return res.status(401).json({
          error: 'Invalid API key',
          hint: 'API keys must start with hdy_int_, hdy_plt_, hdy_pub_, or hdy_trl_'
        });
      }

      // Rate limit check
      if (!checkRateLimit(prefix, tierInfo.rpm)) {
        log.warn('Rate limit exceeded', { node: 'SENTINEL', tier: tierInfo.tier, prefix });
        return res.status(429).json({
          error: 'Rate limit exceeded',
          tier: tierInfo.tier,
          rpm: tierInfo.rpm,
          retryAfter: 60
        });
      }

      // Scope check
      if (opts.requiredScopes) {
        const hasScope = opts.requiredScopes.every(s => tierInfo.scopes.includes(s));
        if (!hasScope) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: opts.requiredScopes,
            available: tierInfo.scopes,
            tier: tierInfo.tier
          });
        }
      }

      req.authTier = tierInfo.tier;
      req.rpmLimit = tierInfo.rpm;
      req.authMethod = 'api-key';
      req.authScopes = tierInfo.scopes;
      return next();
    }

    // ── Path 2: JWT Bearer Token ────────────────────────
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const secret = process.env.JWT_SECRET || process.env.HEADY_JWT_SECRET;

        if (!secret) {
          log.error('JWT_SECRET not configured', { node: 'SENTINEL' });
          return res.status(500).json({ error: 'Auth not configured' });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        req.authTier = decoded.tier || 'free';
        req.authMethod = 'jwt';
        req.authScopes = decoded.scopes || ['read'];
        return next();
      } catch (err) {
        log.warn('JWT verification failed', { node: 'SENTINEL', error: err.message });
        return res.status(401).json({
          error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
        });
      }
    }

    // ── Path 3: Admin Token ─────────────────────────────
    if (opts.allowAdmin && req.headers['x-admin-token']) {
      const adminToken = process.env.ADMIN_TOKEN;
      if (adminToken && safeCompare(req.headers['x-admin-token'], adminToken)) {
        req.authTier = 'internal';
        req.authMethod = 'admin-token';
        req.authScopes = ['read', 'write', 'admin', 'deploy'];
        return next();
      }
      return res.status(401).json({ error: 'Invalid admin token' });
    }

    // ── Optional Auth ───────────────────────────────────
    if (opts.optional) {
      req.authTier = 'anonymous';
      req.authMethod = 'none';
      req.authScopes = [];
      return next();
    }

    return res.status(401).json({
      error: 'Authentication required',
      methods: ['Bearer JWT', 'x-heady-api-key header']
    });
  };
}

/**
 * Scope-checking middleware (use after authGuard)
 */
function requireScope(...scopes) {
  return (req, res, next) => {
    if (!req.authScopes || !scopes.every(s => req.authScopes.includes(s))) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: scopes,
        available: req.authScopes || []
      });
    }
    next();
  };
}

module.exports = { authGuard, requireScope, safeCompare, TIER_LIMITS };
