/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { phiBackoff, fib } = require('../../shared/phi-math');

/**
 * Execute an async function with φ-exponential backoff retry.
 *
 * @param {Function} fn          — Async function to execute
 * @param {Object}   opts        — Options
 * @param {number}   opts.maxRetries — Maximum attempts (default fib(5) = 5)
 * @param {Function} opts.shouldRetry — Predicate (error) => boolean
 * @param {Function} opts.onRetry — Callback (error, attempt) => void
 * @returns {Promise<*>} Result of fn
 */
async function withRetry(fn, opts = {}) {
  const maxRetries = opts.maxRetries || fib(5);  // 5 retries
  const shouldRetry = opts.shouldRetry || (() => true);
  const onRetry = opts.onRetry || (() => {});

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err;
      }

      const delayMs = phiBackoff(attempt);
      onRetry(err, attempt, delayMs);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Predicate: retry on transient HTTP errors (408, 429, 500, 502, 503, 504)
 */
function isTransientHttpError(err) {
  const transient = new Set([408, 429, 500, 502, 503, 504]);
  return transient.has(err.statusCode || err.status || 0);
}

module.exports = { withRetry, isTransientHttpError };
