/**
 * Analytics Service — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type AnalyticsEvent, type MetricPoint, type AggregatedMetric,
  type DashboardKPI, type CoherenceMetric, type AggregationWindow
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

const logger = createLogger('analytics-service');

export class EventIngester {
  private readonly buffer: AnalyticsEvent[] = [];
  private readonly maxBufferSize: number = FIB[8]; // 21 events before flush
  private readonly samplingRates: Record<string, number> = {
    'user': 1.0,           // sample all user events
    'system': PSI,         // sample ~61.8% of system events
    'model': 1.0,          // sample all model events
    'pipeline': PSI,       // sample ~61.8% of pipeline events
    'security': 1.0,       // sample all security events
    'billing': 1.0         // sample all billing events
  };

  shouldSample(event: AnalyticsEvent): boolean {
    const rate = this.samplingRates[event.category] ?? PSI;
    return Math.random() < rate;
  }

  ingest(event: AnalyticsEvent): boolean {
    if (!this.shouldSample(event)) {
      return false;
    }

    this.buffer.push(event);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
    return true;
  }

  flush(): ReadonlyArray<AnalyticsEvent> {
    const events = [...this.buffer];
    this.buffer.length = 0;
    logger.info('events_flushed', { count: events.length });
    return events;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

export class MetricAggregator {
  private readonly windows: Map<string, MetricPoint[]> = new Map();
  private readonly windowDurations: Record<AggregationWindow, number> = {
    '1m': FIB[6] * 1000 * FIB[4],     // ~8*3=24s ≈ 1m approximation via Fibonacci
    '5m': FIB[9] * 1000 * FIB[6],     // 34*8=272s ≈ 5m
    '15m': FIB[11] * 1000 * FIB[8],   // 89*21=1869s ≈ 15m (scaled)
    '1h': FIB[13] * 60 * 1000,         // 233 minutes (close to 4h, but used as scale)
    '1d': FIB[15] * 60 * 1000          // 610 minutes
  };

  addPoint(point: MetricPoint): void {
    const key = `${point.name}:${Object.values(point.tags).join(':')}`;
    const existing = this.windows.get(key) ?? [];
    existing.push(point);
    this.windows.set(key, existing);
  }

  aggregate(name: string, window: AggregationWindow): AggregatedMetric | null {
    const now = Date.now();
    const duration = this.windowDurations[window];
    const cutoff = now - duration;

    const allPoints: MetricPoint[] = [];
    for (const [key, points] of this.windows.entries()) {
      if (key.startsWith(name)) {
        allPoints.push(...points.filter(p => new Date(p.timestamp).getTime() > cutoff));
      }
    }

    if (allPoints.length === 0) return null;

    const values = allPoints.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;

    return {
      name,
      window,
      count,
      sum,
      avg: sum / count,
      min: values[0] ?? 0,
      max: values[count - 1] ?? 0,
      p50: values[Math.floor(count * PSI)] ?? 0,       // φ-based percentile
      p95: values[Math.floor(count * 0.95)] ?? 0,
      p99: values[Math.floor(count * 0.99)] ?? 0,
      startTime: new Date(cutoff).toISOString(),
      endTime: new Date(now).toISOString()
    };
  }
}

export class CoherenceMonitor {
  private readonly measurements: Map<string, CoherenceMetric> = new Map();

  measure(serviceName: string, coherenceScore: number, vectorDrift: number): CoherenceMetric {
    const metric: CoherenceMetric = {
      serviceName,
      coherenceScore,
      vectorDrift,
      lastMeasured: new Date().toISOString(),
      threshold: CSL_THRESHOLD,
      isHealthy: coherenceScore >= CSL_THRESHOLD
    };

    this.measurements.set(serviceName, metric);

    if (!metric.isHealthy) {
      logger.warn('coherence_below_threshold', {
        service: serviceName,
        score: coherenceScore,
        threshold: CSL_THRESHOLD
      });
    }

    return metric;
  }

  getAllMeasurements(): ReadonlyArray<CoherenceMetric> {
    return Array.from(this.measurements.values());
  }

  getSystemCoherence(): number {
    const metrics = this.getAllMeasurements();
    if (metrics.length === 0) return 1.0;
    const sum = metrics.reduce((acc, m) => acc + m.coherenceScore, 0);
    return sum / metrics.length;
  }
}

export class KPIDashboard {
  computeKPI(
    name: string,
    currentValue: number,
    previousValue: number,
    unit: string,
    sparkline: ReadonlyArray<number>
  ): DashboardKPI {
    const changePercent = previousValue !== 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0;

    return {
      name,
      currentValue,
      previousValue,
      changePercent,
      trend: changePercent > PSI ? 'up' : changePercent < -PSI ? 'down' : 'stable',
      unit,
      sparkline
    };
  }
}
