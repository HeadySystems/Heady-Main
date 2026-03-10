/**
 * Heady Consolidated Middleware Index
 * ==================================================
 * Central export point for all security and infrastructure middleware.
 * Provides both individual middleware exports and convenience functions
 * for rapid Express/Fastify wiring.
 *
 * Features:
 *  - Re-exports security-headers middleware
 *  - Re-exports cors-whitelist middleware
 *  - Provides standardMiddleware() factory for common setup
 *  - Production-quality error handling
 *
 * Usage:
 *   import { standardMiddleware, securityHeaders, corsPolicy } from './middleware.mjs';
 *   app.use(...standardMiddleware());
 *
 * @module shared/middleware
 */

// Import security middleware modules
import * as securityHeadersModule from '../../../services/heady-security/middleware/security-headers.js';
import * as corsModule from '../../../services/heady-security/middleware/cors-policy.js';

// Re-export security headers functions
export const securityHeaders = securityHeadersModule.securityHeaders;
export const frameOptions = securityHeadersModule.frameOptions;
export const cspOverride = securityHeadersModule.cspOverride;
export const cspViolationHandler = securityHeadersModule.cspViolationHandler;
export const generateNonce = securityHeadersModule.generateNonce;
export const buildCSP = securityHeadersModule.buildCSP;
export const buildPermissionsPolicy = securityHeadersModule.buildPermissionsPolicy;
export const buildReportTo = securityHeadersModule.buildReportTo;
export const SECURITY_HEADERS_DEFAULTS = securityHeadersModule.DEFAULTS;

// Re-export CORS functions
export const corsPolicy = corsModule.corsPolicy;
export const publicCors = corsModule.publicCors;
export const noCors = corsModule.noCors;
export const validateOrigin = corsModule.validateOrigin;
export const CORSRouteRegistry = corsModule.CORSRouteRegistry;
export const FIRST_PARTY_DOMAINS = corsModule.FIRST_PARTY_DOMAINS;
export const ALLOWED_METHODS = corsModule.ALLOWED_METHODS;
export const ALLOWED_HEADERS = corsModule.ALLOWED_HEADERS;
export const EXPOSED_HEADERS = corsModule.EXPOSED_HEADERS;
export const PREFLIGHT_MAX_AGE = corsModule.PREFLIGHT_MAX_AGE;

/**
 * Create a standard middleware array for typical Express/Fastify applications.
 *
 * Returns a pre-configured array of [corsPolicy, securityHeaders] middleware
 * that can be spread into app.use():
 *
 *   app.use(...standardMiddleware())
 *   app.use(...standardMiddleware({ options: true }))
 *
 * This is the recommended way to wire up security middleware across
 * the application, applying:
 *  1. CORS validation (with environment-aware localhost allowance)
 *  2. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *
 * @param {object} [opts]                        - Configuration options
 * @param {string[]} [opts.additionalDomains]    - Extra allowed first-party domains for CORS
 * @param {boolean} [opts.allowLocalhost]        - Allow localhost in dev (default: NODE_ENV !== 'production')
 * @param {CORSRouteRegistry} [opts.corsRegistry] - Per-route CORS overrides
 * @param {number} [opts.hstsMaxAge]             - HSTS max-age in seconds (default: 31536000 / 1 year)
 * @param {boolean} [opts.hstsPreload]           - Include preload directive (default: true)
 * @param {string} [opts.cspReportUri]           - CSP violation report endpoint (default: /csp-violations)
 * @param {Function} [opts.isAuthenticated]      - fn(req) -> bool; determine auth status for cache control
 * @param {object} [opts.cspOverrides]           - Global CSP directive overrides
 *
 * @returns {Function[]} Array of middleware functions for spread into app.use()
 *
 * @example
 *   import { standardMiddleware } from '@heady-ai/shared';
 *   app.use(...standardMiddleware());
 *
 * @example
 *   import { standardMiddleware } from '@heady-ai/shared';
 *   app.use(...standardMiddleware({
 *     additionalDomains: ['partner.example.com'],
 *     allowLocalhost: false,
 *     hstsMaxAge: 31536000,
 *     cspReportUri: '/.well-known/csp-violations',
 *     isAuthenticated: (req) => !!req.session?.userId,
 *     cspOverrides: {
 *       'connect-src': ["'self'", 'https://api.example.com', 'wss://api.example.com'],
 *     },
 *   }));
 *
 * @example
 *   import { standardMiddleware, CORSRouteRegistry } from '@heady-ai/shared';
 *   const corsRegistry = new CORSRouteRegistry()
 *     .register('/api/public/', { allowAll: true })
 *     .register('/webhooks/', { allowAll: true, methods: ['POST'] })
 *     .register('/embed/', { origins: ['https://partner.example.com'] });
 *
 *   app.use(...standardMiddleware({
 *     corsRegistry,
 *     additionalDomains: ['partner.example.com'],
 *   }));
 */
