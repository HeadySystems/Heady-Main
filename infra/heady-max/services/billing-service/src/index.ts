/**
 * Billing Service — HTTP Server (Port 3353)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import crypto from 'crypto';
import { PHI, PSI, FIB, type BillingHealthStatus, type UsageRecord } from './types.js';
import { PRICING_PLANS, UsageMeter, CreditSystem, InvoiceGenerator, AuditTrail } from './service.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'billing-service', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.BILLING_PORT ?? '3353', 10);
const meter = new UsageMeter();
const credits = new CreditSystem();
const invoices = new InvoiceGenerator();
const audit = new AuditTrail();
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
      const health: BillingHealthStatus = {
        status: 'healthy', activeSubscriptions: 0, pendingInvoices: 0,
        revenueThisMonth: 0, uptime: (Date.now() - startTime) / 1000,
        coherenceScore: PSI + PSI * PSI
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'billing-service', port: PORT });
      return;
    }

    if (path === '/api/billing/plans' && method === 'GET') {
      jsonRes(res, 200, { plans: PRICING_PLANS as unknown as Record<string, unknown> });
      return;
    }

    if (path === '/api/billing/usage' && method === 'POST') {
      const body = await readBody(req);
      const record: UsageRecord = { ...JSON.parse(body), timestamp: new Date().toISOString() };
      meter.record(record);
      audit.log('usage_recorded', record.userId, record.quantity, { type: record.usageType });
      jsonRes(res, 202, { recorded: true });
      return;
    }

    if (path === '/api/billing/usage/summary' && method === 'GET') {
      const userId = url.searchParams.get('userId') ?? '';
      const summary = meter.getSummary(userId);
      jsonRes(res, 200, summary as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/billing/credits' && method === 'GET') {
      const userId = url.searchParams.get('userId') ?? '';
      const balance = credits.getBalance(userId);
      jsonRes(res, 200, balance as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/billing/credits/add' && method === 'POST') {
      const body = await readBody(req);
      const { userId, amount } = JSON.parse(body);
      const balance = credits.addCredits(userId, amount);
      audit.log('credits_added', userId, amount);
      jsonRes(res, 200, balance as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/api/billing/audit' && method === 'GET') {
      const userId = url.searchParams.get('userId') ?? '';
      const entries = audit.getEntries(userId);
      jsonRes(res, 200, { entries: entries as unknown as Record<string, unknown>[] });
      return;
    }

    if (path === '/api/billing/webhook' && method === 'POST') {
      const body = await readBody(req);
      const event = JSON.parse(body);
      log('info', 'stripe_webhook_received', { type: event.type });
      jsonRes(res, 200, { received: true });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => { log('info', 'billing_service_started', { port: PORT }); });
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
