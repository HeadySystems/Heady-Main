'use strict';

const { cosineSimilarity } = require('../../shared/csl-engine');
const { fib, CSL_THRESHOLDS } = require('../../shared/phi-math');

function hashToken(token) {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = ((hash << 5) - hash) + token.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function embedText(text, dimensions = 384) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    const position = hashToken(token) % dimensions;
    vector[position] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + (value * value), 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

class VectorMemory {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 384;
    this.capacity = options.capacity || fib(17);
    this.entries = [];
  }

  store(content, metadata = {}) {
    const record = Object.freeze({
      id: metadata.id || `memory-${Date.now()}-${this.entries.length + 1}`,
      content,
      metadata,
      vector: embedText(content, this.dimensions),
      storedAt: new Date().toISOString()
    });
    this.entries.push(record);
    if (this.entries.length > this.capacity) {
      this.entries.shift();
    }
    return record;
  }

  search(query, options = {}) {
    const limit = options.limit || fib(7);
    const threshold = options.threshold || CSL_THRESHOLDS.MINIMUM;
    const queryVector = embedText(query, this.dimensions);
    return this.entries
      .map((entry) => ({ ...entry, score: cosineSimilarity(queryVector, entry.vector) }))
      .filter((entry) => entry.score >= threshold)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  summary() {
    return {
      dimensions: this.dimensions,
      entries: this.entries.length,
      capacity: this.capacity
    };
  }
}

module.exports = {
  VectorMemory,
  embedText
};
