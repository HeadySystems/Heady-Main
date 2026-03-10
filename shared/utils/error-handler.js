/**
 * Heady™ Error Handler Utility
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides centralized, structured error handling with:
 *   - Consistent error classification (transient vs permanent)
 *   - φ-scaled retry suggestions based on error type
 *   - Structured logging with context preservation
 *   - Safe error object returns for client exposure
 *
 * @module shared/utils/error-handler
 * @version 1.0.0
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const { getLogger } = require('../../src/services/structured-logger');
const {
  phiRetryDelays,
  phiBackoffWithJitter,
  TIMING,
  CSL,
} = require('../../core/constants/phi');

/**
 * Error classification types used for categorization and retry logic
 * @type {Object}
 */
const ERROR_TYPES = {
  TRANSIENT: 'transient',    // Temporary, safe to retry
  PERMANENT: 'permanent',    // Permanent failure, do not retry
  TIMEOUT: 'timeout',        // Request timeout, safe to retry with backoff
  RATE_LIMIT: 'rate_limit',  // Rate limited, use exponential backoff
  AUTH: 'authentication',    // Auth failure, requires user action
  VALIDATION: 'validation',  // Input validation, do not retry
  UNKNOWN: 'unknown',        // Unknown error type
};

/**
 * Common error patterns mapped to classification and HTTP status codes
 * @type {Object}
 */
const ERROR_PATTERNS = {
  // Network/Transient errors
  ECONNREFUSED: { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },
  ECONNRESET: { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },
  ETIMEDOUT: { type: ERROR_TYPES.TIMEOUT, statusCode: 504, retryable: true },
  EHOSTUNREACH: { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },
  ENOTFOUND: { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },

  // HTTP errors
  'ECONNREFUSED:80': { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },
  'timeout': { type: ERROR_TYPES.TIMEOUT, statusCode: 504, retryable: true },
  'socket hang up': { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },

  // Rate limiting
  '429': { type: ERROR_TYPES.RATE_LIMIT, statusCode: 429, retryable: true },
  'Too Many Requests': { type: ERROR_TYPES.RATE_LIMIT, statusCode: 429, retryable: true },

  // Authentication
  '401': { type: ERROR_TYPES.AUTH, statusCode: 401, retryable: false },
  'Unauthorized': { type: ERROR_TYPES.AUTH, statusCode: 401, retryable: false },
  '403': { type: ERROR_TYPES.AUTH, statusCode: 403, retryable: false },
  'Forbidden': { type: ERROR_TYPES.AUTH, statusCode: 403, retryable: false },

  // Validation
  '400': { type: ERROR_TYPES.VALIDATION, statusCode: 400, retryable: false },
  'Bad Request': { type: ERROR_TYPES.VALIDATION, statusCode: 400, retryable: false },
  '422': { type: ERROR_TYPES.VALIDATION, statusCode: 422, retryable: false },
  'Unprocessable Entity': { type: ERROR_TYPES.VALIDATION, statusCode: 422, retryable: false },

  // Server errors (transient)
  '500': { type: ERROR_TYPES.TRANSIENT, statusCode: 500, retryable: true },
  '502': { type: ERROR_TYPES.TRANSIENT, statusCode: 502, retryable: true },
  '503': { type: ERROR_TYPES.TRANSIENT, statusCode: 503, retryable: true },
  '504': { type: ERROR_TYPES.TIMEOUT, statusCode: 504, retryable: true },
};

/**
 * Classify an error based on its type, message, or code
 *
 * @param {Error} error - The error to classify
 * @returns {Object} Classification object with type, retryable, and statusCode
 */
