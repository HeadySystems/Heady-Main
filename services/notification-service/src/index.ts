/**
 * Notification Service — HTTP Server (Port 3345)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import crypto from 'crypto';
import {
  PHI, PSI, FIB,
  type NotificationPayload, type NotificationHealthStatus, type NotificationChannel
} from './types.js';
import {
  NotificationRouter, DigestAggregator, TemplateEngine,
  EmailHandler, WebhookHandler, InAppHandler
} from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'notification-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.NOTIFICATION_PORT ?? '3345', 10);
const router = new NotificationRouter();
const digester = new DigestAggregator();
const templates = new TemplateEngine();
const startTime = Date.now();
let sentCount = 0;
let failCount = 0;

router.registerChannel('email', new EmailHandler());
router.registerChannel('webhook', new WebhookHandler());
router.registerChannel('in_app', new InAppHandler());

templates.registerTemplate('welcome', 'Welcome to Heady, {{name}}! Your AI OS awaits.');
templates.registerTemplate('alert', 'Alert: {{message}} — Severity: {{severity}}');
templates.registerTemplate('digest', 'You have {{count}} new notifications since {{since}}.');

function jsonRes(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  });
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
    if (path === '/health' && method === 'GET') {
      const total = sentCount + failCount;
      const health: NotificationHealthStatus = {
        status: 'healthy',
        queueDepth: 0,
        deliveryRate: total > 0 ? sentCount / total : 1.0,
        failureRate: total > 0 ? failCount / total : 0.0,
        uptime: (Date.now() - startTime) / 1000,
        coherenceScore: total > 0 ? Math.min(sentCount / (total * PSI), 1.0) : 1.0
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready' && method === 'GET') {
      jsonRes(res, 200, { ready: true, service: 'notification-service', port: PORT });
      return;
    }

    if (path === '/api/notifications/send' && method === 'POST') {
      const body = await readBody(req);
      const payload = JSON.parse(body) as NotificationPayload;
      const notification: NotificationPayload = {
        ...payload,
        id: payload.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: payload.expiresAt || new Date(Date.now() + FIB[13] * 60 * 1000).toISOString()
      };

      const record = await router.send(notification);
      if (record.status === 'delivered') sentCount++;
      else failCount++;

      jsonRes(res, record.status === 'delivered' ? 200 : 202, record as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/notifications/batch' && method === 'POST') {
      const body = await readBody(req);
      const { notifications } = JSON.parse(body) as { notifications: NotificationPayload[] };
      const results = await Promise.all(notifications.map(n => router.send({
        ...n,
        id: n.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: n.expiresAt || new Date(Date.now() + FIB[13] * 60 * 1000).toISOString()
      })));

      results.forEach(r => { if (r.status === 'delivered') sentCount++; else failCount++; });
      jsonRes(res, 200, { results: results as unknown as Record<string, unknown>[], count: results.length });
      return;
    }

    if (path === '/api/notifications/digest/flush' && method === 'POST') {
      const body = await readBody(req);
      const { userId, channel } = JSON.parse(body) as { userId: string; channel: NotificationChannel };
      const batch = digester.flushDigest(userId, channel);
      jsonRes(res, batch ? 200 : 204, batch ? (batch as unknown as Record<string, unknown>) : { flushed: false });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    failCount++;
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log('info', 'notification_service_started', { port: PORT });
});

const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => { log('warn', 'forced_shutdown'); process.exit(1); }, FIB[8] * 1000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
