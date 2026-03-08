import { CSL_THRESHOLDS, FIB, PHI, PHI_CUBED, PHI_SQUARED, PSI } from './constants.js';

export { PHI, PSI, PHI_SQUARED, PHI_CUBED, FIB, CSL_THRESHOLDS };

export function fib(index: number): number {
  if (index < 1) return 1;
  if (index <= FIB.length) return FIB[index - 1];
  let a = FIB[FIB.length - 2];
  let b = FIB[FIB.length - 1];
  for (let i = FIB.length; i < index; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

export function phiPower(power: number): number {
  return PHI ** power;
}

export function phiThreshold(level: number, spread = 0.5): number {
  return 1 - ((PSI ** level) * spread);
}

export function phiBackoff(attempt: number, baseMs = 1000, maxMs = 60000): number {
  return Math.min(maxMs, Math.round(baseMs * (PHI ** attempt)));
}

export function phiFusionWeights(count: number): number[] {
  const weights = Array.from({ length: count }, (_, index) => PHI ** (count - index - 1));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => Number((value / total).toFixed(3)));
}
