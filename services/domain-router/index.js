/**
 * HEADY_BRAND:BEGIN
 * ============================================================
 *  Heady Domain Router
 *  Liquid Dynamic Latent OS | HeadySystems Inc.
 *  Domain-based request routing with CSL gate matching
 *  Routes 9 primary domains from single container
 * ============================================================
 * HEADY_BRAND:END
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// ─── Sacred Geometry Constants ───────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1.0 / PHI; // 0.618033988749895
const PHI_SQUARED = PHI * PHI; // 2.618033988749895
const PHI_CUBED = PHI * PHI * PHI; // 4.23606797749979

// CSL gate thresholds
const CSL_MATCH_THRESHOLD = PSI; // 0.618 - minimum for route activation
const CSL_EXACT_MATCH = 1.0;
const CSL_PARTIAL_MATCH = PSI; // 0.618
const CSL_WILDCARD_MATCH = PSI * PSI; // 0.382
const CSL_NO_MATCH = 0.0;

// Fibonacci request pool sizes
const FIB_POOL_SIZES = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const MAX_CONCURRENT_PER_ROUTE = FIB_POOL_SIZES[10]; // 89

// ─── Structured Logger ──────────────────────────────────────
class HeadyLogger {
  constructor(context) {
    this.context = context;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context,
      message,
      ...meta
    };
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }

  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }
  debug(message, meta) { this._log('debug', message, meta); }
}

const logger = new HeadyLogger('domain-router');

// ─── HeadyAutoContext Middleware ─────────────────────────────
function headyAutoContext(req, _res, next) {
  req.headyContext = {
    service: 'domain-router',
    requestId: `dr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    cslGate: 1.0,
    incomingDomain: req.hostname || req.headers.host || 'unknown'
  };
  next();
}

// ─── Domain Route Registry ──────────────────────────────────
class DomainRouteRegistry {
  constructor() {
    this.routes = new Map();
    this.routeStats = new Map();
  }

  /**
   * Register a domain route with CSL gate configuration.
   * CSL gates use continuous [0.0, 1.0] matching, not boolean.
   */
  register(domain, config) {
    const route = {
      domain,
      target: config.target,
      port: config.port || null,
      cslGate: config.cslGate || CSL_EXACT_MATCH,
      pathPrefix: config.pathPrefix || '/',
      headers: config.headers || {},
      metadata: config.metadata || {},
      active: config.active !== false,
      registeredAt: Date.now()
    };

    this.routes.set(domain, route);
    this.routeStats.set(domain, {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      lastRequest: null
    });

    logger.info(`Route registered: ${domain}`, { target: route.target, cslGate: route.cslGate });
  }

  /**
   * CSL gate matching -- returns the best matching route.
   * Uses continuous semantic logic, not boolean matching.
   */
  match(hostname) {
    let bestMatch = null;
    let bestScore = CSL_NO_MATCH;

    for (const [domain, route] of this.routes) {
      if (!route.active) continue;

      const score = this._cslScore(hostname, domain);
      const gatedScore = score * route.cslGate;

      if (gatedScore > bestScore && gatedScore >= CSL_MATCH_THRESHOLD) {
        bestScore = gatedScore;
        bestMatch = { ...route, matchScore: Number(gatedScore.toFixed(6)) };
      }
    }

    return bestMatch;
  }

  /**
   * CSL scoring: continuous semantic similarity between hostname and domain pattern.
   */
  _cslScore(hostname, domainPattern) {
    if (!hostname || !domainPattern) return CSL_NO_MATCH;

    const host = hostname.toLowerCase().replace(/:\d+$/, '');
    const pattern = domainPattern.toLowerCase();

    // Exact match
    if (host === pattern) return CSL_EXACT_MATCH;

    // Wildcard prefix match (*.example.com)
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      if (host.endsWith(suffix) || host === suffix.slice(1)) {
        return CSL_PARTIAL_MATCH;
      }
    }

    // Subdomain match (api.headyme.com matches headyme.com)
    if (host.endsWith('.' + pattern)) {
      return CSL_PARTIAL_MATCH;
    }

    // Partial domain overlap scoring
    const hostParts = host.split('.');
    const patternParts = pattern.split('.');
    let overlap = 0;
    const maxParts = Math.max(hostParts.length, patternParts.length);

    for (let i = 0; i < Math.min(hostParts.length, patternParts.length); i++) {
      const hi = hostParts[hostParts.length - 1 - i];
      const pi = patternParts[patternParts.length - 1 - i];
      if (hi === pi) overlap++;
      else break;
    }

    if (overlap > 0) {
      const score = (overlap / maxParts) * PSI; // Scale by golden ratio
      return score >= CSL_WILDCARD_MATCH ? CSL_WILDCARD_MATCH : CSL_NO_MATCH;
    }

    return CSL_NO_MATCH;
  }

  recordRequest(domain, success, latencyMs) {
    const stats = this.routeStats.get(domain);
    if (!stats) return;

    stats.totalRequests += 1;
    stats.lastRequest = Date.now();

    if (success) {
      stats.successCount += 1;
    } else {
      stats.errorCount += 1;
    }

    // Phi-weighted moving average for latency
    stats.avgLatencyMs = stats.avgLatencyMs * PSI + latencyMs * (1 - PSI);
  }

  getAllRoutes() {
    const result = {};
    for (const [domain, route] of this.routes) {
      result[domain] = {
        target: route.target,
        port: route.port,
        cslGate: route.cslGate,
        active: route.active,
        pathPrefix: route.pathPrefix,
        stats: this.routeStats.get(domain) || {}
      };
    }
    return result;
  }
}

