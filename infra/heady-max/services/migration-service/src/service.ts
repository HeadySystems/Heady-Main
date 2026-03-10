/**
 * Migration Service — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, type Migration, type MigrationPlan, type MigrationResult,
  type MigrationStatus, type MigrationDirection
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

const logger = createLogger('migration-service');

export class MigrationEngine {
  private readonly migrations: Map<string, Migration> = new Map();
  private readonly appliedVersions: Set<string> = new Set();
  private readonly auditLog: MigrationResult[] = [];

  register(migration: Omit<Migration, 'migrationId' | 'status' | 'appliedAt' | 'executionTimeMs' | 'checksum'>): Migration {
    const checksum = crypto.createHash('sha256').update(migration.upSql + migration.downSql).digest('hex');
    const full: Migration = {
      ...migration,
      migrationId: crypto.randomUUID(),
      status: 'pending',
      appliedAt: null,
      executionTimeMs: null,
      checksum
    };
    this.migrations.set(full.version, full);
    logger.info('migration_registered', { version: full.version, name: full.name });
    return full;
  }

  plan(direction: MigrationDirection, targetVersion?: string, dryRun: boolean = false): MigrationPlan {
    const allVersions = Array.from(this.migrations.keys()).sort();
    let migrationsToRun: Migration[] = [];

    if (direction === 'up') {
      migrationsToRun = allVersions
        .filter(v => !this.appliedVersions.has(v))
        .filter(v => !targetVersion || v <= targetVersion)
        .map(v => this.migrations.get(v))
        .filter((m): m is Migration => m !== undefined);
    } else {
      migrationsToRun = allVersions
        .filter(v => this.appliedVersions.has(v))
        .filter(v => !targetVersion || v >= targetVersion)
        .reverse()
        .map(v => this.migrations.get(v))
        .filter((m): m is Migration => m !== undefined);
    }

    const estimatedTimeMs = migrationsToRun.length * FIB[6] * 1000;

    return { migrations: migrationsToRun, direction, dryRun, estimatedTimeMs };
  }

  async execute(plan: MigrationPlan): Promise<ReadonlyArray<MigrationResult>> {
    if (plan.dryRun) {
      logger.info('dry_run_plan', { count: plan.migrations.length, direction: plan.direction });
      return plan.migrations.map(m => ({
        migrationId: m.migrationId,
        version: m.version,
        status: 'completed' as MigrationStatus,
        executionTimeMs: 0,
        error: null
      }));
    }

    const results: MigrationResult[] = [];
    for (const migration of plan.migrations) {
      const start = Date.now();
      try {
        if (plan.direction === 'up') {
          logger.info('applying_migration', { version: migration.version, name: migration.name });
          this.appliedVersions.add(migration.version);
          const updated: Migration = { ...migration, status: 'completed', appliedAt: new Date().toISOString(), executionTimeMs: Date.now() - start };
          this.migrations.set(migration.version, updated);
        } else {
          logger.info('rolling_back_migration', { version: migration.version });
          this.appliedVersions.delete(migration.version);
          const updated: Migration = { ...migration, status: 'rolled_back', appliedAt: null, executionTimeMs: Date.now() - start };
          this.migrations.set(migration.version, updated);
        }

        const result: MigrationResult = {
          migrationId: migration.migrationId,
          version: migration.version,
          status: 'completed',
          executionTimeMs: Date.now() - start,
          error: null
        };
        results.push(result);
        this.auditLog.push(result);
      } catch (err) {
        const result: MigrationResult = {
          migrationId: migration.migrationId,
          version: migration.version,
          status: 'failed',
          executionTimeMs: Date.now() - start,
          error: err instanceof Error ? err.message : 'unknown_error'
        };
        results.push(result);
        this.auditLog.push(result);
        logger.error('migration_failed', { version: migration.version, error: result.error ?? 'unknown' });
        break;
      }
    }
    return results;
  }

  getStatus(): { total: number; applied: number; pending: number; lastApplied: string | null } {
    const allVersions = Array.from(this.migrations.keys());
    const applied = allVersions.filter(v => this.appliedVersions.has(v));
    const lastApplied = applied.sort().reverse()[0] ?? null;
    return {
      total: allVersions.length,
      applied: applied.length,
      pending: allVersions.length - applied.length,
      lastApplied
    };
  }

  getAuditLog(): ReadonlyArray<MigrationResult> {
    return [...this.auditLog];
  }
}
