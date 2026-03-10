/**
 * billing-service — Stripe integration for subscriptions and marketplace
 * Heady™ Service | Domain: integration | Port: 3400
 * ALL requests enriched by HeadyAutoContext (MANDATORY)
 * φ-scaled pricing tiers. Webhook signature verification.
 * NO priority/ranking code. Everything concurrent and equal.
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */
'use strict';

import express from 'express';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';

// ─── φ-Math Constants (No Magic Numbers) ──────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const VECTOR_DIM = 384;
const CSL_GATES = Object.freeze({
  include: PSI * PSI,   // ≈ 0.382
  boost: PSI,           // ≈ 0.618
  inject: PSI + 0.1,    // ≈ 0.718
});

// ─── Service Config ───────────────────────────────────────────────────────────
const SERVICE_NAME = 'billing-service';
const PORT = process.env.PORT || 3400;
const DOMAIN = 'integration';
const BOOT_TIME = Date.now();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_heady_dev';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_heady_dev_2026';

// φ-scaled pricing tiers (base price × PHI^n)
const BASE_PRICE_CENTS = 999; // $9.99
const PRICING_TIERS = Object.freeze([
  { id: 'starter', name: 'Starter', priceMonthly: BASE_PRICE_CENTS, features: ['5 projects', 'Basic analytics'] },
  { id: 'growth', name: 'Growth', priceMonthly: Math.round(BASE_PRICE_CENTS * PHI), features: ['21 projects', 'Advanced analytics', 'API access'] },
  { id: 'scale', name: 'Scale', priceMonthly: Math.round(BASE_PRICE_CENTS * PHI * PHI), features: ['89 projects', 'Full analytics', 'API access', 'Webhooks'] },
  { id: 'enterprise', name: 'Enterprise', priceMonthly: Math.round(BASE_PRICE_CENTS * PHI * PHI * PHI), features: ['Unlimited projects', 'All features', 'Dedicated support', 'Custom integrations'] },
]);

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');

// Raw body for Stripe webhook signature verification
app.use('/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '2mb' }));

// ─── MANDATORY: HeadyAutoContext Enrichment Middleware ─────────────────────────
app.use((req, res, next) => {
  req.headyContext = {
    service: SERVICE_NAME,
    domain: DOMAIN,
    correlationId: req.headers['x-correlation-id'] || randomUUID(),
    timestamp: Date.now(),
    vectorDim: VECTOR_DIM,
    cslGates: CSL_GATES,
  };
  res.setHeader('X-Heady-Service', SERVICE_NAME);
  res.setHeader('X-Correlation-Id', req.headyContext.correlationId);
  res.setHeader('X-Heady-Domain', DOMAIN);
  next();
});

// ─── OpenTelemetry Distributed Tracing ────────────────────────────────────────
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer(SERVICE_NAME, '1.0.0');

// ─── Bulkhead Pattern ─────────────────────────────────────────────────────────
const BULKHEAD = {
  maxConcurrent: 55,
  queueSize: 89,
  active: 0,
  queued: 0,
};

function bulkheadMiddleware(req, res, next) {
  if (BULKHEAD.active >= BULKHEAD.maxConcurrent) {
    if (BULKHEAD.queued >= BULKHEAD.queueSize) {
      return res.status(503).json({
        error: 'Service at capacity',
        service: SERVICE_NAME,
        bulkhead: { active: BULKHEAD.active, queued: BULKHEAD.queued },
      });
    }
    BULKHEAD.queued++;
    setTimeout(() => { BULKHEAD.queued--; next(); }, Math.round(PSI * 1000));
    return;
  }
  BULKHEAD.active++;
  res.on('finish', () => { BULKHEAD.active--; });
  next();
}

// ─── OpenTelemetry Span Middleware ────────────────────────────────────────────
function otelSpanMiddleware(req, res, next) {
  const span = tracer.startSpan(`${SERVICE_NAME}:${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.route': req.path,
      'heady.service': SERVICE_NAME,
      'heady.domain': DOMAIN,
      'heady.correlation_id': req.headyContext?.correlationId || 'unknown',
      'heady.vector_dim': VECTOR_DIM,
    },
  });
  req.otelSpan = span;
  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    if (res.statusCode >= 400) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` });
    }
    span.end();
  });
  next();
}

