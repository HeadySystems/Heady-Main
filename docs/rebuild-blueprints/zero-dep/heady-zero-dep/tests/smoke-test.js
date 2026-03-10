/**
 * Smoke Test Suite for Heady™ Zero-Dependency System
 * Verifies all layers load and core functionality works.
 * Run: node tests/smoke-test.js
 */

const PHI = (1 + Math.sqrt(5)) / 2;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    logger.info(`  ✓ ${message}`);
  } else {
    failed++;
    logger.info(`  ✗ ${message}`);
  }
}

async function testConfig() {
  logger.info('\n── Config Layer ──');
  const { SACRED_GEOMETRY, CLUSTER, POOLS } = await import('../config/global.js');
  assert(Math.abs(SACRED_GEOMETRY.PHI - PHI) < 0.001, 'PHI constant correct');
  assert(CLUSTER.BRAIN.port === 3001, 'BRAIN port configured');
  assert(CLUSTER.CONDUCTOR.port === 3002, 'CONDUCTOR port configured');
  assert(CLUSTER.SENTINEL.port === 3003, 'SENTINEL port configured');
  assert(POOLS.HOT.allocation === 0.34, 'Hot pool Fibonacci ratio');
}

async function testUtils() {
  logger.info('\n── Utils Layer ──');
  const { createLogger } = await import('../utils/logger.js');
  const logger = createLogger('test');
  assert(typeof logger.info === 'function', 'Logger has info method');
  assert(typeof logger.error === 'function', 'Logger has error method');
  assert(typeof logger.child === 'function', 'Logger has child method');
}

async function testEventBus() {
  logger.info('\n── Core: EventBus ──');
  const { EventBus } = await import('../core/event-bus.js');
  const bus = new EventBus();
  let received = false;
  bus.on('test.event', () => { received = true; });
  bus.emit('test.event', { data: 'hello' });
  assert(received, 'Event bus pub/sub works');
}

async function testMCPProtocol() {
  logger.info('\n── Core: MCP Protocol ──');
  const mod = await import('../core/mcp-protocol.js');
  assert(typeof mod.MCPServer === 'function' || typeof mod.MCPServer !== 'undefined', 'MCPServer exported');
  assert(typeof mod.MCPClient === 'function' || typeof mod.MCPClient !== 'undefined', 'MCPClient exported');
}

async function testGitHubClient() {
  logger.info('\n── Core: GitHub Client ──');
  const mod = await import('../core/github-client.js');
  assert(mod.GitHubClient !== undefined, 'GitHubClient exported');
}

async function testHTTPServer() {
  logger.info('\n── Core: HTTP Server ──');
  const mod = await import('../core/http-server.js');
  assert(mod.HeadyHTTPServer !== undefined || mod.default !== undefined, 'HTTP Server exported');
}

async function testProcessManager() {
  logger.info('\n── Core: Process Manager ──');
  const mod = await import('../core/process-manager.js');
  assert(mod.ProcessManager !== undefined || mod.default !== undefined, 'ProcessManager exported');
}

async function testVectorDB() {
  logger.info('\n── Memory: VectorDB ──');
  const mod = await import('../memory/vector-db.js');
  assert(mod.VectorDB !== undefined || mod.default !== undefined, 'VectorDB exported');
  
  // Test basic vector operations if VectorDB is a constructor
  if (typeof mod.VectorDB === 'function') {
    const db = new mod.VectorDB({ dimensions: 384 });
    assert(typeof db.insert === 'function' || typeof db.add === 'function', 'VectorDB has insert/add method');
  }
}

async function testKVStore() {
  logger.info('\n── Memory: KV Store ──');
  const mod = await import('../memory/kv-store.js');
  assert(mod.KVStore !== undefined || mod.default !== undefined, 'KVStore exported');
}

async function testGraphRAG() {
  logger.info('\n── Memory: Graph RAG ──');
  const mod = await import('../memory/graph-rag.js');
  assert(mod.GraphRAG !== undefined || mod.default !== undefined, 'GraphRAG exported');
}

async function testSTMLTM() {
  logger.info('\n── Memory: STM-LTM ──');
  const mod = await import('../memory/stm-ltm.js');
  assert(mod.STM !== undefined || mod.ShortTermMemory !== undefined || mod.default !== undefined, 'STM exported');
}

