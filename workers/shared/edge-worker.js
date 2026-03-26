/**
 * HeadySystems — Shared Edge Worker Template
 * © 2026 HeadySystems Inc.
 *
 * Generic edge proxy for all 8 HeadySystems domains.
 * Each domain Worker imports this and overrides site-specific config.
 *
 * Handles: backend proxying, security headers, edge caching,
 * request correlation, and health checks.
 */

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=2592000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-XSS-Protection': '1; mode=block',
};

export function createEdgeWorker(siteConfig = {}) {
  const {
    serviceName = 'heady-edge',
    cspPolicy = "default-src 'self'",
    cspMode = 'report-only',   // 'report-only' | 'enforce'
    staticCacheTtl = 86400,    // 1 day
    staticEdgeTtl = 604800,    // 7 days
  } = siteConfig;

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);

      // Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'ok',
          service: serviceName,
          environment: env.ENVIRONMENT ?? 'unknown',
          ts: Date.now(),
        });
      }

      // Proxy to backend
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);
      const headers = new Headers(request.headers);
      headers.set('X-Forwarded-Host', url.hostname);
      headers.set('X-Forwarded-Proto', 'https');
      headers.set('X-Real-IP', request.headers.get('cf-connecting-ip') ?? '');
      headers.set('X-Request-ID', crypto.randomUUID());

      const isStatic = /\.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|ico)$/i.test(url.pathname);

      try {
        const response = await fetch(backendUrl.toString(), {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
          redirect: 'follow',
        });

        const resp = new Response(response.body, response);

        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          resp.headers.set(key, value);
        }

        const cspHeader = cspMode === 'enforce'
          ? 'Content-Security-Policy'
          : 'Content-Security-Policy-Report-Only';
        resp.headers.set(cspHeader, cspPolicy);

        if (isStatic) {
          resp.headers.set('Cache-Control', `public, max-age=${staticCacheTtl}, s-maxage=${staticEdgeTtl}`);
        }

        resp.headers.set('X-Served-By', serviceName);
        return resp;
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Origin unreachable', service: serviceName }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    },
  };
}
