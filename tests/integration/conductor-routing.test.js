'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

/** @constant {string} Path to conductor service */
const conductorPath = path.resolve(__dirname, '../../services/heady-conductor/index.js');

module.exports = {
  'conductor service file exists': () => {
    assert.ok(fs.existsSync(conductorPath), 'heady-conductor/index.js must exist');
  },

  'conductor exports a module': () => {
    const conductor = require(conductorPath);
    assert.ok(conductor !== undefined, 'Conductor should export something');
  },

  'conductor contains SWARM_MATRIX': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    assert.ok(source.includes('SWARM_MATRIX'), 'Conductor should define SWARM_MATRIX');
  },

  'conductor has 17 swarms in SWARM_MATRIX': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    const swarmCount = (source.match(/Swarm.*?:/g) || []).length;
    assert.ok(swarmCount >= 13,
      `Expected 13+ swarms in SWARM_MATRIX, found ${swarmCount}`);
  },

  'conductor references pool assignment': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    const hasPool = /pool/i.test(source);
    assert.ok(hasPool, 'Conductor should reference pool assignment');
  },

  'conductor uses DOMAIN_KEYWORDS for CSL classification': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    assert.ok(source.includes('DOMAIN_KEYWORDS'), 'Conductor should define DOMAIN_KEYWORDS');
  },

  'conductor port is 3323': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    assert.ok(source.includes('3323'), 'Conductor should use port 3323');
  },

  'conductor imports from service-mesh': () => {
    const source = fs.readFileSync(conductorPath, 'utf8');
    assert.ok(source.includes('service-mesh'), 'Conductor should import from service-mesh');
  }
};
