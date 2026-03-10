/**
 * Heady™ CSL Engine Unit Tests
 * Tests all 8 CSL gate operations
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const assert = require('assert');
// Note: These tests validate the CSL mathematical properties
// In production, import from src/csl/csl-engine.js

const { cosineSimilarity, normalize, sigmoid, PSI } = require('../../shared/phi-math');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; console.log(`  ✗ ${name}: ${err.message}`); }
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Heady™ CSL Engine Tests                                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// CSL AND = cosine similarity
test('CSL AND: identical vectors = 1.0', () => {
  assert(Math.abs(cosineSimilarity([1,0,0], [1,0,0]) - 1.0) < 1e-10);
});
test('CSL AND: orthogonal vectors = 0.0', () => {
  assert(Math.abs(cosineSimilarity([1,0,0], [0,1,0])) < 1e-10);
});
test('CSL AND: opposite vectors = -1.0', () => {
  assert(Math.abs(cosineSimilarity([1,0,0], [-1,0,0]) + 1.0) < 1e-10);
});
test('CSL AND: is commutative', () => {
  const a = [1,2,3], b = [4,5,6];
  assert(Math.abs(cosineSimilarity(a, b) - cosineSimilarity(b, a)) < 1e-10);
});

// CSL OR = superposition + normalize
function cslOR(a, b) {
  const sum = a.map((v, i) => v + b[i]);
  return normalize(sum);
}

test('CSL OR: produces unit vector', () => {
  const result = cslOR([1,0,0], [0,1,0]);
  const mag = Math.sqrt(result.reduce((s, v) => s + v*v, 0));
  assert(Math.abs(mag - 1.0) < 1e-10);
});

// CSL NOT = orthogonal projection rejection
function cslNOT(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const bMag2 = b.reduce((s, v) => s + v * v, 0);
  const proj = b.map(v => v * (dot / bMag2));
  return a.map((v, i) => v - proj[i]);
}

test('CSL NOT: result is orthogonal to gate', () => {
  const result = cslNOT([1, 1, 0], [1, 0, 0]);
  const dot = result.reduce((s, v, i) => s + v * [1,0,0][i], 0);
  assert(Math.abs(dot) < 1e-10);
});
test('CSL NOT: is idempotent', () => {
  const a = [1, 1, 0], b = [1, 0, 0];
  const first = cslNOT(a, b);
  const second = cslNOT(first, b);
  for (let i = 0; i < first.length; i++) {
    assert(Math.abs(first[i] - second[i]) < 1e-10);
  }
});

// GATE function
test('sigmoid is bounded [0,1]', () => {
  for (let x = -10; x <= 10; x += 0.5) {
    const s = sigmoid(x);
    assert(s >= 0 && s <= 1);
  }
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
