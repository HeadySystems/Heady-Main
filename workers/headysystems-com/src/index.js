/**
 * HeadySystems.com — Cloudflare Worker Edge Proxy
 * © 2026 HeadySystems Inc.
 *
 * Routes requests to the Cloud Run backend, applies security headers,
 * adds authentication forwarding, and implements edge caching.
 */

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=2592000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-XSS-Protection': '1; mode=block',
};

// CSP is report-only initially per the playbook
const CSP_HEADER = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.headysystems.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Health check ────────────────────────────────────────────
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'headysystems-com-worker',
        environment: env.ENVIRONMENT,
        ts: Date.now(),
      });
    }

    // ── .well-known paths pass through ──────────────────────────
    // ── Proxy to Cloud Run backend ──────────────────────────────
    const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Real-IP', request.headers.get('cf-connecting-ip') ?? '');
    headers.set('X-Request-ID', crypto.randomUUID());
    headers.set('X-Worker-Version', '1.0.0');

    // Edge cache check for static assets
    const isStatic = /\.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|ico)$/i.test(url.pathname);
    const cacheControl = isStatic ? 'public, max-age=86400, s-maxage=604800' : 'no-cache';

    try {
      const response = await fetch(backendUrl.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        redirect: 'follow',
      });

      const resp = new Response(response.body, response);

      // Apply security headers
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        resp.headers.set(key, value);
      }
      resp.headers.set('Content-Security-Policy-Report-Only', CSP_HEADER);
      resp.headers.set('Cache-Control', cacheControl);
      resp.headers.set('X-Served-By', 'heady-edge');

      return resp;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Origin unreachable', detail: err.message }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
      );
    }
  },
};
