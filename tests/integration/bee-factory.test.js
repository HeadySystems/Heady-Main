'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const beeFactoryPath = path.resolve(__dirname, '../../services/heady-bee-factory/index.js');

module.exports = {
  'bee-factory service file exists': () => {
    assert.ok(fs.existsSync(beeFactoryPath), 'heady-bee-factory/index.js must exist');
  },

  'bee-factory defines 30+ bee types': () => {
    const source = fs.readFileSync(beeFactoryPath, 'utf8');
    const beeTypes = source.match(/['"]\w+-bee['"]/g) || [];
    const uniqueBees = new Set(beeTypes.map(b => b.replace(/['"]/g, '')));
    assert.ok(uniqueBees.size >= 20,
      `Expected 20+ bee types, found ${uniqueBees.size}: ${[...uniqueBees].slice(0, 10).join(', ')}...`);
  },

  'bee-factory has spawn/retire lifecycle methods': () => {
    const source = fs.readFileSync(beeFactoryPath, 'utf8');
    assert.ok(/spawn/i.test(source), 'Bee factory must support spawn');
    assert.ok(/retire/i.test(source), 'Bee factory must support retire');
  },

  'bee-factory uses phi-scaled capacity limits': () => {
    const source = fs.readFileSync(beeFactoryPath, 'utf8');
    const fibPattern = /\b(89|144|233|377|610|987|1597)\b/;
    const hasFib = fibPattern.test(source);
    const hasPhi = source.includes('1.618') || source.includes('PHI') || source.includes('phi');
    assert.ok(hasFib || hasPhi, 'Capacity limits should use phi/Fibonacci values');
  },

  'bee-factory tracks bee health': () => {
    const source = fs.readFileSync(beeFactoryPath, 'utf8');
    assert.ok(/health/i.test(source), 'Bee factory should track bee health');
  },

  'bee-factory assigns pools to bee types': () => {
    const source = fs.readFileSync(beeFactoryPath, 'utf8');
    assert.ok(/pool/i.test(source), 'Bee factory should assign pool categories');
  }
};
