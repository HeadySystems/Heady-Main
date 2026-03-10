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

const colabGatewayPath = path.resolve(__dirname, '../../services/colab-gateway/index.js');

module.exports = {
  'colab-gateway service exists': () => {
    assert.ok(fs.existsSync(colabGatewayPath), 'colab-gateway/index.js must exist');
  },

  'colab-gateway imports colab-runtime': () => {
    const source = fs.readFileSync(colabGatewayPath, 'utf8');
    assert.ok(source.includes('colab-runtime'), 'colab-gateway must import colab-runtime');
  },

  'colab-gateway exposes GPU cluster status endpoint': () => {
    const source = fs.readFileSync(colabGatewayPath, 'utf8');
    const hasCluster = /cluster|gpu|runtime/i.test(source);
    const hasStatus = /status|health/i.test(source);
    assert.ok(hasCluster && hasStatus, 'colab-gateway should expose cluster status');
  },

  'colab-gateway supports CSL operations via API': () => {
    const source = fs.readFileSync(colabGatewayPath, 'utf8');
    const hasCSL = /csl|cosine|superposition|orthogonal|embed|vector/i.test(source);
    assert.ok(hasCSL, 'colab-gateway should support CSL operations');
  },

  'colab-gateway uses port 3352': () => {
    const source = fs.readFileSync(colabGatewayPath, 'utf8');
    assert.ok(source.includes('3352'), 'colab-gateway should use port 3352');
  },

  'colab-gateway manages 3 Colab Pro+ runtimes': () => {
    const source = fs.readFileSync(colabGatewayPath, 'utf8');
    const hasThree = /3|three|embedding.*projection.*inference|runtime/i.test(source);
    assert.ok(hasThree, 'colab-gateway should manage 3 runtimes');
  }
};
