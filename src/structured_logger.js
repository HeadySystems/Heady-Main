// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/structured_logger.js
// LAYER: backend/src — observability
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ STRUCTURED JSON LOGGER ∞                                               ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                              ║
 * ║     Replaces console.log with structured JSON for Cloud Run / Cloudflare     ║
 * ║     Integrates with GCP Cloud Logging severity levels                        ║
 * ║                                                                               ║
 * ║     Ref: Deep Research §2.3 — Error Handling & Resilience                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

class StructuredLogger {
  constructor(options = {}) {
    this.service = options.service || 'heady-manager';
    this.version = options.version || process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
    this.pretty = options.pretty ?? (this.environment === 'development');
  }

  _log(severity, message, meta = {}) {
    const entry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      version: this.version,
      environment: this.environment,
      ...meta,
    };

    // Stack trace for errors
    if (meta.error instanceof Error) {
      entry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
      };
      delete meta.error;
    }

    const output = this.pretty
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    if (severity === SEVERITY.ERROR || severity === SEVERITY.CRITICAL) {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }

    return entry;
  }

  debug(message, meta) { return this._log(SEVERITY.DEBUG, message, meta); }
  info(message, meta) { return this._log(SEVERITY.INFO, message, meta); }
  warn(message, meta) { return this._log(SEVERITY.WARNING, message, meta); }
  error(message, meta) { return this._log(SEVERITY.ERROR, message, meta); }
  critical(message, meta) { return this._log(SEVERITY.CRITICAL, message, meta); }

  /**
   * Express request logging middleware (Morgan-compatible structured output).
   */
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const originalEnd = res.end;

      res.end = (...args) => {
        res.end = originalEnd;
        res.end(...args);

        this._log(res.statusCode >= 400 ? SEVERITY.WARNING : SEVERITY.INFO, `${req.method} ${req.originalUrl}`, {
          httpRequest: {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            latencyMs: Date.now() - start,
            userAgent: req.get('user-agent'),
            remoteIp: req.ip,
          },
        });
      };

      next();
    };
  }
}

// Singleton for import convenience
const logger = new StructuredLogger();

module.exports = { StructuredLogger, logger, SEVERITY };
