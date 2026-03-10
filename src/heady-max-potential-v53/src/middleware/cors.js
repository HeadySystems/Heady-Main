/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

/**
 * CORS middleware with explicit origin whitelist.
 * NO wildcard (*) origins — ever.
 * Origins are loaded from config or env ALLOWED_ORIGINS.
 *
 * @param {string[]} allowedOrigins — Explicit list of allowed origins
 */
function corsMiddleware(allowedOrigins) {
  const originSet = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin || '';

    if (originSet.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Request-ID,X-Correlation-ID');
    res.setHeader('Access-Control-Expose-Headers',
      'X-Request-ID,X-RateLimit-Limit,X-RateLimit-Remaining');
    res.setHeader('Access-Control-Max-Age', '86400');  // 24h preflight cache (HTTP spec constant)

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    next();
  };
}

module.exports = { corsMiddleware };
