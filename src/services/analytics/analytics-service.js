/**
 * Heady™ Analytics Service v5.0
 * Real-time analytics pipeline — event ingestion, aggregation, phi-scaled windows
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const {
  PHI, PSI, PSI_SQ, fib, phiFusionScore,
  CSL_THRESHOLDS, TIMING, SERVICE_PORTS,
} = require('../../../shared/phi-math');
const { createLogger } = require('../../../shared/logger');
const { HealthProbe } = require('../../../shared/health');

const logger = createLogger('analytics-service');
const PORT = SERVICE_PORTS.HEADY_ANALYTICS;

const RING_BUFFER_SIZE = fib(11);     // 89 time windows
const RETENTION_DAYS = fib(11);       // 89 days
const SLIDING_WINDOW_BUCKETS = fib(9); // 34 buckets
const MAX_EVENTS_BUFFER = fib(17);    // 1597 events before flush

class RingBuffer {
  constructor(size = RING_BUFFER_SIZE) {
    this.size = size;
    this.buffer = new Array(size).fill(null);
    this.head = 0;
    this.count = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;
  }

  getAll() {
    const items = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - this.count + i + this.size) % this.size;
      if (this.buffer[idx] !== null) items.push(this.buffer[idx]);
    }
    return items;
  }

  getLast(n) {
    const all = this.getAll();
    return all.slice(-n);
  }
}

class SlidingWindowAggregator {
  constructor(bucketCount = SLIDING_WINDOW_BUCKETS) {
    this.bucketCount = bucketCount;
    this.bucketDurationMs = TIMING.HEALTH_CHECK_MS; // 34s per bucket
    this.buckets = new Array(bucketCount).fill(null).map(() => ({
      count: 0, sum: 0, min: Infinity, max: -Infinity, timestamp: 0,
    }));
    this.currentBucket = 0;
    this.totalEvents = 0;
  }

  record(value) {
    const now = Date.now();
    const bucketIndex = Math.floor(now / this.bucketDurationMs) % this.bucketCount;

    if (bucketIndex !== this.currentBucket) {
      // Reset new bucket
      this.buckets[bucketIndex] = { count: 0, sum: 0, min: Infinity, max: -Infinity, timestamp: now };
      this.currentBucket = bucketIndex;
    }

    const bucket = this.buckets[bucketIndex];
    bucket.count++;
    bucket.sum += value;
    if (value < bucket.min) bucket.min = value;
    if (value > bucket.max) bucket.max = value;
    this.totalEvents++;
  }

  getStats() {
    let totalCount = 0, totalSum = 0, globalMin = Infinity, globalMax = -Infinity;
    const activeBuckets = this.buckets.filter(b => b.count > 0);

    for (const bucket of activeBuckets) {
      totalCount += bucket.count;
      totalSum += bucket.sum;
      if (bucket.min < globalMin) globalMin = bucket.min;
      if (bucket.max > globalMax) globalMax = bucket.max;
    }

    return {
      count: totalCount,
      avg: totalCount > 0 ? totalSum / totalCount : 0,
      min: globalMin === Infinity ? 0 : globalMin,
      max: globalMax === -Infinity ? 0 : globalMax,
      activeBuckets: activeBuckets.length,
      totalBuckets: this.bucketCount,
      totalEventsAllTime: this.totalEvents,
    };
  }
}

class EventStore {
  constructor() {
    this.events = [];
    this.maxBuffer = MAX_EVENTS_BUFFER;
    this.aggregators = new Map();
    this.counters = new Map();
    this.timeline = new RingBuffer();
  }

  ingest(event) {
    const enriched = {
      ...event,
      id: event.id || crypto.randomBytes(fib(6)).toString('hex'),
      timestamp: event.timestamp || Date.now(),
      ingestedAt: Date.now(),
    };

    this.events.push(enriched);

    // Update counters
    const eventType = event.type || 'unknown';
    this.counters.set(eventType, (this.counters.get(eventType) || 0) + 1);

    // Update aggregators
    if (event.value !== undefined) {
      if (!this.aggregators.has(eventType)) {
        this.aggregators.set(eventType, new SlidingWindowAggregator());
      }
      this.aggregators.get(eventType).record(event.value);
    }

    // Timeline
    this.timeline.push({ type: eventType, timestamp: enriched.timestamp });

    // Flush if buffer full
    if (this.events.length > this.maxBuffer) {
      this._flush();
    }

    return enriched;
  }

  batchIngest(events) {
    return events.map(e => this.ingest(e));
  }

  _flush() {
    const flushed = this.events.length;
    // In production: write to PostgreSQL / BigQuery
    this.events = [];
    logger.info('events_flushed', { count: flushed });
  }

  query(filters = {}) {
    let results = [...this.events];

    if (filters.type) {
      results = results.filter(e => e.type === filters.type);
    }
    if (filters.since) {
      results = results.filter(e => e.timestamp >= filters.since);
    }
    if (filters.until) {
      results = results.filter(e => e.timestamp <= filters.until);
    }
    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }
    if (filters.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  }

  getMetrics() {
    const metrics = {};
    for (const [type, aggregator] of this.aggregators) {
      metrics[type] = aggregator.getStats();
    }
    return metrics;
  }

  getCounters() {
    return Object.fromEntries(this.counters);
  }

  getTimeline(count = fib(8)) {
    return this.timeline.getLast(count);
  }
}

function createAnalyticsService() {
  const eventStore = new EventStore();
  const healthProbe = new HealthProbe('analytics-service');

  healthProbe.registerCheck('eventStore', async () => ({
    healthy: eventStore.events.length < MAX_EVENTS_BUFFER * PSI,
    bufferedEvents: eventStore.events.length,
    maxBuffer: MAX_EVENTS_BUFFER,
  }));

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
      req.on('error', reject);
    });
  }

  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const method = req.method;

    if (url.pathname.startsWith('/health')) {
      return healthProbe.fullHealthHandler(req, res);
    }

    try {
      if (method === 'POST' && url.pathname === '/events') {
        const body = await parseBody(req);
        if (Array.isArray(body)) {
          const results = eventStore.batchIngest(body);
          return json(res, 200, { ingested: results.length });
        }
        const result = eventStore.ingest(body);
        return json(res, 200, { id: result.id });
      }

      if (method === 'GET' && url.pathname === '/events') {
        const filters = {
          type: url.searchParams.get('type'),
          since: url.searchParams.get('since') ? parseInt(url.searchParams.get('since')) : undefined,
          until: url.searchParams.get('until') ? parseInt(url.searchParams.get('until')) : undefined,
          userId: url.searchParams.get('userId'),
          limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')) : fib(10),
        };
        return json(res, 200, eventStore.query(filters));
      }

      if (method === 'GET' && url.pathname === '/metrics') {
        return json(res, 200, eventStore.getMetrics());
      }

      if (method === 'GET' && url.pathname === '/counters') {
        return json(res, 200, eventStore.getCounters());
      }

      if (method === 'GET' && url.pathname === '/timeline') {
        const count = parseInt(url.searchParams.get('count')) || fib(8);
        return json(res, 200, eventStore.getTimeline(count));
      }

      json(res, 404, { error: 'NOT_FOUND' });
    } catch (err) {
      logger.error('request_error', { path: url.pathname, error: err.message });
      json(res, 500, { error: 'INTERNAL_ERROR' });
    }
  });

  return { server, eventStore, healthProbe, PORT };
}

module.exports = { createAnalyticsService, EventStore, SlidingWindowAggregator };
