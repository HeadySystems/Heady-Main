/**
 * Search Service — Core Business Logic with Hybrid RRF
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type SearchQuery, type SearchResult, type SearchResponse,
  type AutocompleteResult, type SearchIndex, type SearchMode
} from './types.js';


interface LogEntry {
  level: string;
  service: string;
  msg: string;
  timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const createLogger = (serviceName: string) => ({
  info: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'info', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  warn: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'warn', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'error', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
});

const logger = createLogger('search-service');

export class HybridSearchEngine {
  private readonly rrfK: number = FIB[6] * PHI; // ≈ 12.94 — φ-weighted RRF constant
  private readonly documents: Map<string, IndexedDocument> = new Map();
  private readonly invertedIndex: Map<string, Set<string>> = new Map();
  private readonly prefixTree: Map<string, Set<string>> = new Map();

  index(doc: IndexedDocument): void {
    this.documents.set(doc.id, doc);

    const tokens = this.tokenize(doc.content);
    for (const token of tokens) {
      const existing = this.invertedIndex.get(token) ?? new Set();
      existing.add(doc.id);
      this.invertedIndex.set(token, existing);

      for (let i = 1; i <= Math.min(token.length, FIB[7]); i++) {
        const prefix = token.substring(0, i);
        const prefixDocs = this.prefixTree.get(prefix) ?? new Set();
        prefixDocs.add(token);
        this.prefixTree.set(prefix, prefixDocs);
      }
    }
  }

  search(query: SearchQuery): SearchResponse {
    const start = Date.now();
    const queryTokens = this.tokenize(query.query);

    const bm25Results = this.bm25Search(queryTokens, query.limit * FIB[3]);
    const vectorResults = this.vectorSearch(query.query, query.limit * FIB[3]);

    let results: SearchResult[];
    switch (query.mode) {
      case 'bm25':
        results = bm25Results;
        break;
      case 'vector':
        results = vectorResults;
        break;
      case 'hybrid':
      case 'semantic':
      default:
        results = this.reciprocalRankFusion(bm25Results, vectorResults);
        break;
    }

    results = results.slice(query.offset, query.offset + query.limit);
    const took = Date.now() - start;

    logger.info('search_executed', {
      query: query.query,
      mode: query.mode,
      resultCount: results.length,
      tookMs: took
    });

    return {
      query: query.query,
      results,
      totalCount: results.length,
      took,
      mode: query.mode,
      maxScore: results[0]?.score ?? 0
    };
  }

  autocomplete(prefix: string, limit: number = FIB[8]): AutocompleteResult {
    const start = Date.now();
    const normalizedPrefix = prefix.toLowerCase();
    const matches = this.prefixTree.get(normalizedPrefix) ?? new Set();

    const suggestions = Array.from(matches)
      .map(text => {
        const docsWithTerm = this.invertedIndex.get(text)?.size ?? 0;
        return { text, score: docsWithTerm * PHI, index: 'all' as SearchIndex };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { suggestions, took: Date.now() - start };
  }

  private bm25Search(queryTokens: ReadonlyArray<string>, limit: number): SearchResult[] {
    const k1 = PHI;           // term frequency saturation
    const b = PSI;             // length normalization
    const avgDl = FIB[8];     // average document length estimate

    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const docsWithToken = this.invertedIndex.get(token);
      if (!docsWithToken) continue;

      const idf = Math.log((this.documents.size - docsWithToken.size + PSI) / (docsWithToken.size + PSI));

      for (const docId of docsWithToken) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        const tf = this.termFrequency(token, doc.content);
        const dl = doc.content.split(/\s+/).length;
        const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgDl))));

        scores.set(docId, (scores.get(docId) ?? 0) + score);
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, bm25Score]) => this.toSearchResult(docId, bm25Score, 0));
  }

  private vectorSearch(query: string, limit: number): SearchResult[] {
    const queryVector = this.simpleEmbed(query);
    const scores: Array<{ docId: string; score: number }> = [];

    for (const [docId, doc] of this.documents) {
      const docVector = this.simpleEmbed(doc.content);
      const similarity = this.cosineSimilarity(queryVector, docVector);
      if (similarity > CSL_THRESHOLD * PSI) {
        scores.push({ docId, score: similarity });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => this.toSearchResult(s.docId, 0, s.score));
  }

  private reciprocalRankFusion(bm25Results: SearchResult[], vectorResults: SearchResult[]): SearchResult[] {
    const rrfScores = new Map<string, number>();
    const resultMap = new Map<string, SearchResult>();

    bm25Results.forEach((result, rank) => {
      const score = PHI / (this.rrfK + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) ?? 0) + score);
      resultMap.set(result.id, result);
    });

    vectorResults.forEach((result, rank) => {
      const score = 1.0 / (this.rrfK + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) ?? 0) + score);
      if (!resultMap.has(result.id)) resultMap.set(result.id, result);
    });

    return Array.from(rrfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, rrfScore]) => {
        const original = resultMap.get(id);
        return original ? { ...original, rrfScore, score: rrfScore } : null;
      })
      .filter((r): r is SearchResult => r !== null);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
  }

  private termFrequency(term: string, content: string): number {
    const tokens = this.tokenize(content);
    return tokens.filter(t => t === term).length;
  }

  private simpleEmbed(text: string): number[] {
    const tokens = this.tokenize(text);
    const dim = FIB[8]; // 21-dimensional simple embedding
    const vec = new Array(dim).fill(0);
    for (const token of tokens) {
      for (let i = 0; i < dim; i++) {
        vec[i] += token.charCodeAt(i % token.length) * PHI / FIB[8];
      }
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) ** 2;
      normB += (b[i] ?? 0) ** 2;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private toSearchResult(docId: string, bm25Score: number, vectorScore: number): SearchResult {
    const doc = this.documents.get(docId);
    return {
      id: docId,
      index: (doc?.index ?? 'all') as SearchIndex,
      title: doc?.title ?? '',
      snippet: doc?.content.substring(0, FIB[11]) ?? '',
      score: bm25Score + vectorScore,
      bm25Score,
      vectorScore,
      rrfScore: 0,
      metadata: doc?.metadata ?? {},
      highlights: []
    };
  }
}

interface IndexedDocument {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}
