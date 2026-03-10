/**
 * Tests for scaling pattern modules
 * Author: Eric Haywood | ESM only
 */
import { strict as assert } from 'assert';

async function testCqrs() {
  const mod = await import('../scaling/cqrs-manager.js');
  assert.ok(typeof mod.executeCommand === 'function', 'CQRS has executeCommand');
  assert.ok(typeof mod.executeQuery === 'function', 'CQRS has executeQuery');
  assert.ok(typeof mod.registerProjection === 'function', 'CQRS has registerProjection');
  assert.ok(typeof mod.replayEvents === 'function', 'CQRS has replayEvents');

  mod.registerCommandHandler('TEST_CMD', (cmd) => [{ type: 'TEST_EVENT', aggregateId: 'agg1', payload: cmd.payload }]);
  const result = await mod.executeCommand({ type: 'TEST_CMD', aggregateId: 'agg1', payload: { data: 'test' } });
  assert.ok(result.success, 'Command executed successfully');
  assert.ok(result.events.length > 0, 'Events generated');
  console.log('  ✓ CQRS manager verified');
}

async function testSaga() {
  const mod = await import('../scaling/saga-coordinator.js');
  assert.ok(typeof mod.defineSaga === 'function', 'Saga has defineSaga');
  assert.ok(typeof mod.startSaga === 'function', 'Saga has startSaga');

  const def = mod.defineSaga('test-saga', [
    { name: 'step1', action: (ctx) => ({ done: true }), compensation: (ctx) => ({ undone: true }) },
    { name: 'step2', action: (ctx) => ({ done: true }), compensation: (ctx) => ({ undone: true }) },
  ]);
  assert.ok(def.defined, 'Saga defined');

  const result = await mod.startSaga('test-saga', { userId: 'test' });
  assert.ok(result.state === 'COMPLETED', 'Saga completed: ' + result.state);
  console.log('  ✓ Saga coordinator verified');
}

async function testFeatureFlags() {
  const mod = await import('../scaling/feature-flags.js');
  const flag = mod.createFlag({ key: 'test-flag', enabled: true, rolloutPercentage: 100 });
  assert.ok(flag.key === 'test-flag', 'Flag created');

  const eval1 = mod.evaluateFlag('test-flag', 'user123');
  assert.ok(eval1.enabled, 'Flag evaluated as enabled');
  assert.ok(eval1.variant, 'Variant assigned');

  const advance = mod.advanceRollout('test-flag');
  assert.ok(advance.rolloutPercentage >= 0, 'Rollout advanced');
  console.log('  ✓ Feature flags verified');
}

async function testDlq() {
  const mod = await import('../scaling/dead-letter-queue.js');
  const result = mod.enqueue({ payload: { test: true }, error: 'test_error', originalQueue: 'test-queue' });
  assert.ok(result.id, 'DLQ entry created');
  assert.ok(result.status === 'dead_lettered', 'Status is dead_lettered');

  const analytics = mod.getAnalytics();
  assert.ok(analytics.total > 0, 'Analytics shows entries');
  console.log('  ✓ Dead letter queue verified');
}

async function testApiContracts() {
  const mod = await import('../scaling/api-contracts.js');
  const schema = mod.registerSchema('test-event', 1, {
    properties: { name: { type: 'string' }, age: { type: 'number' } },
    required: ['name'],
  });
  assert.ok(schema.subject === 'test-event', 'Schema registered');

  const valid = mod.validatePayload('test-event', { name: 'test', age: 25 });
  assert.ok(valid.valid, 'Valid payload passes');

  const invalid = mod.validatePayload('test-event', { age: 25 });
  assert.ok(!invalid.valid, 'Invalid payload fails');
  console.log('  ✓ API contracts verified');
}

async function testErrorCodes() {
  const mod = await import('../scaling/error-codes.js');
  const err = mod.createError('AUTH_1001', { userId: 'test' });
  assert.ok(err.code === 'AUTH_1001', 'Error created');
  assert.ok(err.severity === 'CRITICAL', 'Severity correct');
  assert.ok(err.httpStatus === 401, 'HTTP status correct');
  assert.ok(err.retryable === false, 'Critical not retryable');

  const all = mod.listErrors();
  assert.ok(all.length >= 20, 'At least 20 canonical errors: ' + all.length);
  console.log('  ✓ Error codes verified (' + all.length + ' canonical errors)');
}

async function testProto() {
  const mod = await import('../scaling/heady-services.proto.js');
  const services = mod.listServices();
  assert.ok(services.length >= 3, 'At least 3 canonical services');

  const proto = mod.generateProtoText();
  assert.ok(proto.includes('syntax = "proto3"'), 'Proto3 syntax');
  assert.ok(proto.includes('service HeadyHealth'), 'Health service defined');
  assert.ok(proto.includes('service HeadyMemory'), 'Memory service defined');
  console.log('  ✓ Proto definitions verified (' + services.length + ' services)');
}

console.log('\n=== Scaling Pattern Tests ===');
await testCqrs();
await testSaga();
await testFeatureFlags();
await testDlq();
await testApiContracts();
await testErrorCodes();
await testProto();
console.log('\n✅ All scaling tests passed.');

export default { testCqrs, testSaga, testFeatureFlags, testDlq, testApiContracts, testErrorCodes, testProto };
