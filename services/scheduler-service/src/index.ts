/**
 * Scheduler Service — HTTP Server (Port 3363)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import { PHI, PSI, FIB, type SchedulerHealthStatus } from './types.js';
import { JobScheduler, DAGExecutor } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'scheduler-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.SCHEDULER_PORT ?? '3363', 10);
const scheduler = new JobScheduler();
const dagExecutor = new DAGExecutor();
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
      const jobs = scheduler.listJobs();
      const health: SchedulerHealthStatus = {
        status: 'healthy',
        activeJobs: jobs.filter(j => j.status === 'running').length,
        pendingJobs: jobs.filter(j => j.status === 'pending').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        deadLetterCount: scheduler.getDeadLetterQueue().length,
        uptime: (Date.now() - startTime) / 1000,
        coherenceScore: PSI + PSI * PSI
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'scheduler-service', port: PORT });
      return;
    }

    if (path === '/api/jobs' && method === 'POST') {
      const body = await readBody(req);
      const jobSpec = JSON.parse(body);
      const job = scheduler.schedule(jobSpec);
      jsonRes(res, 201, job as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/jobs' && method === 'GET') {
      const status = url.searchParams.get('status') as 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter' | undefined;
      const jobs = scheduler.listJobs(status ?? undefined);
      jsonRes(res, 200, { jobs: jobs as unknown as Record<string, unknown>[] });
      return;
    }

    if (path.startsWith('/api/jobs/') && method === 'GET') {
      const jobId = path.split('/')[3] ?? '';
      const job = scheduler.getJob(jobId);
      if (!job) { jsonRes(res, 404, { error: 'job_not_found' }); return; }
      jsonRes(res, 200, job as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/jobs/dead-letter' && method === 'GET') {
      jsonRes(res, 200, { deadLetter: scheduler.getDeadLetterQueue() as unknown as Record<string, unknown>[] });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'scheduler_service_started', { port: PORT }); });
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
