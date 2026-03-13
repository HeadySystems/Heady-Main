// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY LATENT SPACE — Vector Routing & Semantic Memory          ║
// ║  FILE: src/hc_latent_space.js                                   ║
// ║  LAYER: core                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HCLatentSpace — Manages vector embeddings, semantic routing,
 * and 3D persistent vector storage for the Heady cognitive pipeline.
 *
 * Integrates with Pinecone, DuckDB-VSS, or in-memory fallback.
 */

const PHI = 1.6180339887;
const DIMENSIONS = 384; // sentence-transformers default

class HCLatentSpace {
  constructor(opts = {}) {
    this.dimensions = opts.dimensions || DIMENSIONS;
    this.store = new Map();
    this.index = [];
    this.stats = {
      totalEmbeddings: 0,
      totalSearches: 0,
      avgSearchMs: 0,
      createdAt: new Date().toISOString(),
    };
    this.backend = opts.backend || "memory"; // "pinecone" | "duckdb" | "memory"
  }

  /**
   * Store a vector embedding with metadata.
   */
  embed(id, vector, metadata = {}) {
    if (!Array.isArray(vector) || vector.length !== this.dimensions) {
      // Auto-pad or truncate to correct dimensions
      vector = this._normalizeVector(vector || []);
    }
    const entry = {
      id,
      vector,
      metadata,
      norm: this._l2Norm(vector),
      storedAt: new Date().toISOString(),
    };
    this.store.set(id, entry);
    this.index.push(id);
    this.stats.totalEmbeddings++;
    return entry;
  }

  /**
   * Semantic search — cosine similarity nearest neighbors.
   */
  search(queryVector, opts = {}) {
    const start = Date.now();
    const limit = opts.limit || 13; // fib(7)
    const minScore = opts.minScore || 0.618; // 1/φ default gate

    queryVector = this._normalizeVector(queryVector || []);
    const queryNorm = this._l2Norm(queryVector);

    const results = [];
    for (const [id, entry] of this.store) {
      const score = this._cosineSimilarity(queryVector, entry.vector, queryNorm, entry.norm);
      if (score >= minScore) {
        results.push({ id, score, metadata: entry.metadata });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const elapsed = Date.now() - start;
    this.stats.totalSearches++;
    this.stats.avgSearchMs = Math.round(
      (this.stats.avgSearchMs * (this.stats.totalSearches - 1) + elapsed) / this.stats.totalSearches
    );

    return {
      results: results.slice(0, limit),
      totalCandidates: this.store.size,
      elapsed,
      ts: new Date().toISOString(),
    };
  }

  /**
   * Scan full vector storage — used by Stage 0 of HCFullPipeline.
   */
  scan(opts = {}) {
    const namespaces = {};
    for (const [id, entry] of this.store) {
      const ns = entry.metadata?.namespace || "default";
      if (!namespaces[ns]) namespaces[ns] = { count: 0, ids: [] };
      namespaces[ns].count++;
      namespaces[ns].ids.push(id);
    }

    return {
      ok: true,
      backend: this.backend,
      dimensions: this.dimensions,
      totalEmbeddings: this.store.size,
      namespaces,
      stats: this.stats,
      ts: new Date().toISOString(),
    };
  }

  /**
   * Delete an embedding by ID.
   */
  remove(id) {
    const existed = this.store.delete(id);
    if (existed) {
      this.index = this.index.filter(i => i !== id);
    }
    return { removed: existed, id };
  }

  /**
   * Get status summary for API endpoints.
   */
  getStatus() {
    return {
      backend: this.backend,
      dimensions: this.dimensions,
      totalEmbeddings: this.store.size,
      stats: this.stats,
      phi: PHI,
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────

  _normalizeVector(v) {
    const result = new Float64Array(this.dimensions);
    for (let i = 0; i < this.dimensions && i < v.length; i++) {
      result[i] = v[i] || 0;
    }
    return Array.from(result);
  }

  _l2Norm(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
    return Math.sqrt(sum);
  }

  _cosineSimilarity(a, b, normA, normB) {
    if (normA === 0 || normB === 0) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot / (normA * normB);
  }

  _dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * (b[i] || 0);
    return sum;
  }
}

// ─── Express Route Registration ────────────────────────────────────

function registerLatentSpaceRoutes(app, latentSpace) {
  app.get("/api/latent-space/status", (req, res) => {
    res.json({ ok: true, ...latentSpace.getStatus(), ts: new Date().toISOString() });
  });

  app.get("/api/latent-space/scan", (req, res) => {
    const result = latentSpace.scan();
    res.json(result);
  });

  app.post("/api/latent-space/embed", (req, res) => {
    const { id, vector, metadata } = req.body;
    if (!id) return res.status(400).json({ error: "id required" });
    const entry = latentSpace.embed(id, vector || [], metadata || {});
    res.json({ ok: true, embedded: entry.id, dimensions: latentSpace.dimensions });
  });

  app.post("/api/latent-space/search", (req, res) => {
    const { vector, limit, minScore } = req.body;
    const results = latentSpace.search(vector || [], { limit, minScore });
    res.json({ ok: true, ...results });
  });

  app.delete("/api/latent-space/:id", (req, res) => {
    const result = latentSpace.remove(req.params.id);
    res.json({ ok: true, ...result });
  });
}

module.exports = { HCLatentSpace, registerLatentSpaceRoutes };
