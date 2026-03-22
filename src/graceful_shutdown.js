// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/graceful_shutdown.js
// LAYER: backend/src — infrastructure
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ GRACEFUL SHUTDOWN MANAGER ∞                                            ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                           ║
 * ║     Phi-aligned shutdown with 34s timeout (Fibonacci F9 × 1000)              ║
 * ║     SIGTERM → stop accepting → drain in-flight → close resources → exit      ║
 * ║                                                                               ║
 * ║     Ref: Deep Research §2.6 — Production Node.js Hardening                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

class GracefulShutdownManager {
  constructor(options = {}) {
    this.shutdownTimeout = options.timeout || 34000; // φ-aligned: Fibonacci F9 × 1000ms
    this.isShuttingDown = false;
    this.connections = new Set();
    this.cleanupHandlers = [];
    this._server = null;
  }

  /**
   * Attach to an HTTP server to track connections and handle SIGTERM.
   * @param {import('http').Server} server
   */
  attach(server) {
    this._server = server;

    // Track active connections
    server.on('connection', (conn) => {
      this.connections.add(conn);
      conn.on('close', () => this.connections.delete(conn));
    });

    // Register signal handlers
    process.on('SIGTERM', () => this._initiateShutdown('SIGTERM'));
    process.on('SIGINT', () => this._initiateShutdown('SIGINT'));

    return this;
  }

  /**
   * Register a cleanup handler (executed in reverse order during shutdown).
   * @param {string} name - Handler name for logging
   * @param {Function} handler - Async cleanup function
   */
  registerCleanup(name, handler) {
    this.cleanupHandlers.push({ name, handler });
    return this;
  }

  /**
   * Middleware that returns 503 during shutdown (signals load balancer to stop routing).
   */
  middleware() {
    return (req, res, next) => {
      if (this.isShuttingDown) {
        res.set('Connection', 'close');
        return res.status(503).json({
          error: 'Service shutting down',
          retryAfter: Math.ceil(this.shutdownTimeout / 1000),
        });
      }
      next();
    };
  }

  async _initiateShutdown(signal) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`[SHUTDOWN] ${signal} received. Starting graceful shutdown (${this.shutdownTimeout}ms timeout)...`);

    // Hard deadline — force exit after timeout
    const forceTimer = setTimeout(() => {
      console.error('[SHUTDOWN] Timeout exceeded — forcing exit.');
      process.exit(1);
    }, this.shutdownTimeout);
    forceTimer.unref();

    try {
      // Step 1: Stop accepting new connections
      if (this._server) {
        await new Promise((resolve) => this._server.close(resolve));
        console.log('[SHUTDOWN] Server closed to new connections.');
      }

      // Step 2: Destroy lingering keep-alive connections
      for (const conn of this.connections) {
        conn.destroy();
      }
      console.log(`[SHUTDOWN] ${this.connections.size} lingering connections closed.`);

      // Step 3: Run cleanup handlers in reverse registration order
      for (const { name, handler } of [...this.cleanupHandlers].reverse()) {
        try {
          await handler();
          console.log(`[SHUTDOWN] ✓ ${name} cleaned up.`);
        } catch (err) {
          console.error(`[SHUTDOWN] ✗ ${name} cleanup failed:`, err.message);
        }
      }

      console.log('[SHUTDOWN] Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN] Error during shutdown:', err.message);
      process.exit(1);
    }
  }
}

module.exports = { GracefulShutdownManager };
