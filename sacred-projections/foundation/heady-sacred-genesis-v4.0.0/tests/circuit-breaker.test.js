'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CircuitBreaker, CIRCUIT_STATES } = require('../src/resilience/circuit-breaker');
const { fib } = require('../shared/phi-math');

test('circuit breaker opens after fibonacci failure threshold', async () => {
  const breaker = new CircuitBreaker('test-breaker');
  for (let index = 0; index < fib(5); index += 1) {
    try {
      await breaker.execute(async () => {
        throw new Error('forced failure');
      });
    } catch (error) {
      assert.equal(error.message, 'forced failure');
    }
  }
  assert.equal(breaker.snapshot().state, CIRCUIT_STATES.OPEN);
});
