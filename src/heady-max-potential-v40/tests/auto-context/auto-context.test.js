/**
 * HeadyAutoContext — Test Suite
 * Tests context assembly, injection, caching, and quality gates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const FIB   = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;

describe('HeadyAutoContext — Context Assembler', () => {
  describe('ContextEnvelope', () => {
    it('creates a frozen, immutable context envelope', () => {
      const { ContextEnvelope, CONTEXT_SOURCES } = require('../../core/auto-context/context-assembler.js');
      const sources = {};
      for (const type of Object.values(CONTEXT_SOURCES)) {
        sources[type] = { items: [{ id: 'test', relevance: 0.9 }], score: 0.85 };
      }
      const envelope = new ContextEnvelope({
        taskId: 'task-001',
        userId: 'user-001',
        sources,
        assemblyMs: 42,
        totalItems: 7,
        relevanceScore: 0.85,
      });

      expect(envelope.taskId).toBe('task-001');
      expect(envelope.userId).toBe('user-001');
      expect(envelope.totalItems).toBe(7);
      expect(envelope.version).toBe('4.0.0');
      expect(Object.isFrozen(envelope)).toBe(true);
      expect(Object.isFrozen(envelope.sources)).toBe(true);
    });

    it('meetsThreshold checks CSL relevance gate', () => {
      const { ContextEnvelope } = require('../../core/auto-context/context-assembler.js');
      const envelope = new ContextEnvelope({
        taskId: 't', userId: 'u', sources: {}, assemblyMs: 0, totalItems: 0,
        relevanceScore: 0.85,
      });

      expect(envelope.meetsThreshold(phiThreshold(2))).toBe(true);   // MEDIUM ≈ 0.809
      expect(envelope.meetsThreshold(phiThreshold(3))).toBe(false);  // HIGH ≈ 0.882
    });

    it('flatten returns all items sorted by relevance', () => {
      const { ContextEnvelope } = require('../../core/auto-context/context-assembler.js');
      const envelope = new ContextEnvelope({
        taskId: 't', userId: 'u',
        sources: {
          vector_memory: { items: [{ id: 'a', relevance: 0.5 }], score: 0.8 },
          session_state: { items: [{ id: 'b', relevance: 0.9 }], score: 0.7 },
        },
        assemblyMs: 0, totalItems: 2, relevanceScore: 0.75,
      });

      const flat = envelope.flatten();
      expect(flat.length).toBe(2);
      expect(flat[0].id).toBe('b'); // Higher relevance first
    });

    it('toJSON produces serializable output', () => {
      const { ContextEnvelope } = require('../../core/auto-context/context-assembler.js');
      const envelope = new ContextEnvelope({
        taskId: 't', userId: 'u', sources: {}, assemblyMs: 10, totalItems: 0,
        relevanceScore: 0.5,
      });
      const json = envelope.toJSON();
      expect(json.taskId).toBe('t');
      expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    });
  });

  describe('HeadyAutoContext', () => {
    it('assembles context from all registered sources concurrently', async () => {
      const { HeadyAutoContext, CONTEXT_SOURCES } = require('../../core/auto-context/context-assembler.js');
      const ctx = new HeadyAutoContext();

      ctx.registerSource(CONTEXT_SOURCES.VECTOR_MEMORY, async () => ({
        items: [{ id: 'vec-1', relevance: 0.9 }],
        score: 0.92,
      }));

      ctx.registerSource(CONTEXT_SOURCES.SESSION_STATE, async () => ({
        items: [{ id: 'sess-1' }],
        score: 0.85,
      }));

      const envelope = await ctx.assemble({
        taskId: 'test-task',
        userId: 'test-user',
        query: 'test query',
      });

      expect(envelope.taskId).toBe('test-task');
      expect(envelope.totalItems).toBeGreaterThanOrEqual(2);
      expect(envelope.assemblyMs).toBeGreaterThanOrEqual(0);
      expect(envelope.relevanceScore).toBeGreaterThan(0);
      await ctx.shutdown();
    });

    it('caches assemblies within TTL', async () => {
      const { HeadyAutoContext, CONTEXT_SOURCES } = require('../../core/auto-context/context-assembler.js');
      let callCount = 0;
      const ctx = new HeadyAutoContext({ cacheTTLMs: 60000 });

      ctx.registerSource(CONTEXT_SOURCES.VECTOR_MEMORY, async () => {
        callCount++;
        return { items: [{ id: 'v1' }], score: 0.9 };
      });

      await ctx.assemble({ taskId: 't1', userId: 'u1', query: 'q1' });
      await ctx.assemble({ taskId: 't2', userId: 'u1', query: 'q1' }); // Same user+query

      expect(callCount).toBe(1); // Second call should hit cache
      await ctx.shutdown();
    });

    it('handles source failures with circuit breaker', async () => {
      const { HeadyAutoContext, CONTEXT_SOURCES } = require('../../core/auto-context/context-assembler.js');
      const ctx = new HeadyAutoContext();

      ctx.registerSource(CONTEXT_SOURCES.VECTOR_MEMORY, async () => {
        throw new Error('connection_refused');
      });

      const envelope = await ctx.assemble({
        taskId: 'fail-test',
        userId: 'u1',
        query: 'q1',
      });

      // Should still return an envelope (sources fail gracefully)
      expect(envelope.taskId).toBe('fail-test');
      expect(envelope.sources.vector_memory.error).toBe('connection_refused');
      await ctx.shutdown();
    });

    it('reports health metrics', () => {
      const { HeadyAutoContext } = require('../../core/auto-context/context-assembler.js');
      const ctx = new HeadyAutoContext();
      const health = ctx.health();

      expect(health.status).toBe('healthy');
      expect(health.assemblyCount).toBe(0);
      expect(health.cacheSize).toBe(0);
      expect(typeof health.sources).toBe('object');
    });
  });

  describe('CONTEXT_WEIGHTS', () => {
    it('sums to approximately 1.0 (φ-fusion property)', () => {
      const { CONTEXT_WEIGHTS } = require('../../core/auto-context/context-assembler.js');
      const sum = CONTEXT_WEIGHTS.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    });

    it('weights are in descending order (φ-decay)', () => {
      const { CONTEXT_WEIGHTS } = require('../../core/auto-context/context-assembler.js');
      for (let i = 1; i < CONTEXT_WEIGHTS.length; i++) {
        expect(CONTEXT_WEIGHTS[i]).toBeLessThan(CONTEXT_WEIGHTS[i - 1]);
      }
    });
  });
});

describe('HeadyAutoContext — Context Injector', () => {
  describe('contextInjector', () => {
    it('wraps a task function with automatic context assembly', async () => {
      const { HeadyAutoContext, CONTEXT_SOURCES } = require('../../core/auto-context/context-assembler.js');
      const { contextInjector, INJECTION_MODES } = require('../../core/auto-context/context-injector.js');

      const ctx = new HeadyAutoContext();
      ctx.registerSource(CONTEXT_SOURCES.VECTOR_MEMORY, async () => ({
        items: [{ id: 'v1' }], score: 0.95,
      }));

      const taskFn = vi.fn(async (envelope, params) => {
        return { success: true, contextReceived: !!envelope };
      });

      const injected = contextInjector(ctx, taskFn, { mode: INJECTION_MODES.PASSTHROUGH });
      const result = await injected({ taskId: 't1', userId: 'u1', query: 'test' });

      expect(result.success).toBe(true);
      expect(result.contextReceived).toBe(true);
      expect(taskFn).toHaveBeenCalledOnce();
      await ctx.shutdown();
    });

    it('strict mode rejects tasks with insufficient context', async () => {
      const { HeadyAutoContext } = require('../../core/auto-context/context-assembler.js');
      const { contextInjector, INJECTION_MODES, QUALITY_GATES } = require('../../core/auto-context/context-injector.js');

      const ctx = new HeadyAutoContext(); // No sources = zero relevance

      const taskFn = vi.fn(async () => ({ done: true }));
      const injected = contextInjector(ctx, taskFn, {
        mode: INJECTION_MODES.STRICT,
        minRelevance: QUALITY_GATES.PASS, // ≈ 0.882
        maxRetries: 1,
      });

      await expect(injected({ taskId: 't1', userId: 'u1' }))
        .rejects.toThrow('HeadyAutoContext');
      expect(taskFn).not.toHaveBeenCalled();
      await ctx.shutdown();
    });
  });

  describe('QUALITY_GATES', () => {
    it('uses φ-harmonic threshold levels', () => {
      const { QUALITY_GATES } = require('../../core/auto-context/context-injector.js');

      expect(QUALITY_GATES.PASS).toBeCloseTo(phiThreshold(3), 3);    // ≈ 0.882
      expect(QUALITY_GATES.REVIEW).toBeCloseTo(phiThreshold(2), 3);  // ≈ 0.809
      expect(QUALITY_GATES.RETRY).toBeCloseTo(phiThreshold(1), 3);   // ≈ 0.691
      expect(QUALITY_GATES.FAIL).toBeCloseTo(phiThreshold(0), 3);    // ≈ 0.500
    });
  });
});
