/**
 * Heady™ Secure Token Storage Utility
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides secure token management with:
 *   - Server-side httpOnly secure cookies (with φ-scaled timing)
 *   - Client-side localStorage → httpOnly migration helpers
 *   - Consistent cookie security policies (Strict SameSite, Secure, HttpOnly)
 *   - φ-derived token expiration windows
 *   - Safe retrieval from request/response contexts
 *
 * @module shared/utils/secure-token
 * @version 1.0.0
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const { getLogger } = require('../../src/services/structured-logger');
const { TIMING, PSI, PHI } = require('../../core/constants/phi');

/**
 * Default cookie configuration with security best practices
 * All timing values derived from φ-constants
 *
 * @type {Object}
 */
const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: true,          // Not accessible from JavaScript (prevents XSS theft)
  secure: true,            // Only transmitted over HTTPS
  sameSite: 'Strict',      // Prevents CSRF attacks
  path: '/',               // Available across entire domain
  domain: undefined,       // Will use current domain
  maxAge: TIMING.CYCLE,    // φ⁷ = 29,034ms by default
};

/**
 * Predefined token configurations with φ-scaled expiration windows
 *
 * @type {Object}
 */
const TOKEN_CONFIGS = {
  // Short-lived session token (φ³ ms ≈ 4.2 seconds)
  access: {
    name: 'access_token',
    maxAge: TIMING.TASK,        // 4,236ms
    sameSite: 'Strict',
  },

  // Medium-lived refresh token (φ⁶ ms ≈ 18 seconds)
  refresh: {
    name: 'refresh_token',
    maxAge: TIMING.WARM,        // 17,944ms
    sameSite: 'Strict',
  },

  // Longer-lived session token (φ⁷ ms ≈ 29 seconds)
  session: {
    name: 'session_token',
    maxAge: TIMING.CYCLE,       // 29,034ms
    sameSite: 'Strict',
  },

  // User identifier token (φ⁸ ms ≈ 47 seconds)
  userId: {
    name: 'user_id',
    maxAge: TIMING.COLD,        // 46,979ms
    sameSite: 'Lax',            // Slightly relaxed for cross-site navigation
  },

  // CSRF protection token (φ⁶ ms ≈ 18 seconds)
  csrf: {
    name: 'csrf_token',
    maxAge: TIMING.WARM,        // 17,944ms
    sameSite: 'Strict',
  },

  // Device fingerprint token (φ MAX ≈ 89 seconds)
  device: {
    name: 'device_token',
    maxAge: TIMING.MAX,         // 89,042ms
    sameSite: 'Lax',
  },
};

/**
 * Set a secure httpOnly cookie on the response object
 *
 * This is a server-side helper for Express/Node.js HTTP responses.
 * Stores the token as a secure httpOnly cookie using φ-scaled timing.
 *
 * Security features:
 *   - httpOnly: Prevents JavaScript access (XSS protection)
 *   - secure: Requires HTTPS (prevents man-in-the-middle)
 *   - sameSite: Prevents CSRF attacks
 *   - maxAge: Derived from φ-math constants
 *
 * @param {Object} res - Express response object
 * @param {string} name - Cookie name (e.g., 'access_token', 'refresh_token')
 * @param {string} value - Token value to store
 * @param {Object} [opts={}] - Cookie options override
 *   @param {number} [opts.maxAge] - Cookie lifetime in milliseconds
 *   @param {string} [opts.sameSite] - SameSite policy ('Strict', 'Lax', 'None')
 *   @param {boolean} [opts.httpOnly] - HttpOnly flag (default: true)
 *   @param {boolean} [opts.secure] - Secure flag (default: true)
 *   @param {string} [opts.path] - Cookie path (default: '/')
 *   @param {string} [opts.domain] - Cookie domain
 *
 * @returns {Object} The response object for chaining
 *
 * @example
 * // Set access token with default φ-scaled timing
 * setToken(res, 'access_token', 'token_value_here');
 *
 * @example
 * // Set custom token with longer lifetime
 * setToken(res, 'session_token', 'token_value_here', {
 *   maxAge: TIMING.LONG
 * });
 */
function setToken(res, name, value, opts = {}) {
  if (!res || typeof res.cookie !== 'function') {
    throw new TypeError('First argument to setToken must be an Express response object');
  }

  if (!name || typeof name !== 'string') {
    throw new TypeError('Cookie name must be a non-empty string');
  }

  if (!value || typeof value !== 'string') {
    throw new TypeError('Token value must be a non-empty string');
  }

  // Merge with predefined config if available
  const tokenConfig = TOKEN_CONFIGS[name] || {};
  const cookieOpts = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...tokenConfig,
    ...opts,
  };

  // Get logger for audit trail
  const logger = getLogger('secure-token');

  try {
    res.cookie(name, value, cookieOpts);

    logger.info(`Token set: ${name}`, {
      tokenName: name,
      maxAge: cookieOpts.maxAge,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
      httpOnly: cookieOpts.httpOnly,
      operation: 'setToken',
    });

    return res;
  } catch (error) {
    logger.error(`Failed to set token: ${name}`, {
      tokenName: name,
      error: error.message,
      operation: 'setToken',
    });
    throw error;
  }
}

/**
 * Retrieve a token from the request's cookies
 *
 * This is a server-side helper that reads httpOnly cookies from incoming requests.
 * Safe and secure — JavaScript cannot access these cookies (browser protection).
 *
 * @param {string} name - Cookie name (e.g., 'access_token', 'refresh_token')
 * @param {Object} req - Express request object with cookies
 *
 * @returns {string|null} Token value if found, null otherwise
 *
 * @example
 * const token = getToken('access_token', req);
 * if (!token) {
 *   return res.status(401).json({ error: 'Unauthorized' });
 * }
 */
