// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: cloudflare/heady-edge-router/src/index.js                ║
// ║  LAYER: edge                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * Heady Edge Router
 *
 * Routes all 9 Heady domains to the Cloud Run origin (heady-liquid-latent-os).
 * Adds security headers, caching, HeadyAutoContext middleware, and health checks.
 */

// ─── Constants ──────────────────────────────────────────────────────

const PHI = 1.618033988749895;
const HEADY_HEARTBEAT_MS = 29034; // phi^7

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.headysystems.com https://*.headyme.com https://*.headyconnection.org; frame-ancestors 'none';",
};

const HEADY_BRAND_HEADERS = {
  'X-Powered-By': 'Heady Liquid Dynamic Latent OS',
  'X-Heady-Edge-Version': '1.0.0',
  'X-Heady-Sacred-Geometry': `phi=${PHI}`,
};

// Cache TTLs in seconds (phi-scaled)
const CACHE_TTL = {
  static: Math.round(PHI * 3600),      // ~5832s for static assets
  api: Math.round(PHI * 60),            // ~97s for API responses
  health: 10,                            // 10s for health checks
};

// ─── Domain to Origin Mapping ──────────────────────────────────────

/**
 * Maps hostnames to their origin path prefix on Cloud Run.
 * All domains route to the single Cloud Run container.
 */
