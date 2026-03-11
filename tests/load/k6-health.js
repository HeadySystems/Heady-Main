/**
 * Heady™ k6 Load Test — Health Endpoints
 * Tests system health endpoints under load.
 * All thresholds derived from phi.
 *
 * Usage: k6 run tests/load/k6-health.js
 *
 * @author Eric Haywood — HeadySystems Inc.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Phi-derived constants
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Custom metrics
const healthCheckFailRate = new Rate('health_check_failures');
const healthLatency = new Trend('health_latency_ms');

// Test configuration — Fibonacci-scaled stages
export const options = {
  stages: [
    { duration: `${FIB[8]}s`, target: FIB[7] },   // 21s ramp to 13 VUs
    { duration: `${FIB[9]}s`, target: FIB[9] },   // 34s sustain at 34 VUs
    { duration: `${FIB[10]}s`, target: FIB[10] },  // 55s sustain at 55 VUs
    { duration: `${FIB[9]}s`, target: FIB[8] },   // 34s sustain at 21 VUs
    { duration: `${FIB[8]}s`, target: 0 },          // 21s ramp down
  ],
  thresholds: {
    http_req_duration: [`p(95)<${FIB[8] * 100}`],     // p95 < 2100ms
    http_req_failed: [`rate<${PSI * PSI * PSI * PSI}`], // < ~14.6% failure rate
    health_check_failures: [`rate<${PSI * PSI * PSI}`], // < ~23.6%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3310';

// Service ports (from phi-math.js SERVICE_PORTS)
const HEALTH_ENDPOINTS = [
  { name: 'main', url: `${BASE_URL}/health` },
];

export default function () {
  for (const endpoint of HEALTH_ENDPOINTS) {
    const res = http.get(endpoint.url, {
      timeout: `${FIB[9]}s`,
      tags: { name: endpoint.name },
    });

    const passed = check(res, {
      [`${endpoint.name} status 200`]: (r) => r.status === 200,
      [`${endpoint.name} response time < ${FIB[8] * 100}ms`]: (r) => r.timings.duration < FIB[8] * 100,
      [`${endpoint.name} has status field`]: (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    });

    healthCheckFailRate.add(!passed);
    healthLatency.add(res.timings.duration);
  }

  // Sleep phi-scaled interval
  sleep(PSI);
}

export function handleSummary(data) {
  const summary = {
    test: 'k6-health',
    timestamp: new Date().toISOString(),
    metrics: {
      vus_max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
      http_req_duration_p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
      http_req_failed_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
      health_check_failure_rate: data.metrics.health_check_failures ? data.metrics.health_check_failures.values.rate : 0,
    },
    thresholds_passed: Object.entries(data.root_group.checks || {}).every(([, v]) => v.passes > 0),
  };

  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}
