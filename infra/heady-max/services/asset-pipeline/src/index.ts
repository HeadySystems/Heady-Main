/**
 * Asset Pipeline — HTTP Server (Port 3365)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import { PHI, PSI, FIB, type AssetHealthStatus } from './types.js';
import { AssetStore, AssetProcessor, CACHE_POLICIES } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'asset-pipeline', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.ASSET_PORT ?? '3365', 10);
const store = new AssetStore();
const processor = new AssetProcessor();
const startTime = Date.now();

function jsonRes(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function readRawBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const maxSize = FIB[14] * 1024; // 377KB max upload
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) { req.destroy(); reject(new Error('body_too_large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';
  const path = url.pathname;

  try {
    if (path === '/health') {
      const health: AssetHealthStatus = {
        status: 'healthy',
        totalAssets: store.list().length,
        totalSizeBytes: store.getTotalSize(),
        cacheHitRate: store.getCacheHitRate(),
        uptime: (Date.now() - startTime) / 1000,
        coherenceScore: store.getCacheHitRate() * PHI > 1 ? 1.0 : store.getCacheHitRate() * PHI
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'asset-pipeline', port: PORT });
      return;
    }

    if (path === '/api/assets' && method === 'POST') {
      const body = await readRawBody(req);
      const fileName = req.headers['x-file-name']?.toString() ?? 'upload';
      const mimeType = req.headers['content-type'] ?? 'application/octet-stream';
      const userId = req.headers['x-user-id']?.toString() ?? 'anonymous';
      const asset = await store.store(fileName, mimeType, body, userId);
      jsonRes(res, 201, asset as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/assets' && method === 'GET') {
      const type = url.searchParams.get('type') as 'image' | 'video' | 'audio' | 'document' | 'model' | 'dataset' | 'other' | undefined;
      const assets = store.list(type ?? undefined);
      jsonRes(res, 200, { assets: assets as unknown as Record<string, unknown>[], count: assets.length });
      return;
    }

    if (path.startsWith('/api/assets/') && method === 'GET') {
      const assetId = path.split('/')[3] ?? '';
      const asset = store.get(assetId);
      if (!asset) { jsonRes(res, 404, { error: 'asset_not_found' }); return; }
      jsonRes(res, 200, asset as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/assets/process' && method === 'POST') {
      const body = await readRawBody(req);
      const { assetId, operations } = JSON.parse(body.toString());
      const job = await processor.process(assetId, operations);
      jsonRes(res, 200, job as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/cache/policies' && method === 'GET') {
      jsonRes(res, 200, CACHE_POLICIES as unknown as Record<string, unknown>);
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'asset_pipeline_started', { port: PORT }); });
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
