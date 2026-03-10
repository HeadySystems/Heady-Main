/**
 * @fileoverview Unit tests for phi-math library
 */
import { PHI, PSI, fib, fibSequence, CSL_THRESHOLDS, cslGate } from '../../src/shared/phi-math.js';

describe('Phi-Math Library', () => {
  test('PHI constant is correct', () => {
    expect(PHI).toBeCloseTo(1.618033988749895, 10);
  });

  test('PSI is reciprocal of PHI', () => {
    expect(PSI).toBeCloseTo(1/PHI, 10);
  });

  test('Fibonacci sequence generation', () => {
    const seq = fibSequence(10);
    expect(seq).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
  });

  test('Individual Fibonacci numbers', () => {
    expect(fib(0)).toBe(0);
    expect(fib(1)).toBe(1);
    expect(fib(10)).toBe(55);
    expect(fib(13)).toBe(233); // MAX_QUEUE_DEPTH
  });

  test('CSL thresholds are phi-derived', () => {
    expect(CSL_THRESHOLDS.HIGH).toBeCloseTo(0.882, 3);
    expect(CSL_THRESHOLDS.MEDIUM).toBeCloseTo(0.809, 3);
    expect(CSL_THRESHOLDS.LOW).toBeCloseTo(0.691, 3);
  });

  test('CSL gate decision logic', () => {
    expect(cslGate(0.9, CSL_THRESHOLDS.HIGH)).toBe(true);
    expect(cslGate(0.8, CSL_THRESHOLDS.HIGH)).toBe(false);
    expect(cslGate(0.8, CSL_THRESHOLDS.MEDIUM)).toBe(false);
  });
});
