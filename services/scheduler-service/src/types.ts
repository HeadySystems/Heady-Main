/**
 * Scheduler Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';
export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export interface ScheduledJob {
  readonly jobId: string;
  readonly name: string;
  readonly cronExpression: string | null;
  readonly intervalMs: number | null;
  readonly handler: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly priority: JobPriority;
  readonly status: JobStatus;
  readonly maxRetries: number;
  readonly retryCount: number;
  readonly lastRunAt: string | null;
  readonly nextRunAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly timeout: number;
  readonly dependencies: ReadonlyArray<string>;
}

export interface JobResult {
  readonly jobId: string;
  readonly status: 'completed' | 'failed';
  readonly result: unknown;
  readonly error: string | null;
  readonly durationMs: number;
  readonly completedAt: string;
}

export interface JobLock {
  readonly jobId: string;
  readonly lockId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
  readonly holder: string;
}

export interface SchedulerHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly activeJobs: number;
  readonly pendingJobs: number;
  readonly failedJobs: number;
  readonly deadLetterCount: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
