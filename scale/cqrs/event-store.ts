/**
 * CQRS Event Store — Append-Only with Snapshots
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export interface DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, string>>;
  readonly timestamp: string;
}

export interface Snapshot {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly state: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export class EventStore {
  private readonly events: Map<string, DomainEvent[]> = new Map();
  private readonly snapshots: Map<string, Snapshot> = new Map();
  private readonly snapshotInterval: number = FIB[8]; // Snapshot every 21 events

  append(event: Omit<DomainEvent, 'eventId' | 'timestamp'>): DomainEvent {
    const full: DomainEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    const existing = this.events.get(event.aggregateId) ?? [];
    existing.push(full);
    this.events.set(event.aggregateId, existing);

    if (existing.length % this.snapshotInterval === 0) {
      this.createSnapshot(event.aggregateId, event.aggregateType, event.version, {});
    }

    return full;
  }

  getEvents(aggregateId: string, afterVersion?: number): ReadonlyArray<DomainEvent> {
    const events = this.events.get(aggregateId) ?? [];
    if (afterVersion !== undefined) {
      return events.filter(e => e.version > afterVersion);
    }
    return events;
  }

  createSnapshot(aggregateId: string, aggregateType: string, version: number, state: Record<string, unknown>): Snapshot {
    const snapshot: Snapshot = {
      aggregateId,
      aggregateType,
      version,
      state,
      createdAt: new Date().toISOString()
    };
    this.snapshots.set(aggregateId, snapshot);
    return snapshot;
  }

  getSnapshot(aggregateId: string): Snapshot | undefined {
    return this.snapshots.get(aggregateId);
  }

  replay(aggregateId: string): ReadonlyArray<DomainEvent> {
    const snapshot = this.snapshots.get(aggregateId);
    if (snapshot) {
      return this.getEvents(aggregateId, snapshot.version);
    }
    return this.getEvents(aggregateId);
  }
}
