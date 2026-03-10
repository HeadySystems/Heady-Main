'use strict';

    const { createLogger } = require('./src/core/heady-logger');
    const { createEventBus } = require('./src/core/event-bus');
    const { VectorMemory } = require('./src/memory/vector-memory');
    const { ReceiptSigner } = require('./src/crypto/ed25519-receipt-signer');
    const { LiquidOrchestrator } = require('./src/orchestration/liquid-orchestrator');
    const { AutoSuccessEngine } = require('./src/orchestration/auto-success-engine');
    const { HCFullPipeline } = require('./src/orchestration/hc-full-pipeline-v4');
    const { HealthService } = require('./src/monitoring/health-service');

    function createManager() {
      const logger = createLogger('heady-manager');
      const eventBus = createEventBus();
      const vectorMemory = new VectorMemory();
      const receiptSigner = new ReceiptSigner();
      const orchestrator = new LiquidOrchestrator();
      const autoSuccess = new AutoSuccessEngine({ enabled: process.env.HEADY_AUTOSUCCESS_ENABLED !== 'false' });
      const pipeline = new HCFullPipeline({ vectorMemory, orchestrator, receiptSigner, logger });
      const health = new HealthService({ eventBus, vectorMemory, orchestrator, pipeline });

      return {
        logger,
        eventBus,
        vectorMemory,
        receiptSigner,
        orchestrator,
        autoSuccess,
        pipeline,
        health,
        getSystemSnapshot() {
          return {
            memory: vectorMemory.summary(),
            orchestrator: orchestrator.snapshot(),
            autoSuccess: autoSuccess.nextCycle(),
            health: health.snapshot()
          };
        }
      };
    }

    async function main() {
      const manager = createManager();
      manager.vectorMemory.store('Heady Sacred Genesis bootstrap complete', { type: 'bootstrap' });
      const result = await manager.pipeline.execute({
        task: 'Bootstrap Heady Sacred Genesis foundation rebuild',
        domain: 'architecture'
      });
      manager.logger.info('Heady manager bootstrap complete', {
        health: manager.health.snapshot(),
        receiptKeyId: result.signature ? result.signature.keyId : 'unsigned'
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
    }

    if (require.main === module) {
      main().catch((error) => {
        process.stderr.write(`${error.stack}
`);
        process.exitCode = 1;
      });
    }

    module.exports = {
      createManager
    };
