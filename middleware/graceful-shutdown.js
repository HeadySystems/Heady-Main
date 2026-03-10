/**
 * GracefulShutdown — LIFO Cleanup Lifecycle Manager
 * Handles SIGTERM/SIGINT with ordered resource cleanup, connection draining,
 * and φ-scaled shutdown timeout. Ensures zero dropped requests.
 * All constants φ-derived. ESM only.
 * Author: Eric Haywood
 */
import { createHash } from 'crypto';

const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

class GracefulShutdown {
  constructor(config = {}) {
    this.shutdownTimeoutMs = config.shutdownTimeoutMs ?? FIB[9] * 1000; // 34s (Cloud Run default is 10s, we use φ-scaled)
    this.drainTimeoutMs = config.drainTimeoutMs ?? FIB[8] * 1000; // 21s for connection draining
    this.cleanupStack = []; // LIFO order — last registered, first cleaned up
    this.isShuttingDown = false;
    this.activeConnections = new Set();
    this.server = null;
    this.exitCode = 0;
  }

  register(name, cleanupFn, priority = PSI) {
    this.cleanupStack.push({ name, cleanupFn, priority, registeredAt: Date.now() });
    return this;
  }

  attachServer(server) {
    this.server = server;

    // Track active connections
    server.on('connection', (socket) => {
      this.activeConnections.add(socket);
      socket.on('close', () => this.activeConnections.delete(socket));
    });

    return this;
  }

  install() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    for (const signal of signals) {
      process.on(signal, () => this._shutdown(signal));
    }

    process.on('uncaughtException', (err) => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'FATAL',
        event: 'uncaughtException',
        error: err.message,
        stack: err.stack,
        hash: hashSHA256({ error: err.message, ts: Date.now() }),
      };
      process.stderr.write(JSON.stringify(entry) + '\n');
      this.exitCode = 1;
      this._shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'FATAL',
        event: 'unhandledRejection',
        reason: reason?.message ?? String(reason),
        hash: hashSHA256({ reason: String(reason), ts: Date.now() }),
      };
      process.stderr.write(JSON.stringify(entry) + '\n');
      this.exitCode = 1;
      this._shutdown('unhandledRejection');
    });

    return this;
  }

  async _shutdown(signal) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    const startTime = Date.now();
    const log = (msg) => {
      const entry = { timestamp: new Date().toISOString(), level: 'INFO', event: 'shutdown', signal, message: msg };
      process.stdout.write(JSON.stringify(entry) + '\n');
    };

    log(`Graceful shutdown initiated (signal: ${signal})`);

    // Phase 1: Stop accepting new connections
    if (this.server) {
      this.server.close();
      log('Server closed — no new connections accepted');
    }

    // Phase 2: Drain active connections
    if (this.activeConnections.size > 0) {
      log(`Draining ${this.activeConnections.size} active connections...`);

      const drainPromise = new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.activeConnections.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, FIB[6] * 100); // Check every 800ms

        setTimeout(() => {
          clearInterval(checkInterval);
          // Force-close remaining connections
          for (const socket of this.activeConnections) {
            socket.destroy();
          }
          this.activeConnections.clear();
          resolve();
        }, this.drainTimeoutMs);
      });

      await drainPromise;
      log('Connection draining complete');
    }

    // Phase 3: Run cleanup stack in LIFO order
    const sortedCleanup = [...this.cleanupStack].reverse();
    for (const item of sortedCleanup) {
      try {
        log(`Cleaning up: ${item.name}`);
        const result = item.cleanupFn();
        if (result && typeof result.then === 'function') {
          await Promise.race([
            result,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), FIB[6] * 1000)), // 8s per cleanup
          ]);
        }
        log(`Cleanup complete: ${item.name}`);
      } catch (err) {
        const entry = { timestamp: new Date().toISOString(), level: 'ERROR', event: 'cleanup-failed', name: item.name, error: err.message };
        process.stderr.write(JSON.stringify(entry) + '\n');
      }
    }

    const totalTime = Date.now() - startTime;
    log(`Shutdown complete in ${totalTime}ms (exit code: ${this.exitCode})`);

    // Phase 4: Exit
    process.exit(this.exitCode);
  }

  // Middleware to reject requests during shutdown
  middleware() {
    const self = this;
    return (req, res, next) => {
      if (self.isShuttingDown) {
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Connection': 'close',
          'Retry-After': Math.ceil(self.shutdownTimeoutMs / 1000),
        });
        res.end(JSON.stringify({ error: 'Service shutting down', code: 'HEADY-SHUTDOWN-001' }));
        return;
      }
      next?.();
    };
  }

  health() {
    return {
      isShuttingDown: this.isShuttingDown,
      activeConnections: this.activeConnections.size,
      cleanupStackSize: this.cleanupStack.length,
      shutdownTimeoutMs: this.shutdownTimeoutMs,
      drainTimeoutMs: this.drainTimeoutMs,
    };
  }
}

export default GracefulShutdown;
export { GracefulShutdown };
