'use strict';

class SagaOrchestrator {
  async execute(steps) {
    const completed = [];
    const outputs = [];
    for (const step of steps) {
      try {
        const output = await step.execute();
        outputs.push({ step: step.name, output });
        completed.push(step);
      } catch (error) {
        for (const compensationStep of completed.reverse()) {
          if (typeof compensationStep.compensate === 'function') {
            await compensationStep.compensate();
          }
        }
        error.sagaOutputs = outputs;
        throw error;
      }
    }
    return outputs;
  }
}

module.exports = { SagaOrchestrator };
