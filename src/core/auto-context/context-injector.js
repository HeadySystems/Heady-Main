/**
 * HeadyAutoContext — Context Injector Middleware
 *
 * Wraps any task execution function with automatic context assembly.
 * Ensures every task gets a ContextEnvelope BEFORE execution begins.
 * This is the enforcement layer for the HeadyAutoContext mandate.
 *
 * Usage:
 *   const injected = contextInjector(autoContext, myTaskFn);
 *   const result = await injected({ taskId, userId, query, ...params });
 *
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 * Architecture: φ-scaled, CSL-gated, Sacred Geometry v4.0
 */

import { EventEmitter } from 'events';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;

// ─── CSL Quality Gates ──────────────────────────────────────────
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;
const QUALITY_GATES = Object.freeze({
  PASS:   phiThreshold(3),  // ≈ 0.882
  REVIEW: phiThreshold(2),  // ≈ 0.809
  RETRY:  phiThreshold(1),  // ≈ 0.691
  FAIL:   phiThreshold(0),  // ≈ 0.500
});

/**
 * Context injection modes.
 */
const INJECTION_MODES = Object.freeze({
  STRICT:    'strict',    // Task FAILS if context doesn't meet threshold
  ADVISORY:  'advisory',  // Task proceeds with warning if context is weak
  PASSTHROUGH: 'passthrough', // Context assembled but task runs regardless
});

/**
 * Create a context-injecting wrapper around a task function.
 *
 * @param {HeadyAutoContext} autoContext - The context engine instance
 * @param {Function} taskFn - The task function: (contextEnvelope, params) => result
 * @param {object} [options]
 * @param {string} [options.mode] - Injection mode (strict/advisory/passthrough)
 * @param {number} [options.minRelevance] - Minimum relevance score (CSL gate)
 * @param {number} [options.maxRetries] - Max context assembly retries
 * @returns {Function} Wrapped function: (params) => result
 */
function contextInjector(autoContext, taskFn, options = {}) {
  const mode = options.mode || INJECTION_MODES.ADVISORY;
  const minRelevance = options.minRelevance ?? QUALITY_GATES.RETRY;
  const maxRetries = options.maxRetries ?? Math.round(PHI * 2); // 3

  return async function injectedTask(params) {
    const { taskId, userId, query, ...rest } = params;

    if (!taskId || !userId) {
      throw new Error('HeadyAutoContext requires taskId and userId in all task params');
    }

    let envelope = null;
    let attempts = 0;
    let lastError = null;

    while (attempts < maxRetries) {
      attempts++;
      try {
        envelope = await autoContext.assemble({
          taskId,
          userId,
          query: query || `task:${taskId}`,
          metadata: rest,
        });

        // CSL relevance gate
        if (envelope.meetsThreshold(minRelevance)) {
          break; // Context is good enough
        }

        if (mode === INJECTION_MODES.PASSTHROUGH) {
          break; // Don't retry in passthrough mode
        }

        // Context below threshold — retry with broader query
        if (attempts < maxRetries) {
          autoContext.emit('context:below_threshold', {
            taskId,
            attempt: attempts,
            relevanceScore: envelope.relevanceScore,
            threshold: minRelevance,
          });
        }
      } catch (err) {
        lastError = err;
        autoContext.emit('context:assembly_error', {
          taskId,
          attempt: attempts,
          error: err.message,
        });
      }
    }

    // Enforce mode
    if (!envelope) {
      if (mode === INJECTION_MODES.STRICT) {
        throw new Error(
          `HeadyAutoContext: Context assembly failed after ${maxRetries} attempts. ` +
          `Last error: ${lastError?.message || 'unknown'}`
        );
      }
      // Advisory/passthrough — create empty envelope
      const { ContextEnvelope, CONTEXT_SOURCES } = await import('./context-assembler.js');
      const emptySources = {};
      for (const type of Object.values(CONTEXT_SOURCES)) {
        emptySources[type] = { items: [], score: 0 };
      }
      envelope = new ContextEnvelope({
        taskId,
        userId,
        sources: emptySources,
        assemblyMs: 0,
        totalItems: 0,
        relevanceScore: 0,
        timestamp: Date.now(),
      });
    }

    if (mode === INJECTION_MODES.STRICT && !envelope.meetsThreshold(minRelevance)) {
      throw new Error(
        `HeadyAutoContext: Context relevance ${envelope.relevanceScore.toFixed(3)} ` +
        `below threshold ${minRelevance.toFixed(3)} in strict mode`
      );
    }

    // Execute the task with context injected
    return taskFn(envelope, { taskId, userId, query, ...rest });
  };
}

/**
 * Decorator-style class for wrapping entire service/engine classes.
 * Adds HeadyAutoContext to every method that accepts a params object.
 */
class ContextInjectorMiddleware extends EventEmitter {
  #autoContext;
  #mode;
  #minRelevance;

  constructor(autoContext, options = {}) {
    super();
    this.#autoContext = autoContext;
    this.#mode = options.mode || INJECTION_MODES.ADVISORY;
    this.#minRelevance = options.minRelevance ?? QUALITY_GATES.RETRY;
  }

  /**
   * Wrap all methods of a target object with context injection.
   * @param {object} target - The service/engine to wrap
   * @param {string[]} [methodNames] - Specific methods to wrap (default: all async methods)
   * @returns {Proxy}
   */
  wrap(target, methodNames = null) {
    const autoContext = this.#autoContext;
    const mode = this.#mode;
    const minRelevance = this.#minRelevance;

    return new Proxy(target, {
      get(obj, prop) {
        const original = obj[prop];

        // Only wrap functions
        if (typeof original !== 'function') return original;

        // Only wrap specified methods (or all if not specified)
        if (methodNames && !methodNames.includes(prop)) return original.bind(obj);

        // Skip internal/lifecycle methods
        if (prop.startsWith('_') || ['constructor', 'health', 'shutdown'].includes(prop)) {
          return original.bind(obj);
        }

        return contextInjector(autoContext, (envelope, params) => {
          // Inject envelope into params
          return original.call(obj, { ...params, _context: envelope });
        }, { mode, minRelevance });
      },
    });
  }

  /**
   * Express/Hono middleware that attaches context to req.
   * @returns {Function}
   */
  expressMiddleware() {
    const autoContext = this.#autoContext;
    return async (req, res, next) => {
      try {
        const envelope = await autoContext.assemble({
          taskId: req.headers['x-request-id'] || `req:${Date.now()}`,
          userId: req.user?.id || 'anonymous',
          query: `${req.method} ${req.path}`,
          metadata: { headers: req.headers, query: req.query },
        });
        req.context = envelope;
        next();
      } catch (err) {
        req.context = null;
        next(); // Advisory mode by default — don't block requests
      }
    };
  }
}

export {
  contextInjector,
  ContextInjectorMiddleware,
  INJECTION_MODES,
  QUALITY_GATES,
};
