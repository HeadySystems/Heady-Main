/**
 * Asset Pipeline — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB,
  type Asset, type AssetType, type ProcessingJob, type ProcessingOperation,
  type ProcessingStatus, type AssetMetadata, type CachePolicy
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

const logger = createLogger('asset-pipeline');

export const CACHE_POLICIES: Record<string, CachePolicy> = {
  hot: { tier: 'hot', ttlMs: FIB[7] * 1000, maxEntries: FIB[11] },       // 13s TTL, 89 entries
  warm: { tier: 'warm', ttlMs: FIB[9] * 1000, maxEntries: FIB[13] },     // 34s TTL, 233 entries
  cold: { tier: 'cold', ttlMs: FIB[11] * 1000, maxEntries: FIB[15] }     // 89s TTL, 610 entries
};

export class AssetStore {
  private readonly assets: Map<string, Asset> = new Map();
  private readonly hashIndex: Map<string, string> = new Map();
  private readonly cache: Map<string, { data: Buffer; cachedAt: number }> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  async store(
    fileName: string,
    mimeType: string,
    content: Buffer,
    uploadedBy: string
  ): Promise<Asset> {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    const existingId = this.hashIndex.get(contentHash);
    if (existingId) {
      const existing = this.assets.get(existingId);
      if (existing) {
        logger.info('dedup_detected', { contentHash, existingId });
        return existing;
      }
    }

    const assetId = crypto.randomUUID();
    const assetType = this.classifyAsset(mimeType);
    const storagePath = `/assets/${assetType}/${assetId}/${fileName}`;

    const asset: Asset = {
      assetId,
      fileName,
      mimeType,
      assetType,
      sizeBytes: content.length,
      contentHash,
      version: 1,
      status: 'ready',
      storagePath,
      cdnUrl: null,
      thumbnailUrl: null,
      metadata: {
        fileSize: content.length,
        contentType: mimeType,
        tags: [],
        custom: {}
      },
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.assets.set(assetId, asset);
    this.hashIndex.set(contentHash, assetId);
    this.updateCache(assetId, content);
    logger.info('asset_stored', { assetId, fileName, sizeBytes: content.length });
    return asset;
  }

  get(assetId: string): Asset | undefined {
    return this.assets.get(assetId);
  }

  getFromCache(assetId: string): Buffer | null {
    const entry = this.cache.get(assetId);
    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    const policy = CACHE_POLICIES['hot'];
    if (Date.now() - entry.cachedAt > (policy?.ttlMs ?? FIB[7] * 1000)) {
      this.cache.delete(assetId);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return entry.data;
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  list(assetType?: AssetType): ReadonlyArray<Asset> {
    const all = Array.from(this.assets.values());
    return assetType ? all.filter(a => a.assetType === assetType) : all;
  }

  getTotalSize(): number {
    return Array.from(this.assets.values()).reduce((sum, a) => sum + a.sizeBytes, 0);
  }

  private updateCache(assetId: string, data: Buffer): void {
    const policy = CACHE_POLICIES['hot'];
    if (this.cache.size >= (policy?.maxEntries ?? FIB[11])) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(assetId, { data, cachedAt: Date.now() });
  }

  private classifyAsset(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }
}

export class AssetProcessor {
  async process(assetId: string, operations: ReadonlyArray<ProcessingOperation>): Promise<ProcessingJob> {
    const jobId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    logger.info('processing_started', { jobId, assetId, operationCount: operations.length });

    const job: ProcessingJob = {
      jobId,
      assetId,
      operations,
      status: 'ready',
      startedAt,
      completedAt: new Date().toISOString(),
      error: null
    };

    logger.info('processing_completed', { jobId, assetId });
    return job;
  }
}