function getOriginConfig(hostname) {
  const domain = hostname.toLowerCase().replace(/:\d+$/, '');

  // Subdomain-based routing
  if (domain.startsWith('api.')) {
    return { pathPrefix: '/api', cacheTtl: CACHE_TTL.api };
  }
  if (domain.startsWith('manager.')) {
    return { pathPrefix: '/manager', cacheTtl: CACHE_TTL.api };
  }
  if (domain.startsWith('registry.')) {
    return { pathPrefix: '/registry', cacheTtl: CACHE_TTL.api };
  }
  if (domain.startsWith('app.')) {
    return { pathPrefix: '', cacheTtl: CACHE_TTL.static };
  }
  if (domain.startsWith('admin.')) {
    return { pathPrefix: '/admin', cacheTtl: CACHE_TTL.api };
  }
  if (domain.startsWith('mcp.')) {
    return { pathPrefix: '/mcp', cacheTtl: 0 }; // No cache for MCP
  }

  // Root domain routing
  const domainMap = {
    'headysystems.com':     { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headyme.com':          { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headyconnection.org':  { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headyweb.com':         { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headymcp.com':         { pathPrefix: '/mcp', cacheTtl: 0 },
    'headyio.com':          { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headybuddy.com':       { pathPrefix: '', cacheTtl: CACHE_TTL.static },
    'headyapi.com':         { pathPrefix: '/api', cacheTtl: CACHE_TTL.api },
    'headyos.com':          { pathPrefix: '', cacheTtl: CACHE_TTL.static },
  };

  return domainMap[domain] || { pathPrefix: '', cacheTtl: CACHE_TTL.static };
}

// ─── HeadyAutoContext Middleware ────────────────────────────────────

/**
 * Enriches each request with Heady context headers for downstream services.
 * Implements Law #3: Context maximization - enrich before every action.
 */
function addHeadyAutoContext(request, env) {
  const url = new URL(request.url);
  const now = Date.now();

  return {
    'X-Heady-Request-Id': crypto.randomUUID(),
    'X-Heady-Timestamp': new Date(now).toISOString(),
    'X-Heady-Edge-Region': request.cf?.colo || 'unknown',
    'X-Heady-Edge-Country': request.cf?.country || 'unknown',
    'X-Heady-Origin-Domain': url.hostname,
    'X-Heady-Origin-Path': url.pathname,
    'X-Heady-Client-IP': request.headers.get('CF-Connecting-IP') || 'unknown',
    'X-Heady-Heartbeat-Phase': String(now % HEADY_HEARTBEAT_MS),
    'X-Heady-Gateway-Version': env.GATEWAY_VERSION || '1.0.0',
  };
}

// ─── Health Check ──────────────────────────────────────────────────

function handleHealthCheck(env) {
  const body = {
    status: 'healthy',
    service: 'heady-edge-router',
    version: env.HEADY_EDGE_ROUTER_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    phi: PHI,
    heartbeatMs: HEADY_HEARTBEAT_MS,
    origin: env.ORIGIN_URL,
    architecture: 'Liquid Dynamic Latent OS',
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL.health}`,
      ...HEADY_BRAND_HEADERS,
      ...SECURITY_HEADERS,
    },
  });
}

// ─── CORS Handling ─────────────────────────────────────────────────

function handleCors(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigins = env.CORS_ORIGINS || '*';

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key, X-Heady-Request-Id',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'X-Heady-Request-Id, X-Heady-Edge-Version',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return corsHeaders;
}

// ─── Edge Cache ────────────────────────────────────────────────────

async function getCachedResponse(request, env, cacheKey) {
  if (!env.EDGE_CACHE) return null;

  try {
    const cached = await env.EDGE_CACHE.get(cacheKey, { type: 'json' });
    if (cached && cached.expiry > Date.now()) {
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          'X-Heady-Cache': 'HIT',
          ...HEADY_BRAND_HEADERS,
          ...SECURITY_HEADERS,
        },
      });
    }
  } catch (e) {
    // Cache miss or error — proceed to origin
  }

  return null;
}

async function setCachedResponse(env, cacheKey, response, ttl) {
  if (!env.EDGE_CACHE || ttl <= 0) return;

  try {
    const body = await response.clone().text();
    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    await env.EDGE_CACHE.put(cacheKey, JSON.stringify({
      body,
      status: response.status,
      headers,
      expiry: Date.now() + (ttl * 1000),
    }), { expirationTtl: ttl });
  } catch (e) {
    // Cache write failure is non-fatal
  }
}

// ─── Main Handler ──────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Health check endpoint — always available at /__heady/health
    if (url.pathname === '/__heady/health' || url.pathname === '/__heady/healthz') {
      return handleHealthCheck(env);
    }

    // CORS preflight
    const corsResult = handleCors(request, env);
    if (corsResult instanceof Response) {
      return corsResult;
    }
    const corsHeaders = corsResult;

    // Resolve origin config for this hostname
    const originConfig = getOriginConfig(hostname);
    const originUrl = env.ORIGIN_URL || 'https://heady-liquid-latent-os-849135684797.us-central1.run.app';

    // Build cache key
    const cacheKey = `${hostname}:${url.pathname}:${url.search}`;

    // Check edge cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await getCachedResponse(request, env, cacheKey);
      if (cachedResponse) {
        // Merge CORS headers into cached response
        const finalHeaders = new Headers(cachedResponse.headers);
        for (const [k, v] of Object.entries(corsHeaders)) {
          finalHeaders.set(k, v);
        }
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers: finalHeaders,
        });
      }
    }

    // Build origin request URL
    const originPath = originConfig.pathPrefix + url.pathname;
    const originRequestUrl = `${originUrl}${originPath}${url.search}`;

    // Build HeadyAutoContext headers
    const autoContextHeaders = addHeadyAutoContext(request, env);

    // Forward request headers, adding Heady context
    const forwardHeaders = new Headers(request.headers);
    for (const [key, value] of Object.entries(autoContextHeaders)) {
      forwardHeaders.set(key, value);
    }
    // Pass original host for virtual hosting at origin
    forwardHeaders.set('X-Forwarded-Host', hostname);
    forwardHeaders.set('X-Original-URL', request.url);

    // Proxy to origin
    let originResponse;
    try {
      const timeoutMs = parseInt(env.REQUEST_TIMEOUT || '30000', 10);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      originResponse = await fetch(originRequestUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err) {
      // Origin unreachable — return 502
      const errorBody = JSON.stringify({
        error: 'Bad Gateway',
        message: 'Origin server is unreachable',
        service: 'heady-edge-router',
        timestamp: new Date().toISOString(),
      });

      return new Response(errorBody, {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...HEADY_BRAND_HEADERS,
          ...SECURITY_HEADERS,
          ...corsHeaders,
        },
      });
    }

    // Build response with security + brand headers
    const responseHeaders = new Headers(originResponse.headers);

    // Apply security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      responseHeaders.set(key, value);
    }

    // Apply brand headers
    for (const [key, value] of Object.entries(HEADY_BRAND_HEADERS)) {
      responseHeaders.set(key, value);
    }

    // Apply CORS headers
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // Add cache control
    if (originConfig.cacheTtl > 0 && originResponse.status === 200) {
      responseHeaders.set('Cache-Control', `public, max-age=${originConfig.cacheTtl}, s-maxage=${originConfig.cacheTtl}`);
      responseHeaders.set('X-Heady-Cache', 'MISS');
    } else {
      responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      responseHeaders.set('X-Heady-Cache', 'BYPASS');
    }

    // Add request ID to response
    responseHeaders.set('X-Heady-Request-Id', autoContextHeaders['X-Heady-Request-Id']);

    const response = new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });

    // Cache successful GET responses
    if (request.method === 'GET' && originResponse.status === 200 && originConfig.cacheTtl > 0) {
      ctx.waitUntil(setCachedResponse(env, cacheKey, response, originConfig.cacheTtl));
    }

    // Log metrics
    if (env.EDGE_METRICS) {
      ctx.waitUntil(
        env.EDGE_METRICS.writeDataPoint({
          blobs: [hostname, url.pathname, request.method, String(originResponse.status)],
          doubles: [Date.now()],
          indexes: [hostname],
        })
      );
    }

    return response;
  },
};