function getToken(name, req) {
  if (!req || !req.cookies) {
    return null;
  }

  if (!name || typeof name !== 'string') {
    return null;
  }

  return req.cookies[name] || null;
}

/**
 * Clear (remove) a token cookie from the response
 *
 * Sets the cookie's maxAge to 0, effectively deleting it from the client.
 * This is the secure way to log out users.
 *
 * @param {Object} res - Express response object
 * @param {string} name - Cookie name to clear
 *
 * @returns {Object} The response object for chaining
 *
 * @example
 * // Clear access token on logout
 * clearToken(res, 'access_token');
 * clearToken(res, 'refresh_token');
 * res.json({ message: 'Logged out' });
 */
function clearToken(res, name) {
  if (!res || typeof res.clearCookie !== 'function') {
    throw new TypeError('First argument to clearToken must be an Express response object');
  }

  if (!name || typeof name !== 'string') {
    throw new TypeError('Cookie name must be a non-empty string');
  }

  const logger = getLogger('secure-token');

  try {
    res.clearCookie(name, { path: '/' });

    logger.info(`Token cleared: ${name}`, {
      tokenName: name,
      operation: 'clearToken',
    });

    return res;
  } catch (error) {
    logger.error(`Failed to clear token: ${name}`, {
      tokenName: name,
      error: error.message,
      operation: 'clearToken',
    });
    throw error;
  }
}

/**
 * Client-side helper: Migrate token from localStorage to secure httpOnly cookie
 *
 * This is a client-side utility for migrating existing localStorage tokens
 * to secure httpOnly cookies (recommended security practice).
 *
 * Flow:
 *   1. Read token from localStorage
 *   2. Call API endpoint to set httpOnly cookie
 *   3. Remove token from localStorage
 *   4. Return result
 *
 * @param {string} name - Token name (e.g., 'access_token')
 * @param {string} [apiEndpoint] - API endpoint to call (default: '/api/auth/migrate')
 *
 * @returns {Promise<Object>} Migration result
 *   @returns {boolean} .success - True if migration succeeded
 *   @returns {string} [.error] - Error message if migration failed
 *   @returns {string} [.message] - Success message
 *
 * @example
 * // Migrate access token from localStorage to httpOnly cookie
 * const result = await migrateFromLocalStorage('access_token');
 * if (result.success) {
 *   console.log('Token migrated securely');
 * } else {
 *   console.error('Migration failed:', result.error);
 * }
 *
 * @note
 * This function is only available in browser environments (window object).
 * Will throw an error if called in Node.js.
 *
 * @note
 * The API endpoint must handle:
 *   - POST request
 *   - Body: { tokenName: string, tokenValue: string }
 *   - Response: { success: boolean, message?: string, error?: string }
 */
async function migrateFromLocalStorage(name, apiEndpoint = '/api/auth/migrate') {
  // Browser environment check
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      success: false,
      error: 'migrateFromLocalStorage can only be called in browser environments',
    };
  }

  if (!name || typeof name !== 'string') {
    return {
      success: false,
      error: 'Token name must be a non-empty string',
    };
  }

  try {
    // Step 1: Read from localStorage
    const tokenValue = window.localStorage.getItem(name);

    if (!tokenValue) {
      return {
        success: false,
        error: `Token "${name}" not found in localStorage`,
      };
    }

    // Step 2: Call API to set httpOnly cookie
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenName: name,
        tokenValue: tokenValue,
      }),
      credentials: 'include', // Include cookies in request
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `API returned ${response.status}`,
      };
    }

    // Step 3: Remove from localStorage
    window.localStorage.removeItem(name);

    // Step 4: Return success
    return {
      success: true,
      message: `Token "${name}" migrated successfully to secure httpOnly cookie`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error during migration',
    };
  }
}

/**
 * Server-side migration endpoint handler
 *
 * Express middleware for handling client-side migration requests.
 * Receives token from client, sets httpOnly cookie, and confirms removal.
 *
 * @param {Object} req - Express request object
 *   @param {Object} req.body - Request body
 *   @param {string} req.body.tokenName - Token name (e.g., 'access_token')
 *   @param {string} req.body.tokenValue - Token value to migrate
 * @param {Object} res - Express response object
 *
 * @returns {void} Sends JSON response
 *
 * @example
 * // In Express app:
 * app.post('/api/auth/migrate', (req, res) => {
 *   handleTokenMigration(req, res);
 * });
 */
function handleTokenMigration(req, res) {
  const logger = getLogger('secure-token');

  try {
    const { tokenName, tokenValue } = req.body;

    if (!tokenName || !tokenValue) {
      return res.status(400).json({
        success: false,
        error: 'tokenName and tokenValue are required',
      });
    }

    // Set the httpOnly cookie
    setToken(res, tokenName, tokenValue);

    logger.info(`Token migrated from localStorage`, {
      tokenName,
      operation: 'handleTokenMigration',
    });

    return res.json({
      success: true,
      message: `Token "${tokenName}" now stored in secure httpOnly cookie`,
    });
  } catch (error) {
    logger.error(`Token migration failed`, {
      error: error.message,
      operation: 'handleTokenMigration',
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to migrate token to secure storage',
    });
  }
}

module.exports = {
  // Configuration
  DEFAULT_COOKIE_OPTIONS,
  TOKEN_CONFIGS,

  // Server-side cookie operations
  setToken,
  getToken,
  clearToken,

  // Client-side migration
  migrateFromLocalStorage,
  handleTokenMigration,
};
