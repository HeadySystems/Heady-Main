/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { AppError } = require('../utils/app-error');

/**
 * Secret manager that resolves secrets from environment variables.
 * In production, integrates with GCP Secret Manager via env injection.
 * NEVER hardcodes secrets. NEVER logs secret values.
 *
 * @example
 *   const secrets = new SecretManager();
 *   const jwtSecret = secrets.require('JWT_SECRET');
 */
class SecretManager {
  constructor() {
    this._cache = new Map();
    this._prefix = process.env.SECRET_PREFIX || 'HEADY_';
  }

  /**
   * Get a secret. Returns null if not found.
   * @param {string} key — Environment variable name
   * @returns {string|null}
   */
  get(key) {
    if (this._cache.has(key)) return this._cache.get(key);

    // Try exact key, then prefixed key
    const value = process.env[key] || process.env[`${this._prefix}${key}`] || null;
    if (value) this._cache.set(key, value);
    return value;
  }

  /**
   * Get a secret or throw. For required secrets in startup.
   * @param {string} key — Environment variable name
   * @returns {string}
   * @throws {AppError} if secret is missing
   */
  require(key) {
    const value = this.get(key);
    if (!value) {
      throw new AppError(
        `Required secret not configured: ${key}`,
        500,
        'HEADY-SECRET-MISSING',
        { key, hint: `Set ${key} or ${this._prefix}${key} in environment` }
      );
    }
    return value;
  }

  /**
   * List all available secret keys (names only, never values).
   * @returns {string[]}
   */
  listKeys() {
    return Object.keys(process.env)
      .filter(k => k.startsWith(this._prefix) || k.includes('SECRET') || k.includes('KEY'))
      .sort();
  }

  /** Clear cached secrets (for rotation) */
  clear() {
    this._cache.clear();
  }
}

module.exports = { SecretManager };
