'use strict';

const { fib } = require('../../shared/phi-math');

class Bulkhead {
  constructor(name, options = {}) {
    this.name = name;
    this.maxConcurrent = options.maxConcurrent || fib(6);
    this.maxQueue = options.maxQueue || fib(11);
    this.active = 0;
    this.queue = [];
  }

  async execute(task) {
    if (this.active >= this.maxConcurrent && this.queue.length >= this.maxQueue) {
      throw new Error(`Bulkhead ${this.name} queue is full.`);
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }

  drain() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      this.active += 1;
      Promise.resolve()
        .then(item.task)
        .then((result) => item.resolve(result))
        .catch((error) => item.reject(error))
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }

  snapshot() {
    return {
      name: this.name,
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue
    };
  }
}

module.exports = { Bulkhead };
