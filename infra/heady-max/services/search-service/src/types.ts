/**
 * Search Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type SearchIndex = 'code' | 'docs' | 'memory' | 'conversations' | 'all';
export type SearchMode = 'hybrid' | 'vector' | 'bm25' | 'semantic';

export interface SearchQuery {
  readonly query: string;
  readonly index: SearchIndex;
  readonly mode: SearchMode;
  readonly limit: number;
  readonly offset: number;
  readonly filters: Readonly<Record<string, string | number | boolean>>;
  readonly userId: string;
  readonly tenantId: string;
  readonly boostFactors: Readonly<Record<string, number>>;
}

export interface SearchResult {
  readonly id: string;
  readonly index: SearchIndex;
  readonly title: string;
  readonly snippet: string;
  readonly score: number;
  readonly bm25Score: number;
  readonly vectorScore: number;
  readonly rrfScore: number;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
  readonly highlights: ReadonlyArray<string>;
}

export interface SearchResponse {
  readonly query: string;
  readonly results: ReadonlyArray<SearchResult>;
  readonly totalCount: number;
  readonly took: number;
  readonly mode: SearchMode;
  readonly maxScore: number;
}

export interface AutocompleteResult {
  readonly suggestions: ReadonlyArray<{ text: string; score: number; index: SearchIndex }>;
  readonly took: number;
}

export interface SearchAnalytics {
  readonly queryCount: number;
  readonly avgLatencyMs: number;
  readonly topQueries: ReadonlyArray<{ query: string; count: number }>;
  readonly clickThroughRate: number;
  readonly noResultRate: number;
}

export interface SearchHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly indexCount: number;
  readonly documentsIndexed: number;
  readonly avgQueryLatencyMs: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
