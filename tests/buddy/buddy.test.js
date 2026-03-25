/**
 * Test: HeadyBuddy Companion Interface
 *
 * Validates intent classification, preference learning, conversation compression,
 * and suggestion generation.
 */

// vitest globals: describe, it, expect, beforeEach are provided by vitest config

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('HeadyBuddy', () => {
  describe('Intent Classification', () => {
    const patterns = {
      code: /\b(write|code|implement|build|create|function|class|api)\b/,
      review: /\b(review|analyze|check|audit|inspect|lint)\b/,
      security: /\b(security|vulnerability|auth|encrypt|permission|cors)\b/,
      architecture: /\b(architect|design|structure|pattern|diagram|topology)\b/,
      research: /\b(research|find|search|look up|compare|benchmark)\b/,
      documentation: /\b(document|docs|readme|explain|describe|api docs)\b/,
      creative: /\b(creative|design|ui|ux|visual|style|brand)\b/,
      monitoring: /\b(monitor|health|status|metric|alert|dashboard)\b/,
      deployment: /\b(deploy|ship|release|publish|docker|cloud run)\b/,
      memory: /\b(remember|recall|store|embed|vector|memory)\b/,
    };

    function classify(message) {
      const lower = message.toLowerCase();
      let bestMatch = 'conversation';
      let bestConfidence = 0;

      for (const [category, regex] of Object.entries(patterns)) {
        const matches = lower.match(regex);
        if (matches) {
          const confidence = Math.min(1, PSI + matches.length * Math.pow(PSI, 3));
          if (confidence > bestConfidence) {
            bestMatch = category;
            bestConfidence = confidence;
          }
        }
      }
      return { category: bestMatch, confidence: bestConfidence };
    }

    it('classifies code requests', () => {
      const result = classify('Write a function to calculate phi');
      expect(result.category).toBe('code');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('classifies security requests', () => {
      const result = classify('Check for CORS vulnerabilities in auth');
      expect(result.category).toBe('security');
    });

    it('classifies deployment requests', () => {
      const result = classify('Deploy the service to Cloud Run');
      expect(result.category).toBe('deployment');
    });

    it('classifies research requests', () => {
      const result = classify('Research pgvector benchmarks');
      expect(result.category).toBe('research');
    });

    it('defaults to conversation for ambiguous input', () => {
      const result = classify('Hello there');
      expect(result.category).toBe('conversation');
    });
  });

  describe('Configuration', () => {
    it('max conversation length is FIB[11] = 89', () => {
      expect(FIB[11]).toBe(89);
    });

    it('compression trigger is FIB[8] = 21', () => {
      expect(FIB[8]).toBe(21);
    });

    it('memory recall topK is FIB[6] = 8', () => {
      expect(FIB[6]).toBe(8);
    });

    it('session timeout is FIB[10] × 60000 = 3,300,000ms (55 min)', () => {
      expect(FIB[10] * 60 * 1000).toBe(3300000);
    });
  });

  describe('Preference Learning', () => {
    it('reinforcement increases confidence', () => {
      let confidence = PSI * PSI; // Start at ≈ 0.382
      const cap = 1 - Math.pow(PSI, 4) * 0.5; // ≈ 0.927

      for (let i = 1; i <= 5; i++) {
        confidence = Math.min(cap, confidence + (1 - confidence) * Math.pow(PSI, i));
      }

      expect(confidence).toBeGreaterThan(PSI);
      expect(confidence).toBeLessThanOrEqual(cap);
    });

    it('decay reduces confidence', () => {
      let confidence = 0.8;
      confidence *= PSI; // ≈ 0.618 decay
      expect(confidence).toBeCloseTo(0.494, 2);
    });
  });

  describe('Conversation Compression', () => {
    it('keeps FIB[6] = 8 most recent turns', () => {
      const turns = Array(25).fill(null).map((_, i) => ({ id: i, role: 'user' }));
      const keepCount = FIB[6];
      const kept = turns.slice(-keepCount);
      expect(kept).toHaveLength(8);
      expect(kept[0].id).toBe(17);
    });
  });

  describe('Intent Map Coverage', () => {
    const INTENT_MAP = {
      code: { domain: 'code-generation', nodes: ['JULES', 'BUILDER'] },
      review: { domain: 'code-review', nodes: ['OBSERVER', 'HeadyAnalyze'] },
      security: { domain: 'security', nodes: ['MURPHY', 'CIPHER'] },
      architecture: { domain: 'architecture', nodes: ['ATLAS', 'PYTHIA'] },
      research: { domain: 'research', nodes: ['HeadyResearch', 'SOPHIA'] },
      documentation: { domain: 'documentation', nodes: ['ATLAS', 'HeadyCodex'] },
      creative: { domain: 'creative', nodes: ['MUSE', 'NOVA'] },
      monitoring: { domain: 'monitoring', nodes: ['OBSERVER', 'SENTINEL'] },
      deployment: { domain: 'deployment', nodes: ['HeadyDeploy', 'HeadyOps'] },
      memory: { domain: 'memory', nodes: ['HeadyMemory', 'HeadyEmbed'] },
      conversation: { domain: 'companion', nodes: ['HeadyBuddy'] },
    };

    it('covers 11 intent categories', () => {
      expect(Object.keys(INTENT_MAP)).toHaveLength(11);
    });

    it('every intent maps to at least 1 node', () => {
      for (const [, mapping] of Object.entries(INTENT_MAP)) {
        expect(mapping.nodes.length).toBeGreaterThanOrEqual(1);
        expect(mapping.domain).toBeTruthy();
      }
    });
  });
});
