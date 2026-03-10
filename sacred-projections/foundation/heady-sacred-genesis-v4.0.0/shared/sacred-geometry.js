'use strict';

const {
  PHI,
  PHI_SQ,
  PHI_CUBE,
  PHI_4,
  GOLDEN_ANGLE_RAD,
  CSL_THRESHOLDS,
  fib
} = require('./phi-math');

const RINGS = Object.freeze({
  CENTER: Object.freeze({ name: 'CENTER', radius: 1, threshold: CSL_THRESHOLDS.HIGH, capacity: fib(1) }),
  INNER: Object.freeze({ name: 'INNER', radius: PHI, threshold: CSL_THRESHOLDS.HIGH, capacity: fib(4) }),
  MIDDLE: Object.freeze({ name: 'MIDDLE', radius: PHI_SQ, threshold: CSL_THRESHOLDS.MEDIUM, capacity: fib(6) }),
  OUTER: Object.freeze({ name: 'OUTER', radius: PHI_CUBE, threshold: CSL_THRESHOLDS.LOW, capacity: fib(7) }),
  GOVERNANCE: Object.freeze({ name: 'GOVERNANCE', radius: PHI_4, threshold: CSL_THRESHOLDS.HIGH, capacity: fib(6) })
});

function polarToCartesian(radius, angleRadians) {
  return Object.freeze({ x: radius * Math.cos(angleRadians), y: radius * Math.sin(angleRadians) });
}

function buildNodeLayout(nodeCount = fib(8)) {
  return Array.from({ length: nodeCount }, (_, index) => {
    const ringNames = Object.keys(RINGS);
    const ringName = ringNames[index % ringNames.length];
    const ring = RINGS[ringName];
    const angle = index * GOLDEN_ANGLE_RAD;
    return Object.freeze({
      id: `node-${index + 1}`,
      ring: ring.name,
      angle,
      ...polarToCartesian(ring.radius, angle)
    });
  });
}

class CoherenceTracker {
  constructor(historyLimit = fib(10)) {
    this.historyLimit = historyLimit;
    this.history = [];
  }

  record(score, metadata = {}) {
    this.history.push(Object.freeze({ score, metadata, at: new Date().toISOString() }));
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  current() {
    if (this.history.length === 0) {
      return 1;
    }
    return this.history[this.history.length - 1].score;
  }

  average() {
    if (this.history.length === 0) {
      return 1;
    }
    return this.history.reduce((total, entry) => total + entry.score, 0) / this.history.length;
  }

  level() {
    const score = this.current();
    if (score >= CSL_THRESHOLDS.HIGH) return 'OPTIMAL';
    if (score >= CSL_THRESHOLDS.MEDIUM) return 'HEALTHY';
    if (score >= CSL_THRESHOLDS.LOW) return 'WARNING';
    if (score >= CSL_THRESHOLDS.MINIMUM) return 'DEGRADED';
    return 'CRITICAL';
  }
}

module.exports = {
  RINGS,
  polarToCartesian,
  buildNodeLayout,
  CoherenceTracker
};
