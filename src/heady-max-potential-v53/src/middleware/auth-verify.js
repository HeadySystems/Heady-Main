/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const crypto = require('crypto');
const { AppError } = require('../utils/app-error');

/**
 * Verify authentication via httpOnly cookie or Authorization bearer token.
 * Tokens are validated using HMAC-SHA256 (symmetric JWT-like verification).
 *
 * @param {Object} opts
 * @param {string} opts.secret — JWT/HMAC secret
 * @param {boolean} opts.required — If true, unauthenticated requests are rejected
 */
function authVerifyMiddleware(opts = {}) {
  const { secret, required = true } = opts;

  if (!secret) {
    throw new Error('authVerifyMiddleware requires a secret');
  }

  return (req, res, next) => {
    let token = null;

    // 1. Check httpOnly cookie first (preferred)
    if (req.cookies?.heady_session) {
      token = req.cookies.heady_session;
    }

    // 2. Fall back to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);  // 'Bearer '.length = 7
      }
    }

    if (!token) {
      if (required) {
        return next(AppError.unauthorized('No authentication token provided'));
      }
      req.user = null;
      return next();
    }

    try {
      // Decode base64url payload (simplified JWT — [header].[payload].[signature])
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token structure');
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify HMAC-SHA256 signature
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(
        Buffer.from(signatureB64, 'base64url'),
        Buffer.from(expectedSig, 'base64url')
      )) {
        throw new Error('Invalid signature');
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      // Check expiry
      if (payload.exp && Date.now() > payload.exp) {
        throw new Error('Token expired');
      }

      req.user = payload;
      next();
    } catch (err) {
      if (required) {
        return next(AppError.unauthorized(err.message));
      }
      req.user = null;
      next();
    }
  };
}

module.exports = { authVerifyMiddleware };
