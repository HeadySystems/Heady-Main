/**
 * Colab Gateway — Runtime Manager (3 Colab Pro+ runtimes)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import {
  PHI, PSI, FIB,
  type ColabRuntime, type RuntimeStatus, type WorkloadType
} from './types.js';

interface LogEntry {
  level: string; service: string; msg: string; timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  const entry: LogEntry = { level, service: 'colab-gateway', msg, timestamp: new Date().toISOString(), ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
};

export class RuntimeManager {
  private readonly runtimes: Map<string, ColabRuntime> = new Map();
  private readonly heartbeatIntervalMs: number = FIB[6] * 1000; // 8000ms
  private readonly maxReconnectDelayMs: number = FIB[10] * 1000; // 55000ms
  private reconnectAttempts: Map<string, number> = new Map();

  register(runtime: ColabRuntime): void {
    this.runtimes.set(runtime.runtimeId, runtime);
    this.reconnectAttempts.set(runtime.runtimeId, 0);
    log('info', 'runtime_registered', {
      runtimeId: runtime.runtimeId,
      gpuType: runtime.gpuType,
      vramGb: runtime.vramGb
    });
  }

  updateHeartbeat(runtimeId: string): boolean {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return false;

    const updated: ColabRuntime = {
      ...runtime,
      lastHeartbeat: new Date().toISOString(),
      status: runtime.status === 'disconnected' ? 'ready' : runtime.status
    };
    this.runtimes.set(runtimeId, updated);
    this.reconnectAttempts.set(runtimeId, 0);
    return true;
  }

  selectRuntime(workloadType: WorkloadType, estimatedVramMb: number): ColabRuntime | null {
    const available = Array.from(this.runtimes.values())
      .filter(r => r.status === 'ready' || r.status === 'busy')
      .filter(r => r.capabilities.includes(workloadType))
      .filter(r => r.vramGb * 1024 * PSI > estimatedVramMb) // keep PSI buffer
      .filter(r => r.currentLoad < r.maxConcurrent);

    if (available.length === 0) return null;

    // φ-weighted round-robin: prefer least-loaded runtime
    const scores = available.map(r => {
      const loadScore = 1 - (r.currentLoad / r.maxConcurrent);
      const vramScore = (r.vramGb * 1024 - estimatedVramMb) / (r.vramGb * 1024);
      return {
        runtime: r,
        score: loadScore * PHI + vramScore // φ-weighted composite
      };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.runtime ?? null;
  }

  getReconnectDelay(runtimeId: string): number {
    const attempts = this.reconnectAttempts.get(runtimeId) ?? 0;
    const delay = Math.min(
      PHI * 1000 * Math.pow(PHI, attempts), // PHI^(n+1) seconds
      this.maxReconnectDelayMs
    );
    this.reconnectAttempts.set(runtimeId, attempts + 1);
    return delay;
  }

  markDisconnected(runtimeId: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (runtime) {
      this.runtimes.set(runtimeId, { ...runtime, status: 'disconnected' as RuntimeStatus });
      log('warn', 'runtime_disconnected', { runtimeId });
    }
  }

  markBusy(runtimeId: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (runtime) {
      this.runtimes.set(runtimeId, {
        ...runtime,
        status: 'busy' as RuntimeStatus,
        currentLoad: runtime.currentLoad + 1
      });
    }
  }

  markFree(runtimeId: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (runtime) {
      const newLoad = Math.max(0, runtime.currentLoad - 1);
      this.runtimes.set(runtimeId, {
        ...runtime,
        status: newLoad === 0 ? 'ready' as RuntimeStatus : 'busy' as RuntimeStatus,
        currentLoad: newLoad
      });
    }
  }

  getAll(): ReadonlyArray<ColabRuntime> {
    return Array.from(this.runtimes.values());
  }

  getHealthy(): ReadonlyArray<ColabRuntime> {
    return this.getAll().filter(r => r.status === 'ready' || r.status === 'busy');
  }

  isHeartbeatStale(runtimeId: string): boolean {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return true;
    const lastBeat = new Date(runtime.lastHeartbeat).getTime();
    return Date.now() - lastBeat > this.heartbeatIntervalMs * FIB[3]; // stale after 2x heartbeat interval
  }
}
