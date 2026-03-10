/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const crypto = require('crypto');

/**
 * Attach a unique request/correlation ID to every request.
 * Propagates X-Request-ID from upstream or generates a new one.
 * Essential for distributed tracing across the Heady Latent OS.
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || `heady-${crypto.randomUUID()}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = { requestIdMiddleware };
