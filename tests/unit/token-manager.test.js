/**
 * Heady™ Latent OS v5.3.0
 * Tests: Token Manager
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */
'use strict';

const assert = require('assert');
const {
  generateToken,
  verifyToken,
  revokeToken,
  refreshToken,
  buildCookieOptions,
  SHORT_SESSION_MS,
  LONG_SESSION_MS,
} = require('../../src/security/token-manager');
const { PHI_TIMING } = require('../../shared/phi-math');

const SECRET = 'test-secret-phi-' + Math.random();
let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    process.stdout.write(JSON.stringify({ level: 'info', test: name, status: 'PASS' }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ level: 'error', test: name, status: 'FAIL', error: err.message }) + '\n');
  }
}

// ─── Token Generation Tests ─────────────────────────────────────────────────

test('generateToken produces valid JWT-like structure', () => {
  const token = generateToken({ uid: 'user_1' }, SECRET);
  const parts = token.split('.');
  assert.strictEqual(parts.length, 3, 'should have 3 parts');
});

test('generateToken includes payload fields', () => {
  const token = generateToken({ uid: 'user_1', email: 'test@test.com' }, SECRET);
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  assert.strictEqual(payload.uid, 'user_1');
  assert.strictEqual(payload.email, 'test@test.com');
  assert.ok(payload.jti, 'should have token ID');
  assert.ok(payload.iat, 'should have issued-at');
  assert.ok(payload.exp, 'should have expiry');
});

test('generateToken SHORT_SESSION_MS uses PHI_TIMING.PHI_7', () => {
  assert.strictEqual(SHORT_SESSION_MS, PHI_TIMING.PHI_7, 'short session should match PHI_7');
});

// ─── Token Verification Tests ───────────────────────────────────────────────

test('verifyToken succeeds for valid token', () => {
  const token = generateToken({ uid: 'user_2' }, SECRET);
  const result = verifyToken(token, SECRET);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.payload.uid, 'user_2');
});

test('verifyToken fails for wrong secret', () => {
  const token = generateToken({ uid: 'user_3' }, SECRET);
  const result = verifyToken(token, 'wrong-secret');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'invalid_signature');
});

test('verifyToken fails for tampered payload', () => {
  const token = generateToken({ uid: 'user_4' }, SECRET);
  const parts = token.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ uid: 'hacker' })).toString('base64url');
  const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const result = verifyToken(tampered, SECRET);
  assert.strictEqual(result.valid, false);
});

test('verifyToken fails for invalid structure', () => {
  const result = verifyToken('not.a.valid.token.too.many.parts', SECRET);
  assert.strictEqual(result.valid, false);
});

// ─── Token Revocation Tests ─────────────────────────────────────────────────

test('revokeToken prevents subsequent verification', () => {
  const token = generateToken({ uid: 'user_5' }, SECRET);
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  revokeToken(payload.jti);
  const result = verifyToken(token, SECRET);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'token_revoked');
});

// ─── Token Refresh Tests ────────────────────────────────────────────────────

test('refreshToken produces new valid token', () => {
  const oldToken = generateToken({ uid: 'user_6' }, SECRET);
  const result = refreshToken(oldToken, SECRET);
  assert.strictEqual(result.success, true);
  assert.ok(result.token, 'should produce new token');
  assert.notStrictEqual(result.token, oldToken, 'new token should differ');
  const verify = verifyToken(result.token, SECRET);
  assert.strictEqual(verify.valid, true);
});

test('refreshToken revokes old token', () => {
  const oldToken = generateToken({ uid: 'user_7' }, SECRET);
  refreshToken(oldToken, SECRET);
  const result = verifyToken(oldToken, SECRET);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'token_revoked');
});

test('refreshToken fails for invalid token', () => {
  const result = refreshToken('garbage.token.value', SECRET);
  assert.strictEqual(result.success, false);
});

// ─── Cookie Options Tests ───────────────────────────────────────────────────

test('buildCookieOptions returns httpOnly, secure, sameSite', () => {
  const opts = buildCookieOptions();
  assert.strictEqual(opts.httpOnly, true);
  assert.strictEqual(opts.secure, true);
  assert.strictEqual(opts.sameSite, 'Lax');
  assert.strictEqual(opts.path, '/');
});

test('buildCookieOptions rememberMe increases maxAge', () => {
  const short = buildCookieOptions({ rememberMe: false });
  const long = buildCookieOptions({ rememberMe: true });
  assert.ok(long.maxAge > short.maxAge, 'remember-me should have longer maxAge');
});

// ─── Summary ────────────────────────────────────────────────────────────────

process.stdout.write(JSON.stringify({
  level: 'info',
  suite: 'token-manager',
  passed,
  total,
  status: passed === total ? 'ALL_PASS' : 'SOME_FAIL',
}) + '\n');

process.exit(passed === total ? 0 : 1);
