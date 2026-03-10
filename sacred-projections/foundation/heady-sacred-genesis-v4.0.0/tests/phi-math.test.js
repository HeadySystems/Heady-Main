'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PHI, PSI, fib, phiThreshold, AUTO_SUCCESS } = require('../shared/phi-math');

test('phi and psi preserve reciprocal identity', () => {
  assert.ok(Math.abs((PHI * PSI) - 1) < Number.EPSILON * fib(8));
});

test('phiThreshold ladder is monotonic', () => {
  assert.ok(phiThreshold(4) > phiThreshold(3));
  assert.ok(phiThreshold(3) > phiThreshold(2));
  assert.ok(phiThreshold(2) > phiThreshold(1));
});

test('auto success cycle is phi seventh power in milliseconds', () => {
  assert.equal(AUTO_SUCCESS.CYCLE_MS, 29034);
});
