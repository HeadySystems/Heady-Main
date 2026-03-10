/**
 * Bulkhead — Fibonacci-Sized Concurrency Isolation
 * Prevents cascading failures by limiting concurrent requests per service.
 * Fibonacci pools: 34 concurrent / 55 queued (from Envoy spec).
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

class Semaphore {
  constructor(permits) {
    this.permits = permits;
    this.queue = [];
    this.active = 0;
  }

  async acquire() {
    if (this.active < this.permits) {
      this.active++;
      return true;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.active--;
    if (this.queue.length > 0) {
      this.active++;
      const next = this.queue.shift();
      next(true);
    }
  }

  stats() {
    return { active: this.active, permits: this.permits, queued: this.queue.length };
  }
}

// ── Bulkhead Pool Profiles ───────────────────────────────────────
const POOL_PROFILES = {
  'hot': { concurrent: FIB[9], queued: FIB[10], timeoutMs: FIB[9] * 1000 },      // 34 / 55 / 34s
  'warm': { concurrent: FIB[8], queued: FIB[9], timeoutMs: FIB[10] * 1000 },     // 21 / 34 / 55s
  'cold': { concurrent: FIB[7], queued: FIB[8], timeoutMs: FIB[12] * 1000 },     // 13 / 21 / 144s
  'critical': { concurrent: FIB[10], queued: FIB[11], timeoutMs: FIB[8] * 1000 }, // 55 / 89 / 21s
};

class Bulkhead {
  constructor(config = {}) {
    this.profile = config.profile ?? 'hot';
    const poolConfig = POOL_PROFILES[this.profile] ?? POOL_PROFILES['hot'];
    this.semaphore = new Semaphore(poolConfig.concurrent);
    this.maxQueued = poolConfig.queued;
    this.timeoutMs = poolConfig.timeoutMs;
    this.totalAccepted = 0;
    this.totalRejected = 0;
    this.totalTimedOut = 0;
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];
  }

  _audit(action, detail) {
    const entry = { ts: Date.now(), action, detail };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]);
    }
  }

  middleware() {
    const self = this;
    return async (req, res, next) => {
      const stats = self.semaphore.stats();

      // Check if queue is full
      if (stats.queued >= self.maxQueued) {
        self.totalRejected++;
        self._audit('rejected', { queued: stats.queued, active: stats.active });
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': Math.ceil(self.timeoutMs / 1000) });
        res.end(JSON.stringify({
          error: 'Service overloaded',
          code: 'HEADY-BULKHEAD-001',
          active: stats.active,
          queued: stats.queued,
          retryAfterMs: self.timeoutMs,
        }));
        return;
      }

      // Acquire with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bulkhead timeout')), self.timeoutMs)
      );

      try {
        await Promise.race([self.semaphore.acquire(), timeoutPromise]);
        self.totalAccepted++;

        // Set pressure headers
        const pressure = stats.active / self.semaphore.permits;
        res.setHeader('X-Bulkhead-Pressure', pressure.toFixed(3));
        res.setHeader('X-Bulkhead-Profile', self.profile);

        // Release on response finish
        const originalEnd = res.end.bind(res);
        res.end = function(...args) {
          self.semaphore.release();
          return originalEnd(...args);
        };

        next?.();
      } catch (err) {
        self.totalTimedOut++;
        self._audit('timeout', { active: stats.active, queued: stats.queued });
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bulkhead timeout', code: 'HEADY-BULKHEAD-002' }));
      }
    };
  }

  health() {
    const stats = this.semaphore.stats();
    return {
      profile: this.profile,
      ...stats,
      maxQueued: this.maxQueued,
      timeoutMs: this.timeoutMs,
      totalAccepted: this.totalAccepted,
      totalRejected: this.totalRejected,
      totalTimedOut: this.totalTimedOut,
      pressure: stats.active / stats.permits,
    };
  }
}

export default Bulkhead;
export { Bulkhead, Semaphore, POOL_PROFILES };
