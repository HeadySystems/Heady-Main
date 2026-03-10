'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createManager } = require('../heady-manager');

test('pipeline returns signed receipt', async () => {
  const manager = createManager();
  const result = await manager.pipeline.execute({ task: 'verify pipeline receipt', domain: 'testing' });
  assert.equal(result.signature.algorithm, 'Ed25519');
  const verification = manager.receiptSigner.verify(result);
  assert.equal(verification.valid, true);
});
