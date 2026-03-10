/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const crypto = require('crypto');
const { AppError } = require('../utils/app-error');

/**
 * CSRF protection via double-submit cookie pattern.
 * - Sets a CSRF token in a non-httpOnly cookie (readable by JS)
 * - Expects the same token in X-CSRF-Token header on state-changing requests
 * - Token rotates per session
 */

/** Generate a cryptographically random CSRF token */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF middleware.
 * @param {Object} opts
 * @param {string[]} opts.safeMethods — Methods that skip CSRF check (default: GET, HEAD, OPTIONS)
 */
function csrfMiddleware(opts = {}) {
  const safeMethods = new Set(opts.safeMethods || ['GET', 'HEAD', 'OPTIONS']);

  return (req, res, next) => {
    // Ensure CSRF cookie exists
    if (!req.cookies?.heady_csrf) {
      const token = generateCsrfToken();
      res.cookie('heady_csrf', token, {
        httpOnly: false,    // JS must read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/',
      });
      req.csrfToken = token;
    } else {
      req.csrfToken = req.cookies.heady_csrf;
    }

    // Skip CSRF check for safe methods
    if (safeMethods.has(req.method)) {
      return next();
    }

    // Verify double-submit: cookie must match header
    const headerToken = req.headers['x-csrf-token'] || '';
    const cookieToken = req.cookies?.heady_csrf || '';

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return next(AppError.forbidden('CSRF token mismatch', {
        code: 'HEADY-CSRF-403',
      }));
    }

    next();
  };
}

module.exports = { csrfMiddleware, generateCsrfToken };
