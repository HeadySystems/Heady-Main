'use strict';

const { EventEmitter } = require('events');

function createEventBus() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  return emitter;
}

module.exports = { createEventBus };
