import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── 384D Embedding Generation ────────────────────────────────────────────────

const DIMS = 384;

/**
 * Deterministic local embedding: word-hashing → 384D bag-of-words vector.
 * Each word hashes to multiple positions in the vector (multi-probe),
 * giving meaningful cosine similarity for texts sharing vocabulary.
 * Zero external dependencies, always available as fallback.
 */
function localEmbed(text) {
  const vec = new Float32Array(DIMS);
  // Tokenize: lowercase, split on non-alphanumeric, filter stopwords/short
  const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with', 'by', 'from', 'as', 'it', 'its', 'this', 'that', 'all', 'has', 'have', 'had']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  if (words.length === 0) words.push('empty');

  // Also generate bigrams for phrase-level similarity
  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(words[i] + '_' + words[i + 1]);
  }

  const weight = 1 / Math.sqrt(tokens.length);
  for (const token of tokens) {
    // FNV-1a hash of each token → multi-probe into 3 positions
    let h = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h = h >>> 0;
    // 3 probes per token for spread
    vec[h % DIMS] += weight;
    vec[(h >>> 8) % DIMS] += weight * 0.7;
    vec[(h >>> 16) % DIMS] += weight * 0.5;
  }

  // L2 normalize
  let mag = 0;
  for (let i = 0; i < DIMS; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < DIMS; i++) vec[i] /= mag;
  return Array.from(vec);
}

/**
 * OpenAI embedding via text-embedding-3-small (truncated to 384D).
 * Returns null if API key unavailable or call fails.
 */
async function openaiEmbed(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, model: 'text-embedding-3-small', dimensions: DIMS }),
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data[0].embedding; // Already 384D from dimensions param
  } catch {
    return null;
  }
}

/**
 * Generate 384D embedding: tries OpenAI first, falls back to local deterministic.
 */
async function generateEmbedding(text) {
  const vec = await openaiEmbed(text);
  if (vec) return { embedding: vec, provider: 'openai' };
  return { embedding: localEmbed(text), provider: 'local' };
}

// ── Cosine Similarity ────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

const PSI = 0.618033988749895;
const PSI_SQ = PSI * PSI; // ≈ 0.382 — local embedding threshold (sparser vectors)

// ── MemoryStore ──────────────────────────────────────────────────────────────

class MemoryStore {
  constructor() {
    this.storePath = process.env.MEMORY_STORE_PATH || './data/memory';
    this.memories = [];
    this._ensureDirectory();
    this._loadFromDisk();
  }

  _ensureDirectory() {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  _loadFromDisk() {
    const indexPath = path.join(this.storePath, 'index.json');
    if (fs.existsSync(indexPath)) {
      try {
        this.memories = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        logger.info(`[MemoryStore] Loaded ${this.memories.length} memories from disk`);
      } catch (err) {
        logger.error(`[MemoryStore] Failed to load index: ${err.message}`);
        this.memories = [];
      }
    }
  }

  _saveToDisk() {
    const indexPath = path.join(this.storePath, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(this.memories, null, 2));
  }

  getStatus() {
    return {
      memories: this.memories.length,
      storePath: this.storePath,
      maxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES) || 100000,
      embeddedCount: this.memories.filter(m => m.embedding).length,
      dimensions: DIMS,
      hasEmbeddings: this.memories.some(m => m.embedding !== null),
    };
  }

  async ingest(content, metadata = {}) {
    const { embedding, provider } = await generateEmbedding(content);

    const memory = {
      id: uuidv4(),
      content,
      metadata,
      embedding,
      embeddingProvider: provider,
      createdAt: new Date().toISOString(),
    };
    this.memories.push(memory);
    this._saveToDisk();
    logger.info(`[MemoryStore] Ingested memory ${memory.id} (${provider} ${DIMS}D)`);
    return { success: true, id: memory.id, provider, dimensions: DIMS };
  }

  async query(queryText, limit = 10) {
    if (this.memories.length === 0) return [];

    const { embedding: queryVec } = await generateEmbedding(queryText);

    // Vector similarity search with CSL gate
    const scored = this.memories
      .filter(m => m.embedding)
      .map(m => ({
        ...m,
        score: Array.isArray(m.embedding)
          ? cosineSimilarity(queryVec, m.embedding)
          : this._fallbackScore(queryText, m.content),
      }))
      .filter(m => m.score >= PSI_SQ) // CSL gate: ψ² ≈ 0.382 minimum relevance
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (scored.length > 0) {
      // Strip embeddings from response (large arrays)
      return scored.map(({ embedding, ...rest }) => rest);
    }

    // Fallback: text search if no vector matches above threshold
    return this.memories
      .filter(m => m.content.toLowerCase().includes(queryText.toLowerCase()))
      .slice(0, limit)
      .map(({ embedding, ...rest }) => ({ ...rest, score: null }));
  }

  // Fallback for memories without array embeddings (legacy data)
  _fallbackScore(query, content) {
    const q = query.toLowerCase();
    const c = content.toLowerCase();
    if (c.includes(q)) return 0.8;
    const words = q.split(/\s+/);
    const matched = words.filter(w => c.includes(w)).length;
    return matched / (words.length || 1) * 0.6;
  }
}

export { MemoryStore };
