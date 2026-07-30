// HEADY_BRAND:BEGIN
// FILE: scripts/pre_projection_gate.js
// LAYER: tools/orchestration
// HEADY_BRAND:END

/**
 * PRE-PROJECTION GATE (Zero-Defect Protocol)
 * Orchestrates:
 * 1. JULES Static Analysis (checking for eval, unused imports, long funcs).
 * 2. Jest Unit & Integration Test Suite.
 * 3. HCFullPipeline Dry-Run Simulation.
 * If any gate fails, AlohaProtocol blocks the projection by asserting stabilityDiagnosticMode.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('../src/hc_pipeline');
const { AINodeManager } = require('../src/hc_ai_nodes');
const { runAgentUpstreamScan } = require('./agent_scanner');

// Normally we'd fetch this via API, but we'll instantiate it for pre-commit context
const nodeManager = new AINodeManager();

async function runAgentScan() {
  console.log('\n--- 0. UPSTREAM AGENT SCAN ---');
  const result = runAgentUpstreamScan();
  result.findings.forEach(f => console.log(`  ${f}`));
  if (!result.passed) {
    throw new Error(`Upstream Agent Scan Blocked Projection: ${result.blocker}`);
  }
  console.log(`✅ Agent upstream is clear.`);
}

async function runStaticAnalysis(files) {
  console.log('--- 1. STATIC ANALYSIS (JULES) ---');
  let highSeverityErrors = 0;

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.py')) continue;
    
    console.log(`Checking ${file}...`);
    const result = await nodeManager.executeOnNode('jules', { file: path.join(__dirname, '..', file) });
    
    if (result.findings && result.findings.length > 0) {
      for (const finding of result.findings) {
        if (finding.severity === 'high') {
          console.error(`  [HIGH] ${finding.type}: ${finding.detail}`);
          highSeverityErrors++;
        } else {
          console.warn(`  [${finding.severity.toUpperCase()}] ${finding.type}: ${finding.detail || finding.variable}`);
        }
      }
    }
  }

  if (highSeverityErrors > 0) {
    throw new Error(`JULES blocked projection: ${highSeverityErrors} high-severity issues found.`);
  }
  console.log('✅ Static analysis passed.');
}

function runTests() {
  console.log('\n--- 2. TEST SUITES (Jest) ---');
  try {
    execSync('npm test', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Unit and Integration tests passed.');
  } catch (err) {
    throw new Error('Test suite execution failed.');
  }
}

async function runSimulation() {
  console.log('\n--- 3. DRY-RUN SIMULATION (HCFullPipeline) ---');
  try {
    const state = await pipeline.run({ simulate: true });
    const metrics = state.metrics;
    console.log(`Pipeline Simulated Tasks: ${metrics.completedTasks} completed, ${metrics.failedTasks} failed.`);
    
    if (metrics.failedTasks > 0) {
      throw new Error(`Dry-Run failed: ${metrics.failedTasks} tasks threw errors in simulation.`);
    }
    console.log('✅ Dry-Run simulation passed.');
  } catch (err) {
    throw new Error(`Simulation engine error: ${err.message}`);
  }
}

function enforceAlohaProtocol(errorMsg) {
  console.error('\n❌ ZERO-DEFECT PROTOCOL FAILED ❌');
  console.error(errorMsg);
  console.error('\n⚠️ INIT ALOHA PROTOCOL: Asserting stabilityDiagnosticMode ⚠️');
  // Edit the aloha-protocol.yaml via string replace to force stability mode across the network
  const alohaPath = path.join(__dirname, '..', 'configs', 'aloha-protocol.yaml');
  if (fs.existsSync(alohaPath)) {
    let content = fs.readFileSync(alohaPath, 'utf8');
    content = content.replace(/stabilityDiagnosticMode:\s*false/, 'stabilityDiagnosticMode: true');
    fs.writeFileSync(alohaPath, content, 'utf8');
    console.error('All APIs and projections are now temporarily locked out until fixed (Aloha Safety Primary).');
  }
  process.exit(1);
}

async function main() {
  console.log('🚀 INITIATING ZERO-DEFECT PRE-PROJECTION GATE...');
  try {
    // Collect modified files. In a real environment, this might come from git diff.
    // For now we test a few core files as a sample, plus our intentionally vulnerable file.
    const filesToCheck = ['src/bad_code.js'];
    
    await runAgentScan();
    await runStaticAnalysis(filesToCheck);
    runTests();
    await runSimulation();
    
    console.log('\n🎉 ALL GATES PASSED. PROJECTION AUTHORIZED. 🎉');
  } catch (err) {
    enforceAlohaProtocol(err.message);
  }
}

main();