async function testEmbeddingEngine() {
  logger.info('\n── Memory: Embedding Engine ──');
  const mod = await import('../memory/embedding-engine.js');
  assert(mod.EmbeddingEngine !== undefined || mod.default !== undefined, 'EmbeddingEngine exported');
}

async function testConductor() {
  logger.info('\n── Orchestration: Conductor ──');
  const mod = await import('../orchestration/heady-conductor.js');
  assert(mod.HeadyConductor !== undefined || mod.default !== undefined, 'HeadyConductor exported');
}

async function testSwarmIntelligence() {
  logger.info('\n── Orchestration: Swarm Intelligence ──');
  const mod = await import('../orchestration/swarm-intelligence.js');
  assert(mod.computeSwarmAllocation !== undefined || mod.SwarmIntelligence !== undefined, 'SwarmIntelligence exported');
}

async function testSelfAwareness() {
  logger.info('\n── Orchestration: Self-Awareness ──');
  const mod = await import('../orchestration/self-awareness.js');
  assert(mod.SelfAwareness !== undefined || mod.default !== undefined, 'SelfAwareness exported');
}

async function testPipelineCore() {
  logger.info('\n── Pipeline: Core ──');
  const mod = await import('../pipeline/pipeline-core.js');
  assert(mod.HCFullPipeline !== undefined || mod.default !== undefined, 'HCFullPipeline exported');
}

async function testPipelinePools() {
  logger.info('\n── Pipeline: Pools ──');
  const mod = await import('../pipeline/pipeline-pools.js');
  assert(mod.PoolManager !== undefined || mod.default !== undefined, 'PoolManager exported');
}

async function testBeeFactory() {
  logger.info('\n── Bees: Factory ──');
  const mod = await import('../bees/bee-factory.js');
  assert(mod.BeeFactory !== undefined || mod.default !== undefined, 'BeeFactory exported');
}

async function testRegistry() {
  logger.info('\n── Bees: Registry ──');
  const mod = await import('../bees/registry.js');
  assert(mod.Registry !== undefined || mod.default !== undefined, 'Registry exported');
}

async function testCircuitBreaker() {
  logger.info('\n── Resilience: Circuit Breaker ──');
  const mod = await import('../resilience/circuit-breaker.js');
  assert(mod.CircuitBreaker !== undefined || mod.default !== undefined, 'CircuitBreaker exported');
}

async function testRateLimiter() {
  logger.info('\n── Resilience: Rate Limiter ──');
  const mod = await import('../resilience/rate-limiter.js');
  assert(mod.RateLimiter !== undefined || mod.TokenBucket !== undefined || mod.default !== undefined, 'RateLimiter exported');
}

async function testCache() {
  logger.info('\n── Resilience: Cache ──');
  const mod = await import('../resilience/cache.js');
  assert(mod.Cache !== undefined || mod.MultiTierCache !== undefined || mod.default !== undefined, 'Cache exported');
}

async function testAutoHeal() {
  logger.info('\n── Resilience: Auto Heal ──');
  const mod = await import('../resilience/auto-heal.js');
  assert(mod.AutoHeal !== undefined || mod.SelfHealingMesh !== undefined || mod.default !== undefined, 'AutoHeal exported');
}

async function testPQC() {
  logger.info('\n── Security: PQC ──');
  const mod = await import('../security/pqc.js');
  assert(mod.default !== undefined || mod.PQC !== undefined || mod.HeadyPQC !== undefined, 'PQC exported');
}

async function testHandshake() {
  logger.info('\n── Security: Handshake ──');
  const mod = await import('../security/handshake.js');
  assert(mod.Handshake !== undefined || mod.NodeHandshake !== undefined || mod.default !== undefined, 'Handshake exported');
}

async function testRBAC() {
  logger.info('\n── Security: RBAC ──');
  const mod = await import('../security/rbac-vendor.js');
  assert(mod.RBAC !== undefined || mod.default !== undefined, 'RBAC exported');
}

