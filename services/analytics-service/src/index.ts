/**
 * Analytics Service — HTTP Server (Port 3352)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import crypto from 'crypto';
import { PHI, PSI, FIB, type AnalyticsEvent, type AnalyticsHealthStatus, type MetricPoint } from './types.js';
import { EventIngester, MetricAggregator, CoherenceMonitor, KPIDashboard } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'analytics-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.ANALYTICS_PORT ?? '3352', 10);
const ingester = new EventIngester();
const aggregator = new MetricAggregator();
const coherence = new CoherenceMonitor();
const kpis = new KPIDashboard();
const startTime = Date.now();
let totalIngested = 0;

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
      const uptimeSec = (Date.now() - startTime) / 1000;
      const health: AnalyticsHealthStatus = {
        status: 'healthy',
        eventsIngested: totalIngested,
        eventsPerSecond: uptimeSec > 0 ? totalIngested / uptimeSec : 0,
        storageUsedBytes: 0,
        uptime: uptimeSec,
        coherenceScore: coherence.getSystemCoherence()
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'analytics-service', port: PORT });
      return;
    }

    if (path === '/api/analytics/events' && method === 'POST') {
      const body = await readBody(req);
      const event: AnalyticsEvent = {
        ...JSON.parse(body),
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };
      const accepted = ingester.ingest(event);
      if (accepted) totalIngested++;
      jsonRes(res, accepted ? 202 : 200, { accepted, eventId: event.eventId });
      return;
    }

    if (path === '/api/analytics/events/batch' && method === 'POST') {
      const body = await readBody(req);
      const { events } = JSON.parse(body) as { events: AnalyticsEvent[] };
      let accepted = 0;
      for (const e of events) {
        if (ingester.ingest({ ...e, eventId: e.eventId || crypto.randomUUID(), timestamp: new Date().toISOString() })) {
          accepted++;
          totalIngested++;
        }
      }
      jsonRes(res, 202, { accepted, total: events.length });
      return;
    }

    if (path === '/api/analytics/metrics' && method === 'POST') {
      const body = await readBody(req);
      const point: MetricPoint = JSON.parse(body);
      aggregator.addPoint(point);
      jsonRes(res, 202, { recorded: true });
      return;
    }

    if (path === '/api/analytics/aggregate' && method === 'GET') {
      const name = url.searchParams.get('name') ?? '';
      const window = url.searchParams.get('window') ?? '5m';
      const result = aggregator.aggregate(name, window as '1m' | '5m' | '15m' | '1h' | '1d');
      jsonRes(res, result ? 200 : 404, result ? (result as unknown as Record<string, unknown>) : { error: 'no_data' });
      return;
    }

    if (path === '/api/analytics/coherence' && method === 'GET') {
      const metrics = coherence.getAllMeasurements();
      jsonRes(res, 200, { metrics: metrics as unknown as Record<string, unknown>[], systemCoherence: coherence.getSystemCoherence() });
      return;
    }

    if (path === '/api/analytics/coherence' && method === 'POST') {
      const body = await readBody(req);
      const { serviceName, coherenceScore, vectorDrift } = JSON.parse(body);
      const result = coherence.measure(serviceName, coherenceScore, vectorDrift);
      jsonRes(res, 200, result as unknown as Record<string, unknown>);
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'analytics_service_started', { port: PORT }); });

const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  const flushed = ingester.flush();
  log('info', 'final_flush', { count: flushed.length });
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
