// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/shared/logger.js                                      ║
// ║  LAYER: shared                                                   ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Shared Logger Factory
 *
 * Usage:
 *   const logger = require('../../src/shared/logger')('MyModule');
 *   logger.info('Server started');
 *   logger.error('Connection failed', err.message);
 *   logger.warn('Cache miss');
 *   logger.debug('Verbose detail');
 *
 * Wraps ColorfulLogger so every service uses structured, tagged output.
 */

const ColorfulLogger = require('../hc_colorful_logger');

/**
 * Create a logger instance tagged with a module name.
 * @param {string} moduleName — e.g. 'BrainAPI', 'MCPGateway'
 * @returns {{ info, error, warn, debug, system, pipeline, success }}
 */
function createLogger(moduleName) {
    const instance = new ColorfulLogger({
        enabled: true,
        level: process.env.LOG_LEVEL || 'info',
        useRainbow: process.env.NODE_ENV !== 'production',
        useEmojis: true
    });

    return {
        info: (msg) => instance.info(msg, moduleName),
        error: (msg) => instance.error(msg, moduleName),
        warn: (msg) => instance.warning(msg, moduleName),
        debug: (msg) => instance.debug(msg, moduleName),
        system: (msg) => instance.system(msg, moduleName),
        pipeline: (msg) => instance.pipeline(msg, moduleName),
        success: (msg) => instance.success(msg, moduleName),
        startup: () => instance.startup(moduleName),
        shutdown: () => instance.shutdown(moduleName),

        /** Direct access to the underlying ColorfulLogger */
        _instance: instance
    };
}

module.exports = createLogger;
