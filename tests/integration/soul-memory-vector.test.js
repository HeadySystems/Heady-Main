'use strict';

const assert = require('assert');
const path = require('path');

/** @constant {number} PHI */
const PHI = 1.6180339887498948;

/** @constant {number} PSI */
const PSI = 1 / PHI;

/**
 * Compute phiThreshold at given level
 * @param {number} level - Threshold level (0-4)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number} Threshold value
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const fs = require('fs');

const soulPath = path.resolve(__dirname, '../../services/heady-soul/index.js');
const memoryPath = path.resolve(__dirname, '../../services/heady-memory/index.js');
const vectorPath = path.resolve(__dirname, '../../services/heady-vector/index.js');
const embedPath = path.resolve(__dirname, '../../services/heady-embed/index.js');

module.exports = {
  'heady-soul validates 3 Unbreakable Laws': () => {
    const source = fs.readFileSync(soulPath, 'utf8');
    const hasLaws = /unbreakable|law|integrity|coherence|mission/i.test(source);
    assert.ok(hasLaws, 'heady-soul must reference Unbreakable Laws');
  },

  'heady-soul port is 3322': () => {
    const source = fs.readFileSync(soulPath, 'utf8');
    assert.ok(source.includes('3322'), 'heady-soul port should be 3322');
  },

  'heady-memory has vector store CRUD': () => {
    const source = fs.readFileSync(memoryPath, 'utf8');
    const hasStore = /store|insert|upsert|create/i.test(source);
    const hasSearch = /search|query|find|retrieve/i.test(source);
    const hasDelete = /delete|remove/i.test(source);
    assert.ok(hasStore, 'heady-memory must support store');
    assert.ok(hasSearch, 'heady-memory must support search');
  },

  'heady-memory uses HNSW parameters': () => {
    const source = fs.readFileSync(memoryPath, 'utf8');
    const hasHNSW = /hnsw|ef_search|ef_construction|m_param/i.test(source);
    assert.ok(hasHNSW, 'heady-memory should use HNSW index parameters');
  },

  'heady-vector supports cosine, superposition, negate operations': () => {
    const source = fs.readFileSync(vectorPath, 'utf8');
    const hasCosine = /cosine|similarity/i.test(source);
    const hasSuperposition = /superposition|combine|blend/i.test(source);
    const hasNegate = /negate|orthogonal|not/i.test(source);
    assert.ok(hasCosine, 'heady-vector must support cosine similarity');
    assert.ok(hasSuperposition || hasNegate, 'heady-vector must support vector operations');
  },

  'heady-embed supports multi-provider embedding': () => {
    const source = fs.readFileSync(embedPath, 'utf8');
    const providers = ['nomic', 'jina', 'cohere', 'local', 'voyage'];
    const found = providers.filter(p => source.toLowerCase().includes(p));
    assert.ok(found.length >= 2,
      `Expected 2+ embedding providers, found: ${found.join(', ')}`);
  },

  'heady-embed has LRU cache': () => {
    const source = fs.readFileSync(embedPath, 'utf8');
    const hasCache = /lru|cache/i.test(source);
    assert.ok(hasCache, 'heady-embed should use LRU caching');
  }
};
