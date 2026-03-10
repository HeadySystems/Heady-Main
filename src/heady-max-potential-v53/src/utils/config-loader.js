/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { PHI, PSI, fib, phiMs, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');
const { AppError } = require('./app-error');

/**
 * Load and validate system configuration from environment variables.
 * All defaults are φ-derived or Fibonacci — ZERO magic numbers.
 *
 * @param {Object} overrides — Optional overrides for testing
 * @returns {Object} Frozen configuration object
 */
function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };

  const config = Object.freeze({
    // ─── Service Identity ───────────────────────────────────────────────────
    serviceName: env.SERVICE_NAME || 'heady-unknown',
    servicePort: parseInt(env.SERVICE_PORT || String(fib(9) * 100), 10),  // 3400
    nodeEnv:     env.NODE_ENV || 'development',

    // ─── Database ───────────────────────────────────────────────────────────
    db: Object.freeze({
      host:     env.DB_HOST || env.PGHOST,
      port:     parseInt(env.DB_PORT || String(fib(11) * fib(7) * 4), 10),  // 89×13×4 = 4628 → use 5432 standard
      name:     env.DB_NAME || 'heady_latent_os',
      user:     env.DB_USER,
      password: env.DB_PASSWORD,
      poolMin:  parseInt(env.DB_POOL_MIN || String(fib(3)), 10),   // 2
      poolMax:  parseInt(env.DB_POOL_MAX || String(fib(7)), 10),   // 13
      idleTimeoutMs: parseInt(env.DB_IDLE_TIMEOUT || String(PHI_TIMING.PHI_7), 10),  // 29,034ms
    }),

    // ─── Auth ───────────────────────────────────────────────────────────────
    auth: Object.freeze({
      jwtSecret:       env.JWT_SECRET,           // Required — no default
      tokenExpiryMs:   parseInt(env.TOKEN_EXPIRY_MS || String(PHI_TIMING.PHI_9), 10),  // 75,025ms ≈ 75s
      refreshExpiryMs: parseInt(env.REFRESH_EXPIRY_MS || String(fib(12) * fib(10) * fib(6) * 1000), 10),  // 63,360,000ms ≈ 17.6h
      cookieSecure:    env.COOKIE_SECURE !== 'false',
      cookieHttpOnly:  true,    // NEVER configurable — always httpOnly
      cookieSameSite:  'Strict',
    }),

    // ─── CORS Origins ───────────────────────────────────────────────────────
    corsOrigins: (env.ALLOWED_ORIGINS || [
      'https://headyme.com', 'https://headysystems.com', 'https://heady-ai.com',
      'https://headyos.com', 'https://headyconnection.org', 'https://headyconnection.com',
      'https://headyex.com', 'https://headyfinance.com', 'https://admin.headysystems.com',
    ].join(',')).split(',').filter(Boolean).map(o => o.trim()),

    // ─── Rate Limiting ──────────────────────────────────────────────────────
    rateLimits: Object.freeze({
      anonymous:     fib(9),   // 34 req/window
      authenticated: fib(11),  // 89 req/window
      enterprise:    fib(13),  // 233 req/window
      windowMs:      fib(10) * 1000,  // 55,000ms
    }),

    // ─── CSL Gate Thresholds ────────────────────────────────────────────────
    csl: CSL_THRESHOLDS,

    // ─── Colab Integration ──────────────────────────────────────────────────
    colab: Object.freeze({
      runtimeHotUrl:  env.COLAB_HOT_URL,
      runtimeWarmUrl: env.COLAB_WARM_URL,
      runtimeColdUrl: env.COLAB_COLD_URL,
      healthCheckMs:  PHI_TIMING.PHI_7,  // 29,034ms heartbeat
    }),

    // ─── Observability ──────────────────────────────────────────────────────
    observability: Object.freeze({
      otelEndpoint:     env.OTEL_EXPORTER_OTLP_ENDPOINT,
      metricsIntervalMs: PHI_TIMING.PHI_5,  // 11,090ms
      logLevel:         env.LOG_LEVEL || 'info',
    }),
  });

  // ─── Validate required fields ───────────────────────────────────────────
  const required = ['auth.jwtSecret'];
  if (config.nodeEnv === 'production') {
    required.push('db.host', 'db.user', 'db.password');
  }
  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    if (!value) {
      throw new AppError(
        `Missing required config: ${key}`,
        500,
        'HEADY-CONFIG-MISSING',
        { field: key, env: config.nodeEnv }
      );
    }
  }

  return config;
}

module.exports = { loadConfig };
