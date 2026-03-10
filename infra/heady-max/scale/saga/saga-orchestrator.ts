/**
 * Saga Orchestrator — Long-Running Transaction Coordination
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export type SagaStatus = 'running' | 'completed' | 'compensating' | 'failed';

export interface SagaStep {
  readonly name: string;
  readonly execute: () => Promise<unknown>;
  readonly compensate: () => Promise<void>;
  readonly timeout: number;
}

export interface SagaInstance {
  readonly sagaId: string;
  readonly name: string;
  readonly status: SagaStatus;
  readonly currentStep: number;
  readonly steps: ReadonlyArray<{ name: string; status: string; result?: unknown; error?: string }>;
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export class SagaOrchestrator {
  private readonly sagas: Map<string, SagaInstance> = new Map();
  private readonly deadLetter: SagaInstance[] = [];

  async execute(name: string, steps: ReadonlyArray<SagaStep>): Promise<SagaInstance> {
    const sagaId = crypto.randomUUID();
    const saga: SagaInstance = {
      sagaId,
      name,
      status: 'running',
      currentStep: 0,
      steps: steps.map(s => ({ name: s.name, status: 'pending' })),
      startedAt: new Date().toISOString(),
      completedAt: null
    };
    this.sagas.set(sagaId, saga);

    const completedSteps: Array<{ step: SagaStep; result: unknown }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;

      const stepTimeout = step.timeout || PHI * Math.pow(PHI, i) * 1000; // PHI^(step+1) seconds
      this.updateStep(sagaId, i, 'running');

      try {
        const result = await Promise.race([
          step.execute(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`step_timeout: ${step.name}`)), stepTimeout)
          )
        ]);

        completedSteps.push({ step, result });
        this.updateStep(sagaId, i, 'completed', result);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'unknown_error';
        this.updateStep(sagaId, i, 'failed', undefined, error);
        await this.compensate(sagaId, completedSteps);
        return this.sagas.get(sagaId) ?? saga;
      }
    }

    const completed: SagaInstance = {
      ...(this.sagas.get(sagaId) ?? saga),
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    this.sagas.set(sagaId, completed);
    return completed;
  }

  private async compensate(sagaId: string, completedSteps: Array<{ step: SagaStep; result: unknown }>): Promise<void> {
    this.updateSagaStatus(sagaId, 'compensating');

    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const entry = completedSteps[i];
      if (!entry) continue;
      try {
        await entry.step.compensate();
      } catch {
        // Log but continue compensating remaining steps
      }
    }

    this.updateSagaStatus(sagaId, 'failed');
    const failed = this.sagas.get(sagaId);
    if (failed) this.deadLetter.push(failed);
  }

  private updateStep(sagaId: string, index: number, status: string, result?: unknown, error?: string): void {
    const saga = this.sagas.get(sagaId);
    if (!saga) return;
    const steps = [...saga.steps];
    steps[index] = { ...steps[index]!, status, result, error };
    this.sagas.set(sagaId, { ...saga, currentStep: index, steps });
  }

  private updateSagaStatus(sagaId: string, status: SagaStatus): void {
    const saga = this.sagas.get(sagaId);
    if (saga) this.sagas.set(sagaId, { ...saga, status });
  }

  getSaga(sagaId: string): SagaInstance | undefined {
    return this.sagas.get(sagaId);
  }

  getDeadLetter(): ReadonlyArray<SagaInstance> {
    return [...this.deadLetter];
  }
}
