/**
 * Asset Pipeline — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'model' | 'dataset' | 'other';
export type ProcessingStatus = 'uploaded' | 'processing' | 'ready' | 'failed' | 'archived';

export interface Asset {
  readonly assetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly assetType: AssetType;
  readonly sizeBytes: number;
  readonly contentHash: string;
  readonly version: number;
  readonly status: ProcessingStatus;
  readonly storagePath: string;
  readonly cdnUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly metadata: AssetMetadata;
  readonly uploadedBy: string;
  readonly uploadedAt: string;
  readonly updatedAt: string;
}

export interface AssetMetadata {
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly format?: string;
  readonly colorSpace?: string;
  readonly fileSize: number;
  readonly contentType: string;
  readonly tags: ReadonlyArray<string>;
  readonly custom: Readonly<Record<string, string | number | boolean>>;
}

export interface ProcessingJob {
  readonly jobId: string;
  readonly assetId: string;
  readonly operations: ReadonlyArray<ProcessingOperation>;
  readonly status: ProcessingStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly error: string | null;
}

export type ProcessingOperation =
  | { type: 'resize'; width: number; height: number; fit: 'cover' | 'contain' | 'fill' }
  | { type: 'thumbnail'; size: number }
  | { type: 'optimize'; quality: number }
  | { type: 'convert'; format: string }
  | { type: 'extract_metadata' };

export interface CachePolicy {
  readonly tier: 'hot' | 'warm' | 'cold';
  readonly ttlMs: number;
  readonly maxEntries: number;
}

export interface AssetHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly totalAssets: number;
  readonly totalSizeBytes: number;
  readonly cacheHitRate: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
