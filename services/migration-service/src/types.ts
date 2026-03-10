/**
 * Migration Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
export type MigrationDirection = 'up' | 'down';

export interface Migration {
  readonly migrationId: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly upSql: string;
  readonly downSql: string;
  readonly status: MigrationStatus;
  readonly appliedAt: string | null;
  readonly executionTimeMs: number | null;
  readonly checksum: string;
  readonly service: string;
}

export interface MigrationPlan {
  readonly migrations: ReadonlyArray<Migration>;
  readonly direction: MigrationDirection;
  readonly dryRun: boolean;
  readonly estimatedTimeMs: number;
}

export interface MigrationResult {
  readonly migrationId: string;
  readonly version: string;
  readonly status: MigrationStatus;
  readonly executionTimeMs: number;
  readonly error: string | null;
}

export interface MigrationHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly totalMigrations: number;
  readonly appliedMigrations: number;
  readonly pendingMigrations: number;
  readonly lastApplied: string | null;
  readonly uptime: number;
  readonly coherenceScore: number;
}