function classifyError(error) {
  if (!error) {
    return {
      type: ERROR_TYPES.UNKNOWN,
      retryable: false,
      statusCode: 500,
    };
  }

  // Check error code (Node.js system errors)
  if (error.code) {
    const pattern = ERROR_PATTERNS[error.code];
    if (pattern) {
      return pattern;
    }
  }

  // Check HTTP status code
  if (error.statusCode || error.status) {
    const code = String(error.statusCode || error.status);
    const pattern = ERROR_PATTERNS[code];
    if (pattern) {
      return pattern;
    }
  }

  // Check message patterns
  if (error.message) {
    for (const [key, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (!key.includes(':') && !key.match(/^\d+$/) && error.message.includes(key)) {
        return pattern;
      }
    }
  }

  // Default to permanent error
  return {
    type: ERROR_TYPES.UNKNOWN,
    retryable: false,
    statusCode: 500,
  };
}

/**
 * Calculate retry suggestions based on error classification
 *
 * @param {string} errorType - The classified error type
 * @param {number} attemptNumber - Current attempt number (0-based)
 * @param {number} maxRetries - Maximum retries allowed (default: 5)
 * @returns {Object} Retry suggestion with delay and max attempts
 */
function getRetryStrategy(errorType, attemptNumber = 0, maxRetries = 5) {
  const suggestion = {
    canRetry: false,
    nextDelayMs: null,
    maxAttempts: maxRetries,
    strategy: null,
  };

  switch (errorType) {
    case ERROR_TYPES.TRANSIENT:
      suggestion.canRetry = true;
      suggestion.strategy = 'exponential_backoff';
      suggestion.nextDelayMs = phiBackoffWithJitter(attemptNumber, TIMING.CONNECT);
      break;

    case ERROR_TYPES.TIMEOUT:
      suggestion.canRetry = true;
      suggestion.strategy = 'exponential_backoff_extended';
      suggestion.nextDelayMs = phiBackoffWithJitter(attemptNumber, TIMING.REQUEST);
      break;

    case ERROR_TYPES.RATE_LIMIT:
      suggestion.canRetry = true;
      suggestion.strategy = 'exponential_backoff_long';
      // Use longer base delay for rate limits
      suggestion.nextDelayMs = phiBackoffWithJitter(attemptNumber, TIMING.CYCLE);
      break;

    case ERROR_TYPES.AUTH:
    case ERROR_TYPES.VALIDATION:
    case ERROR_TYPES.PERMANENT:
      suggestion.canRetry = false;
      suggestion.strategy = 'no_retry';
      break;

    case ERROR_TYPES.UNKNOWN:
    default:
      suggestion.canRetry = false;
      suggestion.strategy = 'unknown_do_not_retry';
      break;
  }

  // Don't exceed max retries
  if (attemptNumber >= maxRetries) {
    suggestion.canRetry = false;
  }

  return suggestion;
}

/**
 * Create a safe error object for client exposure
 * Strips sensitive information and includes only necessary details
 *
 * @param {Error} error - The original error
 * @param {Object} classification - Classification from classifyError()
 * @returns {Object} Safe error object for client response
 */
function createSafeError(error, classification) {
  const safeError = {
    code: classification.type,
    statusCode: classification.statusCode,
    message: error?.message || 'An error occurred',
  };

  // Add safe details based on error type
  if (classification.type === ERROR_TYPES.VALIDATION && error?.details) {
    safeError.details = error.details;
  }

  if (classification.type === ERROR_TYPES.RATE_LIMIT && error?.retryAfter) {
    safeError.retryAfter = error.retryAfter;
  }

  return safeError;
}

/**
 * Handle and log a caught error with structured context
 *
 * Performs classification, logging, and returns a safe error object for client use.
 * Logs sensitive details server-side while returning limited info to client.
 *
 * @param {Error} error - The error to handle
 * @param {Object} context - Context object for logging
 *   @param {string} context.operation - Operation name (e.g., 'fetchUserData')
 *   @param {string} [context.service] - Service name (defaults to 'error-handler')
 *   @param {string} [context.traceId] - Trace ID for request tracking
 *   @param {number} [context.attemptNumber] - Current attempt number
 *   @param {number} [context.maxRetries] - Max retries (default: 5)
 *   @param {Object} [context.metadata] - Additional metadata for logging
 *
 * @returns {Object} Safe error object with classification and retry suggestions
 */
function handleCatchError(error, context = {}) {
  const {
    operation = 'unknown',
    service = 'error-handler',
    traceId = null,
    attemptNumber = 0,
    maxRetries = 5,
    metadata = {},
  } = context;

  // Classify the error
  const classification = classifyError(error);
  const retryStrategy = getRetryStrategy(classification.type, attemptNumber, maxRetries);

  // Get logger instance
  const logger = getLogger(service);

  // Create server-side log entry with full details
  const logEntry = {
    operation,
    traceId,
    errorType: classification.type,
    statusCode: classification.statusCode,
    message: error?.message || 'Unknown error',
    stack: error?.stack || null,
    code: error?.code || null,
    attemptNumber,
    canRetry: retryStrategy.canRetry,
    retryStrategy: retryStrategy.strategy,
    nextDelayMs: retryStrategy.nextDelayMs,
    ...metadata,
  };

  // Log based on error severity
  if (classification.type === ERROR_TYPES.PERMANENT || classification.type === ERROR_TYPES.AUTH) {
    logger.error(`Error in ${operation}`, logEntry);
  } else if (classification.type === ERROR_TYPES.VALIDATION) {
    logger.warn(`Validation error in ${operation}`, logEntry);
  } else {
    logger.info(`Transient error in ${operation}`, logEntry);
  }

  // Create safe error for client
  const safeError = createSafeError(error, classification);

  // Add retry information
  if (retryStrategy.canRetry) {
    safeError.retry = {
      canRetry: true,
      nextDelayMs: retryStrategy.nextDelayMs,
      strategy: retryStrategy.strategy,
      maxAttempts: retryStrategy.maxAttempts,
    };
  }

  return safeError;
}

/**
 * Wrap an async function to automatically handle errors
 *
 * Catches errors during execution and calls handleCatchError,
 * then rethrows with structured error context.
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Error handling context (passed to handleCatchError)
 *   @param {string} context.operation - Operation name
 *   @param {string} [context.service] - Service name
 *   @param {string} [context.traceId] - Trace ID
 *   @param {number} [context.maxRetries] - Max retries
 *
 * @returns {Function} Wrapped async function
 *
 * @example
 * const safeFetch = wrapAsync(fetchUserData, { operation: 'fetchUser', service: 'api' });
 * try {
 *   const user = await safeFetch(userId);
 * } catch (err) {
 *   // err already has retry info
 * }
 */
function wrapAsync(fn, context = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('First argument to wrapAsync must be a function');
  }

  return async function wrappedAsyncFn(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      const safeError = handleCatchError(error, {
        ...context,
        operation: context.operation || fn.name || 'asyncFunction',
      });

      // Enrich the error with safe error details
      const enhancedError = new Error(safeError.message);
      enhancedError.code = safeError.code;
      enhancedError.statusCode = safeError.statusCode;
      enhancedError.retry = safeError.retry || null;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  };
}

module.exports = {
  // Constants
  ERROR_TYPES,
  ERROR_PATTERNS,

  // Classification
  classifyError,
  getRetryStrategy,

  // Error handling
  handleCatchError,
  wrapAsync,
  createSafeError,
};
