/**
 * Circuit Breaker — φ-based Failure Detection
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;      // FIB[5] = 5
  readonly openDurationMs: number;        // PHI * FIB[7] * 1000 ≈ 21034ms
  readonly halfOpenProbeCount: number;    // FIB[3] = 2
  readonly successThreshold: number;      // FIB[3] = 2 (to close from half-open)
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureAt: number = 0;
  private probeCount: number = 0;

  private readonly config: CircuitBreakerConfig = {
    failureThreshold: FIB[5],                    // 5
    openDurationMs: PHI * FIB[7] * 1000,         // ≈ 21034ms
    halfOpenProbeCount: FIB[3],                   // 2
    successThreshold: FIB[3]                      // 2
  };

  constructor(private readonly serviceName: string, overrides?: Partial<CircuitBreakerConfig>) {
    if (overrides) {
      this.config = { ...this.config, ...overrides };
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureAt >= this.config.openDurationMs) {
        this.state = 'half_open';
        this.probeCount = 0;
        this.successCount = 0;
      } else {
        throw new Error(`circuit_open: ${this.serviceName}`);
      }
    }

    if (this.state === 'half_open' && this.probeCount >= this.config.halfOpenProbeCount) {
      throw new Error(`circuit_half_open_limit: ${this.serviceName}`);
    }

    try {
      const result = await fn();

      if (this.state === 'half_open') {
        this.probeCount++;
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.reset();
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureAt = Date.now();

    if (this.state === 'half_open' || this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.probeCount = 0;
  }

  getState(): CircuitState { return this.state; }
  getFailureCount(): number { return this.failureCount; }
  getServiceName(): string { return this.serviceName; }
}
