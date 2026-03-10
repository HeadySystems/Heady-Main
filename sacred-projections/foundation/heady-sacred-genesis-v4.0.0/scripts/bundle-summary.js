'use strict';

const { createManager } = require('../heady-manager');

const manager = createManager();
process.stdout.write(`${JSON.stringify(manager.getSystemSnapshot(), null, 2)}\n`);
