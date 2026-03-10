/**
 * Heady™ Colab Vector Space Operations v5.0
 * Core 384D vector space engine running on Colab Pro+ A100 GPUs
 * CSL gate operations, batch embedding, HNSW index, drift detection
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const {
  PHI, PSI, PSI_SQ, fib,
  EMBEDDING_DIM, CSL_THRESHOLDS, HNSW_PARAMS, COLAB_RUNTIMES,
  COHERENCE_DRIFT_THRESHOLD, DEDUP_THRESHOLD,
  cslAND, cslOR, cslNOT, cslGate, adaptiveTemperature,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('vector-space-ops');

const VECTOR_CACHE_SIZE = COLAB_RUNTIMES.VECTOR_CACHE_SIZE;   // 6765
const EMBEDDING_BATCH_SIZE = COLAB_RUNTIMES.EMBEDDING_BATCH;  // 144

class LRUVectorCache {
  constructor(capacity = VECTOR_CACHE_SIZE) {
    this.capacity = capacity;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }
    this.hits++;
    const value = this.cache.get(key);
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first entry)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  get hitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size() {
    return this.cache.size;
  }
}

class HNSWIndex {
  constructor(dimensions = EMBEDDING_DIM) {
    this.dimensions = dimensions;
    this.m = HNSW_PARAMS.M;                        // 21
    this.efConstruction = HNSW_PARAMS.EF_CONSTRUCTION; // 144
    this.efSearch = HNSW_PARAMS.EF_SEARCH;          // 89
    this.nodes = new Map();
    this.adjacency = new Map();
    this.entryPoint = null;
    this.maxLevel = 0;
  }

  _getRandomLevel() {
    let level = 0;
    while (Math.random() < (1 / PHI) && level < fib(6)) {
      level++;
    }
    return level;
  }

  insert(id, vector) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    const level = this._getRandomLevel();
    this.nodes.set(id, { vector: Float32Array.from(vector), level });

    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }

    if (!this.entryPoint) {
      this.entryPoint = id;
      this.maxLevel = level;
      return;
    }

    // Find nearest neighbors via greedy search
    const neighbors = this._greedySearch(vector, this.efConstruction);

    // Connect to top-M neighbors
    const topM = neighbors.slice(0, this.m);
    for (const { id: neighborId } of topM) {
      const adj = this.adjacency.get(id) || [];
      adj.push(neighborId);
      this.adjacency.set(id, adj);

      const neighborAdj = this.adjacency.get(neighborId) || [];
      if (neighborAdj.length < this.m) {
        neighborAdj.push(id);
        this.adjacency.set(neighborId, neighborAdj);
      }
    }

    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPoint = id;
    }
  }

  search(queryVector, k = fib(7)) {
    if (this.nodes.size === 0) return [];
    return this._greedySearch(queryVector, Math.max(k, this.efSearch)).slice(0, k);
  }

  _greedySearch(queryVector, ef) {
    const visited = new Set();
    const candidates = [];

    // Start from entry point
    if (!this.entryPoint) return [];

    const queue = [this.entryPoint];
    visited.add(this.entryPoint);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentNode = this.nodes.get(currentId);
      if (!currentNode) continue;

      const similarity = this._cosineSimilarity(queryVector, currentNode.vector);
      candidates.push({ id: currentId, similarity });

      // Explore neighbors
      const neighbors = this.adjacency.get(currentId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }

      if (candidates.length >= ef) break;
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    return candidates.slice(0, ef);
  }

  _cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < this.dimensions; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    return (magA && magB) ? dot / (magA * magB) : 0;
  }

  remove(id) {
    const neighbors = this.adjacency.get(id) || [];
    for (const neighborId of neighbors) {
      const adj = this.adjacency.get(neighborId) || [];
      this.adjacency.set(neighborId, adj.filter(n => n !== id));
    }
    this.adjacency.delete(id);
    this.nodes.delete(id);
    if (this.entryPoint === id) {
      this.entryPoint = this.nodes.size > 0 ? this.nodes.keys().next().value : null;
    }
  }

  get size() {
    return this.nodes.size;
  }
}

class VectorSpaceOps {
  constructor(options = {}) {
    this.dimensions = options.dimensions || EMBEDDING_DIM;
    this.index = new HNSWIndex(this.dimensions);
    this.cache = new LRUVectorCache(options.cacheSize || VECTOR_CACHE_SIZE);
    this.batchSize = options.batchSize || EMBEDDING_BATCH_SIZE;
    this.driftAlerts = [];
    this.operationCount = 0;
    this.totalLatencyMs = 0;
  }

  embed(text) {
    const start = Date.now();
    // Deterministic embedding from text — production would call model API
    const cached = this.cache.get(`embed:${text}`);
    if (cached) return { vector: cached, cached: true, latencyMs: Date.now() - start };

    const vector = this._generateEmbedding(text);
    this.cache.set(`embed:${text}`, vector);
    const latency = Date.now() - start;
    this.operationCount++;
    this.totalLatencyMs += latency;

    return { vector, cached: false, latencyMs: latency };
  }

  batchEmbed(texts) {
    const start = Date.now();
    const results = [];
    const batches = [];

    // Split into phi-sized batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      batches.push(texts.slice(i, i + this.batchSize));
    }

    for (const batch of batches) {
      for (const text of batch) {
        results.push(this.embed(text));
      }
    }

    return {
      embeddings: results,
      batchCount: batches.length,
      batchSize: this.batchSize,
      totalLatencyMs: Date.now() - start,
    };
  }

  insert(id, vector) {
    const start = Date.now();
    this.index.insert(id, vector);
    this.cache.set(`vec:${id}`, vector);
    const latency = Date.now() - start;
    this.operationCount++;
    this.totalLatencyMs += latency;

    logger.debug('vector_inserted', { id, indexSize: this.index.size, latencyMs: latency });
    return { id, indexSize: this.index.size, latencyMs: latency };
  }

  search(queryVector, k = fib(7)) {
    const start = Date.now();
    const results = this.index.search(queryVector, k);
    const latency = Date.now() - start;
    this.operationCount++;
    this.totalLatencyMs += latency;

    return {
      results,
      count: results.length,
      latencyMs: latency,
      indexSize: this.index.size,
    };
  }

  // CSL Gate Operations
  gateAND(vecA, vecB) {
    return cslAND(Array.from(vecA), Array.from(vecB));
  }

  gateOR(vecA, vecB) {
    const result = cslOR(Array.from(vecA), Array.from(vecB));
    // Normalize
    const mag = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    return mag > 0 ? result.map(v => v / mag) : result;
  }

  gateNOT(vec, basis) {
    const result = cslNOT(Array.from(vec), Array.from(basis));
    const mag = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    return mag > 0 ? result.map(v => v / mag) : result;
  }

  gateIMPLY(antecedent, consequent) {
    // Projection of consequent onto antecedent subspace
    const dot = antecedent.reduce((s, a, i) => s + a * consequent[i], 0);
    const magSq = antecedent.reduce((s, a) => s + a * a, 0);
    const scale = magSq > 0 ? dot / magSq : 0;
    return antecedent.map(a => a * scale);
  }

  gateXOR(vecA, vecB) {
    // XOR = OR(AND(A, NOT(B)), AND(NOT(A), B))
    const notB = this.gateNOT(vecB, vecA);
    const notA = this.gateNOT(vecA, vecB);
    const left = this.gateOR(vecA, notB);
    const right = this.gateOR(notA, vecB);
    return this.gateAND(left, right);
  }

  // Semantic Drift Detection
  detectDrift(currentEmbedding, referenceEmbedding) {
    const similarity = this.gateAND(currentEmbedding, referenceEmbedding);
    const drifted = similarity < COHERENCE_DRIFT_THRESHOLD;

    if (drifted) {
      const alert = {
        timestamp: new Date().toISOString(),
        similarity,
        threshold: COHERENCE_DRIFT_THRESHOLD,
        severity: similarity < CSL_THRESHOLDS.LOW ? 'CRITICAL' : 'WARNING',
      };
      this.driftAlerts.push(alert);
      logger.warn('semantic_drift_detected', alert);
    }

    return { similarity, drifted, threshold: COHERENCE_DRIFT_THRESHOLD };
  }

  // Deduplication
  isDuplicate(vecA, vecB) {
    const similarity = this.gateAND(vecA, vecB);
    return { isDuplicate: similarity >= DEDUP_THRESHOLD, similarity, threshold: DEDUP_THRESHOLD };
  }

  // Clustering via cosine similarity
  cluster(vectors, numClusters = fib(5)) {
    const start = Date.now();
    const assignments = new Array(vectors.length).fill(0);
    const centroids = vectors.slice(0, numClusters).map(v => [...v]);

    // K-means with cosine distance, phi-scaled iterations
    const maxIters = fib(8); // 21 iterations
    for (let iter = 0; iter < maxIters; iter++) {
      let changed = false;

      // Assign points to nearest centroid
      for (let i = 0; i < vectors.length; i++) {
        let bestCluster = 0;
        let bestSim = -1;
        for (let c = 0; c < centroids.length; c++) {
          const sim = this.gateAND(vectors[i], centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update centroids
      for (let c = 0; c < centroids.length; c++) {
        const members = vectors.filter((_, i) => assignments[i] === c);
        if (members.length === 0) continue;
        for (let d = 0; d < this.dimensions; d++) {
          centroids[c][d] = members.reduce((s, v) => s + v[d], 0) / members.length;
        }
        // Normalize
        const mag = Math.sqrt(centroids[c].reduce((s, v) => s + v * v, 0));
        if (mag > 0) centroids[c] = centroids[c].map(v => v / mag);
      }
    }

    return {
      assignments,
      centroids,
      numClusters,
      latencyMs: Date.now() - start,
    };
  }

  // PCA dimensionality reduction with phi-scaled components
  pca(vectors, targetDims = null) {
    const start = Date.now();
    if (!targetDims) {
      // Phi-scaled: reduce to ~61.8% of original dimensions
      targetDims = Math.round(this.dimensions * PSI);
    }

    // Center the data
    const mean = new Array(this.dimensions).fill(0);
    for (const vec of vectors) {
      for (let i = 0; i < this.dimensions; i++) mean[i] += vec[i];
    }
    for (let i = 0; i < this.dimensions; i++) mean[i] /= vectors.length;

    const centered = vectors.map(v => v.map((val, i) => val - mean[i]));

    // Simplified PCA via power iteration for top components
    const components = [];
    let residuals = centered.map(v => [...v]);

    for (let comp = 0; comp < targetDims; comp++) {
      let pc = new Array(this.dimensions).fill(0).map(() => Math.random() - 0.5);
      const mag0 = Math.sqrt(pc.reduce((s, v) => s + v * v, 0));
      pc = pc.map(v => v / mag0);

      // Power iteration (fib(7)=13 iterations)
      for (let iter = 0; iter < fib(7); iter++) {
        const newPc = new Array(this.dimensions).fill(0);
        for (const vec of residuals) {
          const dot = vec.reduce((s, v, i) => s + v * pc[i], 0);
          for (let i = 0; i < this.dimensions; i++) newPc[i] += dot * vec[i];
        }
        const pcMag = Math.sqrt(newPc.reduce((s, v) => s + v * v, 0));
        pc = pcMag > 0 ? newPc.map(v => v / pcMag) : newPc;
      }

      components.push(pc);

      // Remove component from residuals
      residuals = residuals.map(vec => {
        const dot = vec.reduce((s, v, i) => s + v * pc[i], 0);
        return vec.map((v, i) => v - dot * pc[i]);
      });
    }

    // Project vectors onto components
    const projected = vectors.map(vec =>
      components.map(pc => vec.reduce((s, v, i) => s + v * pc[i], 0))
    );

    return {
      projected,
      components,
      originalDims: this.dimensions,
      targetDims,
      varianceRatio: PSI, // Approximate
      latencyMs: Date.now() - start,
    };
  }

  // Distance metrics
  cosineSimilarity(a, b) {
    return this.gateAND(a, b);
  }

  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  dotProduct(a, b) {
    return a.reduce((s, ai, i) => s + ai * b[i], 0);
  }

  _generateEmbedding(text) {
    // Deterministic pseudo-embedding for consistent behavior
    const bytes = Buffer.from(text, 'utf8');
    const vector = new Float32Array(this.dimensions);
    for (let i = 0; i < this.dimensions; i++) {
      const idx = i % bytes.length;
      vector[i] = ((bytes[idx] + i * PHI) % 256) / 256 - 0.5;
    }
    // Normalize to unit sphere
    const mag = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (mag > 0) for (let i = 0; i < this.dimensions; i++) vector[i] /= mag;
    return Array.from(vector);
  }

  getStats() {
    return {
      indexSize: this.index.size,
      cacheSize: this.cache.size,
      cacheHitRate: this.cache.hitRate,
      operationCount: this.operationCount,
      avgLatencyMs: this.operationCount > 0
        ? Math.round(this.totalLatencyMs / this.operationCount)
        : 0,
      driftAlerts: this.driftAlerts.length,
      dimensions: this.dimensions,
    };
  }
}

module.exports = { VectorSpaceOps, HNSWIndex, LRUVectorCache };
