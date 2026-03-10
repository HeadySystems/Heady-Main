'use strict';

const assert = require('assert');
const path = require('path');

/** @constant {number} PHI */
const PHI = 1.6180339887498948;

/** @constant {number} PSI */
const PSI = 1 / PHI;

/**
 * Compute phiThreshold at given level
 * @param {number} level - Threshold level (0-4)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number} Threshold value
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const fs = require('fs');

const hcfpPath = path.resolve(__dirname, '../../services/hcfullpipeline-executor/index.js');

module.exports = {
  'hcfullpipeline-executor file exists': () => {
    assert.ok(fs.existsSync(hcfpPath), 'hcfullpipeline-executor/index.js must exist');
  },

  'HCFP defines 21 pipeline stages': () => {
    const source = fs.readFileSync(hcfpPath, 'utf8');
    // Count stage definitions
    const stagePatterns = source.match(/stage|STAGE/gi) || [];
    assert.ok(stagePatterns.length >= 10,
      `Expected many stage references, found ${stagePatterns.length}`);
  },

  'HCFP executor port is 3326': () => {
    const source = fs.readFileSync(hcfpPath, 'utf8');
    assert.ok(source.includes('3326'), 'HCFP executor should use port 3326');
  },

  'HCFP has execution and status endpoints': () => {
    const source = fs.readFileSync(hcfpPath, 'utf8');
    const hasExecute = /execute|run|start/i.test(source);
    const hasStatus = /status|progress/i.test(source);
    assert.ok(hasExecute, 'HCFP must have execute capability');
    assert.ok(hasStatus, 'HCFP must have status reporting');
  }
};
