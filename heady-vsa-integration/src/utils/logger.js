/**
 * @fileoverview Simple logger utility
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

let currentLevel = LOG_LEVELS.info;

const logger = {
  setLevel(level) {
    currentLevel = LOG_LEVELS[level] || LOG_LEVELS.info;
  },

  debug(...args) {
    if (currentLevel <= LOG_LEVELS.debug) {
      logger.info('[DEBUG]', ...args);
    }
  },

  info(...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      logger.info('[INFO]', ...args);
    }
  },

  warn(...args) {
    if (currentLevel <= LOG_LEVELS.warn) {
      logger.warn('[WARN]', ...args);
    }
  },

  error(...args) {
    if (currentLevel <= LOG_LEVELS.error) {
      logger.error('[ERROR]', ...args);
    }
  }
};

module.exports = { logger };
