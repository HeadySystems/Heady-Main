/**
 * Heady™ Latent OS v5.3.0
 * Integration Tests: Security Headers
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */
'use strict';

const assert = require('assert');
const { securityHeadersMiddleware, buildCSPSources, HSTS_MAX_AGE } = require('../../src/security/security-headers');
const { HEADY_DOMAINS, ADMIN_SUBDOMAINS } = require('../../shared/heady-domains');
const { fib } = require('../../shared/phi-math');

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

// Mock response
function mockRes() {
  const headers = {};
  return {
    setHeader: (key, value) => { headers[key] = value; },
    getHeaders: () => headers,
  };
}

// ─── CSP Sources Tests ──────────────────────────────────────────────────────

test('buildCSPSources includes all 9 domains', () => {
  const sources = buildCSPSources();
  for (const domain of Object.values(HEADY_DOMAINS)) {
    assert.ok(
      sources.includes(`https://${domain.host}`),
      `should include ${domain.host}`
    );
  }
});

test('buildCSPSources includes admin subdomains', () => {
  const sources = buildCSPSources();
  for (const sub of ADMIN_SUBDOMAINS) {
    assert.ok(sources.includes(`https://${sub}`), `should include ${sub}`);
  }
});

// ─── HSTS Tests ─────────────────────────────────────────────────────────────

test('HSTS_MAX_AGE is φ-derived (fib(11) × fib(12) × fib(10))', () => {
  const expected = fib(11) * fib(12) * fib(10); // 89 × 144 × 55
  assert.strictEqual(HSTS_MAX_AGE, expected);
});

// ─── Middleware Tests ───────────────────────────────────────────────────────

test('securityHeadersMiddleware sets all required headers', () => {
  const middleware = securityHeadersMiddleware();
  const res = mockRes();
  const req = {};

  middleware(req, res, () => {});

  const headers = res.getHeaders();
  assert.ok(headers['Strict-Transport-Security'], 'should set HSTS');
  assert.ok(headers['Content-Security-Policy'], 'should set CSP');
  assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(headers['X-Frame-Options'], 'DENY');
  assert.strictEqual(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headers['Permissions-Policy'], 'should set Permissions-Policy');
});

test('CSP includes auth bridge frame-src', () => {
  const middleware = securityHeadersMiddleware();
  const res = mockRes();
  middleware({}, res, () => {});
  const csp = res.getHeaders()['Content-Security-Policy'];
  assert.ok(csp.includes('frame-src'), 'should have frame-src directive');
  assert.ok(csp.includes('auth.headysystems.com'), 'should allow auth bridge');
});

test('CSP includes upgrade-insecure-requests', () => {
  const middleware = securityHeadersMiddleware();
  const res = mockRes();
  middleware({}, res, () => {});
  const csp = res.getHeaders()['Content-Security-Policy'];
  assert.ok(csp.includes('upgrade-insecure-requests'));
});

test('HSTS includes includeSubDomains and preload', () => {
  const middleware = securityHeadersMiddleware();
  const res = mockRes();
  middleware({}, res, () => {});
  const hsts = res.getHeaders()['Strict-Transport-Security'];
  assert.ok(hsts.includes('includeSubDomains'));
  assert.ok(hsts.includes('preload'));
});

// ─── Summary ────────────────────────────────────────────────────────────────

process.stdout.write(JSON.stringify({
  level: 'info',
  suite: 'security-headers-integration',
  passed,
  total,
  status: passed === total ? 'ALL_PASS' : 'SOME_FAIL',
}) + '\n');

process.exit(passed === total ? 0 : 1);
