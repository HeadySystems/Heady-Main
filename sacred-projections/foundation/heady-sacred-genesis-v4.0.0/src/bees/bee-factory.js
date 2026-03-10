'use strict';

const { fib } = require('../../shared/phi-math');

const BEE_STATES = Object.freeze({
  SPAWNED: 'SPAWNED',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  DRAINING: 'DRAINING',
  SHUTDOWN: 'SHUTDOWN'
});

class Bee {
  constructor(id, swarm, handler) {
    this.id = id;
    this.swarm = swarm;
    this.handler = handler;
    this.state = BEE_STATES.SPAWNED;
    this.createdAt = new Date().toISOString();
    this.completed = 0;
  }

  async initialize() {
    this.state = BEE_STATES.READY;
    return this;
  }

  async run(task) {
    if (this.state !== BEE_STATES.READY) {
      throw new Error(`Bee ${this.id} is not READY.`);
    }
    this.state = BEE_STATES.ACTIVE;
    const result = await this.handler(task, this);
    this.completed += 1;
    this.state = BEE_STATES.READY;
    return result;
  }

  shutdown() {
    this.state = BEE_STATES.SHUTDOWN;
  }
}

class BeeFactory {
  constructor(options = {}) {
    this.maxConcurrentBees = options.maxConcurrentBees || 10000;
    this.maxBeeTypes = options.maxBeeTypes || fib(11);
    this.registry = new Map();
    this.sequence = 0;
  }

  async spawn(swarm, handler = async (task) => task) {
    if (this.registry.size >= this.maxConcurrentBees) {
      throw new Error('BeeFactory capacity reached.');
    }
    const id = `bee-${++this.sequence}`;
    const bee = new Bee(id, swarm, handler);
    await bee.initialize();
    this.registry.set(id, bee);
    return bee;
  }

  getReadyBee(swarm) {
    for (const bee of this.registry.values()) {
      if (bee.swarm === swarm && bee.state === BEE_STATES.READY) {
        return bee;
      }
    }
    return null;
  }

  snapshot() {
    return {
      totalBees: this.registry.size,
      maxConcurrentBees: this.maxConcurrentBees,
      maxBeeTypes: this.maxBeeTypes,
      bySwarm: Array.from(this.registry.values()).reduce((accumulator, bee) => {
        accumulator[bee.swarm] = (accumulator[bee.swarm] || 0) + 1;
        return accumulator;
      }, {})
    };
  }
}

module.exports = {
  BeeFactory,
  BEE_STATES
};