// ─── Initialize Routes ─────────────────────────────────────
const routeRegistry = new DomainRouteRegistry();

// Register Heady domain zones
const DOMAIN_ROUTES = [
  { domain: 'headyme.com', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: 'www.headyme.com', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: 'api.headyme.com', target: 'core-api', port: 3301, cslGate: CSL_EXACT_MATCH },
  { domain: 'headysystems.com', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: 'www.headysystems.com', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: 'headyconnection.org', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: 'headybuddy.com', target: 'heady-buddy', port: 3302, cslGate: CSL_EXACT_MATCH },
  { domain: 'headyapi.com', target: 'api-gateway', port: 3303, cslGate: CSL_EXACT_MATCH },
  { domain: 'headyos.com', target: 'heady-web', port: 3300, cslGate: CSL_EXACT_MATCH },
  { domain: '*.headyme.com', target: 'heady-web', port: 3300, cslGate: CSL_PARTIAL_MATCH },
  { domain: '*.headysystems.com', target: 'heady-web', port: 3300, cslGate: CSL_PARTIAL_MATCH }
];

for (const route of DOMAIN_ROUTES) {
  routeRegistry.register(route.domain, route);
}

// ─── Express App ────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(headyAutoContext);

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    service: 'domain-router',
    status: 'healthy',
    routes: routeRegistry.routes.size,
    cslMatchThreshold: CSL_MATCH_THRESHOLD,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Resolve a domain to its route
app.get('/resolve', (req, res) => {
  const domain = req.query.domain || req.headyContext.incomingDomain;
  const match = routeRegistry.match(domain);

  if (!match) {
    res.status(404).json({
      error: { code: 'NO_ROUTE', message: `No matching route for domain: ${domain}` },
      cslBestScore: CSL_NO_MATCH,
      threshold: CSL_MATCH_THRESHOLD
    });
    return;
  }

  res.json({
    domain,
    match: {
      target: match.target,
      port: match.port,
      pathPrefix: match.pathPrefix,
      matchScore: match.matchScore,
      cslGate: match.cslGate
    }
  });
});

// Route incoming request (proxy-style resolution)
app.all('/route/*', (req, res) => {
  const domain = req.headers['x-forwarded-host'] || req.hostname || req.headers.host;
  const match = routeRegistry.match(domain);

  if (!match) {
    routeRegistry.recordRequest(domain, false, 0);
    res.status(502).json({
      error: { code: 'NO_UPSTREAM', message: `No upstream route for: ${domain}` }
    });
    return;
  }

  const start = Date.now();
  const upstreamUrl = `http://${match.target}:${match.port}${match.pathPrefix}${req.params[0] || ''}`;

  // In production this would proxy; here we return the resolution
  const latency = Date.now() - start;
  routeRegistry.recordRequest(match.domain, true, latency);

  res.json({
    resolved: true,
    upstream: upstreamUrl,
    matchScore: match.matchScore,
    target: match.target,
    port: match.port,
    latencyMs: latency
  });
});

// Register a new domain route
app.post('/register', (req, res) => {
  const { domain, target, port, cslGate, pathPrefix, headers, metadata } = req.body;
  if (!domain || !target) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'domain and target are required' } });
    return;
  }
  routeRegistry.register(domain, { target, port, cslGate, pathPrefix, headers, metadata });
  res.status(201).json({ registered: domain, target, timestamp: new Date().toISOString() });
});

// List all routes with stats
app.get('/routes', (_req, res) => {
  res.json({
    routes: routeRegistry.getAllRoutes(),
    constants: {
      CSL_MATCH_THRESHOLD,
      CSL_EXACT_MATCH,
      CSL_PARTIAL_MATCH,
      CSL_WILDCARD_MATCH,
      PHI,
      PSI
    }
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled request error', { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

// ─── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3391;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Domain Router listening on port ${PORT}`, {
    registeredRoutes: DOMAIN_ROUTES.length,
    cslMatchThreshold: CSL_MATCH_THRESHOLD
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = { app, routeRegistry, DomainRouteRegistry };