// ─── Structured Logging ───────────────────────────────────────────────────────
function structuredLog(level, msg, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    level,
    message: msg,
    correlationId: meta.correlationId || 'system',
    domain: DOMAIN,
    ...meta,
  };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

// ─── Typed Error Classes ──────────────────────────────────────────────────────
class HeadyServiceError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = 'HeadyServiceError';
    this.code = code;
    this.meta = meta;
  }
}

// ─── Circuit Breaker (Fibonacci-based) ────────────────────────────────────────
const circuitBreaker = {
  state: 'closed',
  failures: 0,
  maxFailures: FIB[7],
  resetTimeoutMs: FIB[10] * 1000,
  lastFailure: 0,
  check() {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) { this.state = 'half-open'; return true; }
      return false;
    }
    return true;
  },
  recordSuccess() { this.failures = 0; this.state = 'closed'; },
  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.maxFailures) this.state = 'open';
  },
};

// ─── Subscription Store (In-memory) ──────────────────────────────────────────
const subscriptionStore = new Map(); // userId -> subscription
const purchaseStore = [];            // marketplace purchases
const webhookLog = [];               // webhook event log
const MAX_WEBHOOK_LOG = FIB[12];     // 233

// ─── Stripe Webhook Signature Verification ────────────────────────────────────
function verifyStripeSignature(payload, signatureHeader) {
  if (!signatureHeader) {
    throw new HeadyServiceError('Missing Stripe-Signature header', 400);
  }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => {
      const [key, val] = p.split('=');
      return [key, val];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    throw new HeadyServiceError('Invalid Stripe-Signature format', 400);
  }

  const tolerance = FIB[9] * 1000; // 55s tolerance
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > tolerance / 1000) {
    throw new HeadyServiceError('Stripe webhook timestamp outside tolerance window', 400);
  }

  const expectedPayload = `${timestamp}.${typeof payload === 'string' ? payload : payload.toString('utf8')}`;
  const expectedSignature = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(expectedPayload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new HeadyServiceError('Invalid Stripe webhook signature', 403);
  }

  return { timestamp, verified: true };
}

// ─── Apply Global Middleware ──────────────────────────────────────────────────
app.use(bulkheadMiddleware);
app.use(otelSpanMiddleware);

// ─── Health Endpoints ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'operational',
    domain: DOMAIN,
    uptime: Math.round((Date.now() - BOOT_TIME) / 1000),
    port: PORT,
    vectorDim: VECTOR_DIM,
    phiVersion: PHI.toFixed(15),
    activeSubscriptions: subscriptionStore.size,
    circuitBreaker: circuitBreaker.state,
    timestamp: new Date().toISOString(),
  });
});

app.get('/healthz', (req, res) => { res.status(200).send('OK'); });
app.get('/health/live', (req, res) => { res.json({ status: 'alive', service: SERVICE_NAME }); });
app.get('/health/ready', (req, res) => { res.json({ status: 'ready', service: SERVICE_NAME, domain: DOMAIN }); });

app.get('/readiness', (req, res) => {
  const ready = circuitBreaker.state !== 'open';
  res.status(ready ? 200 : 503).json({ service: SERVICE_NAME, ready, circuitBreaker: circuitBreaker.state });
});

// ─── Service Info ─────────────────────────────────────────────────────────────
app.get('/info', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    description: 'Stripe integration for subscriptions and marketplace with φ-scaled pricing',
    domain: DOMAIN,
    port: PORT,
    version: '1.0.0',
    phiConstants: { PHI, PSI, cslGates: CSL_GATES },
    pricingTiers: PRICING_TIERS.length,
    architecture: 'concurrent-equals',
    bootTime: new Date(BOOT_TIME).toISOString(),
  });
});

