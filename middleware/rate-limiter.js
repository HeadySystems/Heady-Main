/**
 * RateLimiter — φ-Scaled Sliding Window Rate Limiter
 * Enforces per-user, per-IP, per-API-key limits with Fibonacci-based tiers:
 *   Anonymous: 34 req/min, Authenticated: 89 req/min, Enterprise: 233 req/min
 * All constants φ-derived. CSL gates replace boolean. ESM only.
 * Author: Eric Haywood
 */
import { createHash } from 'crypto';

const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function cslGate(value, score, tau = CSL_THRESHOLDS.MEDIUM, temp = Math.pow(PSI, 3)) {
  return value * (1 / (1 + Math.exp(-(score - tau) / temp)));
}

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── Rate Limit Tiers (Fibonacci-based) ───────────────────────────
const RATE_TIERS = {
  anonymous:     { requestsPerMinute: FIB[9],  burstMultiplier: PHI, windowMs: 60000 },  // 34/min
  authenticated: { requestsPerMinute: FIB[11], burstMultiplier: PHI, windowMs: 60000 },  // 89/min
  enterprise:    { requestsPerMinute: FIB[13], burstMultiplier: PHI, windowMs: 60000 },  // 233/min
  internal:      { requestsPerMinute: FIB[16], burstMultiplier: PHI * PHI, windowMs: 60000 }, // 987/min
};

// ── Sliding Window Counter ───────────────────────────────────────
class SlidingWindow {
  constructor(windowMs, maxBuckets = FIB[10]) {
    this.windowMs = windowMs;
    this.bucketDurationMs = windowMs / maxBuckets;
    this.maxBuckets = maxBuckets;
    this.buckets = new Map();
  }

  record() {
    const now = Date.now();
    const bucketKey = Math.floor(now / this.bucketDurationMs);
    this.buckets.set(bucketKey, (this.buckets.get(bucketKey) ?? 0) + 1);
    this._prune(now);
  }

  count() {
    const now = Date.now();
    this._prune(now);
    let total = 0;
    const oldestBucket = Math.floor((now - this.windowMs) / this.bucketDurationMs);
    for (const [key, count] of this.buckets) {
      if (key >= oldestBucket) total += count;
    }
    return total;
  }

  _prune(now) {
    const oldestBucket = Math.floor((now - this.windowMs) / this.bucketDurationMs) - 1;
    for (const key of this.buckets.keys()) {
      if (key < oldestBucket) this.buckets.delete(key);
    }
  }
}

// ── Rate Limiter ─────────────────────────────────────────────────
class RateLimiter {
  constructor(config = {}) {
    this.windows = new Map();
    this.maxClients = config.maxClients ?? FIB[16] * FIB[5]; // 987 * 5 = 4935
    this.defaultTier = config.defaultTier ?? 'anonymous';
    this.blockedKeys = new Set();
    this.blockDurationMs = config.blockDurationMs ?? FIB[10] * 1000; // 55s
    this.violations = [];
    this.maxViolations = FIB[16];
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];
  }

  _audit(action, detail) {
    const entry = { ts: Date.now(), action, detail, hash: hashSHA256({ action, detail, ts: Date.now() }) };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]);
    }
  }

  _getWindow(key, tier) {
    if (!this.windows.has(key)) {
      const tierConfig = RATE_TIERS[tier] ?? RATE_TIERS[this.defaultTier];
      this.windows.set(key, { window: new SlidingWindow(tierConfig.windowMs), tier, createdAt: Date.now() });
      // Prune if too many clients tracked
      if (this.windows.size > this.maxClients) {
        const oldest = [...this.windows.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
        if (oldest) this.windows.delete(oldest[0]);
      }
    }
    return this.windows.get(key);
  }

  _resolveKey(req) {
    const ctx = req.headyContext;
    if (ctx?.user?.userId) return { key: `user:${ctx.user.userId}`, tier: ctx.user.tier ?? 'authenticated' };
    const apiKey = req.headers['x-api-key'] ?? req.headers['authorization'];
    if (apiKey) return { key: `apikey:${hashSHA256(apiKey).slice(0, FIB[8])}`, tier: 'enterprise' };
    const ip = ctx?.request?.ip ?? req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
    return { key: `ip:${ip}`, tier: 'anonymous' };
  }

  check(key, tier) {
    if (this.blockedKeys.has(key)) {
      return { allowed: false, reason: 'blocked', remaining: 0, resetMs: this.blockDurationMs };
    }

    const tierConfig = RATE_TIERS[tier] ?? RATE_TIERS[this.defaultTier];
    const { window } = this._getWindow(key, tier);
    const currentCount = window.count();
    const limit = tierConfig.requestsPerMinute;
    const burstLimit = Math.ceil(limit * tierConfig.burstMultiplier);

    if (currentCount >= burstLimit) {
      this._recordViolation(key, tier, 'burst-exceeded');
      return { allowed: false, reason: 'burst-limit', remaining: 0, limit: burstLimit, resetMs: tierConfig.windowMs };
    }

    if (currentCount >= limit) {
      const severity = cslGate(1.0, currentCount / burstLimit, CSL_THRESHOLDS.HIGH);
      if (severity > CSL_THRESHOLDS.CRITICAL) {
        this._recordViolation(key, tier, 'rate-exceeded');
        return { allowed: false, reason: 'rate-limit', remaining: 0, limit, resetMs: tierConfig.windowMs };
      }
    }

    window.record();
    return {
      allowed: true,
      remaining: Math.max(0, limit - currentCount - 1),
      limit,
      resetMs: tierConfig.windowMs,
    };
  }

  _recordViolation(key, tier, type) {
    this.violations.push({ key, tier, type, ts: Date.now() });
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-FIB[14]);
    }

    // Auto-block after repeated violations
    const recentViolations = this.violations.filter(v => v.key === key && Date.now() - v.ts < FIB[10] * 60 * 1000).length;
    if (recentViolations >= FIB[6]) {
      this.blockedKeys.add(key);
      setTimeout(() => this.blockedKeys.delete(key), this.blockDurationMs);
      this._audit('auto-block', { key, violations: recentViolations });
    }
  }

  middleware() {
    const self = this;
    return (req, res, next) => {
      const { key, tier } = self._resolveKey(req);
      const result = self.check(key, tier);

      res.setHeader('X-RateLimit-Limit', result.limit ?? 0);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + (result.resetMs ?? 60000) / 1000));

      if (!result.allowed) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': Math.ceil((result.resetMs ?? 60000) / 1000) });
        res.end(JSON.stringify({ error: 'Rate limit exceeded', code: 'HEADY-RATE-001', reason: result.reason, retryAfterMs: result.resetMs }));
        return;
      }

      next?.();
    };
  }

  health() {
    return {
      trackedClients: this.windows.size,
      blockedKeys: this.blockedKeys.size,
      violationCount: this.violations.length,
      tiers: Object.entries(RATE_TIERS).map(([k, v]) => ({ tier: k, limit: v.requestsPerMinute })),
    };
  }
}

export default RateLimiter;
export { RateLimiter, SlidingWindow, RATE_TIERS };
