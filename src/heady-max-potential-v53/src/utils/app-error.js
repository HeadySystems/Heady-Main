/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

/**
 * Typed application error with HTTP status, error code, and operational flag.
 * Replaces generic Error throws across the entire Heady Latent OS.
 *
 * @example
 *   throw new AppError('Session expired', 401, 'AUTH_SESSION_EXPIRED', { userId });
 */
class AppError extends Error {
  /**
   * @param {string}  message    — Human-readable error description
   * @param {number}  statusCode — HTTP status code
   * @param {string}  code       — Machine-readable HEADY-prefixed error code
   * @param {Object}  details    — Structured context (never contains secrets)
   */
  constructor(message, statusCode = 500, code = 'HEADY-INTERNAL-500', details = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;   // operational errors are expected; programmer errors are not
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  /** Serialize for JSON responses (strips stack in production) */
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  // ─── Factory methods for common errors ──────────────────────────────────────

  static badRequest(message, details = {}) {
    return new AppError(message, 400, 'HEADY-BAD-REQUEST-400', details);
  }

  static unauthorized(message = 'Authentication required', details = {}) {
    return new AppError(message, 401, 'HEADY-UNAUTHORIZED-401', details);
  }

  static forbidden(message = 'Access denied', details = {}) {
    return new AppError(message, 403, 'HEADY-FORBIDDEN-403', details);
  }

  static notFound(resource = 'Resource', details = {}) {
    return new AppError(`${resource} not found`, 404, 'HEADY-NOT-FOUND-404', details);
  }

  static conflict(message, details = {}) {
    return new AppError(message, 409, 'HEADY-CONFLICT-409', details);
  }

  static tooManyRequests(message = 'Rate limit exceeded', details = {}) {
    return new AppError(message, 429, 'HEADY-RATE-429', details);
  }

  static internal(message = 'Internal server error', details = {}) {
    return new AppError(message, 500, 'HEADY-INTERNAL-500', details);
  }

  static serviceUnavailable(service, details = {}) {
    return new AppError(`Service unavailable: ${service}`, 503, 'HEADY-UNAVAILABLE-503', details);
  }
}

module.exports = { AppError };
