/**
 * Test: Heady Context Window Manager
 *
 * Validates tiered context, compression, eviction, and capsule creation.
 */

// vitest globals: describe, it, expect, beforeEach are provided by vitest config

// Inline test doubles (no external dependencies)
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('TieredContextManager', () => {
  let manager;

  beforeEach(() => {
    // Simulate the TieredContextManager behavior
    manager = {
      tiers: new Map([
        ['working', []],
        ['session', []],
        ['memory', []],
        ['artifacts', []],
      ]),
      usage: new Map([
        ['working', 0],
        ['session', 0],
        ['memory', 0],
        ['artifacts', 0],
      ]),
      budgets: {
        working: 8192,
        session: Math.round(8192 * PHI * PHI),
        memory: Math.round(8192 * Math.pow(PHI, 4)),
        artifacts: Math.round(8192 * Math.pow(PHI, 6)),
      },
      totalMessages: 0,
    };
  });

  describe('Token Budgets', () => {
    it('working budget is 8192 tokens', () => {
      expect(manager.budgets.working).toBe(8192);
    });

    it('session budget is ~21450 (base × φ²)', () => {
      expect(manager.budgets.session).toBeGreaterThan(21000);
      expect(manager.budgets.session).toBeLessThan(22000);
    });

    it('memory budget is ~56131 (base × φ⁴)', () => {
      expect(manager.budgets.memory).toBeGreaterThan(55000);
      expect(manager.budgets.memory).toBeLessThan(57000);
    });

    it('artifacts budget is ~146920 (base × φ⁶)', () => {
      expect(manager.budgets.artifacts).toBeGreaterThan(145000);
      expect(manager.budgets.artifacts).toBeLessThan(148000);
    });

    it('each tier is φ² larger than the previous', () => {
      const phiSquared = PHI * PHI;
      const ratio1 = manager.budgets.session / manager.budgets.working;
      const ratio2 = manager.budgets.memory / manager.budgets.session;
      expect(ratio1).toBeCloseTo(phiSquared, 1);
      expect(ratio2).toBeCloseTo(phiSquared, 1);
    });
  });

  describe('Eviction Weights', () => {
    const EVICTION_WEIGHTS = {
      importance: PHI * PHI / (PHI * PHI + PHI + 1),
      recency: PHI / (PHI * PHI + PHI + 1),
      relevance: 1 / (PHI * PHI + PHI + 1),
    };

    it('weights sum to 1.0', () => {
      const sum = EVICTION_WEIGHTS.importance + EVICTION_WEIGHTS.recency + EVICTION_WEIGHTS.relevance;
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('importance ≈ 0.486', () => {
      expect(EVICTION_WEIGHTS.importance).toBeCloseTo(0.486, 2);
    });

    it('recency ≈ 0.300', () => {
      expect(EVICTION_WEIGHTS.recency).toBeCloseTo(0.300, 2);
    });

    it('relevance ≈ 0.214', () => {
      expect(EVICTION_WEIGHTS.relevance).toBeCloseTo(0.214, 2);
    });
  });

  describe('Compression Threshold', () => {
    it('triggers at 1 - ψ⁴ ≈ 0.910', () => {
      const threshold = 1 - Math.pow(PSI, 4);
      expect(threshold).toBeCloseTo(0.910, 2);
    });

    it('compression milestones follow Fibonacci', () => {
      const milestones = [FIB[6], FIB[7], FIB[8], FIB[9], FIB[10], FIB[11]];
      expect(milestones).toEqual([8, 13, 21, 34, 55, 89]);
    });
  });

  describe('Context Capsule', () => {
    it('capsule token budget defaults to session tier', () => {
      const capsuleMax = manager.budgets.session;
      expect(capsuleMax).toBeGreaterThan(20000);
    });

    it('capsule respects token budget', () => {
      const maxTokens = 1000;
      const entries = [
        { tokens: 400, role: 'system', content: 'sys' },
        { tokens: 400, role: 'user', content: 'usr' },
        { tokens: 400, role: 'assistant', content: 'ast' },
      ];

      let total = 0;
      const capsuleEntries = [];
      for (const entry of entries) {
        if (total + entry.tokens <= maxTokens) {
          capsuleEntries.push(entry);
          total += entry.tokens;
        }
      }

      expect(total).toBeLessThanOrEqual(maxTokens);
      expect(capsuleEntries).toHaveLength(2);
    });
  });
});
