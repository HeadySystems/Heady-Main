/**
 * HeadyAutoContext — Mandatory Context Middleware
 * Attaches correlation ID, service domain, user context, timing,
 * and φ-scaled metadata to every request. Required on ALL endpoints.
 * Unbreakable Law #5: HeadyAutoContext mandatory.
 * All constants φ-derived. ESM only.
 * Author: Eric Haywood
 */
import { createHash, randomUUID } from 'crypto';

const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── Service Domain Registry ──────────────────────────────────────
const SERVICE_DOMAINS = {
  inference: ['heady-brain', 'heady-brains', 'heady-infer', 'ai-router', 'model-gateway'],
  memory: ['heady-embed', 'heady-memory', 'heady-vector', 'heady-projection'],
  agents: ['heady-bee-factory', 'heady-hive', 'heady-federation'],
  orchestration: ['heady-soul', 'heady-conductor', 'heady-orchestration', 'auto-success-engine', 'hcfullpipeline-executor', 'heady-chain', 'prompt-manager'],
  security: ['heady-guard', 'heady-security', 'heady-governance', 'secret-gateway'],
  monitoring: ['heady-health', 'heady-eval', 'heady-maintenance', 'heady-testing'],
  web: ['heady-web', 'heady-buddy', 'heady-ui', 'heady-onboarding', 'heady-pilot-onboarding', 'heady-task-browser'],
  data: ['heady-cache'],
  integration: ['api-gateway', 'domain-router', 'mcp-server', 'google-mcp', 'memory-mcp', 'perplexity-mcp', 'jules-mcp', 'huggingface-gateway', 'colab-gateway', 'silicon-bridge', 'discord-bot'],
  specialized: ['heady-vinci', 'heady-autobiographer', 'heady-midi', 'budget-tracker', 'cli-service'],
};

function resolveDomain(serviceName) {
  for (const [domain, services] of Object.entries(SERVICE_DOMAINS)) {
    if (services.includes(serviceName)) return domain;
  }
  return 'unknown';
}

// ── Context Builder ──────────────────────────────────────────────
class HeadyAutoContext {
  constructor(config = {}) {
    this.serviceName = config.serviceName ?? 'unknown';
    this.serviceVersion = config.serviceVersion ?? '4.0.0';
    this.domain = config.domain ?? resolveDomain(this.serviceName);
    this.environment = config.environment ?? process.env.NODE_ENV ?? 'production';
    this.region = config.region ?? 'us-east1';
    this.instanceId = config.instanceId ?? randomUUID().slice(0, FIB[6]);
    this.requestCount = 0;
  }

  middleware() {
    const self = this;
    return (req, res, next) => {
      self.requestCount++;
      const startTime = process.hrtime.bigint();
      const correlationId = req.headers['x-correlation-id'] ?? req.headers['x-request-id'] ?? randomUUID();
      const parentSpanId = req.headers['x-parent-span-id'] ?? null;
      const spanId = randomUUID().slice(0, FIB[8]);

      // Build context object
      req.headyContext = {
        correlationId,
        spanId,
        parentSpanId,
        service: {
          name: self.serviceName,
          version: self.serviceVersion,
          domain: self.domain,
          instanceId: self.instanceId,
        },
        environment: self.environment,
        region: self.region,
        timing: { startTime, startMs: Date.now() },
        request: {
          method: req.method,
          path: req.url ?? req.path,
          userAgent: req.headers['user-agent'] ?? 'unknown',
          ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown',
          contentType: req.headers['content-type'] ?? null,
        },
        user: {
          sessionId: null,
          userId: null,
          roles: [],
          tier: 'anonymous',
        },
        phi: {
          requestSequence: self.requestCount,
          fibonacciSlot: FIB[self.requestCount % FIB.length] ?? FIB[FIB.length - 1],
        },
      };

      // Extract user context from httpOnly session cookie
      const sessionCookie = self._extractSessionCookie(req);
      if (sessionCookie) {
        req.headyContext.user.sessionId = hashSHA256(sessionCookie).slice(0, FIB[8]);
        req.headyContext.user.tier = 'authenticated';
      }

      // Set response headers for correlation
      res.setHeader('X-Correlation-ID', correlationId);
      res.setHeader('X-Span-ID', spanId);
      res.setHeader('X-Service', self.serviceName);
      res.setHeader('X-Service-Domain', self.domain);

      // Timing hook on response finish
      const originalEnd = res.end.bind(res);
      res.end = function(...args) {
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationMs = durationNs / 1_000_000;
        res.setHeader('X-Response-Time-Ms', durationMs.toFixed(3));
        res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(1)}`);

        // Structured log entry
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
          correlationId,
          spanId,
          service: self.serviceName,
          domain: self.domain,
          method: req.method,
          path: req.url,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 1000) / 1000,
          userTier: req.headyContext.user.tier,
          hash: hashSHA256({ correlationId, status: res.statusCode, durationMs }),
        };

        // Write structured log to stdout (not console.log)
        process.stdout.write(JSON.stringify(logEntry) + '\n');

        return originalEnd(...args);
      };

      next?.();
    };
  }

  _extractSessionCookie(req) {
    const cookies = req.headers?.cookie ?? '';
    const match = cookies.match(/__Host-heady_session=([^;]+)/);
    return match ? match[1] : null;
  }

  contextForOutbound(req) {
    const ctx = req.headyContext;
    if (!ctx) return {};
    return {
      'X-Correlation-ID': ctx.correlationId,
      'X-Parent-Span-ID': ctx.spanId,
      'X-Source-Service': ctx.service.name,
      'X-Source-Domain': ctx.service.domain,
    };
  }

  health() {
    return {
      service: this.serviceName,
      domain: this.domain,
      version: this.serviceVersion,
      environment: this.environment,
      region: this.region,
      instanceId: this.instanceId,
      totalRequests: this.requestCount,
    };
  }
}

export default HeadyAutoContext;
export { HeadyAutoContext, SERVICE_DOMAINS, resolveDomain };
