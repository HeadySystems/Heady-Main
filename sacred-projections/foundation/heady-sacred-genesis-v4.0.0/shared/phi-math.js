'use strict';

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;
const PHI_SQ = PHI * PHI;
const PHI_CUBE = PHI_SQ * PHI;
const PHI_4 = PHI_CUBE * PHI;
const PHI_5 = PHI_4 * PHI;
const PHI_6 = PHI_5 * PHI;
const PHI_7 = PHI_6 * PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI2 * PSI;
const PSI4 = PSI3 * PSI;
const GOLDEN_ANGLE_DEG = 360 * PSI2;
const GOLDEN_ANGLE_RAD = GOLDEN_ANGLE_DEG * (Math.PI / 180);

const FIB_CACHE = new Map([[0, 0], [1, 1], [2, 1]]);

function fib(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError(`fib(n) requires a non-negative integer. Received: ${n}`);
  }
  if (FIB_CACHE.has(n)) {
    return FIB_CACHE.get(n);
  }
  for (let index = 3; index <= n; index += 1) {
    if (!FIB_CACHE.has(index)) {
      FIB_CACHE.set(index, FIB_CACHE.get(index - 1) + FIB_CACHE.get(index - 2));
    }
  }
  return FIB_CACHE.get(n);
}

function nearestFib(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`nearestFib(value) requires a finite non-negative number. Received: ${value}`);
  }
  let index = 1;
  let previous = fib(index);
  while (fib(index) < value) {
    previous = fib(index);
    index += 1;
  }
  const current = fib(index);
  return Math.abs(current - value) < Math.abs(previous - value) ? current : previous;
}

function phiThreshold(level, spread = 0.5) {
  return 1 - (Math.pow(PSI, level) * spread);
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM: phiThreshold(0),
  LOW: phiThreshold(1),
  MEDIUM: phiThreshold(2),
  HIGH: phiThreshold(3),
  CRITICAL: phiThreshold(4)
});

function phiBackoff(attempt, baseMs = 1000, maxMs = Math.round(PHI_5 * 1000)) {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new TypeError(`phiBackoff(attempt) requires a non-negative integer. Received: ${attempt}`);
  }
  return Math.min(Math.round(baseMs * Math.pow(PHI, attempt)), maxMs);
}

function phiTimeout(power) {
  return Math.round(Math.pow(PHI, power) * 1000);
}

function phiFusionWeights(count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError(`phiFusionWeights(count) requires a positive integer. Received: ${count}`);
  }
  const raw = Array.from({ length: count }, (_, index) => Math.pow(PSI, index + 1));
  const sum = raw.reduce((total, value) => total + value, 0);
  return raw.map((value) => value / sum);
}

function phiResourceWeights() {
  return Object.freeze({
    hot: fib(9),
    warm: fib(8),
    cold: fib(7),
    reserve: fib(6),
    governance: fib(5)
  });
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function cslGate(value, cosineScore, threshold = CSL_THRESHOLDS.LOW, temperature = PSI3) {
  const scaled = (cosineScore - threshold) / temperature;
  return value * sigmoid(scaled);
}

function pressureLevel(loadRatio) {
  if (loadRatio < PSI2) return 'NOMINAL';
  if (loadRatio < PSI) return 'ELEVATED';
  if (loadRatio < (1 - PSI3)) return 'HIGH';
  if (loadRatio < (1 - PSI4)) return 'CRITICAL';
  return 'EXCEEDED';
}

const AUTO_SUCCESS = Object.freeze({
  CYCLE_MS: Math.round(PHI_7 * 1000),
  TASK_TIMEOUT_MS: Math.round(PHI_CUBE * 1000),
  CATEGORY_COUNT: fib(7),
  TASK_TARGET: fib(12),
  TIER_WEIGHTS: Object.freeze({
    critical: PSI2,
    high: PSI3,
    standard: PSI4,
    growth: Math.pow(PSI, 5)
  })
});

const PIPELINE_PATHS = Object.freeze({
  FAST_PATH: Object.freeze([0, 1, 2, 7, 12, 13, 20]),
  FULL_PATH: Object.freeze(Array.from({ length: fib(8) }, (_, index) => index)),
  ARENA_PATH: Object.freeze([0, 1, 2, 3, 4, 8, 9, 10, 20]),
  LEARNING_PATH: Object.freeze([0, 1, 16, 17, 18, 19, 20])
});

module.exports = {
  PHI,
  PSI,
  PHI_SQ,
  PHI_CUBE,
  PHI_4,
  PHI_5,
  PHI_6,
  PHI_7,
  PSI2,
  PSI3,
  PSI4,
  GOLDEN_ANGLE_DEG,
  GOLDEN_ANGLE_RAD,
  AUTO_SUCCESS,
  CSL_THRESHOLDS,
  PIPELINE_PATHS,
  fib,
  nearestFib,
  phiThreshold,
  phiBackoff,
  phiTimeout,
  phiFusionWeights,
  phiResourceWeights,
  cslGate,
  pressureLevel
};
