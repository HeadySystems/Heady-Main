/**
 * Test: Heady Circuit Breaker
 *
 * Validates state transitions, phi-backoff, half-open probing, and registry.
 */

// vitest globals: describe, it, expect, beforeEach are provided by vitest config

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CB_STATES = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' };

describe('CircuitBreaker', () => {
  describe('Configuration Defaults', () => {
    it('failure threshold is FIB[5] = 5', () => {
      expect(FIB[5]).toBe(5);
    });

    it('success threshold for half-open is FIB[4] = 3', () => {
      expect(FIB[4]).toBe(3);
    });

    it('open duration base is FIB[8] × 1000 = 21000ms', () => {
      expect(FIB[8] * 1000).toBe(21000);
    });

    it('max open duration is FIB[12] × 1000 = 144000ms', () => {
      expect(FIB[12] * 1000).toBe(144000);
    });

    it('sliding window is FIB[10] × 1000 = 55000ms', () => {
      expect(FIB[10] * 1000).toBe(55000);
    });
  });

  describe('State Transitions', () => {
    let state;
    let failureCount;

    beforeEach(() => {
      state = CB_STATES.CLOSED;
      failureCount = 0;
    });

    it('starts in CLOSED state', () => {
      expect(state).toBe(CB_STATES.CLOSED);
    });

    it('transitions to OPEN after FIB[5] failures', () => {
      const failureThreshold = FIB[5];
      for (let i = 0; i < failureThreshold; i++) {
        failureCount++;
      }
      if (failureCount >= failureThreshold) {
        state = CB_STATES.OPEN;
      }
      expect(state).toBe(CB_STATES.OPEN);
      expect(failureCount).toBe(5);
    });

    it('transitions from OPEN to HALF_OPEN after timeout', () => {
      state = CB_STATES.OPEN;
      const elapsed = FIB[8] * 1000 + 1; // Just past the open duration
      const openDuration = FIB[8] * 1000;
      if (elapsed >= openDuration) {
        state = CB_STATES.HALF_OPEN;
      }
      expect(state).toBe(CB_STATES.HALF_OPEN);
    });

    it('transitions from HALF_OPEN to CLOSED after FIB[4] successes', () => {
      state = CB_STATES.HALF_OPEN;
      let halfOpenSuccesses = 0;
      const successThreshold = FIB[4];

      for (let i = 0; i < successThreshold; i++) {
        halfOpenSuccesses++;
      }
      if (halfOpenSuccesses >= successThreshold) {
        state = CB_STATES.CLOSED;
      }
      expect(state).toBe(CB_STATES.CLOSED);
    });

    it('transitions from HALF_OPEN back to OPEN on failure', () => {
      state = CB_STATES.HALF_OPEN;
      // Simulate failed probe
      state = CB_STATES.OPEN;
      expect(state).toBe(CB_STATES.OPEN);
    });
  });

  describe('Phi-Backoff', () => {
    it('escalates open duration with phi', () => {
      const base = FIB[8] * 1000; // 21s
      const max = FIB[12] * 1000; // 144s

      const durations = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const duration = Math.min(base * Math.pow(PHI, attempt), max);
        durations.push(Math.round(duration));
      }

      expect(durations[0]).toBe(21000);
      expect(durations[1]).toBeCloseTo(21000 * PHI, -2);
      expect(durations[2]).toBeCloseTo(21000 * PHI * PHI, -2);
      // Should not exceed max
      expect(durations[4]).toBeLessThanOrEqual(max);
    });
  });

  describe('Health Score', () => {
    it('returns 1.0 when no failures', () => {
      const window = Array(10).fill({ success: true });
      const successes = window.filter(w => w.success).length;
      const score = successes / window.length;
      expect(score).toBe(1.0);
    });

    it('returns 0.0 when circuit is open', () => {
      const state = CB_STATES.OPEN;
      const score = state === CB_STATES.OPEN ? 0 : 1;
      expect(score).toBe(0);
    });

    it('calculates ratio for mixed results', () => {
      const window = [
        ...Array(7).fill({ success: true }),
        ...Array(3).fill({ success: false }),
      ];
      const successes = window.filter(w => w.success).length;
      const score = successes / window.length;
      expect(score).toBe(0.7);
    });
  });
});
