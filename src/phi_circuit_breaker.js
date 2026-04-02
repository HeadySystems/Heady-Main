// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/phi_circuit_breaker.js
// LAYER: backend/src — resilience
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ PHI-ALIGNED CIRCUIT BREAKER ∞                                          ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                          ║
 * ║     Three-state machine: CLOSED → OPEN → HALF_OPEN                           ║
 * ║     All thresholds derived from Fibonacci sequence and φ (1.618...)          ║
 * ║                                                                               ║
 * ║     Ref: Deep Research §2.5 — Circuit Breaker Pattern                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const PHI = 1.618033988749895;

// Fibonacci-aligned defaults
const DEFAULTS = {
  failureThreshold: 5,        // Fibonacci F5 — failures before OPEN
  recoveryTimeout: 34000,     // Fibonacci F9 × 1000ms — OPEN → HALF_OPEN wait
  halfOpenMaxCalls: 3,        // Fibonacci F4 — probe calls in HALF_OPEN
  resetOnSuccess: true,       // Reset failure count on any success
  phiBackoffBase: 1000,       // Base delay for phi-backoff retries
  maxRetries: 4,              // Maximum retry attempts
};

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class PhiCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.config = { ...DEFAULTS, ...options };
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    this.stats = { totalCalls: 0, totalFailures: 0, totalSuccesses: 0, trips: 0 };
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} - Result of fn()
   * @throws {Error} - If circuit is OPEN or fn() fails and breaker trips
   */
  async execute(fn) {
    this.stats.totalCalls++;

    // Check if OPEN state should transition to HALF_OPEN
    if (this.state === STATE.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.recoveryTimeout) {
        this._transition(STATE.HALF_OPEN);
      } else {
        throw new Error(
          `[CircuitBreaker:${this.name}] OPEN — rejecting call. ` +
          `Recovery in ${Math.ceil((this.config.recoveryTimeout - elapsed) / 1000)}s`
        );
      }
    }

    // HALF_OPEN: limit probe calls
    if (this.state === STATE.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error(
          `[CircuitBreaker:${this.name}] HALF_OPEN — max probe calls (${this.config.halfOpenMaxCalls}) reached`
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  /**
   * Execute with phi-backoff retry.
   * Delay = baseMs × φ^attempt
   *   Attempt 1: 1,618ms
   *   Attempt 2: 2,618ms
   *   Attempt 3: 4,236ms
   *   Attempt 4: 6,854ms
   *
   * More conservative than base-2 exponential at early attempts,
   * reducing thundering herd risk on HeadyConductor during cascade recovery.
   */
  async executeWithRetry(fn) {
    let lastError;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.execute(fn);
      } catch (err) {
        lastError = err;
        if (attempt < this.config.maxRetries && this.state !== STATE.OPEN) {
          const delay = Math.round(this.config.phiBackoffBase * Math.pow(PHI, attempt + 1));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  _onSuccess() {
    this.stats.totalSuccesses++;
    this.successCount++;

    if (this.state === STATE.HALF_OPEN) {
      // All probe calls succeeded → close circuit
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this._transition(STATE.CLOSED);
      }
    } else if (this.config.resetOnSuccess) {
      this.failureCount = 0;
    }
  }

  _onFailure() {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === STATE.HALF_OPEN) {
      // Any failure in HALF_OPEN → back to OPEN
      this._transition(STATE.OPEN);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this._transition(STATE.OPEN);
    }
  }

  _transition(newState) {
    const from = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === STATE.OPEN) {
      this.stats.trips++;
      process.stderr.write(JSON.stringify({ severity: 'WARNING', message: `[CircuitBreaker:${this.name}] ${from} → OPEN (failures: ${this.failureCount})` }) + '\n');
    } else if (newState === STATE.HALF_OPEN) {
      this.halfOpenCalls = 0;
      this.successCount = 0;
      process.stdout.write(JSON.stringify({ severity: 'INFO', message: `[CircuitBreaker:${this.name}] ${from} → HALF_OPEN (probing with ${this.config.halfOpenMaxCalls} calls)` }) + '\n');
    } else if (newState === STATE.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      process.stdout.write(JSON.stringify({ severity: 'INFO', message: `[CircuitBreaker:${this.name}] ${from} → CLOSED (recovered)` }) + '\n');
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
      config: {
        failureThreshold: this.config.failureThreshold,
        recoveryTimeout: this.config.recoveryTimeout,
        halfOpenMaxCalls: this.config.halfOpenMaxCalls,
      },
      stats: this.stats,
    };
  }

  reset() {
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
  }
}

/**
 * Calculate phi-backoff delay for a given attempt.
 * @param {number} attempt - Zero-indexed attempt number
 * @param {number} baseMs - Base delay in milliseconds (default: 1000)
 * @returns {number} - Delay in milliseconds
 */
function phiBackoffDelay(attempt, baseMs = 1000) {
  return Math.round(baseMs * Math.pow(PHI, attempt + 1));
}

module.exports = { PhiCircuitBreaker, phiBackoffDelay, PHI, STATE };
