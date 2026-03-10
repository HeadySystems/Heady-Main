/**
 * Contract Tests — Health Endpoint Schema
 * Verifies all services conform to the standard health response contract
 *
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const assert = require('assert');

/**
 * Standard health response schema
 * All Heady services MUST return this structure from /healthz
 */
const HEALTH_SCHEMA = {
  required: ['service', 'status', 'version'],
  properties: {
    service: { type: 'string' },
    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
    version: { type: 'string', pattern: /^\d+\.\d+\.\d+$/ }
  }
};

/**
 * Validate a health response against the contract
 * @param {Object} response - Health response object
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateHealthResponse(response) {
  const errors = [];

  for (const field of HEALTH_SCHEMA.required) {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  for (const [field, spec] of Object.entries(HEALTH_SCHEMA.properties)) {
    if (field in response) {
      if (typeof response[field] !== spec.type) {
        errors.push(`Field ${field}: expected ${spec.type}, got ${typeof response[field]}`);
      }
      if (spec.enum && !spec.enum.includes(response[field])) {
        errors.push(`Field ${field}: "${response[field]}" not in [${spec.enum.join(', ')}]`);
      }
      if (spec.pattern && !spec.pattern.test(response[field])) {
        errors.push(`Field ${field}: "${response[field]}" does not match pattern`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  'valid healthy response passes contract': () => {
    const result = validateHealthResponse({
      service: 'heady-soul',
      status: 'healthy',
      version: '4.0.0'
    });
    assert.strictEqual(result.valid, true, result.errors.join('; '));
  },

  'valid degraded response passes contract': () => {
    const result = validateHealthResponse({
      service: 'heady-memory',
      status: 'degraded',
      version: '4.0.0'
    });
    assert.strictEqual(result.valid, true);
  },

  'missing service field fails contract': () => {
    const result = validateHealthResponse({
      status: 'healthy',
      version: '4.0.0'
    });
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('service')));
  },

  'missing status field fails contract': () => {
    const result = validateHealthResponse({
      service: 'test',
      version: '4.0.0'
    });
    assert.strictEqual(result.valid, false);
  },

  'invalid status value fails contract': () => {
    const result = validateHealthResponse({
      service: 'test',
      status: 'broken',
      version: '4.0.0'
    });
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('not in')));
  },

  'invalid version format fails contract': () => {
    const result = validateHealthResponse({
      service: 'test',
      status: 'healthy',
      version: 'v4'
    });
    assert.strictEqual(result.valid, false);
    assert(result.errors.some(e => e.includes('pattern')));
  },

  'extra fields are allowed': () => {
    const result = validateHealthResponse({
      service: 'heady-soul',
      status: 'healthy',
      version: '4.0.0',
      uptime: 12345,
      extra: 'field'
    });
    assert.strictEqual(result.valid, true);
  },

  'empty object fails all required fields': () => {
    const result = validateHealthResponse({});
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 3);
  }
};
