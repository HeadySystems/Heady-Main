const pino = require('pino');
const logger = pino();
/**
 * @fileoverview CSL Script Execution Example
 * @description Shows how to execute continuous semantic logic scripts
 */

const { VSACodebook } = require('../src/vsa/codebook');
const { VSASemanticGates, CSLInterpreter } = require('../src/vsa/vsa-csl-bridge');

logger.info('=== Heady CSL Script Execution Example ===\n');

// Create Heady™ codebook
const codebook = VSACodebook.createHeadyCodebook(4096);
logger.info(`Loaded Heady codebook with ${codebook.concepts.size} concepts\n`);

// Create semantic gates
const gates = new VSASemanticGates(codebook);

// Example 1: Direct gate usage (no traditional if/else!)
logger.info('1. Direct semantic gate usage:');
logger.info('   Traditional: if (a && b) { ... }');
logger.info('   VSA/CSL: continuous_and(a, b)\n');

const confidence = 0.8;
const priority = 0.7;
const traditional_result = (confidence > 0.7 && priority > 0.6) ? 1 : 0;
const continuous_result = gates.continuous_and(
  gates.soft_gate(confidence, 0.7, 10),
  gates.soft_gate(priority, 0.6, 10)
);

logger.info(`   Traditional result: ${traditional_result}`);
logger.info(`   Continuous result: ${continuous_result.toFixed(4)}\n`);

// Example 2: Resonance-based decisions
logger.info('2. Resonance-based semantic matching:');
const resonance1 = gates.resonance_gate('HEADY', 'AGENT');
const resonance2 = gates.resonance_gate('RESONANCE_GATE', 'SOFT_GATE');
const resonance3 = gates.resonance_gate('HEADY', 'PHI');

logger.info(`   HEADY <-> AGENT: ${resonance1.toFixed(4)}`);
logger.info(`   RESONANCE_GATE <-> SOFT_GATE: ${resonance2.toFixed(4)}`);
logger.info(`   HEADY <-> PHI: ${resonance3.toFixed(4)}\n`);

// Example 3: CSL Script execution
logger.info('3. Executing CSL script:\n');

const cslScript = `# Task decision logic
@input_state = superposition_gate(HEADY, SEMANTIC, AGENT)
@gate_resonance = resonance_gate($input_state, RESONANCE_GATE)
@activation = soft_gate($gate_resonance, 0.618, 10)
@decision = continuous_and($activation, 0.85)
`;

logger.info('Script:');
logger.info(cslScript);

const interpreter = new CSLInterpreter(gates);
interpreter.execute(cslScript);

const inputState = interpreter.getVariable('input_state');
const gateResonance = interpreter.getVariable('gate_resonance');
const activation = interpreter.getVariable('activation');
const decision = interpreter.getVariable('decision');

logger.info('Results:');
logger.info(`   input_state: ${inputState?.toString() || 'N/A'}`);
logger.info(`   gate_resonance: ${gateResonance?.toFixed(4) || 'N/A'}`);
logger.info(`   activation: ${activation?.toFixed(4) || 'N/A'}`);
logger.info(`   decision: ${decision?.toFixed(4) || 'N/A'}\n`);

// Example 4: Multi-gate orchestration
logger.info('4. Multi-gate orchestration (no if/else cascades!):');

// Traditional nested ifs
function traditionalDecision(conf, prio, load) {
  if (conf > 0.8) {
    if (prio === 'high') {
      if (load < 0.5) {
        return 'execute_now';
      } else {
        return 'execute_later';
      }
    } else {
      return 'queue';
    }
  } else {
    return 'reject';
  }
}

// VSA continuous version
function continuousDecision(conf, prio, load) {
  const confGate = gates.soft_gate(conf, 0.8, 10);
  const prioGate = gates.soft_gate(prio, 0.7, 10);
  const loadGate = gates.soft_gate(1 - load, 0.5, 10);

  const executeNow = gates.continuous_and(confGate, gates.continuous_and(prioGate, loadGate));
  const executeLater = gates.continuous_and(confGate, gates.continuous_and(prioGate, gates.continuous_not(loadGate)));
  const queue = gates.continuous_and(confGate, gates.continuous_not(prioGate));
  const reject = gates.continuous_not(confGate);

  return {
    execute_now: executeNow,
    execute_later: executeLater,
    queue: queue,
    reject: reject
  };
}

const testCase = { conf: 0.85, prio: 0.9, load: 0.3 };
const tradResult = traditionalDecision(testCase.conf, testCase.prio, testCase.load > 0.5 ? 'low' : 'high');
const contResult = continuousDecision(testCase.conf, testCase.prio, testCase.load);

logger.info(`   Input: confidence=${testCase.conf}, priority=${testCase.prio}, load=${testCase.load}`);
logger.info(`   Traditional: ${tradResult}`);
logger.info(`   Continuous:`);
for (const [action, score] of Object.entries(contResult)) {
  logger.info(`      ${action}: ${score.toFixed(4)}`);
}

logger.info('\n=== Example Complete ===');
