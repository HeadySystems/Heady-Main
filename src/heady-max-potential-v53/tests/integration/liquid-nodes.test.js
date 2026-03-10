/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const assert = require('assert');
const {
  scoreComplexity, routeDecision, shouldCompress,
  COMPLEXITY, RESOURCE_SPLIT, COMPRESSION_TRIGGERS,
  AGENT_STATES, TRANSITIONS, DurableAgentState,
  PROVIDERS, ProviderHealth, routeRequest,
} = require('../../src/liquid-nodes');
const { PHI, PSI, fib, PHI_TIMING } = require('../../shared/phi-math');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; process.stdout.write(`  ✓ ${name}\n`); }
  catch (err) { failed++; process.stdout.write(`  ✗ ${name}: ${err.message}\n`); }
}

process.stdout.write('\n╔══════════════════════════════════════════════════════════════╗\n');
process.stdout.write('║  Heady™ Liquid Nodes Integration Tests                     ║\n');
process.stdout.write('╚══════════════════════════════════════════════════════════════╝\n\n');

// ─── Edge Worker Tests ────────────────────────────────────────────────────────

test('COMPLEXITY thresholds are φ-derived', () => {
  assert(Math.abs(COMPLEXITY.EDGE_ONLY - PSI * PSI) < 1e-10);
  assert(Math.abs(COMPLEXITY.EDGE_PREFERRED - PSI) < 1e-10);
});

test('RESOURCE_SPLIT sums to ~1.0', () => {
  const sum = RESOURCE_SPLIT.edge + RESOURCE_SPLIT.origin + RESOURCE_SPLIT.hybrid + RESOURCE_SPLIT.reserved;
  assert(Math.abs(sum - 1.0) < 0.01);
});

test('COMPRESSION_TRIGGERS are Fibonacci', () => {
  const expected = [fib(6), fib(7), fib(8), fib(9), fib(10), fib(11)];
  assert.deepStrictEqual(COMPRESSION_TRIGGERS, expected);
});

test('scoreComplexity returns 0-1 for empty request', () => {
  const score = scoreComplexity({});
  assert(score >= 0 && score <= 1);
});

test('scoreComplexity increases with message length', () => {
  const short = scoreComplexity({ messages: [{ role: 'user', content: 'hello' }] });
  const long = scoreComplexity({ messages: [{ role: 'user', content: 'x'.repeat(1000) }] });
  assert(long > short, `long=${long} should be > short=${short}`);
});

test('routeDecision returns edge for low complexity', () => {
  assert.strictEqual(routeDecision(0.1), 'edge');
});

test('routeDecision returns origin for high complexity', () => {
  assert.strictEqual(routeDecision(0.9), 'origin');
});

test('shouldCompress at fib(8)=21 messages', () => {
  assert.strictEqual(shouldCompress(21), true);
  assert.strictEqual(shouldCompress(20), false);
});

// ─── Durable Agent State Tests ────────────────────────────────────────────────

test('Agent starts in INIT state', () => {
  const agent = new DurableAgentState('test-1');
  assert.strictEqual(agent.state, AGENT_STATES.INIT);
});

test('Agent transitions INIT → ACTIVE', () => {
  const agent = new DurableAgentState('test-2');
  const ok = agent.transition(AGENT_STATES.ACTIVE);
  assert.strictEqual(ok, true);
  assert.strictEqual(agent.state, AGENT_STATES.ACTIVE);
});

test('Agent rejects invalid transition INIT → THINKING', () => {
  const agent = new DurableAgentState('test-3');
  const ok = agent.transition(AGENT_STATES.THINKING);
  assert.strictEqual(ok, false);
  assert.strictEqual(agent.state, AGENT_STATES.INIT);
});

test('Agent addMessage stores messages', () => {
  const agent = new DurableAgentState('test-4');
  agent.transition(AGENT_STATES.ACTIVE);
  agent.addMessage({ role: 'user', content: 'test message' });
  assert.strictEqual(agent.conversationHistory.length, 1);
});

test('Agent compresses history at fib(8)=21 messages', () => {
  const agent = new DurableAgentState('test-5');
  agent.transition(AGENT_STATES.ACTIVE);
  for (let i = 0; i < 21; i++) {
    agent.addMessage({ role: 'user', content: `msg ${i}` });
  }
  // After compression: 1 summary + fib(6)=8 recent = 9 messages
  assert(agent.conversationHistory.length <= 10, `history=${agent.conversationHistory.length}`);
});

test('Agent serialize/deserialize roundtrip', () => {
  const agent = new DurableAgentState('test-6');
  agent.transition(AGENT_STATES.ACTIVE);
  agent.addMessage({ role: 'user', content: 'hello' });
  const data = agent.serialize();
  const restored = DurableAgentState.deserialize(data);
  assert.strictEqual(restored.agentId, 'test-6');
  assert.strictEqual(restored.state, AGENT_STATES.ACTIVE);
  assert.strictEqual(restored.conversationHistory.length, 1);
  agent.destroy();
});

// ─── Edge-Origin Router Tests ─────────────────────────────────────────────────

test('ProviderHealth default score is ψ', () => {
  const health = new ProviderHealth();
  const score = health.getScore('unknown-provider');
  assert(Math.abs(score - PSI) < 1e-10);
});

test('ProviderHealth tracks success', () => {
  const health = new ProviderHealth();
  health.record('test-provider', true, 100);
  health.record('test-provider', true, 200);
  assert(health.isHealthy('test-provider'));
});

test('routeRequest returns edge for simple query', () => {
  const health = new ProviderHealth();
  const result = routeRequest({ messages: [{ role: 'user', content: 'hi' }] }, health);
  assert.strictEqual(result.route, 'edge');
  assert(result.providers.length > 0);
});

test('PROVIDERS have φ-scaled timeouts', () => {
  assert.strictEqual(PROVIDERS['workers-ai-llama'].timeoutMs, PHI_TIMING.PHI_3);
  assert.strictEqual(PROVIDERS['claude-sonnet'].timeoutMs, PHI_TIMING.PHI_7);
});

process.stdout.write(`\n${'═'.repeat(60)}\n`);
process.stdout.write(`  Results: ${passed} passed, ${failed} failed\n`);
process.stdout.write(`${'═'.repeat(60)}\n\n`);
process.exit(failed > 0 ? 1 : 0);
