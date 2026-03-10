/**
 * Analytics Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type EventCategory = 'user' | 'system' | 'model' | 'pipeline' | 'security' | 'billing';
export type AggregationWindow = '1m' | '5m' | '15m' | '1h' | '1d';

export interface AnalyticsEvent {
  readonly eventId: string;
  readonly category: EventCategory;
  readonly action: string;
  readonly label: string;
  readonly value: number;
  readonly userId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly timestamp: string;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
  readonly source: string;
}

export interface MetricPoint {
  readonly name: string;
  readonly value: number;
  readonly timestamp: string;
  readonly tags: Readonly<Record<string, string>>;
  readonly unit: string;
}

export interface AggregatedMetric {
  readonly name: string;
  readonly window: AggregationWindow;
  readonly count: number;
  readonly sum: number;
  readonly avg: number;
  readonly min: number;
  readonly max: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly startTime: string;
  readonly endTime: string;
}

export interface DashboardKPI {
  readonly name: string;
  readonly currentValue: number;
  readonly previousValue: number;
  readonly changePercent: number;
  readonly trend: 'up' | 'down' | 'stable';
  readonly unit: string;
  readonly sparkline: ReadonlyArray<number>;
}

export interface CoherenceMetric {
  readonly serviceName: string;
  readonly coherenceScore: number;
  readonly vectorDrift: number;
  readonly lastMeasured: string;
  readonly threshold: number;
  readonly isHealthy: boolean;
}

export interface AnalyticsHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly eventsIngested: number;
  readonly eventsPerSecond: number;
  readonly storageUsedBytes: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