export function standardMiddleware(opts = {}) {
  const {
    additionalDomains = [],
    allowLocalhost = process.env.NODE_ENV !== 'production',
    corsRegistry = null,
    hstsMaxAge = 31536000,
    hstsPreload = true,
    hstsIncludeSubdomains = true,
    cspReportUri = '/csp-violations',
    isAuthenticated = null,
    cspOverrides = {},
  } = opts;

  // Build CORS middleware
  const corsMw = corsPolicy({
    additionalDomains,
    allowLocalhost,
    routeRegistry: corsRegistry || new CORSRouteRegistry(),
  });

  // Build security headers middleware
  const securityMw = securityHeaders({
    hstsMaxAge,
    hstsPreload,
    hstsIncludeSubdomains,
    cspReportUri,
    isAuthenticated,
    cspOverrides,
  });

  return [corsMw, securityMw];
}

/**
 * Usage Examples
 * ==============
 *
 * BASIC EXPRESS SETUP:
 * ====================
 *   import express from 'express';
 *   import { standardMiddleware, cspViolationHandler } from '@heady-ai/shared';
 *
 *   const app = express();
 *
 *   // Apply standard middleware to all routes
 *   app.use(...standardMiddleware());
 *
 *   // CSP violation handler
 *   app.post('/csp-violations',
 *     express.json({ type: ['application/json', 'application/csp-report'] }),
 *     cspViolationHandler({ onViolation: (v) => console.log('CSP:', v) })
 *   );
 *
 *   // Public endpoint
 *   app.get('/api/public/data', publicCors(['GET']), (req, res) => {
 *     res.json({ data: 'public' });
 *   });
 *
 * ADVANCED FASTIFY SETUP:
 * =======================
 *   import fastify from 'fastify';
 *   import { standardMiddleware, CORSRouteRegistry } from '@heady-ai/shared';
 *
 *   const app = fastify();
 *
 *   // Per-route CORS registry
 *   const corsRegistry = new CORSRouteRegistry()
 *     .register('/api/public/', { allowAll: true })
 *     .register('/webhooks/', { allowAll: true })
 *     .register('/admin/', { credentials: true });
 *
 *   // Register standard middleware
 *   const mw = standardMiddleware({
 *     corsRegistry,
 *     additionalDomains: ['partner.example.com'],
 *     isAuthenticated: (req) => !!req.user,
 *   });
 *
 *   // Fastify: wrap Express middleware
 *   mw.forEach(m => app.use(m));
 *
 * CUSTOM ROUTE OVERRIDES:
 * =======================
 *   import { standardMiddleware, cspOverride, frameOptions } from '@heady-ai/shared';
 *
 *   app.use(...standardMiddleware());
 *
 *   // Analytics route with custom CSP
 *   app.get('/dashboard', cspOverride({
 *     'connect-src': ["'self'", 'https://analytics.example.com'],
 *   }), (req, res) => {
 *     res.send(templat`<script src="https://analytics.example.com/tracker.js" nonce="${res.locals.cspNonce}"></script>`);
 *   });
 *
 *   // Embedded widget (same-origin framing allowed)
 *   app.get('/embed/widget', frameOptions('SAMEORIGIN'), (req, res) => {
 *     res.send(`<script nonce="${res.locals.cspNonce}">console.log('widget')</script>`);
 *   });
 */
