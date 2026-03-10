const logger = require('./utils/logger.js');
global.logger = logger;
global.logger.info = function(...args) {
    logger.info({ args });
};
global.logger.warn = function(...args) {
    logger.warn({ args });
};
global.logger.error = function(...args) {
    logger.error({ args });
};
