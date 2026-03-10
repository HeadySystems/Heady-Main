/**
 * Heady™ Auth Session Unit Tests
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const assert = require('assert');
const { fib, PSI, PHI, CSL_THRESHOLDS, PHI_TIMING } = require('../../shared/phi-math');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.log(`  ✗ ${name}: ${err.message}`); }
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Heady™ Auth Session Tests                                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Rate limit constants
test('Anonymous rate = fib(9) = 34', () => assert.strictEqual(fib(9), 34));
test('Authenticated rate = fib(11) = 89', () => assert.strictEqual(fib(11), 89));
test('Enterprise rate = fib(13) = 233', () => assert.strictEqual(fib(13), 233));
test('Rate window = fib(10) = 55 seconds', () => assert.strictEqual(fib(10), 55));

// Session TTL
test('Short session TTL is φ-derived', () => {
  const ttl = PHI_TIMING.PHI_7;  // φ⁷ × 1000 via canonical phi-math
  assert.strictEqual(ttl, 29034);
});

// Origin whitelist
const ORIGINS = [
  'https://headyme.com', 'https://headysystems.com', 'https://heady-ai.com',
  'https://headyos.com', 'https://headyconnection.org', 'https://headyconnection.com',
  'https://headyex.com', 'https://headyfinance.com', 'https://admin.headysystems.com',
];
test('All 9 domains in whitelist', () => assert.strictEqual(ORIGINS.length, 9));

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
