/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { requestIdMiddleware } = require('./request-id');
const { corsMiddleware } = require('./cors');
const { authVerifyMiddleware } = require('./auth-verify');
const { errorHandler } = require('./error-handler');

module.exports = {
  requestIdMiddleware,
  corsMiddleware,
  authVerifyMiddleware,
  errorHandler,
};