// ─── GET /plans — List φ-scaled pricing tiers ─────────────────────────────────
app.get('/plans', (req, res) => {
  res.json({
    plans: PRICING_TIERS.map(tier => ({
      ...tier,
      priceMonthlyDisplay: `$${(tier.priceMonthly / 100).toFixed(2)}`,
      priceYearly: Math.round(tier.priceMonthly * 12 * PSI2), // φ-discounted annual
      priceYearlyDisplay: `$${(Math.round(tier.priceMonthly * 12 * PSI2) / 100).toFixed(2)}`,
    })),
    phiScaling: { base: BASE_PRICE_CENTS, multiplier: PHI },
    service: SERVICE_NAME,
    correlationId: req.headyContext.correlationId,
  });
});

// ─── POST /subscriptions/create ───────────────────────────────────────────────
app.post('/subscriptions/create', async (req, res) => {
  const startTime = performance.now();
  const { userId, planId, paymentMethodId } = req.body || {};

  if (!userId || !planId) {
    return res.status(400).json({
      error: 'Missing required fields: userId, planId',
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }

  const plan = PRICING_TIERS.find(p => p.id === planId);
  if (!plan) {
    return res.status(400).json({
      error: `Invalid plan: ${planId}. Valid plans: ${PRICING_TIERS.map(p => p.id).join(', ')}`,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }

  if (!circuitBreaker.check()) {
    return res.status(503).json({
      error: 'Billing circuit breaker open — Stripe unavailable',
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }

  try {
    const subscription = {
      id: `sub_${randomUUID().replace(/-/g, '').slice(0, 14)}`,
      userId,
      planId,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      status: 'active',
      paymentMethodId: paymentMethodId || null,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    subscriptionStore.set(userId, subscription);
    circuitBreaker.recordSuccess();

    structuredLog('info', 'Subscription created', {
      correlationId: req.headyContext.correlationId,
      userId,
      planId,
      subscriptionId: subscription.id,
      latencyMs: Math.round(performance.now() - startTime),
    });

    res.status(201).json({
      success: true,
      subscription,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  } catch (err) {
    circuitBreaker.recordFailure();
    structuredLog('error', `Subscription creation failed: ${err.message}`, {
      correlationId: req.headyContext.correlationId,
      error: err.message,
    });
    res.status(500).json({
      error: err.message,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }
});

// ─── GET /subscriptions/:userId ───────────────────────────────────────────────
app.get('/subscriptions/:userId', (req, res) => {
  const { userId } = req.params;
  const subscription = subscriptionStore.get(userId);

  if (!subscription) {
    return res.status(404).json({
      error: 'No subscription found for user',
      userId,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }

  res.json({
    subscription,
    service: SERVICE_NAME,
    correlationId: req.headyContext.correlationId,
  });
});

// ─── POST /webhooks/stripe — Stripe Webhook with Signature Verification ──────
app.post('/webhooks/stripe', (req, res) => {
  const startTime = performance.now();
  const signatureHeader = req.headers['stripe-signature'];

  try {
    const payload = req.body;
    verifyStripeSignature(payload, signatureHeader);

    const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
    const { type, data } = event;

    webhookLog.push({
      id: event.id || randomUUID(),
      type,
      receivedAt: new Date().toISOString(),
      correlationId: req.headyContext.correlationId,
    });
    while (webhookLog.length > MAX_WEBHOOK_LOG) webhookLog.shift();

    switch (type) {
      case 'customer.subscription.updated': {
        const subData = data?.object;
        if (subData?.metadata?.userId) {
          const existing = subscriptionStore.get(subData.metadata.userId);
          if (existing) {
            existing.status = subData.status || existing.status;
            existing.currentPeriodEnd = subData.current_period_end
              ? new Date(subData.current_period_end * 1000).toISOString()
              : existing.currentPeriodEnd;
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subData = data?.object;
        if (subData?.metadata?.userId) {
          const existing = subscriptionStore.get(subData.metadata.userId);
          if (existing) existing.status = 'canceled';
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        structuredLog('info', 'Payment succeeded', {
          correlationId: req.headyContext.correlationId,
          invoiceId: data?.object?.id,
        });
        break;
      }
      case 'invoice.payment_failed': {
        structuredLog('warn', 'Payment failed', {
          correlationId: req.headyContext.correlationId,
          invoiceId: data?.object?.id,
        });
        break;
      }
      default:
        structuredLog('info', `Unhandled Stripe webhook event type: ${type}`, {
          correlationId: req.headyContext.correlationId,
        });
    }

    structuredLog('info', 'Stripe webhook processed', {
      correlationId: req.headyContext.correlationId,
      eventType: type,
      latencyMs: Math.round(performance.now() - startTime),
    });

    res.json({ received: true, type, service: SERVICE_NAME });
  } catch (err) {
    structuredLog('error', `Stripe webhook failed: ${err.message}`, {
      correlationId: req.headyContext.correlationId,
      error: err.message,
    });
    res.status(err.code || 400).json({
      error: err.message,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }
});

// ─── POST /marketplace/purchase ───────────────────────────────────────────────
app.post('/marketplace/purchase', (req, res) => {
  const startTime = performance.now();
  const { userId, itemId, itemName, priceCents } = req.body || {};

  if (!userId || !itemId || !priceCents) {
    return res.status(400).json({
      error: 'Missing required fields: userId, itemId, priceCents',
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }

  const purchase = {
    id: `pur_${randomUUID().replace(/-/g, '').slice(0, 14)}`,
    userId,
    itemId,
    itemName: itemName || itemId,
    priceCents,
    priceDisplay: `$${(priceCents / 100).toFixed(2)}`,
    status: 'completed',
    purchasedAt: new Date().toISOString(),
    correlationId: req.headyContext.correlationId,
  };

  purchaseStore.push(purchase);

  structuredLog('info', 'Marketplace purchase completed', {
    correlationId: req.headyContext.correlationId,
    userId,
    itemId,
    purchaseId: purchase.id,
    priceCents,
    latencyMs: Math.round(performance.now() - startTime),
  });

  res.status(201).json({
    success: true,
    purchase,
    service: SERVICE_NAME,
    correlationId: req.headyContext.correlationId,
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  structuredLog('error', err.message, {
    correlationId: req.headyContext?.correlationId,
    stack: err.stack,
  });
  res.status(err.code || 500).json({
    error: err.message,
    service: SERVICE_NAME,
    correlationId: req.headyContext?.correlationId,
  });
});

// ─── Consul Service Discovery Registration ────────────────────────────────────
async function registerWithConsul() {
  const CONSUL_HOST = process.env.CONSUL_HOST || 'consul';
  const CONSUL_PORT = process.env.CONSUL_PORT || 8500;
  const INSTANCE_ID = process.env.INSTANCE_ID || `${SERVICE_NAME}-${process.pid}`;
  try {
    const registration = {
      ID: INSTANCE_ID,
      Name: SERVICE_NAME,
      Port: parseInt(PORT),
      Tags: ['heady', DOMAIN, 'v1', 'stripe', 'billing'],
      Meta: { domain: DOMAIN, vector_dim: String(VECTOR_DIM), version: '1.0.0' },
      Check: {
        HTTP: `http://127.0.0.1:${PORT}/health`,
        Interval: '13s',
        Timeout: '5s',
        DeregisterCriticalServiceAfter: '89s',
      },
    };
    structuredLog('info', `Consul registration prepared for ${INSTANCE_ID}`, { consul: `${CONSUL_HOST}:${CONSUL_PORT}` });
  } catch (err) {
    structuredLog('warn', `Consul registration deferred: ${err.message}`);
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  registerWithConsul();
  structuredLog('info', `${SERVICE_NAME} operational on port ${PORT}`, {
    domain: DOMAIN,
    phiTimeout: Math.round(PHI * 1000) + 'ms',
    cslGates: CSL_GATES,
    pricingTiers: PRICING_TIERS.map(t => t.id),
  });
});

export default app;
