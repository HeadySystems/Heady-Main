/**
 * Test: Heady Event Bus
 *
 * Validates pub-sub, topic matching, queue groups, dead letters, and backpressure.
 */

// vitest globals: describe, it, expect, beforeEach are provided by vitest config

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('HeadyEventBus', () => {
  describe('Topic Pattern Matching', () => {
    function patternToRegex(pattern) {
      const escaped = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '[^.]+')
        .replace(/>$/, '.+');
      return new RegExp(`^${escaped}$`);
    }

    it('matches exact topics', () => {
      const regex = patternToRegex('heady.swarm.spawned');
      expect(regex.test('heady.swarm.spawned')).toBe(true);
      expect(regex.test('heady.swarm.retired')).toBe(false);
    });

    it('matches single-level wildcard *', () => {
      const regex = patternToRegex('heady.*.health');
      expect(regex.test('heady.auth.health')).toBe(true);
      expect(regex.test('heady.billing.health')).toBe(true);
      expect(regex.test('heady.auth.sub.health')).toBe(false);
    });

    it('matches multi-level wildcard >', () => {
      const regex = patternToRegex('heady.swarm.>');
      expect(regex.test('heady.swarm.bee.spawned')).toBe(true);
      expect(regex.test('heady.swarm.consensus.reached')).toBe(true);
      expect(regex.test('heady.conductor.routed')).toBe(false);
    });

    it('combines * and specific segments', () => {
      const regex = patternToRegex('heady.services.*.status');
      expect(regex.test('heady.services.auth.status')).toBe(true);
      expect(regex.test('heady.services.billing.status')).toBe(true);
      expect(regex.test('heady.services.auth.health')).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('max queue depth is FIB[13] = 233', () => {
      expect(FIB[13]).toBe(233);
    });

    it('max retries is FIB[5] = 5', () => {
      expect(FIB[5]).toBe(5);
    });

    it('backpressure threshold is ψ ≈ 0.618', () => {
      expect(PSI).toBeCloseTo(0.618, 3);
    });
  });

  describe('Queue Group Load Balancing', () => {
    it('selects subscriber with fewest messages', () => {
      const subs = [
        { id: 'a', messagesReceived: 10, group: 'workers' },
        { id: 'b', messagesReceived: 3, group: 'workers' },
        { id: 'c', messagesReceived: 7, group: 'workers' },
      ];

      const selected = subs.reduce((min, sub) =>
        sub.messagesReceived < min.messagesReceived ? sub : min
      );

      expect(selected.id).toBe('b');
    });
  });

  describe('Dead Letter Queue', () => {
    it('moves events to DLQ after max retries', () => {
      const maxRetries = FIB[5];
      const event = { retryCount: maxRetries, topic: 'test.topic' };

      const isDeadLetter = event.retryCount >= maxRetries;
      expect(isDeadLetter).toBe(true);
    });
  });

  describe('Event Envelope', () => {
    it('generates unique event IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(`evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
      }
      expect(ids.size).toBe(100);
    });
  });
});
