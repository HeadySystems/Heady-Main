/**
 * Scheduler Service — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, type ScheduledJob, type JobResult, type JobLock,
  type JobStatus, type JobPriority
} from './types.js';


interface LogEntry {
  level: string;
  service: string;
  msg: string;
  timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const createLogger = (serviceName: string) => ({
  info: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'info', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  warn: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'warn', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'error', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
});

const logger = createLogger('scheduler-service');

export class JobScheduler {
  private readonly jobs: Map<string, ScheduledJob> = new Map();
  private readonly locks: Map<string, JobLock> = new Map();
  private readonly results: Map<string, JobResult[]> = new Map();
  private readonly deadLetter: JobResult[] = [];
  private readonly maxRetries: number = FIB[5]; // 5 retries
  private readonly baseRetryMs: number = FIB[6] * 1000; // 8 seconds

  schedule(job: Omit<ScheduledJob, 'jobId' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): ScheduledJob {
    const scheduled: ScheduledJob = {
      ...job,
      jobId: crypto.randomUUID(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      maxRetries: job.maxRetries || this.maxRetries
    };
    this.jobs.set(scheduled.jobId, scheduled);
    logger.info('job_scheduled', { jobId: scheduled.jobId, name: scheduled.name });
    return scheduled;
  }

  async acquireLock(jobId: string, holder: string): Promise<JobLock | null> {
    if (this.locks.has(jobId)) {
      const existing = this.locks.get(jobId);
      if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
        return null;
      }
    }

    const lock: JobLock = {
      jobId,
      lockId: crypto.randomUUID(),
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + FIB[8] * 1000).toISOString(), // 21s lock TTL
      holder
    };

    this.locks.set(jobId, lock);
    logger.info('lock_acquired', { jobId, holder });
    return lock;
  }

  releaseLock(jobId: string): void {
    this.locks.delete(jobId);
  }

  completeJob(jobId: string, result: unknown, durationMs: number): JobResult {
    const jobResult: JobResult = {
      jobId,
      status: 'completed',
      result,
      error: null,
      durationMs,
      completedAt: new Date().toISOString()
    };

    this.updateJobStatus(jobId, 'completed');
    this.storeResult(jobId, jobResult);
    this.releaseLock(jobId);
    logger.info('job_completed', { jobId, durationMs });
    return jobResult;
  }

  failJob(jobId: string, error: string, durationMs: number): JobResult {
    const job = this.jobs.get(jobId);
    const retryCount = (job?.retryCount ?? 0) + 1;
    const maxRetries = job?.maxRetries ?? this.maxRetries;

    const jobResult: JobResult = {
      jobId,
      status: 'failed',
      result: null,
      error,
      durationMs,
      completedAt: new Date().toISOString()
    };

    if (retryCount >= maxRetries) {
      this.deadLetter.push(jobResult);
      this.updateJobStatus(jobId, 'dead_letter');
      logger.warn('job_dead_lettered', { jobId, retryCount });
    } else {
      const backoffMs = this.calculateBackoff(retryCount);
      const nextRunAt = new Date(Date.now() + backoffMs).toISOString();
      if (job) {
        const updated: ScheduledJob = { ...job, status: 'pending', retryCount, nextRunAt, updatedAt: new Date().toISOString() };
        this.jobs.set(jobId, updated);
      }
      logger.warn('job_retry_scheduled', { jobId, retryCount, backoffMs: Math.round(backoffMs) });
    }

    this.storeResult(jobId, jobResult);
    this.releaseLock(jobId);
    return jobResult;
  }

  calculateBackoff(attempt: number): number {
    return this.baseRetryMs * Math.pow(PHI, attempt);
  }

  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(status?: JobStatus): ReadonlyArray<ScheduledJob> {
    const all = Array.from(this.jobs.values());
    return status ? all.filter(j => j.status === status) : all;
  }

  getDeadLetterQueue(): ReadonlyArray<JobResult> {
    return [...this.deadLetter];
  }

  private updateJobStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.set(jobId, { ...job, status, updatedAt: new Date().toISOString() });
    }
  }

  private storeResult(jobId: string, result: JobResult): void {
    const existing = this.results.get(jobId) ?? [];
    existing.push(result);
    this.results.set(jobId, existing);
  }
}

export class DAGExecutor {
  resolveDependencies(jobs: ReadonlyArray<ScheduledJob>): ReadonlyArray<ReadonlyArray<string>> {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    for (const job of jobs) {
      graph.set(job.jobId, new Set());
      inDegree.set(job.jobId, 0);
    }

    for (const job of jobs) {
      for (const dep of job.dependencies) {
        graph.get(dep)?.add(job.jobId);
        inDegree.set(job.jobId, (inDegree.get(job.jobId) ?? 0) + 1);
      }
    }

    const levels: string[][] = [];
    const queue: string[] = [];

    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const level = [...queue];
      levels.push(level);
      queue.length = 0;

      for (const id of level) {
        for (const dependent of graph.get(id) ?? []) {
          const newDegree = (inDegree.get(dependent) ?? 1) - 1;
          inDegree.set(dependent, newDegree);
          if (newDegree === 0) queue.push(dependent);
        }
      }
    }

    return levels;
  }
}
