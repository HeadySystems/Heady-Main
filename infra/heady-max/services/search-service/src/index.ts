/**
 * Search Service — HTTP Server (Port 3326)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import { PHI, PSI, FIB, type SearchQuery, type SearchHealthStatus } from './types.js';
import { HybridSearchEngine } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'search-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.SEARCH_PORT ?? '3326', 10);
const engine = new HybridSearchEngine();
const startTime = Date.now();

function jsonRes(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > FIB[12] * 1024) { req.destroy(); reject(new Error('body_too_large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';
  const path = url.pathname;

  try {
    if (path === '/health') {
      const health: SearchHealthStatus = {
        status: 'healthy', indexCount: FIB[3], documentsIndexed: 0,
        avgQueryLatencyMs: 0, uptime: (Date.now() - startTime) / 1000,
        coherenceScore: PSI + PSI * PSI
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'search-service', port: PORT });
      return;
    }

    if (path === '/api/search' && method === 'POST') {
      const body = await readBody(req);
      const query = JSON.parse(body) as SearchQuery;
      const response = engine.search(query);
      jsonRes(res, 200, response as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/search/autocomplete' && method === 'GET') {
      const prefix = url.searchParams.get('q') ?? '';
      const limit = parseInt(url.searchParams.get('limit') ?? String(FIB[8]), 10);
      const result = engine.autocomplete(prefix, limit);
      jsonRes(res, 200, result as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/search/index' && method === 'POST') {
      const body = await readBody(req);
      const doc = JSON.parse(body);
      engine.index(doc);
      jsonRes(res, 201, { indexed: true, id: doc.id });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'search_service_started', { port: PORT }); });
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
