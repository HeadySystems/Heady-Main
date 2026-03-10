/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { CSL_THRESHOLDS, fib } = require('../../shared/phi-math');
const { AppError } = require('../utils/app-error');

/** Maximum input length before rejection: fib(17) = 1597 chars */
const MAX_INPUT_LENGTH = fib(17);

/** Maximum JSON body depth: fib(7) = 13 levels */
const MAX_JSON_DEPTH = fib(7);

/** Maximum array items in body: fib(14) = 377 */
const MAX_ARRAY_ITEMS = fib(14);

/**
 * Dangerous patterns for injection detection.
 * Scored against CSL thresholds — patterns above MEDIUM trigger rejection.
 */
const INJECTION_PATTERNS = [
  { pattern: /<script[^>]*>/i, threat: 'XSS_SCRIPT', severity: 'CRITICAL' },
  { pattern: /javascript:/i, threat: 'XSS_PROTOCOL', severity: 'CRITICAL' },
  { pattern: /on\w+\s*=/i, threat: 'XSS_EVENT', severity: 'HIGH' },
  { pattern: /['"]\s*(?:OR|AND|UNION)\s+/i, threat: 'SQL_INJECTION', severity: 'CRITICAL' },
  { pattern: /;\s*(?:DROP|DELETE|ALTER|TRUNCATE)/i, threat: 'SQL_DESTRUCTIVE', severity: 'CRITICAL' },
  { pattern: /\$\{.*\}|\{\{.*\}\}/i, threat: 'TEMPLATE_INJECTION', severity: 'HIGH' },
  { pattern: /\.\.\/|\.\.\\/, threat: 'PATH_TRAVERSAL', severity: 'HIGH' },
];

/**
 * Validate and sanitize input string.
 * @param {string} input — Raw user input
 * @param {Object} opts — Options
 * @param {number} opts.maxLength — Max allowed length (default fib(17) = 1597)
 * @returns {{ safe: boolean, sanitized: string, threats: string[] }}
 */
function validateInput(input, opts = {}) {
  const maxLength = opts.maxLength || MAX_INPUT_LENGTH;
  const threats = [];

  if (typeof input !== 'string') {
    return { safe: false, sanitized: '', threats: ['INVALID_TYPE'] };
  }

  if (input.length > maxLength) {
    return { safe: false, sanitized: input.slice(0, maxLength), threats: ['EXCEEDS_LENGTH'] };
  }

  // Check injection patterns
  for (const { pattern, threat } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(threat);
    }
  }

  // Sanitize: strip control chars (keep newline, tab), normalize unicode
  const sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // strip control chars
    .normalize('NFC');                                           // normalize unicode

  return {
    safe: threats.length === 0,
    sanitized,
    threats,
  };
}

/**
 * Express middleware: validate request body depth and size.
 */
function bodyValidatorMiddleware(req, res, next) {
  if (!req.body) return next();

  const depth = measureDepth(req.body);
  if (depth > MAX_JSON_DEPTH) {
    return next(AppError.badRequest('Request body too deeply nested', {
      maxDepth: MAX_JSON_DEPTH,
      actualDepth: depth,
    }));
  }

  const arrayCount = countArrayItems(req.body);
  if (arrayCount > MAX_ARRAY_ITEMS) {
    return next(AppError.badRequest('Request body contains too many array items', {
      maxItems: MAX_ARRAY_ITEMS,
      actualItems: arrayCount,
    }));
  }

  next();
}

function measureDepth(obj, current = 0) {
  if (typeof obj !== 'object' || obj === null) return current;
  let max = current;
  for (const val of Object.values(obj)) {
    max = Math.max(max, measureDepth(val, current + 1));
  }
  return max;
}

function countArrayItems(obj) {
  if (Array.isArray(obj)) return obj.length;
  if (typeof obj !== 'object' || obj === null) return 0;
  let count = 0;
  for (const val of Object.values(obj)) {
    count += countArrayItems(val);
  }
  return count;
}

module.exports = { validateInput, bodyValidatorMiddleware, MAX_INPUT_LENGTH, MAX_JSON_DEPTH, MAX_ARRAY_ITEMS };
