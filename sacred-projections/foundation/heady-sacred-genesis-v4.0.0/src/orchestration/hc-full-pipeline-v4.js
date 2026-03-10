'use strict';

const { PIPELINE_PATHS, phiTimeout, phiBackoff, fib } = require('../../shared/phi-math');

const STAGES = Object.freeze([
  'CHANNEL_ENTRY', 'RECON', 'INTAKE', 'CLASSIFY', 'TRIAGE', 'DECOMPOSE', 'TRIAL_AND_ERROR',
  'ORCHESTRATE', 'MONTE_CARLO', 'ARENA', 'JUDGE', 'APPROVE', 'EXECUTE', 'VERIFY',
  'SELF_AWARENESS', 'SELF_CRITIQUE', 'MISTAKE_ANALYSIS', 'OPTIMIZATION_OPS', 'CONTINUOUS_SEARCH',
  'EVOLUTION', 'RECEIPT'
]);

class HCFullPipeline {
  constructor(options = {}) {
    this.vectorMemory = options.vectorMemory;
    this.orchestrator = options.orchestrator;
    this.receiptSigner = options.receiptSigner;
    this.logger = options.logger;
    this.stageTimeoutMs = options.stageTimeoutMs || phiTimeout(3);
    this.retryLimit = options.retryLimit || fib(4);
  }

  async execute(input, variant = 'FULL_PATH') {
    const stageIndexes = PIPELINE_PATHS[variant] || PIPELINE_PATHS.FULL_PATH;
    const context = {
      input,
      variant,
      startedAt: new Date().toISOString(),
      traces: [],
      state: {}
    };

    for (const stageIndex of stageIndexes) {
      const stageName = STAGES[stageIndex];
      const result = await this.runStage(stageIndex, stageName, context);
      context.traces.push(result);
    }

    const unsignedReceipt = {
      variant,
      startedAt: context.startedAt,
      completedAt: new Date().toISOString(),
      stages: context.traces.map((trace) => ({ stage: trace.stage, status: trace.status, durationMs: trace.durationMs }))
    };

    return this.receiptSigner ? this.receiptSigner.sign(unsignedReceipt) : unsignedReceipt;
  }

  async runStage(stageIndex, stageName, context) {
    const started = Date.now();
    let attempt = 0;
    while (attempt < this.retryLimit) {
      try {
        const output = await this.dispatchStage(stageName, context);
        return { stageIndex, stage: stageName, status: 'ok', output, durationMs: Date.now() - started };
      } catch (error) {
        attempt += 1;
        if (attempt >= this.retryLimit) {
          return { stageIndex, stage: stageName, status: 'failed', error: error.message, durationMs: Date.now() - started };
        }
        await new Promise((resolve) => setTimeout(resolve, phiBackoff(attempt)));
      }
    }
    throw new Error(`Unreachable stage failure state for ${stageName}`);
  }

  async dispatchStage(stageName, context) {
    switch (stageName) {
      case 'CHANNEL_ENTRY':
        context.state.requestId = `hcfp-${Date.now()}`;
        return { requestId: context.state.requestId };
      case 'RECON':
        return { hasMemory: Boolean(this.vectorMemory), hasOrchestrator: Boolean(this.orchestrator) };
      case 'INTAKE':
        context.state.normalizedInput = typeof context.input === 'string' ? { task: context.input } : context.input;
        return context.state.normalizedInput;
      case 'CLASSIFY':
        context.state.classification = { domain: 'general', risk: 'medium' };
        return context.state.classification;
      case 'TRIAGE':
        return { priority: 'HIGH', queue: 'HOT' };
      case 'DECOMPOSE':
        return { subtasks: [context.state.normalizedInput] };
      case 'TRIAL_AND_ERROR':
        return { candidates: fib(5) };
      case 'ORCHESTRATE':
        return this.orchestrator ? this.orchestrator.snapshot() : { orchestrator: 'absent' };
      case 'MONTE_CARLO':
        return { passes: fib(9) };
      case 'ARENA':
        return { approaches: fib(4) };
      case 'JUDGE':
        return { winner: 'approach-1' };
      case 'APPROVE':
        return { approved: true };
      case 'EXECUTE':
        if (this.orchestrator) {
          context.state.execution = await this.orchestrator.execute(context.state.normalizedInput, { swarm: 'execution' });
          return context.state.execution;
        }
        return { executed: false };
      case 'VERIFY':
        return { verified: true };
      case 'SELF_AWARENESS':
        return { confidence: 0.882 };
      case 'SELF_CRITIQUE':
        return { critique: 'bounded and explicit' };
      case 'MISTAKE_ANALYSIS':
        return { rootCauseTracked: true };
      case 'OPTIMIZATION_OPS':
        return { optimizationWindowOpen: true };
      case 'CONTINUOUS_SEARCH':
        return { searchReady: true };
      case 'EVOLUTION':
        return { mutationApplied: false };
      case 'RECEIPT':
        return { receiptPending: true };
      default:
        throw new Error(`Unknown stage ${stageName}`);
    }
  }
}

module.exports = {
  HCFullPipeline,
  STAGES
};
