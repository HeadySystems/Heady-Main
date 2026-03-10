/**
 * Heady™ HeadyBee Agent Worker v5.0
 * Single-purpose agent worker — the atomic unit of the Heady swarm
 * 24 domains, CSL-gated task acceptance, phi-timed lifecycle
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const {
  PHI, PSI, PSI_SQ, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, TIMING, EMBEDDING_DIM,
  cslAND, getPressureLevel, phiFusionScore,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('heady-bee');

const BEE_STATES = Object.freeze({
  SPAWNING:      'SPAWNING',
  INITIALIZING:  'INITIALIZING',
  READY:         'READY',
  WORKING:       'WORKING',
  DRAINING:      'DRAINING',
  TERMINATED:    'TERMINATED',
});

const BEE_DOMAINS = Object.freeze([
  'inference', 'memory', 'search', 'security', 'monitoring',
  'code', 'docs', 'translation', 'creative', 'analytics',
  'pipeline', 'scheduling', 'health', 'cache', 'governance',
  'audit', 'testing', 'deployment', 'notification', 'storage',
  'evolution', 'patterns', 'consensus', 'backup',
]);

const TASK_ACCEPT_THRESHOLD = CSL_THRESHOLDS.LOW;   // 0.691
const FAILURE_THRESHOLD = fib(5);                    // 5
const HALF_OPEN_DELAY = fib(8) * 1000;              // 21s
const EPHEMERAL_IDLE_TTL = fib(13) * 1000;          // 233s

class BeeCircuitBreaker {
  constructor() {
    this.failures = 0;
    this.state = 'CLOSED';
    this._timer = null;
  }

  recordSuccess() {
    this.failures = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    }
  }

  recordFailure() {
    this.failures++;
    if (this.failures >= FAILURE_THRESHOLD && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this._timer = setTimeout(() => { this.state = 'HALF_OPEN'; }, HALF_OPEN_DELAY);
    }
  }

  canExecute() { return this.state !== 'OPEN'; }
  destroy() { if (this._timer) { clearTimeout(this._timer); this._timer = null; } }
}

class HeadyBee extends EventEmitter {
  constructor(config = {}) {
    super();
    this.id = config.id || `bee-${crypto.randomBytes(fib(4)).toString('hex')}`;
    this.domain = config.domain || 'general';
    this.ephemeral = config.ephemeral || false;
    this.state = BEE_STATES.SPAWNING;
    this.capabilities = config.capabilities
      ? Float32Array.from(config.capabilities)
      : new Float32Array(EMBEDDING_DIM);
    this.config = { ...config };

    // Metrics
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.totalLatencyMs = 0;
    this.coherenceScore = 1.0;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Internal
    this.activeTasks = new Map();
    this.circuitBreaker = new BeeCircuitBreaker();
    this._heartbeatInterval = null;
    this._idleCheckInterval = null;

    if (!config.capabilities) {
      this._generateDomainCapabilities();
    }
  }

  _generateDomainCapabilities() {
    const seed = Buffer.from(`${this.domain}:${this.id}`, 'utf8');
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      this.capabilities[i] = ((seed[i % seed.length] + i * PHI) % 256) / 256 - 0.5;
    }
    const mag = Math.sqrt(this.capabilities.reduce((s, v) => s + v * v, 0));
    if (mag > 0) for (let i = 0; i < EMBEDDING_DIM; i++) this.capabilities[i] /= mag;
  }

  async initialize() {
    this.state = BEE_STATES.INITIALIZING;
    this.emit('stateChange', { beeId: this.id, state: this.state });

    this.state = BEE_STATES.READY;
    this.emit('stateChange', { beeId: this.id, state: this.state });

    this._heartbeatInterval = setInterval(() => this._heartbeat(), TIMING.HEARTBEAT_MS);

    if (this.ephemeral) {
      this._idleCheckInterval = setInterval(() => this._checkIdleTimeout(), TIMING.HEALTH_CHECK_MS);
    }

    logger.info('bee_initialized', { beeId: this.id, domain: this.domain, ephemeral: this.ephemeral });
    this.emit('ready', { beeId: this.id });
    return this;
  }

  canAcceptTask(taskEmbedding) {
    if (this.state !== BEE_STATES.READY && this.state !== BEE_STATES.WORKING) return false;
    if (!this.circuitBreaker.canExecute()) return false;

    const score = cslAND(Array.from(taskEmbedding), Array.from(this.capabilities));
    return score >= TASK_ACCEPT_THRESHOLD;
  }

  scoreTask(taskEmbedding) {
    return cslAND(Array.from(taskEmbedding), Array.from(this.capabilities));
  }

  async accept(task) {
    if (!task || !task.id) {
      return { success: false, error: 'INVALID_TASK' };
    }

    // CSL gate validation
    if (task.embedding) {
      const score = this.scoreTask(task.embedding);
      if (score < TASK_ACCEPT_THRESHOLD) {
        logger.warn('task_rejected_low_score', {
          beeId: this.id, taskId: task.id,
          score, threshold: TASK_ACCEPT_THRESHOLD,
        });
        return { success: false, error: 'BELOW_CSL_THRESHOLD', score };
      }
    }

    return this.execute(task);
  }

  async execute(task) {
    const start = Date.now();
    this.activeTasks.set(task.id, { startTime: start });
    this.state = BEE_STATES.WORKING;
    this.lastActivity = Date.now();

    this.emit('taskStarted', { beeId: this.id, taskId: task.id, domain: this.domain });

    try {
      let result;
      if (typeof task.handler === 'function') {
        result = await task.handler({ bee: this, task });
      } else {
        result = {
          beeId: this.id,
          taskId: task.id,
          domain: this.domain,
          status: 'COMPLETED',
        };
      }

      const latencyMs = Date.now() - start;
      this.tasksCompleted++;
      this.totalLatencyMs += latencyMs;
      this.circuitBreaker.recordSuccess();
      this.activeTasks.delete(task.id);

      if (this.activeTasks.size === 0) this.state = BEE_STATES.READY;

      logger.info('task_completed', { beeId: this.id, taskId: task.id, latencyMs });
      this.emit('taskCompleted', { beeId: this.id, taskId: task.id, latencyMs, result });

      return {
        success: true,
        result,
        latencyMs,
        beeId: this.id,
        domain: this.domain,
        coherence: this.coherenceScore,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.tasksFailed++;
      this.totalLatencyMs += latencyMs;
      this.circuitBreaker.recordFailure();
      this.activeTasks.delete(task.id);

      if (this.activeTasks.size === 0) {
        this.state = this.circuitBreaker.canExecute() ? BEE_STATES.READY : BEE_STATES.TERMINATED;
      }

      logger.error('task_failed', { beeId: this.id, taskId: task.id, error: err.message });
      this.emit('taskFailed', { beeId: this.id, taskId: task.id, error: err.message });

      return { success: false, error: err.message, beeId: this.id, latencyMs };
    }
  }

  _heartbeat() {
    const health = this.getHealth();
    this.emit('heartbeat', health);
  }

  _checkIdleTimeout() {
    if (this.ephemeral && this.state === BEE_STATES.READY) {
      const idleTime = Date.now() - this.lastActivity;
      if (idleTime > EPHEMERAL_IDLE_TTL) {
        logger.info('ephemeral_bee_idle_termination', {
          beeId: this.id, idleMs: idleTime, ttl: EPHEMERAL_IDLE_TTL,
        });
        this.shutdown();
      }
    }
  }

  async drain() {
    this.state = BEE_STATES.DRAINING;
    this.emit('stateChange', { beeId: this.id, state: this.state });

    let attempt = 0;
    while (this.activeTasks.size > 0 && attempt < fib(6)) {
      await new Promise(resolve => setTimeout(resolve, phiBackoffWithJitter(attempt)));
      attempt++;
    }

    this.activeTasks.clear();
  }

  async shutdown() {
    await this.drain();
    if (this._heartbeatInterval) { clearInterval(this._heartbeatInterval); this._heartbeatInterval = null; }
    if (this._idleCheckInterval) { clearInterval(this._idleCheckInterval); this._idleCheckInterval = null; }
    this.circuitBreaker.destroy();
    this.state = BEE_STATES.TERMINATED;
    this.emit('stateChange', { beeId: this.id, state: this.state });
    this.emit('terminated', { beeId: this.id });
    logger.info('bee_terminated', { beeId: this.id });
  }

  clone() {
    return new HeadyBee({
      domain: this.domain,
      capabilities: Array.from(this.capabilities),
      ephemeral: this.ephemeral,
      ...this.config,
      id: undefined,
    });
  }

  get avgLatencyMs() {
    return this.tasksCompleted > 0 ? this.totalLatencyMs / this.tasksCompleted : 0;
  }

  get errorRate() {
    const total = this.tasksCompleted + this.tasksFailed;
    return total > 0 ? this.tasksFailed / total : 0;
  }

  getHealth() {
    return {
      beeId: this.id,
      domain: this.domain,
      state: this.state,
      ephemeral: this.ephemeral,
      activeTasks: this.activeTasks.size,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      avgLatencyMs: Math.round(this.avgLatencyMs),
      errorRate: this.errorRate,
      coherence: this.coherenceScore,
      circuitBreaker: this.circuitBreaker.state,
      uptime: Date.now() - this.createdAt,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { HeadyBee, BEE_STATES, BEE_DOMAINS };
