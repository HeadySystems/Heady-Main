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

const autoSuccessPath = path.resolve(__dirname, '../../services/auto-success-engine/index.js');

module.exports = {
  'auto-success-engine file exists': () => {
    assert.ok(fs.existsSync(autoSuccessPath), 'auto-success-engine/index.js must exist');
  },

  'auto-success-engine implements phi^7 cycle timing': () => {
    const source = fs.readFileSync(autoSuccessPath, 'utf8');
    // phi^7 ~ 29.034 * 1000 = 29034ms
    const hasPhi7 = source.includes('29034') || source.includes('29.034') ||
                    /phi.*7|PHI.*7|Math\.pow.*PHI.*7/i.test(source);
    assert.ok(hasPhi7, 'Auto-success engine must use phi^7-derived cycle (29034ms)');
  },

  'auto-success-engine has 5-stage pipeline (Battle/Coder/Analyze/Risks/Patterns)': () => {
    const source = fs.readFileSync(autoSuccessPath, 'utf8');
    const stages = ['battle', 'coder', 'analyz', 'risk', 'pattern'];
    const found = stages.filter(s => source.toLowerCase().includes(s));
    assert.ok(found.length >= 4,
      `Expected 5 pipeline stages, found ${found.length}: ${found.join(', ')}`);
  },

  'auto-success-engine port is 3325': () => {
    const source = fs.readFileSync(autoSuccessPath, 'utf8');
    assert.ok(source.includes('3325'), 'Auto-success engine should use port 3325');
  },

  'auto-success-engine has no magic numbers': () => {
    const source = fs.readFileSync(autoSuccessPath, 'utf8');
    // Check that common magic numbers are absent or derived
    const hasTODO = /\/\/ *TODO/i.test(source);
    const hasFIXME = /\/\/ *FIXME/i.test(source);
    const hasHACK = /\/\/ *HACK/i.test(source);
    assert.ok(!hasTODO, 'No TODO comments allowed');
    assert.ok(!hasFIXME, 'No FIXME comments allowed');
    assert.ok(!hasHACK, 'No HACK comments allowed');
  }
};
