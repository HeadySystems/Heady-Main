/**
 * Heady™ φ-Math Foundation Unit Tests
 * Validates all Sacred Geometry constants and functions
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const assert = require('assert');
const {
  PHI, PSI, PHI_SQ, PHI_CUBED, SQRT5,
  fib, fibCeil, fibFloor,
  phiPower, phiMs, PHI_TIMING,
  phiThreshold, CSL_THRESHOLDS,
  phiBackoff, phiBackoffWithJitter,
  phiFusionWeights, phiMultiSplit,
  PRESSURE, getPressureLevel,
  POOLS, JUDGE, COST_W, EVICTION,
  cosineSimilarity, normalize,
  sigmoid, cslGate, cslBlend,
} = require('../../shared/phi-math');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Heady™ φ-Math Foundation Tests                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Core constants
test('PHI ≈ 1.618', () => assert(Math.abs(PHI - 1.618) < 0.001));
test('PSI ≈ 0.618', () => assert(Math.abs(PSI - 0.618) < 0.001));
test('PHI × PSI = 1', () => assert(Math.abs(PHI * PSI - 1) < 1e-10));
test('PHI² = PHI + 1', () => assert(Math.abs(PHI_SQ - PHI - 1) < 1e-10));
test('PHI³ = 2PHI + 1', () => assert(Math.abs(PHI_CUBED - 2 * PHI - 1) < 1e-10));
test('√5 ≈ 2.236', () => assert(Math.abs(SQRT5 - 2.236) < 0.001));

// Fibonacci
test('fib(0) = 0', () => assert.strictEqual(fib(0), 0));
test('fib(1) = 1', () => assert.strictEqual(fib(1), 1));
test('fib(7) = 13', () => assert.strictEqual(fib(7), 13));
test('fib(8) = 21', () => assert.strictEqual(fib(8), 21));
test('fib(12) = 144', () => assert.strictEqual(fib(12), 144));
test('fib(20) = 6765', () => assert.strictEqual(fib(20), 6765));
test('fibCeil(10) = 13', () => assert.strictEqual(fibCeil(10), 13));
test('fibFloor(10) = 8', () => assert.strictEqual(fibFloor(10), 8));

// Timing
test('PHI_TIMING.PHI_7 = 29034', () => assert.strictEqual(PHI_TIMING.PHI_7, 29034));
test('phiMs(1) = 1618', () => assert.strictEqual(phiMs(1), 1618));
test('phiMs(2) = 2618', () => assert.strictEqual(phiMs(2), 2618));

// CSL Thresholds
test('CSL MINIMUM ≈ 0.500', () => assert(Math.abs(CSL_THRESHOLDS.MINIMUM - 0.5) < 0.001));
test('CSL LOW ≈ 0.691', () => assert(Math.abs(CSL_THRESHOLDS.LOW - 0.691) < 0.001));
test('CSL MEDIUM ≈ 0.809', () => assert(Math.abs(CSL_THRESHOLDS.MEDIUM - 0.809) < 0.001));
test('CSL HIGH ≈ 0.882', () => assert(Math.abs(CSL_THRESHOLDS.HIGH - 0.882) < 0.001));
test('CSL CRITICAL ≈ 0.927', () => assert(Math.abs(CSL_THRESHOLDS.CRITICAL - 0.927) < 0.001));

// Backoff
test('phiBackoff(0) = 1000', () => assert.strictEqual(phiBackoff(0), 1000));
test('phiBackoff(1) = 1618', () => assert.strictEqual(phiBackoff(1), 1618));
test('phiBackoff(2) = 2618', () => assert.strictEqual(phiBackoff(2), 2618));

// Fusion weights sum to 1
test('phiFusionWeights(2) sums to 1', () => {
  const w = phiFusionWeights(2);
  assert(Math.abs(w.reduce((s, v) => s + v, 0) - 1) < 0.001);
});
test('phiFusionWeights(5) sums to 1', () => {
  const w = phiFusionWeights(5);
  assert(Math.abs(w.reduce((s, v) => s + v, 0) - 1) < 0.001);
});

// Pools sum correctly
test('POOLS sum ≈ 0.81', () => {
  const sum = POOLS.HOT + POOLS.WARM + POOLS.COLD + POOLS.RESERVE + POOLS.GOVERNANCE;
  assert(Math.abs(sum - 0.81) < 0.01);
});

// Judge weights sum to 1
test('JUDGE weights sum to 1', () => {
  const sum = JUDGE.CORRECTNESS + JUDGE.SAFETY + JUDGE.PERFORMANCE + JUDGE.QUALITY + JUDGE.ELEGANCE;
  assert(Math.abs(sum - 1.0) < 0.01);
});

// Vector math
test('cosineSimilarity identical = 1', () => {
  const v = [1, 2, 3, 4, 5];
  assert(Math.abs(cosineSimilarity(v, v) - 1) < 1e-10);
});
test('cosineSimilarity orthogonal = 0', () => {
  assert(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-10);
});
test('normalize produces unit vector', () => {
  const n = normalize([3, 4]);
  const mag = Math.sqrt(n[0] ** 2 + n[1] ** 2);
  assert(Math.abs(mag - 1) < 1e-10);
});

// CSL gates
test('sigmoid(0) = 0.5', () => assert(Math.abs(sigmoid(0) - 0.5) < 1e-10));
test('cslGate attenuates below threshold', () => {
  // cos=0.0 (orthogonal), far below τ=ψ≈0.618 → sigmoid((-0.618)/0.236)≈0.071
  const result = cslGate(1.0, 0.0, PSI);
  assert(result < PSI * PSI, `expected <${PSI * PSI} got ${result}`); // heavily attenuated
});
test('cslGate passes above threshold', () => {
  // cos=1.0 (aligned) → sigmoid((1.0-0.618)/0.236)≈0.835 > ψ=0.618
  const result = cslGate(1.0, 1.0, PSI);
  assert(result > PSI, `expected >${PSI} got ${result}`); // passes through above ψ
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
