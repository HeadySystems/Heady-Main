/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { AppError } = require('../utils/app-error');

/**
 * Centralized error handling middleware.
 * - Operational errors (AppError) → structured JSON response
 * - Programmer errors → 500 with sanitized message (no stack leak)
 *
 * @param {Function} logger — Structured logger instance with .error() method
 */
function errorHandler(logger) {
  // Express error middleware requires exactly 4 params
  return (err, req, res, _next) => {
    // Normalize to AppError
    if (!(err instanceof AppError)) {
      logger.error({
        err: { message: err.message, stack: err.stack },
        requestId: req.requestId,
        method: req.method,
        path: req.path,
      });

      err = AppError.internal(
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message
      );
    } else {
      logger.error({
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
        requestId: req.requestId,
      });
    }

    res.status(err.statusCode).json(err.toJSON());
  };
}

module.exports = { errorHandler };
