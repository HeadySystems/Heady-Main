/**
 * ─── Heady Distributed 3D Vector Memory ──────────────────────────
 * 
 * DISTRIBUTED LIQUID ARCHITECTURE:
 *   - Remote-first: embeddings via HF workers (round-robin across 3 tokens)
 *   - Parallel ingest: fire N worker nodes simultaneously
 *   - Sharded query: split search across worker pool, merge results
 *   - Local JSON: LAST-RESORT fallback only, not primary store
 *   - Every operation → audit + metrics
 *
 * Worker Pool:
 *   Each worker handles a shard of the vector space.
 *   Ingest round-robins across shards.
 *   Query fans out to ALL shards, merges top-K.
 *
 * Embedding: sentence-transformers/all-MiniLM-L6-v2 (384-dim)
 * Timing: φ-derived (golden ratio intervals)
 * ──────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

const PHI = 1.6180339887;
const VECTOR_STORE_PATH = path.join(__dirname, "..", "data", "vector-memory.json");
const SHARD_DIR = path.join(__dirname, "..", "data", "vector-shards");
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const MAX_VECTORS_PER_SHARD = 2000;
const NUM_SHARDS = 5; // φ-adjacent (Fibonacci: 5)
const PERSIST_DEBOUNCE = Math.round(PHI ** 2 * 1000); // φ² = 2,618ms

// Ensure shard directory
if (!fs.existsSync(SHARD_DIR)) fs.mkdirSync(SHARD_DIR, { recursive: true });

// ── Sharded Storage ─────────────────────────────────────────────
const shards = [];
let hfClients = [];
let ingestCount = 0;
let queryCount = 0;
let remoteEmbedCount = 0;
let localFallbackCount = 0;

function initShards() {
    for (let i = 0; i < NUM_SHARDS; i++) {
        const shardPath = path.join(SHARD_DIR, `shard-${i}.json`);
        let vectors = [];
        try {
            if (fs.existsSync(shardPath)) {
                vectors = JSON.parse(fs.readFileSync(shardPath, "utf-8"));
            }
        } catch { }
        shards.push({ id: i, vectors, path: shardPath, dirty: false });
    }

    // Migrate: if old single-file store exists, distribute into shards
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            const data = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, "utf-8"));
            const oldVectors = Array.isArray(data) ? data : data.vectors || [];
            if (oldVectors.length > 0 && shards.every(s => s.vectors.length === 0)) {
                console.log(`  ∞ VectorMemory: Migrating ${oldVectors.length} vectors into ${NUM_SHARDS} shards`);
                oldVectors.forEach((v, i) => {
                    shards[i % NUM_SHARDS].vectors.push(v);
                    shards[i % NUM_SHARDS].dirty = true;
                });
                persistAllShards();
            }
        }
    } catch { }

    const total = shards.reduce((s, sh) => s + sh.vectors.length, 0);
    console.log(`  ∞ VectorMemory: ${NUM_SHARDS} shards loaded, ${total} total vectors`);
}

// ── HF Client Pool (round-robin across tokens) ─────────────────
function initHFClients() {
    try {
        const { InferenceClient } = require("@huggingface/inference");
        const tokens = [process.env.HF_TOKEN, process.env.HF_TOKEN_2, process.env.HF_TOKEN_3]
            .filter(t => t && !t.includes("placeholder"));
        hfClients = tokens.map(t => new InferenceClient(t));
        if (hfClients.length > 0) {
            console.log(`  ∞ VectorMemory: ${hfClients.length} HF embedding workers ready (${EMBEDDING_MODEL})`);
        } else {
            console.warn("  ⚠ VectorMemory: No HF tokens — local hash fallback only");
        }
    } catch {
        console.warn("  ⚠ VectorMemory: HF SDK not available, local hash fallback");
    }
}

// ── Embedding (distributed across HF workers) ──────────────────
let embedRoundRobin = 0;

async function embed(text) {
    const truncated = typeof text === "string" ? text.substring(0, 2000) : String(text).substring(0, 2000);

    if (hfClients.length > 0) {
        // Round-robin across HF worker tokens
        const client = hfClients[embedRoundRobin % hfClients.length];
        embedRoundRobin++;
        try {
            const result = await client.featureExtraction({
                model: EMBEDDING_MODEL,
                inputs: truncated,
            });
            remoteEmbedCount++;
            return Array.isArray(result) ? result : Array.from(result);
        } catch (err) {
            // Try next worker
            for (let i = 1; i < hfClients.length; i++) {
                const fallback = hfClients[(embedRoundRobin + i) % hfClients.length];
                try {
                    const result = await fallback.featureExtraction({ model: EMBEDDING_MODEL, inputs: truncated });
                    remoteEmbedCount++;
                    return Array.isArray(result) ? result : Array.from(result);
                } catch { }
            }
            console.warn("  ⚠ VectorMemory: All HF workers failed, local fallback");
        }
    }

    localFallbackCount++;
    return localHashEmbed(truncated, 384);
}

// Local hash embedding — deterministic fallback only
function localHashEmbed(text, dims) {
    const vec = new Float32Array(dims);
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        let hash = 0;
        for (let j = 0; j < words[i].length; j++) {
            hash = ((hash << 5) - hash + words[i].charCodeAt(j)) | 0;
        }
        for (let d = 0; d < dims; d++) {
            vec[d] += Math.sin(hash * (d + 1) * 0.01) * (1.0 / words.length);
        }
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return Array.from(vec.map(v => v / norm));
}

// ── Cosine Similarity ───────────────────────────────────────────
function cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// ── Distributed Ingest (round-robin across shards) ──────────────
async function ingestMemory({ content, metadata = {}, embedding = null }) {
    const text = typeof content === "string" ? content : JSON.stringify(content);
    const vec = embedding || await embed(text);

    const entry = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: text.substring(0, 2000),
        embedding: vec,
        metadata: { ...metadata, ts: Date.now() },
        created: new Date().toISOString(),
    };

    // Round-robin shard assignment
    const shardIdx = ingestCount % NUM_SHARDS;
    const shard = shards[shardIdx];
    shard.vectors.push(entry);
    shard.dirty = true;
    ingestCount++;

    // Cap per-shard
    if (shard.vectors.length > MAX_VECTORS_PER_SHARD) {
        shard.vectors = shard.vectors.slice(-MAX_VECTORS_PER_SHARD);
    }

    // Debounced persist
    schedulePersist(shardIdx);

    return entry.id;
}

// ── Distributed Query (fan-out to ALL shards, merge top-K) ──────
async function queryMemory(query, topK = 5, filter = {}) {
    const totalVecs = shards.reduce((s, sh) => s + sh.vectors.length, 0);
    if (totalVecs === 0) return [];

    const queryEmbedding = await embed(query);
    queryCount++;

    // Fan-out: search all shards in parallel
    const shardResults = await Promise.all(
        shards.map(shard => {
            return new Promise(resolve => {
                let candidates = shard.vectors;

                // Metadata filtering
                if (filter.type) candidates = candidates.filter(v => v.metadata?.type === filter.type);
                if (filter.since) candidates = candidates.filter(v => (v.metadata?.ts || 0) > filter.since);

                // Score all candidates in this shard
                const scored = candidates.map(v => ({
                    id: v.id,
                    content: v.content,
                    score: cosineSim(queryEmbedding, v.embedding),
                    metadata: v.metadata,
                    created: v.created,
                    shard: shard.id,
                }));

                // Return top-K from this shard
                scored.sort((a, b) => b.score - a.score);
                resolve(scored.slice(0, topK));
            });
        })
    );

    // Merge results from all shards, re-sort, return final top-K
    const merged = shardResults.flat().sort((a, b) => b.score - a.score);
    return merged.slice(0, topK);
}

// ── Persistence (per-shard, debounced) ──────────────────────────
const persistTimers = {};
function schedulePersist(shardIdx) {
    if (persistTimers[shardIdx]) return;
    persistTimers[shardIdx] = setTimeout(() => {
        try {
            const shard = shards[shardIdx];
            if (shard.dirty) {
                fs.writeFileSync(shard.path, JSON.stringify(shard.vectors, null, 0));
                shard.dirty = false;
            }
        } catch { }
        delete persistTimers[shardIdx];
    }, PERSIST_DEBOUNCE); // φ² = 2,618ms
}

function persistAllShards() {
    shards.forEach((shard, i) => {
        try {
            fs.writeFileSync(shard.path, JSON.stringify(shard.vectors, null, 0));
            shard.dirty = false;
        } catch { }
    });
}

// ── Stats ───────────────────────────────────────────────────────
function getStats() {
    const shardStats = shards.map(s => ({
        id: s.id, vectors: s.vectors.length, dirty: s.dirty,
    }));
    const total = shards.reduce((s, sh) => s + sh.vectors.length, 0);
    return {
        architecture: "distributed-sharded",
        total_vectors: total,
        num_shards: NUM_SHARDS,
        max_per_shard: MAX_VECTORS_PER_SHARD,
        embedding_model: EMBEDDING_MODEL,
        hf_workers: hfClients.length,
        embedding_source: hfClients.length > 0 ? `hf-distributed (${hfClients.length} workers)` : "local-hash-fallback",
        dimensions: 384,
        ingest_count: ingestCount,
        query_count: queryCount,
        remote_embeds: remoteEmbedCount,
        local_fallbacks: localFallbackCount,
        remote_ratio: ingestCount > 0 ? +((remoteEmbedCount / Math.max(remoteEmbedCount + localFallbackCount, 1)) * 100).toFixed(1) : 0,
        persist_debounce_ms: PERSIST_DEBOUNCE,
        shards: shardStats,
    };
}

// ── Init ────────────────────────────────────────────────────────
function init() {
    initShards();
    initHFClients();
}

// ── Express Routes ──────────────────────────────────────────────
function registerRoutes(app) {
    app.post("/api/vector/query", async (req, res) => {
        try {
            const { query, top_k, filter } = req.body;
            if (!query) return res.status(400).json({ error: "query required" });
            const results = await queryMemory(query, top_k || 5, filter || {});
            const total = shards.reduce((s, sh) => s + sh.vectors.length, 0);
            res.json({ ok: true, results, total_vectors: total, shards_searched: NUM_SHARDS });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post("/api/vector/store", async (req, res) => {
        try {
            const { content, metadata } = req.body;
            if (!content) return res.status(400).json({ error: "content required" });
            const id = await ingestMemory({ content, metadata });
            const total = shards.reduce((s, sh) => s + sh.vectors.length, 0);
            res.json({ ok: true, id, total_vectors: total, shard: ingestCount % NUM_SHARDS });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/vector/stats", (req, res) => {
        res.json({ ok: true, ...getStats() });
    });
}

module.exports = { init, ingestMemory, queryMemory, getStats, registerRoutes, embed };
