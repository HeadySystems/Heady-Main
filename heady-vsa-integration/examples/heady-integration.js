const pino = require('pino');
const logger = pino();
/**
 * @fileoverview Complete Heady™ Integration Example
 * @description Shows VSA integration with Heady™ orchestration system
 */

const { VSACodebook } = require('../src/vsa/codebook');
const { VSASemanticGates } = require('../src/vsa/vsa-csl-bridge');
const { Hypervector } = require('../src/vsa/hypervector');

logger.info('=== Heady VSA Full Integration Example ===\n');

// 1. Initialize Heady™ Codebook
logger.info('1. Initializing Heady Semantic Codebook...');
const codebook = VSACodebook.createHeadyCodebook(4096);

// Add domain-specific concepts
const additionalConcepts = [
  'TASK', 'HIGH_PRIORITY', 'LOW_PRIORITY',
  'EXECUTE', 'QUEUE', 'REJECT',
  'DATABASE', 'API', 'COMPUTE',
  'SUCCESS', 'FAILURE', 'PENDING'
];

for (const concept of additionalConcepts) {
  codebook.add(concept, null, { type: 'atomic', domain: 'orchestration' });
}

logger.info(`   Codebook now has ${codebook.concepts.size} concepts\n`);

// 2. Create Semantic Gates
logger.info('2. Creating VSA Semantic Gates...');
const gates = new VSASemanticGates(codebook);
logger.info('   ✅ Gates ready\n');

// 3. Simulate Task Orchestration
logger.info('3. Task Orchestration Simulation\n');

class Task {
  constructor(id, type, priority, confidence, load) {
    this.id = id;
    this.type = type;
    this.priority = priority;
    this.confidence = confidence;
    this.load = load;
  }

  toHypervector(codebook, gates) {
    // Convert task properties to semantic concepts
    const concepts = ['TASK'];

    if (this.type === 'database') concepts.push('DATABASE');
    else if (this.type === 'api') concepts.push('API');
    else if (this.type === 'compute') concepts.push('COMPUTE');

    if (this.priority > 0.7) concepts.push('HIGH_PRIORITY');
    else concepts.push('LOW_PRIORITY');

    // Bundle into task vector
    return gates.superposition_gate(...concepts);
  }
}

// Create test tasks
const tasks = [
  new Task('T1', 'database', 0.9, 0.85, 0.3),
  new Task('T2', 'api', 0.5, 0.6, 0.8),
  new Task('T3', 'compute', 0.8, 0.9, 0.2)
];

logger.info('   Created tasks:');
for (const task of tasks) {
  logger.info(`   - ${task.id}: ${task.type}, priority=${task.priority}, confidence=${task.confidence}, load=${task.load}`);
}
logger.info();

// 4. Orchestration Decision (NO if/else!)
logger.info('4. Making orchestration decisions (continuous logic)...\n');

for (const task of tasks) {
  logger.info(`   Task ${task.id}:`);

  // Convert to hypervector
  const taskVec = task.toHypervector(codebook, gates);

  // Continuous decision gates
  const confGate = gates.soft_gate(task.confidence, 0.8, 10);
  const prioGate = gates.soft_gate(task.priority, 0.7, 10);
  const loadGate = gates.soft_gate(1 - task.load, 0.5, 10);

  // Decision scores (all computed simultaneously)
  const executeNow = gates.continuous_and(confGate, gates.continuous_and(prioGate, loadGate));
  const executeLater = gates.continuous_and(confGate, gates.continuous_and(prioGate, gates.continuous_not(loadGate)));
  const queueScore = gates.continuous_and(confGate, gates.continuous_not(prioGate));
  const rejectScore = gates.continuous_not(confGate);

  logger.info(`      Confidence gate: ${confGate.toFixed(4)}`);
  logger.info(`      Priority gate: ${prioGate.toFixed(4)}`);
  logger.info(`      Load gate: ${loadGate.toFixed(4)}`);
  logger.info(`      Decision scores:`);
  logger.info(`        - Execute now: ${executeNow.toFixed(4)}`);
  logger.info(`        - Execute later: ${executeLater.toFixed(4)}`);
  logger.info(`        - Queue: ${queueScore.toFixed(4)}`);
  logger.info(`        - Reject: ${rejectScore.toFixed(4)}`);

  // Select highest score
  const decisions = {
    'EXECUTE_NOW': executeNow,
    'EXECUTE_LATER': executeLater,
    'QUEUE': queueScore,
    'REJECT': rejectScore
  };

  const bestDecision = Object.entries(decisions).reduce((best, curr) => 
    curr[1] > best[1] ? curr : best
  );

  logger.info(`      → Decision: ${bestDecision[0]} (score: ${bestDecision[1].toFixed(4)})\n`);
}

// 5. Agent Matching via Resonance
logger.info('5. Agent matching via semantic resonance...\n');

// Define agent specializations
const agents = [
  { name: 'DatabaseAgent', concepts: ['DATABASE', 'HEADY', 'AGENT'] },
  { name: 'APIAgent', concepts: ['API', 'HEADY', 'AGENT'] },
  { name: 'ComputeAgent', concepts: ['COMPUTE', 'HEADY', 'AGENT'] }
];

// Create agent hypervectors
for (const agent of agents) {
  const agentVec = gates.superposition_gate(...agent.concepts);
  codebook.add(agent.name, agentVec, { type: 'agent', domain: 'heady_agents' });
}

// Match tasks to agents
for (const task of tasks) {
  const taskVec = task.toHypervector(codebook, gates);

  logger.info(`   Task ${task.id} (${task.type}):`);

  // Query for best agent match
  const matches = gates.query_gate(taskVec, 0.3, 3);

  for (const match of matches) {
    if (match.metadata && match.metadata.type === 'agent') {
      logger.info(`      - ${match.name}: ${match.similarity.toFixed(4)}`);
    }
  }
  logger.info();
}

// 6. State Tracking with Phi-Scales
logger.info('6. State tracking with phi-scale values...\n');

const systemState = gates.superposition_gate('HEADY', 'ORCHESTRATOR', 'SEMANTIC');
const phiValue = systemState.toPhiScale();
const truthValue = systemState.toTruthValue();

logger.info(`   System state hypervector:`);
logger.info(`   - Phi-scale value: ${phiValue.toFixed(4)} (range: [0, ${((1 + Math.sqrt(5)) / 2).toFixed(4)}])`);
logger.info(`   - Truth value: ${truthValue.toFixed(4)} (range: [0, 1])`);
logger.info(`   - Dimensionality: ${systemState.dimensionality}\n`);

// 7. Performance Stats
logger.info('7. Performance statistics...\n');
logger.info(codebook.stats());

logger.info('\n=== Integration Example Complete ===');
logger.info('\n✨ Key Takeaways:');
logger.info('   • No if/else statements used in decision logic');
logger.info('   • All decisions computed continuously');
logger.info('   • Semantic matching via hypervector resonance');
logger.info('   • Phi-scale integration for continuous values');
logger.info('   • Instant pattern recognition via codebook queries');
