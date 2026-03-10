/**
 * Tests for shared/phi-math-v2.js, csl-engine-v2.js, sacred-geometry-v2.js
 * Author: Eric Haywood | ESM only
 */
import { strict as assert } from 'assert';
import { PHI, PSI, PSI2, phiThreshold, phiBackoff, fibonacci, phiFusionWeights, phiResourceWeights } from '../shared/phi-math-v2.js';
import { cslGate, cslBlend, cosineSimilarity, cslAND, cslOR, cslNOT } from '../shared/csl-engine-v2.js';
import { goldenLayout, fibonacciSpacing, sacredTopology } from '../shared/sacred-geometry-v2.js';

const EPSILON = 1e-6;
function approxEqual(a, b, eps) { return Math.abs(a - b) < (eps || EPSILON); }

// ── PHI Math Tests ───────────────────────────────────────────────
function testPhiConstants() {
  assert.ok(approxEqual(PHI, 1.6180339887, 1e-9), 'PHI ≈ 1.618');
  assert.ok(approxEqual(PSI, 0.6180339887, 1e-9), 'PSI = 1/PHI');
  assert.ok(approxEqual(PSI2, 0.3819660113, 1e-9), 'PSI² = 1-PSI');
  assert.ok(approxEqual(PHI * PSI, 1.0, 1e-9), 'PHI × PSI = 1');
  assert.ok(approxEqual(PHI * PHI, PHI + 1, 1e-9), 'PHI² = PHI + 1');
  console.log('  ✓ PHI constants verified');
}

function testFibonacci() {
  const expected = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
  for (let i = 0; i < expected.length; i++) {
    assert.strictEqual(fibonacci(i + 1), expected[i], 'fib(' + (i + 1) + ') = ' + expected[i]);
  }
  console.log('  ✓ Fibonacci sequence verified (17 values)');
}

function testPhiThreshold() {
  const t0 = phiThreshold(0);
  const t1 = phiThreshold(1);
  const t2 = phiThreshold(2);
  const t3 = phiThreshold(3);
  const t4 = phiThreshold(4);
  assert.ok(t0 < t1 && t1 < t2 && t2 < t3 && t3 < t4, 'Thresholds monotonically increase');
  assert.ok(approxEqual(t0, 0.500, 0.01), 'Level 0 ≈ 0.500');
  assert.ok(approxEqual(t4, 0.927, 0.01), 'Level 4 ≈ 0.927');
  assert.ok(t4 < 1.0, 'Max threshold < 1.0');
  console.log('  ✓ phiThreshold levels verified');
}

function testPhiBackoff() {
  const b0 = phiBackoff(0, 1000, 60000);
  const b1 = phiBackoff(1, 1000, 60000);
  const b2 = phiBackoff(2, 1000, 60000);
  assert.ok(b0 >= 1000, 'Base delay ≥ 1000');
  assert.ok(b1 > b0, 'Backoff increases');
  assert.ok(b2 > b1, 'Backoff continues to increase');
  assert.ok(approxEqual(b1, 1618, 50), 'Attempt 1 ≈ 1618ms');
  const bMax = phiBackoff(20, 1000, 60000);
  assert.ok(bMax <= 60000, 'Capped at max');
  console.log('  ✓ phiBackoff timing verified');
}

function testPhiFusionWeights() {
  const w2 = phiFusionWeights(2);
  assert.ok(approxEqual(w2[0] + w2[1], 1.0, 0.01), '2-way weights sum to ~1');
  assert.ok(approxEqual(w2[0], PSI, 0.01), 'First weight ≈ PSI');
  const w3 = phiFusionWeights(3);
  assert.ok(approxEqual(w3.reduce((a, b) => a + b, 0), 1.0, 0.02), '3-way weights sum to ~1');
  console.log('  ✓ phiFusionWeights verified');
}

// ── CSL Engine Tests ─────────────────────────────────────────────
function testCosineSimilarity() {
  const a = [1, 0, 0];
  const b = [1, 0, 0];
  assert.ok(approxEqual(cosineSimilarity(a, b), 1.0), 'Identical vectors → 1.0');
  const c = [0, 1, 0];
  assert.ok(approxEqual(cosineSimilarity(a, c), 0.0), 'Orthogonal vectors → 0.0');
  const d = [-1, 0, 0];
  assert.ok(approxEqual(cosineSimilarity(a, d), -1.0), 'Antipodal vectors → -1.0');
  console.log('  ✓ Cosine similarity verified');
}

function testCslGate() {
  const high = cslGate(1.0, 0.95, 0.5, 0.236);
  const low = cslGate(1.0, 0.1, 0.5, 0.236);
  assert.ok(high > low, 'High score passes more than low score');
  assert.ok(high > 0.9, 'High-scoring gate ≈ pass-through');
  assert.ok(low < 0.2, 'Low-scoring gate ≈ blocked');
  const zero = cslGate(0.0, 1.0, 0.5, 0.236);
  assert.ok(approxEqual(zero, 0.0, 0.01), 'Zero value → zero output');
  console.log('  ✓ CSL gate verified');
}

function testCslOperations() {
  const v1 = [0.8, 0.2, 0.1];
  const v2 = [0.7, 0.3, 0.2];
  const andResult = cslAND(v1, v2);
  assert.ok(typeof andResult === 'number', 'AND returns scalar');
  assert.ok(andResult > 0 && andResult <= 1, 'AND in valid range');
  const orResult = cslOR(v1, v2);
  assert.ok(Array.isArray(orResult), 'OR returns vector');
  assert.ok(orResult.length === v1.length, 'OR preserves dimensionality');
  const notResult = cslNOT(v1, v2);
  assert.ok(Array.isArray(notResult), 'NOT returns vector');
  console.log('  ✓ CSL operations (AND, OR, NOT) verified');
}

// ── Sacred Geometry Tests ────────────────────────────────────────
function testGoldenLayout() {
  const layout = goldenLayout(1000, 618);
  assert.ok(layout.primary && layout.secondary, 'Layout has primary/secondary');
  assert.ok(approxEqual(layout.primary.width / layout.secondary.width, PHI, 0.5), 'Golden ratio split');
  console.log('  ✓ Golden layout verified');
}

function testFibonacciSpacing() {
  const spacing = fibonacciSpacing(8);
  assert.ok(Array.isArray(spacing), 'Returns array');
  assert.ok(spacing.length === 8, 'Correct count');
  for (let i = 1; i < spacing.length; i++) {
    assert.ok(spacing[i] >= spacing[i - 1], 'Monotonically non-decreasing');
  }
  console.log('  ✓ Fibonacci spacing verified');
}

// ── Run All Tests ────────────────────────────────────────────────
console.log('\n=== Shared Module Tests ===');
testPhiConstants();
testFibonacci();
testPhiThreshold();
testPhiBackoff();
testPhiFusionWeights();
console.log('\n=== CSL Engine Tests ===');
testCosineSimilarity();
testCslGate();
testCslOperations();
console.log('\n=== Sacred Geometry Tests ===');
testGoldenLayout();
testFibonacciSpacing();
console.log('\n✅ All shared module tests passed.');

export default { testPhiConstants, testFibonacci, testPhiThreshold, testPhiBackoff, testCosineSimilarity, testCslGate };
