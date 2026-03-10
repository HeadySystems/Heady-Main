/**
 * Heady™ Structured JSON Logger v5.0
 * Zero console.log — ALL output is structured JSON
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { PHI, PSI, fib } = require('./phi-math');

const LOG_LEVELS = Object.freeze({
  TRACE: 0,
  DEBUG: 1,
  INFO:  2,
  WARN:  3,
  ERROR: 4,
  FATAL: 5,
});

const LOG_BUFFER_SIZE = fib(12); // 144 entries before flush
const SAMPLE_RATE_DEFAULT = PSI; // Log ~61.8% of trace/debug in production

class HeadyLogger {
  constructor(service, options = {}) {
    this.service = service;
    this.level = LOG_LEVELS[options.level || 'INFO'];
    this.buffer = [];
    this.bufferSize = options.bufferSize || LOG_BUFFER_SIZE;
    this.sampleRate = options.sampleRate || SAMPLE_RATE_DEFAULT;
    this.output = options.output || process.stdout;
    this.correlationId = options.correlationId || null;
  }

  _shouldLog(level) {
    if (level < this.level) return false;
    if (level <= LOG_LEVELS.DEBUG && Math.random() > this.sampleRate) return false;
    return true;
  }

  _emit(level, message, meta = {}) {
    const levelName = Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level);
    const entry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      service: this.service,
      message,
      ...meta,
    };
    if (this.correlationId) entry.correlationId = this.correlationId;
    
    this.buffer.push(entry);
    if (this.buffer.length >= this.bufferSize || level >= LOG_LEVELS.ERROR) {
      this.flush();
    }
  }

  flush() {
    for (const entry of this.buffer) {
      this.output.write(JSON.stringify(entry) + '\n');
    }
    this.buffer = [];
  }

  trace(msg, meta) { if (this._shouldLog(LOG_LEVELS.TRACE)) this._emit(LOG_LEVELS.TRACE, msg, meta); }
  debug(msg, meta) { if (this._shouldLog(LOG_LEVELS.DEBUG)) this._emit(LOG_LEVELS.DEBUG, msg, meta); }
  info(msg, meta)  { if (this._shouldLog(LOG_LEVELS.INFO))  this._emit(LOG_LEVELS.INFO, msg, meta); }
  warn(msg, meta)  { if (this._shouldLog(LOG_LEVELS.WARN))  this._emit(LOG_LEVELS.WARN, msg, meta); }
  error(msg, meta) { if (this._shouldLog(LOG_LEVELS.ERROR)) this._emit(LOG_LEVELS.ERROR, msg, meta); }
  fatal(msg, meta) { if (this._shouldLog(LOG_LEVELS.FATAL)) this._emit(LOG_LEVELS.FATAL, msg, meta); }

  child(overrides) {
    return new HeadyLogger(this.service, {
      level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.level),
      bufferSize: this.bufferSize,
      sampleRate: this.sampleRate,
      output: this.output,
      correlationId: overrides.correlationId || this.correlationId,
      ...overrides,
    });
  }
}

function createLogger(service, options = {}) {
  return new HeadyLogger(service, options);
}

module.exports = { HeadyLogger, createLogger, LOG_LEVELS };
