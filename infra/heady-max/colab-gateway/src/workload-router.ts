/**
 * Colab Gateway — CSL-based Workload Router
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type WorkloadRequest, type WorkloadResult, type WorkloadPriority, type WorkloadType
} from './types.js';
import { RuntimeManager } from './runtime-manager.js';

interface LogEntry {
  level: string; service: string; msg: string; timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  const entry: LogEntry = { level, service: 'colab-gateway', msg, timestamp: new Date().toISOString(), ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
};

export class WorkloadRouter {
  private readonly queues: Record<WorkloadPriority, WorkloadRequest[]> = {
    hot: [],
    warm: [],
    cold: []
  };

  private readonly maxQueueSizes: Record<WorkloadPriority, number> = {
    hot: FIB[8],    // 21
    warm: FIB[10],  // 55
    cold: FIB[12]   // 144
  };

  private readonly workloadVramEstimates: Record<WorkloadType, number> = {
    embedding: FIB[9] * FIB[5],         // 34*5 = 170 MB
    inference: FIB[10] * FIB[7],         // 55*13 = 715 MB
    training: FIB[11] * FIB[8],          // 89*21 = 1869 MB
    fine_tuning: FIB[12] * FIB[8],       // 144*21 = 3024 MB
    evaluation: FIB[9] * FIB[6]          // 34*8 = 272 MB
  };

  constructor(private readonly runtimeManager: RuntimeManager) {}

  enqueue(request: WorkloadRequest): boolean {
    const queue = this.queues[request.priority];
    if (queue.length >= this.maxQueueSizes[request.priority]) {
      log('warn', 'queue_full', { priority: request.priority, size: queue.length });
      return false;
    }

    queue.push(request);
    log('info', 'workload_enqueued', {
      requestId: request.requestId,
      type: request.type,
      priority: request.priority
    });
    return true;
  }

  async dispatch(): Promise<WorkloadResult | null> {
    // Process queues in priority order: hot → warm → cold
    for (const priority of ['hot', 'warm', 'cold'] as WorkloadPriority[]) {
      const queue = this.queues[priority];
      if (queue.length === 0) continue;

      const request = queue[0];
      if (!request) continue;

      const estimatedVram = request.estimatedVramMb || this.workloadVramEstimates[request.type];
      const runtime = this.runtimeManager.selectRuntime(request.type, estimatedVram);

      if (!runtime) continue;

      queue.shift();
      this.runtimeManager.markBusy(runtime.runtimeId);

      const start = Date.now();

      try {
        log('info', 'workload_dispatched', {
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          type: request.type
        });

        // Simulate processing (in production: send via WebSocket bridge)
        const result: WorkloadResult = {
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          status: 'completed',
          result: { processed: true, type: request.type },
          error: null,
          durationMs: Date.now() - start,
          gpuUtilization: PSI,
          completedAt: new Date().toISOString()
        };

        this.runtimeManager.markFree(runtime.runtimeId);
        return result;
      } catch (err) {
        this.runtimeManager.markFree(runtime.runtimeId);
        const errMsg = err instanceof Error ? err.message : 'unknown_error';
        log('error', 'workload_failed', { requestId: request.requestId, error: errMsg });

        return {
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          status: 'failed',
          result: null,
          error: errMsg,
          durationMs: Date.now() - start,
          gpuUtilization: 0,
          completedAt: new Date().toISOString()
        };
      }
    }

    return null;
  }

  getQueueDepths(): Record<WorkloadPriority, number> {
    return {
      hot: this.queues.hot.length,
      warm: this.queues.warm.length,
      cold: this.queues.cold.length
    };
  }

  computeCSLScore(request: WorkloadRequest): number {
    const urgencyVector = [
      request.priority === 'hot' ? PHI : request.priority === 'warm' ? 1.0 : PSI,
      request.estimatedVramMb / (FIB[12] * FIB[8]),
      request.timeout > 0 ? FIB[8] * 1000 / request.timeout : PSI
    ];

    const magnitude = Math.sqrt(urgencyVector.reduce((s, v) => s + v * v, 0));
    return magnitude > CSL_THRESHOLD ? magnitude : 0;
  }
}
