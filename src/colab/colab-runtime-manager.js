/**
 * Heady™ Colab Runtime Manager v5.0
 * Manages 3 Colab Pro+ runtimes as the latent space operations layer
 * Each runtime operates as a GPU-accelerated vector space processing unit
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const {
  PHI, PSI, PSI_SQ, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, TIMING, COLAB_RUNTIMES, RESOURCE_ALLOCATION,
  POOL_SIZES, cslAND, getPressureLevel, phiFusionScore,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('colab-runtime-manager');

const RUNTIME_STATES = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  BUSY: 'BUSY',
  DRAINING: 'DRAINING',
  ERROR: 'ERROR',
  TERMINATED: 'TERMINATED',
});

const FAILURE_THRESHOLD = fib(5);       // 5 failures trips circuit breaker
const HALF_OPEN_DELAY = fib(8) * 1000;  // 21s before half-open probe
const HEARTBEAT_INTERVAL = TIMING.HEARTBEAT_MS; // 13s
const MAX_TASKS_PER_RUNTIME = COLAB_RUNTIMES.MAX_CONCURRENT_TASKS; // 21
const GPU_MEMORY_GB = COLAB_RUNTIMES.GPU_MEMORY_GB; // 55

class CircuitBreaker {
  constructor(runtimeId) {
    this.runtimeId = runtimeId;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailure = 0;
    this.halfOpenTimer = null;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      logger.warn('circuit_breaker_tripped', {
        runtimeId: this.runtimeId,
        failures: this.failures,
        threshold: FAILURE_THRESHOLD,
      });
      this.halfOpenTimer = setTimeout(() => {
        this.state = 'HALF_OPEN';
        logger.info('circuit_breaker_half_open', { runtimeId: this.runtimeId });
      }, HALF_OPEN_DELAY);
    }
  }

  canExecute() {
    return this.state !== 'OPEN';
  }
}

class ColabRuntime {
  constructor(id, role) {
    this.id = id;
    this.role = role;
    this.state = RUNTIME_STATES.INITIALIZING;
    this.gpuMemoryGB = GPU_MEMORY_GB;
    this.gpuMemoryUsedGB = 0;
    this.activeTasks = new Map();
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.totalLatencyMs = 0;
    this.circuitBreaker = new CircuitBreaker(id);
    this.lastHeartbeat = Date.now();
    this.capabilities = new Float32Array(384);
    this.coherenceScore = 1.0;
    this.createdAt = Date.now();
  }

  get load() {
    return this.activeTasks.size / MAX_TASKS_PER_RUNTIME;
  }

  get avgLatencyMs() {
    return this.completedTasks > 0 ? this.totalLatencyMs / this.completedTasks : 0;
  }

  get isAvailable() {
    return this.state === RUNTIME_STATES.READY &&
           this.circuitBreaker.canExecute() &&
           this.activeTasks.size < MAX_TASKS_PER_RUNTIME;
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      state: this.state,
      load: this.load,
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      avgLatencyMs: Math.round(this.avgLatencyMs),
      gpuMemoryUsedGB: this.gpuMemoryUsedGB,
      gpuMemoryGB: this.gpuMemoryGB,
      coherenceScore: this.coherenceScore,
      circuitBreaker: this.circuitBreaker.state,
      uptime: Date.now() - this.createdAt,
    };
  }
}

class ColabRuntimeManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.runtimes = new Map();
    this.taskQueue = [];
    this.maxQueueSize = fib(13); // 233
    this._heartbeatInterval = null;
    this._drainPromises = [];

    this._initializeRuntimes();
  }

  _initializeRuntimes() {
    const roles = [
      { id: 'colab-alpha', role: 'inference-embedding', resourceShare: RESOURCE_ALLOCATION.HOT },
      { id: 'colab-beta', role: 'vector-memory-search', resourceShare: RESOURCE_ALLOCATION.WARM },
      { id: 'colab-gamma', role: 'training-evolution', resourceShare: RESOURCE_ALLOCATION.COLD },
    ];

    for (const { id, role, resourceShare } of roles) {
      const runtime = new ColabRuntime(id, role);
      runtime.resourceShare = resourceShare;
      // Generate role-specific capability embedding
      this._generateCapabilityEmbedding(runtime);
      this.runtimes.set(id, runtime);
    }

    logger.info('runtimes_initialized', {
      count: COLAB_RUNTIMES.COUNT,
      roles: roles.map(r => r.role),
    });
  }

  _generateCapabilityEmbedding(runtime) {
    // Deterministic pseudo-embedding based on role hash
    const roleBytes = Buffer.from(runtime.role, 'utf8');
    for (let i = 0; i < 384; i++) {
      const seed = roleBytes[i % roleBytes.length] / 255;
      runtime.capabilities[i] = (seed - 0.5) * PHI;
    }
    // Normalize to unit sphere
    const mag = Math.sqrt(runtime.capabilities.reduce((s, v) => s + v * v, 0));
    if (mag > 0) {
      for (let i = 0; i < 384; i++) runtime.capabilities[i] /= mag;
    }
  }

  async start() {
    for (const runtime of this.runtimes.values()) {
      runtime.state = RUNTIME_STATES.READY;
      runtime.lastHeartbeat = Date.now();
    }

    this._heartbeatInterval = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL);
    this.emit('started', { runtimes: this.getStatus() });
    logger.info('runtime_manager_started', { runtimes: COLAB_RUNTIMES.COUNT });
  }

  async stop() {
    logger.info('runtime_manager_stopping');
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }

    // LIFO drain — terminate in reverse order (gamma first, alpha last)
    const runtimeIds = [...this.runtimes.keys()].reverse();
    for (const id of runtimeIds) {
      await this._drainRuntime(id);
    }

    logger.info('runtime_manager_stopped');
    this.emit('stopped');
  }

  async _drainRuntime(runtimeId) {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return;

    runtime.state = RUNTIME_STATES.DRAINING;
    logger.info('runtime_draining', { runtimeId, activeTasks: runtime.activeTasks.size });

    // Wait for active tasks with phi-backoff
    let attempt = 0;
    while (runtime.activeTasks.size > 0 && attempt < fib(6)) {
      const delay = phiBackoffWithJitter(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }

    // Force-terminate remaining tasks
    for (const [taskId, task] of runtime.activeTasks) {
      task.status = 'CANCELLED';
      runtime.activeTasks.delete(taskId);
    }

    runtime.state = RUNTIME_STATES.TERMINATED;
    logger.info('runtime_terminated', { runtimeId });
  }

  routeTask(task) {
    if (!task || !task.embedding || task.embedding.length !== 384) {
      logger.error('invalid_task', { reason: 'missing_or_invalid_embedding' });
      return null;
    }

    // CSL cosine scoring against all available runtimes
    let bestRuntime = null;
    let bestScore = -1;

    for (const runtime of this.runtimes.values()) {
      if (!runtime.isAvailable) continue;

      const score = cslAND(Array.from(task.embedding), Array.from(runtime.capabilities));
      const loadPenalty = runtime.load * PSI_SQ; // Penalize loaded runtimes
      const adjustedScore = score - loadPenalty;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestRuntime = runtime;
      }
    }

    if (!bestRuntime) {
      // All runtimes busy — queue the task
      if (this.taskQueue.length < this.maxQueueSize) {
        this.taskQueue.push({ task, timestamp: Date.now() });
        logger.warn('task_queued', { queueSize: this.taskQueue.length });
        this.emit('taskQueued', { taskId: task.id, queueSize: this.taskQueue.length });
        return { queued: true, position: this.taskQueue.length };
      }
      logger.error('task_rejected', { reason: 'queue_full', queueSize: this.taskQueue.length });
      return null;
    }

    return this._assignTask(bestRuntime, task, bestScore);
  }

  _assignTask(runtime, task, score) {
    const taskEntry = {
      id: task.id,
      startTime: Date.now(),
      status: 'EXECUTING',
      score,
    };
    runtime.activeTasks.set(task.id, taskEntry);
    runtime.state = RUNTIME_STATES.BUSY;

    logger.info('task_assigned', {
      taskId: task.id,
      runtimeId: runtime.id,
      score,
      runtimeLoad: runtime.load,
    });

    this.emit('taskAssigned', { taskId: task.id, runtimeId: runtime.id, score });
    return { runtimeId: runtime.id, score, taskEntry };
  }

  completeTask(runtimeId, taskId, result) {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return;

    const taskEntry = runtime.activeTasks.get(taskId);
    if (!taskEntry) return;

    const latency = Date.now() - taskEntry.startTime;
    runtime.activeTasks.delete(taskId);
    runtime.completedTasks++;
    runtime.totalLatencyMs += latency;
    runtime.circuitBreaker.recordSuccess();

    if (runtime.activeTasks.size === 0) {
      runtime.state = RUNTIME_STATES.READY;
    }

    logger.info('task_completed', { runtimeId, taskId, latencyMs: latency });
    this.emit('taskCompleted', { runtimeId, taskId, latency, result });

    // Process queued tasks
    this._processQueue();
  }

  failTask(runtimeId, taskId, error) {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return;

    runtime.activeTasks.delete(taskId);
    runtime.failedTasks++;
    runtime.circuitBreaker.recordFailure();

    if (runtime.activeTasks.size === 0) {
      runtime.state = runtime.circuitBreaker.canExecute()
        ? RUNTIME_STATES.READY
        : RUNTIME_STATES.ERROR;
    }

    logger.error('task_failed', { runtimeId, taskId, error: error.message || error });
    this.emit('taskFailed', { runtimeId, taskId, error });

    // Auto-redistribute if runtime is down
    if (!runtime.circuitBreaker.canExecute()) {
      this._redistributeTasks(runtimeId);
    }
  }

  _redistributeTasks(failedRuntimeId) {
    const failedRuntime = this.runtimes.get(failedRuntimeId);
    if (!failedRuntime) return;

    const tasks = [...failedRuntime.activeTasks.values()];
    failedRuntime.activeTasks.clear();

    logger.warn('redistributing_tasks', {
      fromRuntime: failedRuntimeId,
      taskCount: tasks.length,
    });

    for (const task of tasks) {
      // Re-route to available runtimes
      for (const runtime of this.runtimes.values()) {
        if (runtime.id !== failedRuntimeId && runtime.isAvailable) {
          runtime.activeTasks.set(task.id, { ...task, startTime: Date.now() });
          logger.info('task_redistributed', { taskId: task.id, toRuntime: runtime.id });
          break;
        }
      }
    }
  }

  _processQueue() {
    while (this.taskQueue.length > 0) {
      const availableRuntime = [...this.runtimes.values()].find(r => r.isAvailable);
      if (!availableRuntime) break;

      const { task } = this.taskQueue.shift();
      const score = cslAND(Array.from(task.embedding), Array.from(availableRuntime.capabilities));
      this._assignTask(availableRuntime, task, score);
    }
  }

  _heartbeat() {
    const status = [];
    for (const runtime of this.runtimes.values()) {
      runtime.lastHeartbeat = Date.now();
      status.push(runtime.toJSON());
    }

    const meshPressure = this._calculateMeshPressure();
    this.emit('heartbeat', { runtimes: status, pressure: meshPressure });

    logger.debug('heartbeat', {
      pressure: meshPressure,
      pressureLevel: getPressureLevel(meshPressure),
      runtimes: status.map(s => ({ id: s.id, state: s.state, load: s.load })),
    });
  }

  _calculateMeshPressure() {
    let totalLoad = 0;
    let count = 0;
    for (const runtime of this.runtimes.values()) {
      if (runtime.state !== RUNTIME_STATES.TERMINATED) {
        totalLoad += runtime.load;
        count++;
      }
    }
    const runtimePressure = count > 0 ? totalLoad / count : 0;
    const queuePressure = this.taskQueue.length / this.maxQueueSize;
    return phiFusionScore([runtimePressure, queuePressure], [PSI, 1 - PSI]);
  }

  getStatus() {
    const runtimes = [];
    for (const runtime of this.runtimes.values()) {
      runtimes.push(runtime.toJSON());
    }
    return {
      runtimes,
      queueSize: this.taskQueue.length,
      meshPressure: this._calculateMeshPressure(),
      timestamp: new Date().toISOString(),
    };
  }

  getRuntime(id) {
    return this.runtimes.get(id);
  }
}

module.exports = { ColabRuntimeManager, ColabRuntime, RUNTIME_STATES };
