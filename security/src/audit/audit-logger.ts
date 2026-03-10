/**
 * Immutable Audit Logger — Cryptographic Hash Chain
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export type AuditEventType = 'auth' | 'access' | 'mutation' | 'admin' | 'system' | 'security';

export interface AuditLogEntry {
  readonly entryId: string;
  readonly eventType: AuditEventType;
  readonly action: string;
  readonly actor: string;
  readonly resource: string;
  readonly outcome: 'success' | 'failure' | 'denied';
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly entryHash: string;
}

export class ImmutableAuditLogger {
  private readonly entries: AuditLogEntry[] = [];
  private lastHash: string = '0'.repeat(FIB[9] * FIB[3]); // 64 char genesis hash
  private readonly retentionDays: number = FIB[15]; // 610 days ≈ 20 months

  log(
    eventType: AuditEventType,
    action: string,
    actor: string,
    resource: string,
    outcome: 'success' | 'failure' | 'denied',
    metadata: Record<string, string | number | boolean> = {}
  ): AuditLogEntry {
    const entryId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const previousHash = this.lastHash;

    const content = `${entryId}:${eventType}:${action}:${actor}:${resource}:${outcome}:${timestamp}:${previousHash}`;
    const entryHash = crypto.createHash('sha256').update(content).digest('hex');

    const entry: AuditLogEntry = {
      entryId,
      eventType,
      action,
      actor,
      resource,
      outcome,
      metadata,
      timestamp,
      previousHash,
      entryHash
    };

    this.entries.push(entry);
    this.lastHash = entryHash;

    return entry;
  }

  verify(): { valid: boolean; brokenAt: number | null } {
    let previousHash = '0'.repeat(FIB[9] * FIB[3]);

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (!entry) continue;

      if (entry.previousHash !== previousHash) {
        return { valid: false, brokenAt: i };
      }

      const content = `${entry.entryId}:${entry.eventType}:${entry.action}:${entry.actor}:${entry.resource}:${entry.outcome}:${entry.timestamp}:${entry.previousHash}`;
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

      if (entry.entryHash !== expectedHash) {
        return { valid: false, brokenAt: i };
      }

      previousHash = entry.entryHash;
    }

    return { valid: true, brokenAt: null };
  }

  query(
    filters: {
      eventType?: AuditEventType;
      actor?: string;
      resource?: string;
      outcome?: 'success' | 'failure' | 'denied';
      since?: string;
    }
  ): ReadonlyArray<AuditLogEntry> {
    return this.entries.filter(e => {
      if (filters.eventType && e.eventType !== filters.eventType) return false;
      if (filters.actor && e.actor !== filters.actor) return false;
      if (filters.resource && !e.resource.includes(filters.resource)) return false;
      if (filters.outcome && e.outcome !== filters.outcome) return false;
      if (filters.since && e.timestamp < filters.since) return false;
      return true;
    });
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  getLastEntry(): AuditLogEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  exportCEF(): ReadonlyArray<string> {
    return this.entries.map(e =>
      `CEF:0|HeadySystems|HeadyOS|1.0|${e.eventType}|${e.action}|${e.outcome === 'denied' ? '8' : e.outcome === 'failure' ? '5' : '3'}|` +
      `src=${e.actor} dst=${e.resource} outcome=${e.outcome} rt=${e.timestamp} ` +
      `cs1=${e.entryHash} cs1Label=AuditHash`
    );
  }
}
