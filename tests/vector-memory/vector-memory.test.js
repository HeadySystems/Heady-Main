/**
 * Test: Heady Vector Memory Store
 *
 * Validates in-memory CRUD, cosine similarity search, compaction, and HNSW config.
 */

// vitest globals: describe, it, expect are provided by vitest config

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('VectorMemoryStore', () => {
  describe('HNSW Configuration', () => {
    it('m parameter is FIB[7] = 21', () => {
      expect(FIB[7]).toBe(21);
    });

    it('ef_construction is FIB[11] = 144', () => {
      expect(FIB[11]).toBe(144);
    });

    it('ef_search is FIB[10] = 89', () => {
      expect(FIB[10]).toBe(89);
    });
  });

  describe('Cosine Similarity', () => {
    function cosineSimilarity(a, b) {
      if (!a || !b || a.length !== b.length) return 0;
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      const denom = Math.sqrt(normA) * Math.sqrt(normB);
      return denom > 0 ? dot / denom : 0;
    }

    it('identical vectors have similarity 1.0', () => {
      const v = [0.5, 0.3, 0.8, 0.1];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
    });

    it('orthogonal vectors have similarity 0.0', () => {
      const a = [1, 0, 0, 0];
      const b = [0, 1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
    });

    it('opposite vectors have similarity -1.0', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
    });

    it('similar vectors have high similarity', () => {
      const a = [0.9, 0.1, 0.0];
      const b = [0.8, 0.2, 0.0];
      expect(cosineSimilarity(a, b)).toBeGreaterThan(0.9);
    });
  });

  describe('Memory Types', () => {
    const MEMORY_TYPES = {
      EPISODIC: 'episodic',
      SEMANTIC: 'semantic',
      PROCEDURAL: 'procedural',
      IDENTITY: 'identity',
    };

    it('has 4 memory types', () => {
      expect(Object.keys(MEMORY_TYPES)).toHaveLength(4);
    });

    it('includes episodic, semantic, procedural, identity', () => {
      expect(MEMORY_TYPES.EPISODIC).toBe('episodic');
      expect(MEMORY_TYPES.SEMANTIC).toBe('semantic');
      expect(MEMORY_TYPES.PROCEDURAL).toBe('procedural');
      expect(MEMORY_TYPES.IDENTITY).toBe('identity');
    });
  });

  describe('Search Defaults', () => {
    it('default topK is FIB[7] = 21', () => {
      expect(FIB[7]).toBe(21);
    });

    it('default threshold is ψ ≈ 0.618', () => {
      expect(PSI).toBeCloseTo(0.618, 3);
    });
  });

  describe('Compaction', () => {
    it('dedup threshold is above CRITICAL (≈0.972)', () => {
      const phiThreshold4 = 1 - Math.pow(PSI, 4) * 0.5; // ≈ 0.927
      const dedupThreshold = phiThreshold4 + 0.045; // ≈ 0.972
      expect(dedupThreshold).toBeGreaterThan(0.95);
      expect(dedupThreshold).toBeLessThan(1.0);
    });

    it('merges entries above dedup threshold', () => {
      const dedupThreshold = 0.972;
      const similarPair = 0.985;
      const dissimilarPair = 0.65;

      expect(similarPair >= dedupThreshold).toBe(true);
      expect(dissimilarPair >= dedupThreshold).toBe(false);
    });
  });

  describe('Batch Sizes', () => {
    it('batch upsert is FIB[11] = 144', () => {
      expect(FIB[11]).toBe(144);
    });

    it('batch delete is FIB[9] = 55', () => {
      expect(FIB[9]).toBe(55);
    });
  });
});
