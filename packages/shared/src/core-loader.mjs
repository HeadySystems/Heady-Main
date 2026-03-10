/**
 * Heady Core Loader - Safe Wiring Helper for Legacy Services
 * =============================================================
 * Provides safe lazy-loaded access to core infrastructure components
 * with graceful fallback if core module is unavailable.
 *
 * Usage:
 *   import { getEngine, getConductor, getScheduler } from './core-loader.mjs';
 *   const engine = getEngine();
 *   const conductor = getConductor();
 *   const scheduler = getScheduler();
 *
 * @module shared/core-loader
 */

let _coreModule = null;
let _coreLoadError = null;
let _system = null;
let _engine = null;
let _conductor = null;
let _scheduler = null;
let _nodeRegistry = null;
let _embeddingRouter = null;

/**
 * Safely load the core module with fallback if unavailable.
 * Caches result so subsequent calls do not re-require.
 *
 * @returns {object|null} Core module exports, or null if loading failed
 */
export async function loadCore() {
  if (_coreModule !== null) {
    return _coreModule;
  }

  if (_coreLoadError) {
    return null;
  }

  try {
    _coreModule = await import('../../../core/index.js');
    return _coreModule;
  } catch (err) {
    _coreLoadError = err;
    console.warn('[CoreLoader] Failed to load core module:', err.message);
    return null;
  }
}

/**
 * Lazily initialize the Heady system using core/index.js createSystem().
 * Creates PipelineEngine, Conductor, AutoSuccessScheduler, LiquidNodeRegistry,
 * and EmbeddingRouter wired together.
 *
 * @param {object} [opts] - System initialization options
 * @returns {Promise<object|null>} System object with { engine, conductor, scheduler, nodeRegistry, embeddingRouter }, or null if core unavailable
 */
async function _initializeSystem(opts = {}) {
  const core = await loadCore();
  if (!core || typeof core.createSystem !== 'function') {
    console.warn('[CoreLoader] Core module does not export createSystem()');
    return null;
  }

  try {
    _system = core.createSystem(opts);
    return _system;
  } catch (err) {
    console.warn('[CoreLoader] Failed to create system:', err.message);
    return null;
  }
}

/**
 * Get or create the shared system instance.
 *
 * @param {object} [opts] - Options passed to createSystem() on first call only
 * @returns {Promise<object|null>}
 */
async function _getSystem(opts = {}) {
  if (_system) {
    return _system;
  }
  return _initializeSystem(opts);
}

/**
 * Get the PipelineEngine instance (lazy singleton).
 * Automatically initializes the system if not already done.
 *
 * @param {object} [opts] - System options (used only on first initialization)
 * @returns {Promise<PipelineEngine|null>}
 */
export async function getEngine(opts = {}) {
  if (_engine !== null) {
    return _engine;
  }

  const system = await _getSystem(opts);
  if (!system || !system.engine) {
    return null;
  }

  _engine = system.engine;
  return _engine;
}

/**
 * Get the Conductor instance (lazy singleton).
 * Automatically initializes the system if not already done.
 *
 * @param {object} [opts] - System options (used only on first initialization)
 * @returns {Promise<Conductor|null>}
 */
export async function getConductor(opts = {}) {
  if (_conductor !== null) {
    return _conductor;
  }

  const system = await _getSystem(opts);
  if (!system || !system.conductor) {
    return null;
  }

  _conductor = system.conductor;
  return _conductor;
}

/**
 * Get the AutoSuccessScheduler instance (lazy singleton).
 * Automatically initializes the system if not already done.
 *
 * @param {object} [opts] - System options (used only on first initialization)
 * @returns {Promise<AutoSuccessScheduler|null>}
 */
export async function getScheduler(opts = {}) {
  if (_scheduler !== null) {
    return _scheduler;
  }

  const system = await _getSystem(opts);
  if (!system || !system.scheduler) {
    return null;
  }

  _scheduler = system.scheduler;
  return _scheduler;
}

/**
 * Get the LiquidNodeRegistry instance (lazy singleton).
 * Automatically initializes the system if not already done.
 *
 * @param {object} [opts] - System options (used only on first initialization)
 * @returns {Promise<LiquidNodeRegistry|null>}
 */
export async function getNodeRegistry(opts = {}) {
  if (_nodeRegistry !== null) {
    return _nodeRegistry;
  }

  const system = await _getSystem(opts);
  if (!system || !system.nodeRegistry) {
    return null;
  }

  _nodeRegistry = system.nodeRegistry;
  return _nodeRegistry;
}

/**
 * Get the EmbeddingRouter instance (lazy singleton).
 * Automatically initializes the system if not already done.
 *
 * @param {object} [opts] - System options (used only on first initialization)
 * @returns {Promise<EmbeddingRouter|null>}
 */
export async function getEmbeddingRouter(opts = {}) {
  if (_embeddingRouter !== null) {
    return _embeddingRouter;
  }

  const system = await _getSystem(opts);
  if (!system || !system.embeddingRouter) {
    return null;
  }

  _embeddingRouter = system.embeddingRouter;
  return _embeddingRouter;
}

/**
 * Reset all cached instances (for testing or re-initialization).
 * Use with caution in production.
 *
 * @returns {void}
 */
export function reset() {
  _coreModule = null;
  _coreLoadError = null;
  _system = null;
  _engine = null;
  _conductor = null;
  _scheduler = null;
  _nodeRegistry = null;
  _embeddingRouter = null;
}

/**
 * Check if the core module is available.
 *
 * @returns {Promise<boolean>}
 */
export async function isCoreAvailable() {
  return (await loadCore()) !== null;
}

/**
 * Get the last core load error, if any.
 *
 * @returns {Error|null}
 */
export function getCoreLoadError() {
  return _coreLoadError;
}
