/**
 * HEADY_BRAND:BEGIN
 * ============================================================
 *  Heady Auto-Success Engine
 *  Liquid Dynamic Latent OS | HeadySystems Inc.
 *  Phi^7 heartbeat (29,034ms) auto-success system
 *  Health monitoring, auto-recovery, CSL confidence tracking
 * ============================================================
 * HEADY_BRAND:END
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// ─── Sacred Geometry Constants ───────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1.0 / PHI; // 0.618033988749895
const PHI_SQUARED = PHI * PHI; // 2.618033988749895
const PHI_CUBED = PHI * PHI * PHI; // 4.23606797749979
const PHI_7 = Math.pow(PHI, 7); // 29.034...
const HEARTBEAT_INTERVAL_MS = Math.round(PHI_7 * 1000); // 29,034ms

// Fibonacci sequence for retry delays (ms)
const FIBONACCI_RETRY_MS = [1000, 1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000];
const FIBONACCI_MAX_RETRIES = 8; // fib(6) = 8

// CSL confidence thresholds (continuous semantic logic, [0.0, 1.0])
const CSL_HEALTHY = PSI; // 0.618 - golden ratio threshold
const CSL_DEGRADED = PSI * PSI; // 0.382
const CSL_CRITICAL = PSI * PSI * PSI; // 0.236

// ─── Structured Logger ──────────────────────────────────────
class HeadyLogger {
  constructor(context) {
    this.context = context;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context,
      message,
      ...meta
    };
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }

  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }
  debug(message, meta) { this._log('debug', message, meta); }
}

const logger = new HeadyLogger('auto-success-engine');

// ─── HeadyAutoContext Middleware ─────────────────────────────
function headyAutoContext(req, _res, next) {
  req.headyContext = {
    service: 'auto-success-engine',
    requestId: `ase-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    cslGate: 1.0
  };
  next();
}

// ─── Service Health Registry ────────────────────────────────
class ServiceHealthRegistry {
  constructor() {
    this.services = new Map();
    this.heartbeatCount = 0;
    this.startTime = Date.now();
    this.lastHeartbeat = null;
    this.cslConfidence = 1.0; // Start fully confident
  }

  register(serviceId, config = {}) {
    this.services.set(serviceId, {
      id: serviceId,
      status: 'unknown',
      cslConfidence: PSI, // Start at golden ratio
      lastCheck: null,
      lastHealthy: null,
      failCount: 0,
      retryIndex: 0,
      endpoint: config.endpoint || null,
      port: config.port || null,
      registeredAt: Date.now(),
      metadata: config.metadata || {}
    });
    logger.info(`Service registered: ${serviceId}`, { port: config.port });
  }

  updateHealth(serviceId, healthy, latencyMs = 0) {
    const svc = this.services.get(serviceId);
    if (!svc) {
      logger.warn(`Unknown service health update: ${serviceId}`);
      return;
    }

    const now = Date.now();
    svc.lastCheck = now;

    if (healthy) {
      svc.status = 'healthy';
      svc.lastHealthy = now;
      // CSL confidence rises toward 1.0, phi-scaled
      svc.cslConfidence = Math.min(1.0, svc.cslConfidence + (1.0 - svc.cslConfidence) * PSI);
      svc.failCount = 0;
      svc.retryIndex = 0;
      svc.latencyMs = latencyMs;
    } else {
      svc.failCount += 1;
      // CSL confidence decays, phi-scaled
      svc.cslConfidence = Math.max(0.0, svc.cslConfidence * PSI);

      if (svc.cslConfidence < CSL_CRITICAL) {
        svc.status = 'critical';
      } else if (svc.cslConfidence < CSL_DEGRADED) {
        svc.status = 'degraded';
      } else {
        svc.status = 'unhealthy';
      }
    }

    // Recalculate global CSL confidence
    this._recalculateGlobalConfidence();
  }

  _recalculateGlobalConfidence() {
    if (this.services.size === 0) {
      this.cslConfidence = 1.0;
      return;
    }
    let sum = 0;
    for (const svc of this.services.values()) {
      sum += svc.cslConfidence;
    }
    this.cslConfidence = sum / this.services.size;
  }

  getStatus(serviceId) {
    return this.services.get(serviceId) || null;
  }

  getAllStatuses() {
    const result = {};
    for (const [id, svc] of this.services) {
      result[id] = {
        status: svc.status,
        cslConfidence: Number(svc.cslConfidence.toFixed(6)),
        failCount: svc.failCount,
        lastCheck: svc.lastCheck ? new Date(svc.lastCheck).toISOString() : null,
        lastHealthy: svc.lastHealthy ? new Date(svc.lastHealthy).toISOString() : null,
        latencyMs: svc.latencyMs || 0
      };
    }
    return result;
  }

  getGlobalHealth() {
    const total = this.services.size;
    let healthy = 0;
    let degraded = 0;
    let critical = 0;

    for (const svc of this.services.values()) {
      if (svc.cslConfidence >= CSL_HEALTHY) healthy++;
      else if (svc.cslConfidence >= CSL_DEGRADED) degraded++;
      else critical++;
    }

    let globalStatus = 'healthy';
    if (this.cslConfidence < CSL_CRITICAL) globalStatus = 'critical';
    else if (this.cslConfidence < CSL_DEGRADED) globalStatus = 'degraded';
    else if (this.cslConfidence < CSL_HEALTHY) globalStatus = 'warning';

    return {
      status: globalStatus,
      cslConfidence: Number(this.cslConfidence.toFixed(6)),
      total,
      healthy,
      degraded,
      critical,
      heartbeatCount: this.heartbeatCount,
      uptimeMs: Date.now() - this.startTime,
      lastHeartbeat: this.lastHeartbeat ? new Date(this.lastHeartbeat).toISOString() : null
    };
  }
}

// ─── Auto-Recovery Engine ───────────────────────────────────
class AutoRecoveryEngine {
  constructor(registry) {
    this.registry = registry;
    this.recoveryLog = [];
    this.maxLogSize = 89; // Fibonacci number
  }

  async attemptRecovery(serviceId) {
    const svc = this.registry.getStatus(serviceId);
    if (!svc) {
      logger.warn(`Cannot recover unknown service: ${serviceId}`);
      return { success: false, reason: 'unknown_service' };
    }

    if (svc.status === 'healthy') {
      return { success: true, reason: 'already_healthy' };
    }

    // Fibonacci retry delay
    const retryIndex = Math.min(svc.retryIndex, FIBONACCI_RETRY_MS.length - 1);
    const delayMs = FIBONACCI_RETRY_MS[retryIndex];

    if (svc.retryIndex >= FIBONACCI_MAX_RETRIES) {
      const entry = {
        serviceId,
        action: 'recovery_exhausted',
        retries: svc.retryIndex,
        cslConfidence: svc.cslConfidence,
        timestamp: new Date().toISOString()
      };
      this._addLog(entry);
      logger.error(`Recovery exhausted for ${serviceId}`, entry);
      return { success: false, reason: 'retries_exhausted', retries: svc.retryIndex };
    }

    svc.retryIndex += 1;

    const entry = {
      serviceId,
      action: 'recovery_attempt',
      retryIndex: svc.retryIndex,
      delayMs,
      cslConfidence: svc.cslConfidence,
      timestamp: new Date().toISOString()
    };
    this._addLog(entry);
    logger.info(`Recovery attempt for ${serviceId}`, entry);

    // Simulate recovery probe (in production, this would HTTP GET the health endpoint)
    if (svc.endpoint) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.round(PHI_CUBED * 1000));
        const response = await fetch(`${svc.endpoint}/health`, {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
          this.registry.updateHealth(serviceId, true);
          logger.info(`Recovery successful for ${serviceId}`);
          return { success: true, reason: 'health_check_passed' };
        }
      } catch (err) {
        logger.warn(`Recovery probe failed for ${serviceId}: ${err.message}`);
      }
    }

    return { success: false, reason: 'probe_failed', nextRetryMs: delayMs };
  }

  _addLog(entry) {
    this.recoveryLog.push(entry);
    if (this.recoveryLog.length > this.maxLogSize) {
      this.recoveryLog = this.recoveryLog.slice(-55); // Fibonacci trim
    }
  }

  getLog() {
    return this.recoveryLog;
  }
}

// ─── Heartbeat Engine ───────────────────────────────────────
class HeartbeatEngine {
  constructor(registry, recovery) {
    this.registry = registry;
    this.recovery = recovery;
    this.intervalHandle = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    logger.info(`Heartbeat engine starting`, {
      intervalMs: HEARTBEAT_INTERVAL_MS,
      phi7: PHI_7.toFixed(6)
    });

    // Immediate first beat
    this._beat();

    // Phi^7 interval
    this.intervalHandle = setInterval(() => this._beat(), HEARTBEAT_INTERVAL_MS);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    logger.info('Heartbeat engine stopped');
  }

  async _beat() {
    this.registry.heartbeatCount += 1;
    this.registry.lastHeartbeat = Date.now();

    const beatNumber = this.registry.heartbeatCount;
    const globalHealth = this.registry.getGlobalHealth();

    logger.info(`Heartbeat #${beatNumber}`, {
      globalStatus: globalHealth.status,
      cslConfidence: globalHealth.cslConfidence,
      services: globalHealth.total,
      healthy: globalHealth.healthy,
      degraded: globalHealth.degraded,
      critical: globalHealth.critical
    });

    // Check each registered service and attempt recovery for unhealthy ones
    for (const [serviceId, svc] of this.registry.services) {
      if (svc.status !== 'healthy' && svc.status !== 'unknown') {
        await this.recovery.attemptRecovery(serviceId);
      }

      // Probe services with endpoints
      if (svc.endpoint && svc.status !== 'critical') {
        try {
          const start = Date.now();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), Math.round(PHI_SQUARED * 1000));
          const response = await fetch(`${svc.endpoint}/health`, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          const latency = Date.now() - start;

          this.registry.updateHealth(serviceId, response.ok, latency);
        } catch (_err) {
          this.registry.updateHealth(serviceId, false);
        }
      }
    }
  }
}

// ─── Initialize ─────────────────────────────────────────────
const registry = new ServiceHealthRegistry();
const recovery = new AutoRecoveryEngine(registry);
const heartbeat = new HeartbeatEngine(registry, recovery);

// Register known Heady services with their ports
const HEADY_SERVICES = [
  { id: 'heady-manager', port: 3300 },
  { id: 'heady-brain', port: 3310 },
  { id: 'heady-conductor', port: 3311 },
  { id: 'domain-router', port: 3391 },
  { id: 'budget-tracker', port: 3392 },
  { id: 'heady-cache', port: 3393 },
  { id: 'hcfullpipeline-executor', port: 3320 },
  { id: 'heady-guard', port: 3330 },
  { id: 'heady-memory', port: 3340 },
  { id: 'heady-soul', port: 3350 },
  { id: 'heady-hive', port: 3360 },
  { id: 'heady-eval', port: 3370 },
  { id: 'heady-embed', port: 3380 }
];

for (const svc of HEADY_SERVICES) {
  const host = process.env[`${svc.id.toUpperCase().replace(/-/g, '_')}_HOST`] || 'localhost';
  registry.register(svc.id, {
    port: svc.port,
    endpoint: `http://${host}:${svc.port}`,
    metadata: { registeredBy: 'auto-success-engine' }
  });
}

// ─── Express App ────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(headyAutoContext);

// Health endpoint
app.get('/health', (_req, res) => {
  const global = registry.getGlobalHealth();
  const statusCode = global.status === 'critical' ? 503 : 200;
  res.status(statusCode).json({
    service: 'auto-success-engine',
    status: global.status,
    cslConfidence: global.cslConfidence,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    phi7: Number(PHI_7.toFixed(6)),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Global health overview
app.get('/status', (_req, res) => {
  res.json({
    engine: registry.getGlobalHealth(),
    services: registry.getAllStatuses(),
    constants: {
      PHI,
      PSI,
      PHI_7: Number(PHI_7.toFixed(6)),
      HEARTBEAT_INTERVAL_MS,
      CSL_HEALTHY,
      CSL_DEGRADED,
      CSL_CRITICAL,
      FIBONACCI_MAX_RETRIES
    }
  });
});

// Register a new service
app.post('/register', (req, res) => {
  const { serviceId, endpoint, port, metadata } = req.body;
  if (!serviceId) {
    res.status(400).json({ error: { code: 'MISSING_SERVICE_ID', message: 'serviceId is required' } });
    return;
  }
  registry.register(serviceId, { endpoint, port, metadata });
  res.status(201).json({ registered: serviceId, timestamp: new Date().toISOString() });
});

// Report health for a service
app.post('/report', (req, res) => {
  const { serviceId, healthy, latencyMs } = req.body;
  if (!serviceId || typeof healthy !== 'boolean') {
    res.status(400).json({ error: { code: 'INVALID_REPORT', message: 'serviceId and healthy (boolean) are required' } });
    return;
  }
  registry.updateHealth(serviceId, healthy, latencyMs || 0);
  const status = registry.getStatus(serviceId);
  res.json({ serviceId, status: status.status, cslConfidence: Number(status.cslConfidence.toFixed(6)) });
});

// Get individual service status
app.get('/service/:serviceId', (req, res) => {
  const status = registry.getStatus(req.params.serviceId);
  if (!status) {
    res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: `Service ${req.params.serviceId} not registered` } });
    return;
  }
  res.json(status);
});

// Trigger manual recovery
app.post('/recover/:serviceId', async (req, res) => {
  try {
    const result = await recovery.attemptRecovery(req.params.serviceId);
    res.json(result);
  } catch (err) {
    logger.error('Recovery endpoint error', { error: err.message });
    res.status(500).json({ error: { code: 'RECOVERY_ERROR', message: err.message } });
  }
});

// Recovery log
app.get('/recovery-log', (_req, res) => {
  res.json({ log: recovery.getLog() });
});

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled request error', { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

// ─── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3390;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Auto-Success Engine listening on port ${PORT}`, {
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    registeredServices: HEADY_SERVICES.length,
    phi7: PHI_7.toFixed(6)
  });

  // Start the heartbeat engine
  heartbeat.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  heartbeat.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  heartbeat.stop();
  process.exit(0);
});

module.exports = { app, registry, recovery, heartbeat, HeartbeatEngine, ServiceHealthRegistry, AutoRecoveryEngine };