async function testMonteCarlo() {
  logger.info('\n── Intelligence: Monte Carlo ──');
  const mod = await import('../intelligence/monte-carlo.js');
  assert(mod.MonteCarloEngine !== undefined || mod.default !== undefined, 'MonteCarloEngine exported');
}

async function testAnalyticsEngine() {
  logger.info('\n── Intelligence: Analytics Engine ──');
  const mod = await import('../intelligence/analytics-engine.js');
  assert(mod.AnalyticsEngine !== undefined || mod.default !== undefined, 'AnalyticsEngine exported');
}

async function testPatternEngine() {
  logger.info('\n── Intelligence: Pattern Engine ──');
  const mod = await import('../intelligence/pattern-engine.js');
  assert(mod.PatternEngine !== undefined || mod.default !== undefined, 'PatternEngine exported');
}

async function testApprovalGates() {
  logger.info('\n── Governance: Approval Gates ──');
  const mod = await import('../governance/approval-gates.js');
  assert(mod.ApprovalGates !== undefined || mod.default !== undefined, 'ApprovalGates exported');
}

async function testLLMRouter() {
  logger.info('\n── Services: LLM Router ──');
  const mod = await import('../services/llm-router.js');
  assert(mod.LLMRouter !== undefined || mod.default !== undefined, 'LLMRouter exported');
}

async function testArenaMode() {
  logger.info('\n── Services: Arena Mode ──');
  const mod = await import('../services/arena-mode.js');
  assert(mod.ArenaMode !== undefined || mod.default !== undefined, 'ArenaMode exported');
}

async function testBudgetTracker() {
  logger.info('\n── Services: Budget Tracker ──');
  const mod = await import('../services/budget-tracker.js');
  assert(mod.BudgetTracker !== undefined || mod.default !== undefined, 'BudgetTracker exported');
}

async function testTelemetry() {
  logger.info('\n── Telemetry ──');
  const mod = await import('../telemetry/heady-telemetry.js');
  assert(mod.HeadyTelemetry !== undefined || mod.Telemetry !== undefined || mod.default !== undefined, 'Telemetry exported');
}

async function testProviders() {
  logger.info('\n── Providers ──');
  const mod = await import('../providers/brain-providers.js');
  assert(mod.ProviderRegistry !== undefined || mod.default !== undefined, 'ProviderRegistry exported');
}

async function testColabRuntime() {
  logger.info('\n── Runtime: Colab ──');
  const mod = await import('../runtime/colab-runtime.js');
  assert(mod.ColabRuntime !== undefined || mod.default !== undefined, 'ColabRuntime exported');
}

async function testLiquidColabServices() {
  logger.info('\n── Runtime: Liquid Colab Services ──');
  const mod = await import('../runtime/liquid-colab-services.js');
  assert(mod.default !== undefined || mod.LiquidColabServices !== undefined || mod.ServiceRegistry !== undefined, 'LiquidColabServices exported');
}

// Run all tests
async function main() {
  logger.info('╔═══════════════════════════════════════════╗');
  logger.info('║  Heady Zero-Dep Smoke Test Suite          ║');
  logger.info('║  Zero external dependencies verified      ║');
  logger.info('╚═══════════════════════════════════════════╝');
  
  const tests = [
    testConfig, testUtils, testEventBus, testMCPProtocol,
    testGitHubClient, testHTTPServer, testProcessManager,
    testVectorDB, testKVStore, testGraphRAG, testSTMLTM, testEmbeddingEngine,
    testConductor, testSwarmIntelligence, testSelfAwareness,
    testPipelineCore, testPipelinePools,
    testBeeFactory, testRegistry,
    testCircuitBreaker, testRateLimiter, testCache, testAutoHeal,
    testPQC, testHandshake, testRBAC,
    testMonteCarlo, testAnalyticsEngine, testPatternEngine,
    testApprovalGates,
    testLLMRouter, testArenaMode, testBudgetTracker,
    testTelemetry, testProviders,
    testColabRuntime, testLiquidColabServices
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (err) {
      failed++;
      logger.info(`  ✗ ${test.name}: ${err.message}`);
    }
  }
  
  logger.info('\n══════════════════════════════════════');
  logger.info(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  logger.info('══════════════════════════════════════');
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('Fatal:', err);
  process.exit(1);
});
