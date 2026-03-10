'use strict';

const { CSL_THRESHOLDS, PSI, cslGate, phiFusionWeights } = require('./phi-math');

function dot(a, b) {
  if (a.length !== b.length) {
    throw new Error(`dot(a,b) requires vectors of equal length. Received ${a.length} and ${b.length}.`);
  }
  let total = 0;
  for (let index = 0; index < a.length; index += 1) {
    total += a[index] * b[index];
  }
  return total;
}

function norm(vector) {
  return Math.sqrt(dot(vector, vector));
}

function normalize(vector) {
  const magnitude = norm(vector);
  if (magnitude === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(a, b) {
  const left = norm(a);
  const right = norm(b);
  if (left === 0 || right === 0) {
    return 0;
  }
  return dot(a, b) / (left * right);
}

function cslAND(a, b) {
  return cosineSimilarity(a, b);
}

function cslOR(a, b) {
  return normalize(a.map((value, index) => value + b[index]));
}

function cslNOT(a, b) {
  const denominator = dot(b, b);
  if (denominator === 0) {
    return [...a];
  }
  const scale = dot(a, b) / denominator;
  return a.map((value, index) => value - (scale * b[index]));
}

function cslIMPLY(a, b) {
  const denominator = dot(b, b);
  if (denominator === 0) {
    return a.map(() => 0);
  }
  const scale = dot(a, b) / denominator;
  return b.map((value) => value * scale);
}

function cslXOR(a, b) {
  return normalize(cslOR(a, b).map((value, index) => value - cslIMPLY(a, b)[index]));
}

function cslCONSENSUS(vectors, weights = phiFusionWeights(vectors.length)) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    return [];
  }
  const dimension = vectors[0].length;
  const aggregate = Array.from({ length: dimension }, () => 0);
  for (let vectorIndex = 0; vectorIndex < vectors.length; vectorIndex += 1) {
    for (let dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex += 1) {
      aggregate[dimensionIndex] += vectors[vectorIndex][dimensionIndex] * weights[vectorIndex];
    }
  }
  return normalize(aggregate);
}

function ternaryClassify(score) {
  if (score >= PSI) return 'TRUE';
  if (score <= -PSI) return 'FALSE';
  return 'UNKNOWN';
}

function gatedConfidence(score, threshold = CSL_THRESHOLDS.LOW) {
  return cslGate(1, score, threshold);
}

module.exports = {
  dot,
  norm,
  normalize,
  cosineSimilarity,
  cslAND,
  cslOR,
  cslNOT,
  cslIMPLY,
  cslXOR,
  cslCONSENSUS,
  ternaryClassify,
  gatedConfidence
};
