/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const assert = require('assert');
const { AppError } = require('../../src/utils/app-error');
const { loadConfig } = require('../../src/utils/config-loader');
const { withRetry, isTransientHttpError } = require('../../src/utils/retry-helper');
const { validateInput, MAX_INPUT_LENGTH, MAX_JSON_DEPTH, MAX_ARRAY_ITEMS } = require('../../src/security/input-validator');
const { SecretManager } = require('../../src/security/secret-manager');
const { fib, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; process.stdout.write(`  ✓ ${name}\n`); }
  catch (err) { failed++; process.stdout.write(`  ✗ ${name}: ${err.message}\n`); }
}

process.stdout.write('\n╔══════════════════════════════════════════════════════════════╗\n');
process.stdout.write('║  Heady™ Middleware & Security Integration Tests             ║\n');
process.stdout.write('╚══════════════════════════════════════════════════════════════╝\n\n');

// ─── AppError Tests ───────────────────────────────────────────────────────────

test('AppError.badRequest creates 400', () => {
  const err = AppError.badRequest('test');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.code, 'HEADY-BAD-REQUEST-400');
});

test('AppError.unauthorized creates 401', () => {
  const err = AppError.unauthorized();
  assert.strictEqual(err.statusCode, 401);
});

test('AppError.tooManyRequests creates 429', () => {
  const err = AppError.tooManyRequests();
  assert.strictEqual(err.statusCode, 429);
  assert.strictEqual(err.code, 'HEADY-RATE-429');
});

test('AppError.toJSON excludes stack', () => {
  const err = AppError.notFound('User');
  const json = err.toJSON();
  assert.strictEqual(json.statusCode, 404);
  assert(!json.stack, 'stack should not be in JSON');
});

// ─── Config Loader Tests ──────────────────────────────────────────────────────

test('loadConfig with JWT_SECRET succeeds', () => {
  const config = loadConfig({ JWT_SECRET: 'test-secret' });
  assert.strictEqual(config.auth.jwtSecret, 'test-secret');
  assert.strictEqual(config.auth.cookieHttpOnly, true);  // always true
  assert.strictEqual(config.rateLimits.anonymous, fib(9));
  assert.strictEqual(config.rateLimits.authenticated, fib(11));
});

test('loadConfig without JWT_SECRET throws in production', () => {
  try {
    loadConfig({ NODE_ENV: 'production' });
    assert.fail('should have thrown');
  } catch (err) {
    assert.strictEqual(err.code, 'HEADY-CONFIG-MISSING');
  }
});

// ─── Input Validator Tests ────────────────────────────────────────────────────

test('validateInput accepts clean input', () => {
  const result = validateInput('hello world');
  assert.strictEqual(result.safe, true);
  assert.strictEqual(result.threats.length, 0);
});

test('validateInput detects XSS', () => {
  const result = validateInput('<script>alert(1)</script>');
  assert.strictEqual(result.safe, false);
  assert(result.threats.includes('XSS_SCRIPT'));
});

test('validateInput detects SQL injection', () => {
  const result = validateInput("' OR 1=1 --");
  assert.strictEqual(result.safe, false);
  assert(result.threats.includes('SQL_INJECTION'));
});

test('validateInput rejects oversized input', () => {
  const result = validateInput('x'.repeat(fib(17) + 1));
  assert.strictEqual(result.safe, false);
});

test('MAX_INPUT_LENGTH is fib(17) = 1597', () => {
  assert.strictEqual(MAX_INPUT_LENGTH, 1597);
});

test('MAX_JSON_DEPTH is fib(7) = 13', () => {
  assert.strictEqual(MAX_JSON_DEPTH, 13);
});

test('MAX_ARRAY_ITEMS is fib(14) = 377', () => {
  assert.strictEqual(MAX_ARRAY_ITEMS, 377);
});

// ─── Secret Manager Tests ─────────────────────────────────────────────────────

test('SecretManager.get returns env value', () => {
  process.env.TEST_SECRET_KEY = 'test-value';
  const sm = new SecretManager();
  assert.strictEqual(sm.get('TEST_SECRET_KEY'), 'test-value');
  delete process.env.TEST_SECRET_KEY;
});

test('SecretManager.require throws on missing', () => {
  const sm = new SecretManager();
  try {
    sm.require('DEFINITELY_NOT_SET_12345');
    assert.fail('should have thrown');
  } catch (err) {
    assert.strictEqual(err.code, 'HEADY-SECRET-MISSING');
  }
});

// ─── Retry Helper Tests ──────────────────────────────────────────────────────

test('withRetry succeeds on first try', async () => {
  const result = await withRetry(async () => 42);
  assert.strictEqual(result, 42);
});

test('isTransientHttpError identifies 503', () => {
  assert.strictEqual(isTransientHttpError({ statusCode: 503 }), true);
  assert.strictEqual(isTransientHttpError({ statusCode: 404 }), false);
});

process.stdout.write(`\n${'═'.repeat(60)}\n`);
process.stdout.write(`  Results: ${passed} passed, ${failed} failed\n`);
process.stdout.write(`${'═'.repeat(60)}\n\n`);
process.exit(failed > 0 ? 1 : 0);
