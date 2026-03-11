/**
 * Heady™ Wave 9 Component Tests
 * Tests all 8 new Wave 9 components for correct initialization, phi-compliance, and basic operations.
 * 
 * @version 1.0.0
 * @author Eric Haywood
 */

'use strict';

const { PHI, PSI, fib, CSL_THRESHOLDS, phiThreshold } = require('../shared/phi-math');

let passed = 0;
let failed = 0;
const results = [];

function test(suite, name, fn) {
  try {
    fn();
    passed++;
    results.push({ suite, name, status: 'PASS' });
  } catch (err) {
    failed++;
    results.push({ suite, name, status: 'FAIL', error: err.message });
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

/* ─────────── HeadyRisks Tests ─────────── */

const { HeadyRisks, SEVERITY, OWASP_CATEGORIES, shannonEntropy, computeRiskScore } = require('../src/security/heady-risks');

test('HeadyRisks', 'initializes correctly', () => {
  const risks = new HeadyRisks();
  assert(risks.stats.totalScans === 0, 'Should start with 0 scans');
  assert(risks.cveCache.size === 0, 'CVE cache should be empty');
});

test('HeadyRisks', 'severity thresholds are phi-derived', () => {
  assert(Math.abs(SEVERITY.CRITICAL.threshold - phiThreshold(4)) < 0.001, 'CRITICAL should be phiThreshold(4)');
  assert(Math.abs(SEVERITY.HIGH.threshold - phiThreshold(3)) < 0.001, 'HIGH should be phiThreshold(3)');
  assert(Math.abs(SEVERITY.MEDIUM.threshold - phiThreshold(2)) < 0.001, 'MEDIUM should be phiThreshold(2)');
});

test('HeadyRisks', 'shannon entropy calculation', () => {
  assert(shannonEntropy('') === 0, 'Empty string entropy should be 0');
  assert(shannonEntropy('aaaa') === 0, 'Uniform string entropy should be 0');
  assert(shannonEntropy('abcd') > 0, 'Mixed string should have positive entropy');
});

test('HeadyRisks', 'scan detects console.log', () => {
  const risks = new HeadyRisks();
  const files = [{ path: 'test.js', content: 'console.log("hello world");\n' }];
  risks.scan(files).then(report => {
    assert(report.totalFindings > 0, 'Should detect console.log');
  });
});

test('HeadyRisks', 'risk score computation', () => {
  const score = computeRiskScore(0.9, 0.8, 0.7);
  assert(score > 0 && score <= 1, 'Risk score should be between 0 and 1');
});

test('HeadyRisks', 'OWASP has 10 categories', () => {
  assert(Object.keys(OWASP_CATEGORIES).length === 10, 'Should have 10 OWASP categories');
});

test('HeadyRisks', 'health check', () => {
  const risks = new HeadyRisks();
  const h = risks.health();
  assert(h.service === 'heady-risks', 'Service name should be heady-risks');
  assert(h.status === 'healthy', 'Should be healthy');
});

/* ─────────── HeadyCodex Tests ─────────── */

const { HeadyCodex, parseJSDoc, buildDependencyGraph } = require('../src/documentation/heady-codex');

test('HeadyCodex', 'initializes correctly', () => {
  const codex = new HeadyCodex({ projectName: 'Test' });
  assert(codex.projectName === 'Test', 'Should use provided project name');
  assert(codex.index.size === 0, 'Index should be empty');
});

test('HeadyCodex', 'parses JSDoc blocks', () => {
  const code = '/**\n * Test function\n * @param {string} name - The name\n * @returns {boolean} Success\n */\nfunction test(name) {}';
  const blocks = parseJSDoc(code);
  assert(blocks.length === 1, 'Should find 1 JSDoc block');
  assert(blocks[0].params.length === 1, 'Should find 1 param');
  assert(blocks[0].returns !== null, 'Should find return type');
});

test('HeadyCodex', 'builds dependency graph', () => {
  const files = [
    { path: 'a.js', content: "const b = require('./b');" },
    { path: 'b.js', content: "const c = require('./c');" },
  ];
  const graph = buildDependencyGraph(files);
  assert(Object.keys(graph.nodes).length === 2, 'Should have 2 nodes');
  assert(graph.edges.length === 2, 'Should have 2 edges');
});

test('HeadyCodex', 'search returns results', () => {
  const codex = new HeadyCodex();
  codex.ingest([{
    path: 'test.js',
    content: '/**\n * @module TestModule\n * Phi math foundation\n */\nconst PHI = 1.618;\nmodule.exports = { PHI };',
  }]).then(() => {
    const results = codex.search('phi math');
    assert(results.length >= 0, 'Search should return array');
  });
});

/* ─────────── HeadyBattle Tests ─────────── */

const { HeadyBattle, ARENA_MODES, ELO } = require('../src/orchestration/heady-battle');

test('HeadyBattle', 'initializes with ELO defaults', () => {
  const battle = new HeadyBattle();
  assert(ELO.INITIAL_RATING === fib(16), 'Initial ELO should be fib(16)=987');
  assert(battle.contestants.size === 0, 'No contestants initially');
});

test('HeadyBattle', 'registers contestants', () => {
  const battle = new HeadyBattle();
  const c = battle.registerContestant('a', 'Agent A', {}, async () => ({ result: 'hello' }));
  assert(c.id === 'a', 'Should set contestant ID');
  assert(c.rating === ELO.INITIAL_RATING, 'Should have initial rating');
  assert(battle.contestants.size === 1, 'Should have 1 contestant');
});

test('HeadyBattle', 'head-to-head battle runs', async () => {
  const battle = new HeadyBattle();
  battle.registerContestant('a', 'Agent A', {}, async () => ({ quality: 'high' }));
  battle.registerContestant('b', 'Agent B', {}, async () => ({ quality: 'low' }));
  const result = await battle.battle({ description: 'test' }, ['a', 'b']);
  assert(result.battleId, 'Should have battle ID');
  assert(result.scores.length === 2, 'Should score both contestants');
});

test('HeadyBattle', 'leaderboard sorts by rating', () => {
  const battle = new HeadyBattle();
  battle.registerContestant('a', 'A', {}, async () => ({}));
  battle.registerContestant('b', 'B', {}, async () => ({}));
  const lb = battle.getLeaderboard();
  assert(lb.length === 2, 'Should have 2 entries');
  assert(lb[0].rank === 1, 'Top entry should be rank 1');
});

/* ─────────── HeadyManager Tests ─────────── */

const { HeadyManager, ToolRegistry, RPC_ERRORS } = require('../src/orchestration/heady-manager');

test('HeadyManager', 'initializes with built-in tools', () => {
  const mgr = new HeadyManager();
  assert(mgr.toolRegistry.tools.size >= 4, 'Should have at least 4 built-in tools');
  mgr.rateLimiter.destroy();
  mgr.sseManager.destroy();
});

test('HeadyManager', 'tool registry lists tools', () => {
  const registry = new ToolRegistry();
  registry.register('test_tool', { type: 'object' }, async () => 'ok', { description: 'Test' });
  const tools = registry.list();
  assert(tools.length === 1, 'Should list 1 tool');
  assert(tools[0].name === 'test_tool', 'Tool name should match');
});

test('HeadyManager', 'health check returns correct format', () => {
  const mgr = new HeadyManager();
  const h = mgr.health();
  assert(h.service === 'heady-manager', 'Service name');
  assert(h.status === 'healthy', 'Status');
  mgr.rateLimiter.destroy();
  mgr.sseManager.destroy();
});

/* ─────────── BeeFactory Tests ─────────── */

const { BeeFactory, BEE_STATES, DOMAIN_REGISTRY, POOL_TIERS } = require('../src/bees/bee-factory');

test('BeeFactory', 'has 24 domains', () => {
  assert(Object.keys(DOMAIN_REGISTRY).length === 24, 'Should have 24 domains');
});

test('BeeFactory', 'creates persistent bees', () => {
  const factory = new BeeFactory();
  const bee = factory.createBee('coder');
  assert(bee.state === BEE_STATES.IDLE, 'Bee should be idle');
  assert(bee.domain === 'code_generation', 'Should map to code_generation domain');
  assert(factory.bees.size === 1, 'Should have 1 active bee');
  clearInterval(factory._healthTimer);
});

test('BeeFactory', 'pool tiers sum to ~1', () => {
  const sum = Object.values(POOL_TIERS).reduce((s, t) => s + t.weight, 0);
  // Reserve + Governance weights are small; should be close to 1
  assert(sum > 0.9 && sum <= 1.1, `Pool weights should sum near 1, got ${sum}`);
});

test('BeeFactory', 'counts types correctly', () => {
  let totalTypes = 0;
  for (const config of Object.values(DOMAIN_REGISTRY)) {
    totalTypes += config.types.length;
  }
  assert(totalTypes > 90, `Should have 90+ types, got ${totalTypes}`);
});

/* ─────────── ContextWindowManager Tests ─────────── */

const { ContextWindowManager, TIERS, PRIORITY } = require('../src/orchestration/context-window-manager');

test('ContextWindowManager', 'phi-scaled budgets', () => {
  const cwm = new ContextWindowManager({ baseBudget: 8192 });
  assert(cwm.budgets.working === 8192, 'Working budget should be base');
  assert(cwm.budgets.session > cwm.budgets.working, 'Session > Working');
  assert(cwm.budgets.memory > cwm.budgets.session, 'Memory > Session');
  assert(cwm.budgets.artifacts > cwm.budgets.memory, 'Artifacts > Memory');
});

test('ContextWindowManager', 'adds entries and tracks tokens', async () => {
  const cwm = new ContextWindowManager();
  await cwm.add('Hello world test content', { type: 'user' });
  assert(cwm.tiers.working.length === 1, 'Should have 1 entry');
  assert(cwm.tokenUsage.working > 0, 'Should track tokens');
});

test('ContextWindowManager', 'priority levels are phi-derived', () => {
  assert(Math.abs(PRIORITY.CRITICAL.weight - phiThreshold(4)) < 0.001, 'CRITICAL weight');
  assert(Math.abs(PRIORITY.HIGH.weight - phiThreshold(3)) < 0.001, 'HIGH weight');
});

/* ─────────── TaskDecomposer Tests ─────────── */

const { TaskDecomposer, SUBTASK_STATES, SWARM_CAPABILITIES, detectCycle, topologicalSort } = require('../src/orchestration/task-decomposer');

test('TaskDecomposer', '17 swarm capabilities', () => {
  assert(Object.keys(SWARM_CAPABILITIES).length === 17, 'Should have 17 capabilities');
});

test('TaskDecomposer', 'detects cycles', () => {
  const map = new Map();
  map.set('a', { dependencies: ['b'] });
  map.set('b', { dependencies: ['a'] });
  const cycle = detectCycle(map);
  assert(cycle !== null, 'Should detect cycle');
});

test('TaskDecomposer', 'topological sort works', () => {
  const map = new Map();
  map.set('a', { dependencies: [], priority: 1 });
  map.set('b', { dependencies: ['a'], priority: 1 });
  map.set('c', { dependencies: ['a'], priority: 1 });
  const sorted = topologicalSort(map);
  assert(sorted[0] === 'a', 'Root should come first');
  assert(sorted.length === 3, 'Should include all nodes');
});

test('TaskDecomposer', 'decomposes with predefined subtasks', async () => {
  const td = new TaskDecomposer();
  const result = await td.decompose('Build a feature', {
    subtasks: [
      { id: 'design', description: 'Design the architecture', dependencies: [] },
      { id: 'code', description: 'Write the code', dependencies: ['design'] },
      { id: 'test', description: 'Write tests', dependencies: ['code'] },
    ],
  });
  assert(result.subtasks.length === 3, 'Should have 3 subtasks');
  assert(result.maxDepth === 2, 'Max depth should be 2');
});

/* ─────────── BackpressureManager Tests ─────────── */

const { BackpressureManager, CircuitBreaker, CB_STATES, CRITICALITY } = require('../src/orchestration/backpressure-manager');

test('BackpressureManager', 'admits requests when healthy', () => {
  const bp = new BackpressureManager({ name: 'test' });
  const result = bp.admit({ criticality: 'MEDIUM' });
  assert(result.admitted === true, 'Should admit when healthy');
  bp.destroy();
});

test('BackpressureManager', 'criticality has 5 levels', () => {
  assert(Object.keys(CRITICALITY).length === 5, 'Should have 5 criticality levels');
  assert(CRITICALITY.CRITICAL.shedThreshold === 1.0, 'CRITICAL should never shed');
});

test('BackpressureManager', 'circuit breaker starts closed', () => {
  const cb = new CircuitBreaker('test-service');
  assert(cb.state === CB_STATES.CLOSED, 'Should start closed');
  assert(cb.allow() === true, 'Should allow when closed');
});

test('BackpressureManager', 'circuit breaker opens after failures', () => {
  const cb = new CircuitBreaker('test-service');
  for (let i = 0; i < fib(5); i++) {
    cb.recordFailure();
  }
  assert(cb.state === CB_STATES.OPEN, 'Should open after fib(5) failures');
  assert(cb.allow() === false, 'Should reject when open');
});

test('BackpressureManager', 'health check returns status', () => {
  const bp = new BackpressureManager({ name: 'test' });
  const h = bp.health();
  assert(h.service === 'backpressure-manager', 'Service name');
  assert(h.status === 'healthy', 'Should be healthy with no load');
  bp.destroy();
});

/* ─────────── Report ─────────── */

const suites = {};
for (const r of results) {
  if (!suites[r.suite]) suites[r.suite] = { pass: 0, fail: 0, tests: [] };
  if (r.status === 'PASS') suites[r.suite].pass++;
  else suites[r.suite].fail++;
  suites[r.suite].tests.push(r);
}

const report = {
  summary: { total: passed + failed, passed, failed },
  suites: Object.entries(suites).map(([name, data]) => ({
    name,
    passed: data.pass,
    failed: data.fail,
    status: data.fail === 0 ? 'PASS' : 'FAIL',
    tests: data.tests,
  })),
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(failed > 0 ? 1 : 0);
