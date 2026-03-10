/**
 * Migration Service — HTTP Server (Port 3364)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import { PHI, PSI, FIB, type MigrationHealthStatus } from './types.js';
import { MigrationEngine } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'migration-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.MIGRATION_PORT ?? '3364', 10);
const engine = new MigrationEngine();
const startTime = Date.now();

function jsonRes(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
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
      const status = engine.getStatus();
      const health: MigrationHealthStatus = {
        status: 'healthy',
        totalMigrations: status.total,
        appliedMigrations: status.applied,
        pendingMigrations: status.pending,
        lastApplied: status.lastApplied,
        uptime: (Date.now() - startTime) / 1000,
        coherenceScore: status.pending === 0 ? 1.0 : PSI
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'migration-service', port: PORT });
      return;
    }

    if (path === '/api/migrations' && method === 'POST') {
      const body = await readBody(req);
      const migration = engine.register(JSON.parse(body));
      jsonRes(res, 201, migration as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/migrations/plan' && method === 'POST') {
      const body = await readBody(req);
      const { direction, targetVersion, dryRun } = JSON.parse(body);
      const plan = engine.plan(direction ?? 'up', targetVersion, dryRun ?? false);
      jsonRes(res, 200, plan as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/migrations/execute' && method === 'POST') {
      const body = await readBody(req);
      const { direction, targetVersion } = JSON.parse(body);
      const plan = engine.plan(direction ?? 'up', targetVersion);
      const results = await engine.execute(plan);
      jsonRes(res, 200, { results: results as unknown as Record<string, unknown>[] });
      return;
    }

    if (path === '/api/migrations/status' && method === 'GET') {
      jsonRes(res, 200, engine.getStatus() as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/migrations/audit' && method === 'GET') {
      jsonRes(res, 200, { audit: engine.getAuditLog() as unknown as Record<string, unknown>[] });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'migration_service_started', { port: PORT }); });
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
