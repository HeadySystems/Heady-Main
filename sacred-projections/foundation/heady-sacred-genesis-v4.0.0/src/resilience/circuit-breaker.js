'use strict';

const { fib, phiBackoff } = require('../../shared/phi-math');

const STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || fib(5);
    this.probeThreshold = options.probeThreshold || fib(4);
    this.baseDelayMs = options.baseDelayMs || 1000;
    this.maxDelayMs = options.maxDelayMs;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.recoveryAttempt = 0;
    this.probeCount = 0;
    this.lastOpenedAt = 0;
  }

  canAttempt() {
    if (this.state !== STATES.OPEN) {
      return true;
    }
    const delay = phiBackoff(this.recoveryAttempt, this.baseDelayMs, this.maxDelayMs);
    return (Date.now() - this.lastOpenedAt) >= delay;
  }

  async execute(operation) {
    if (!this.canAttempt()) {
      throw new Error(`Circuit ${this.name} is OPEN.`);
    }
    if (this.state === STATES.OPEN) {
      this.state = STATES.HALF_OPEN;
      this.probeCount = 0;
    }
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === STATES.HALF_OPEN) {
      this.probeCount += 1;
      if (this.probeCount >= this.probeThreshold) {
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.recoveryAttempt = 0;
        this.probeCount = 0;
      }
      return;
    }
    this.failureCount = Math.max(0, this.failureCount - 1);
  }

  onFailure() {
    this.failureCount += 1;
    if (this.state === STATES.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
      this.recoveryAttempt += 1;
      this.lastOpenedAt = Date.now();
      this.probeCount = 0;
    }
  }

  snapshot() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      recoveryAttempt: this.recoveryAttempt
    };
  }
}

module.exports = {
  CircuitBreaker,
  CIRCUIT_STATES: STATES
};
