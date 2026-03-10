/**
 * Heady™ Latent OS v5.3.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 *
 * SECURITY HEADERS MIDDLEWARE
 * CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
 * for all Heady services.
 */
'use strict';

const { fib } = require('../../shared/phi-math');
const { HEADY_DOMAINS, ADMIN_SUBDOMAINS } = require('../../shared/heady-domains');

// ─── Build CSP sources from canonical domain list ───────────────────────────

function buildCSPSources() {
  const domains = Object.values(HEADY_DOMAINS).map((d) => `https://${d.host}`);
  const subs = ADMIN_SUBDOMAINS.map((s) => `https://${s}`);
  return [...domains, ...subs];
}

const HSTS_MAX_AGE = fib(11) * fib(12) * fib(10); // 89 × 144 × 55 = 704 880s ≈ 8.16 days

// ─── Security headers middleware ────────────────────────────────────────────

function securityHeadersMiddleware(options = {}) {
  const {
    frameAncestors = "'none'",
    reportUri = null,
  } = options;

  const cspSources = buildCSPSources().join(' ');

  return (req, res, next) => {
    // Strict Transport Security
    res.setHeader('Strict-Transport-Security',
      `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`);

    // Content Security Policy
    const csp = [
      `default-src 'self'`,
      `script-src 'self' ${cspSources}`,
      `style-src 'self' 'unsafe-inline' ${cspSources}`,
      `img-src 'self' data: ${cspSources}`,
      `font-src 'self' ${cspSources}`,
      `connect-src 'self' ${cspSources}`,
      `frame-src 'self' https://auth.headysystems.com`,
      `frame-ancestors ${frameAncestors}`,
      `base-uri 'self'`,
      `form-action 'self' https://auth.headysystems.com`,
      `upgrade-insecure-requests`,
    ];
    if (reportUri) {
      csp.push(`report-uri ${reportUri}`);
    }
    res.setHeader('Content-Security-Policy', csp.join('; '));

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0'); // Deprecated — CSP handles this
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()');

    next();
  };
}

module.exports = { securityHeadersMiddleware, buildCSPSources, HSTS_MAX_AGE };
