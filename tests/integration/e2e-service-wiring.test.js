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

const SERVICES_DIR = path.resolve(__dirname, '../../services');
const SHARED_DIR = path.resolve(__dirname, '../../shared');

module.exports = {
  'all 60 service directories exist': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    assert.strictEqual(dirs.length, 60, `Expected 60 services, found ${dirs.length}`);
  },

  'every service has an index.js': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const missing = [];
    for (const d of dirs) {
      const indexPath = path.join(SERVICES_DIR, d.name, 'index.js');
      if (!fs.existsSync(indexPath)) missing.push(d.name);
    }
    assert.strictEqual(missing.length, 0,
      `Services missing index.js: ${missing.join(', ')}`);
  },

  'every service requires liquid-node-base or has LiquidNodeBase': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const notUsingLNB = [];
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      if (!source.includes('liquid-node-base') && !source.includes('LiquidNodeBase')) {
        notUsingLNB.push(d.name);
      }
    }
    assert.strictEqual(notUsingLNB.length, 0,
      `Services not using LiquidNodeBase: ${notUsingLNB.join(', ')}`);
  },

  'every service has JSDoc on exported functions': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const noJSDoc = [];
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      if (!source.includes('/**') && !source.includes('@module') && !source.includes('@param')) {
        noJSDoc.push(d.name);
      }
    }
    assert.strictEqual(noJSDoc.length, 0,
      `Services without JSDoc: ${noJSDoc.join(', ')}`);
  },

  'no service contains TODO, FIXME, HACK, or console.log': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const violations = [];
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      const hasTODO = /\/\/ *TODO/i.test(source);
      const hasFIXME = /\/\/ *FIXME/i.test(source);
      const hasHACK = /\/\/ *HACK/i.test(source);
      const hasConsoleLog = /console\.log\(/i.test(source);
      if (hasTODO || hasFIXME || hasHACK || hasConsoleLog) {
        const issues = [];
        if (hasTODO) issues.push('TODO');
        if (hasFIXME) issues.push('FIXME');
        if (hasHACK) issues.push('HACK');
        if (hasConsoleLog) issues.push('console.log');
        violations.push(`${d.name}: ${issues.join(', ')}`);
      }
    }
    assert.strictEqual(violations.length, 0,
      `Violations found:\n${violations.join('\n')}`);
  },

  'no service contains empty catch blocks': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const violations = [];
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      // Match catch blocks with only whitespace inside
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(source)) {
        violations.push(d.name);
      }
    }
    assert.strictEqual(violations.length, 0,
      `Services with empty catch blocks: ${violations.join(', ')}`);
  },

  'every service uses CommonJS (require/module.exports)': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const esModules = [];
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      if (/^\s*import\s/m.test(source) || /^\s*export\s/m.test(source)) {
        esModules.push(d.name);
      }
    }
    assert.strictEqual(esModules.length, 0,
      `Services using ES modules instead of CommonJS: ${esModules.join(', ')}`);
  },

  'all 3 shared infrastructure modules exist': () => {
    const required = ['liquid-node-base.js', 'service-mesh.js', 'colab-runtime.js'];
    const missing = required.filter(f => !fs.existsSync(path.join(SHARED_DIR, f)));
    assert.strictEqual(missing.length, 0,
      `Missing shared modules: ${missing.join(', ')}`);
  },

  'all 6 shared modules exist (original 3 + new 3)': () => {
    const required = [
      'phi-math.js', 'csl-engine.js', 'sacred-geometry.js',
      'liquid-node-base.js', 'service-mesh.js', 'colab-runtime.js'
    ];
    const missing = required.filter(f => !fs.existsSync(path.join(SHARED_DIR, f)));
    assert.strictEqual(missing.length, 0,
      `Missing shared modules: ${missing.join(', ')}`);
  },

  'every service has unique port assignment': () => {
    const dirs = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    const portMap = {};
    for (const d of dirs) {
      const source = fs.readFileSync(path.join(SERVICES_DIR, d.name, 'index.js'), 'utf8');
      const portMatch = source.match(/port[:\s]*(?:process\.env\.[A-Z_]+\s*\|\|\s*)?['"]?(33\d{2})['"]?/i);
      if (portMatch) {
        const port = portMatch[1];
        if (portMap[port]) {
          portMap[port].push(d.name);
        } else {
          portMap[port] = [d.name];
        }
      }
    }
    const duplicates = Object.entries(portMap)
      .filter(([_, services]) => services.length > 1)
      .map(([port, services]) => `Port ${port}: ${services.join(', ')}`);
    assert.strictEqual(duplicates.length, 0,
      `Duplicate ports:\n${duplicates.join('\n')}`);
  }
};
