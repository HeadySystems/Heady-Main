'use strict';

    function createLogger(scope = 'heady') {
      function log(level, message, metadata = {}) {
        const entry = {
          timestamp: new Date().toISOString(),
          scope,
          level,
          message,
          metadata
        };
        process.stdout.write(`${JSON.stringify(entry)}
`);
      }

      return Object.freeze({
        info(message, metadata) {
          log('INFO', message, metadata);
        },
        warn(message, metadata) {
          log('WARN', message, metadata);
        },
        error(message, metadata) {
          log('ERROR', message, metadata);
        },
        debug(message, metadata) {
          log('DEBUG', message, metadata);
        }
      });
    }

    module.exports = { createLogger };
