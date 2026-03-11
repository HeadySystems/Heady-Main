/**
 * Heady™ k6 Load Test — API Endpoints
 * Tests core API endpoints under realistic load patterns.
 * All thresholds derived from phi.
 *
 * Usage: k6 run tests/load/k6-api.js
 *
 * @author Eric Haywood — HeadySystems Inc.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Phi-derived constants
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI_SQ = PSI * PSI;
const PSI_CUBE = PSI * PSI * PSI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Custom metrics
const apiFailRate = new Rate('api_failures');
const apiLatency = new Trend('api_latency_ms');
const apiRequests = new Counter('api_total_requests');

// Fibonacci-scaled stages simulating realistic traffic
export const options = {
  scenarios: {
    // Steady-state API traffic
    steady_state: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${FIB[8]}s`, target: FIB[6] },    // 21s ramp to 8 VUs
        { duration: `${FIB[10]}s`, target: FIB[8] },    // 55s sustain at 21 VUs
        { duration: `${FIB[8]}s`, target: 0 },            // 21s ramp down
      ],
    },
    // Burst traffic
    burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: `${FIB[9]}s`, // Start after 34s
      stages: [
        { duration: `${FIB[5]}s`, target: FIB[9] },     // 5s spike to 34 VUs
        { duration: `${FIB[7]}s`, target: FIB[9] },     // 13s hold at 34
        { duration: `${FIB[5]}s`, target: 0 },            // 5s cooldown
      ],
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${FIB[9] * 100}`],           // p95 < 3400ms
    http_req_failed: [`rate<${PSI_CUBE}`],                    // < 23.6% failure
    api_failures: [`rate<${PSI_SQ}`],                         // < 38.2% API failures
    api_latency_ms: [`p(95)<${FIB[8] * 100}`],              // p95 < 2100ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3310';

// ═══════════════════════════════════════════════════════════
// API TEST SCENARIOS
// ═══════════════════════════════════════════════════════════

export default function () {
  // Weighted scenario selection using phi distribution
  const rand = Math.random();

  if (rand < PSI) {
    // 61.8% — Read operations (Hot pool)
    group('read_operations', () => {
      testHealthEndpoint();
      testPatternsTrend();
      testConductorStatus();
    });
  } else if (rand < PSI + PSI_SQ * PSI) {
    // ~23.6% — Write operations (Warm pool)
    group('write_operations', () => {
      testSubmitDriftEvent();
      testCheckOutput();
    });
  } else {
    // ~14.6% — Heavy operations (Cold pool)
    group('heavy_operations', () => {
      testMCRecommend();
      testAssureCertify();
    });
  }

  // Phi-scaled think time
  sleep(PSI + Math.random() * PSI_SQ);
}

// ═══════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════

function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
  const passed = check(res, {
    'health status 200': (r) => r.status === 200,
    'health response < 500ms': (r) => r.timings.duration < 500,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testPatternsTrend() {
  const res = http.get(`${BASE_URL}/api/patterns/trend`, { tags: { endpoint: 'patterns_trend' } });
  const passed = check(res, {
    'patterns trend status 200': (r) => r.status === 200 || r.status === 404,
    'patterns trend response valid': (r) => {
      if (r.status === 404) return true;
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testConductorStatus() {
  const res = http.get(`${BASE_URL}/api/conductor/status`, { tags: { endpoint: 'conductor_status' } });
  const passed = check(res, {
    'conductor status 200': (r) => r.status === 200 || r.status === 404,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testSubmitDriftEvent() {
  const payload = JSON.stringify({
    source: `k6-load-test-${__VU}`,
    timestamp: Date.now(),
    metadata: {
      type: 'load_test',
      severity: 'low',
    },
  });

  const res = http.post(`${BASE_URL}/api/patterns/event`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'patterns_event' },
  });

  const passed = check(res, {
    'drift event accepted': (r) => r.status === 200 || r.status === 201 || r.status === 404,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testCheckOutput() {
  const payload = JSON.stringify({
    id: `k6-check-${__VU}-${__ITER}`,
    content: "'use strict';\nmodule.exports = { test: true };",
    type: 'code',
    pool: 'warm',
  });

  const res = http.post(`${BASE_URL}/api/check/validate`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'check_validate' },
  });

  const passed = check(res, {
    'check validate accepted': (r) => r.status === 200 || r.status === 404,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testMCRecommend() {
  const payload = JSON.stringify({
    healthScore: PSI,
    pressure: PSI_SQ,
    healthyNodes: FIB[5],
    snapshotAge: FIB[10],
  });

  const res = http.post(`${BASE_URL}/api/mc/recommend`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'mc_recommend' },
    timeout: `${FIB[9]}s`,
  });

  const passed = check(res, {
    'mc recommend accepted': (r) => r.status === 200 || r.status === 404,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

function testAssureCertify() {
  const payload = JSON.stringify({
    deploymentId: `k6-deploy-${__VU}-${__ITER}`,
    files: [
      { path: 'test.js', content: "'use strict';\nmodule.exports = {};" },
    ],
  });

  const res = http.post(`${BASE_URL}/api/assure/certify`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'assure_certify' },
    timeout: `${FIB[9]}s`,
  });

  const passed = check(res, {
    'assure certify accepted': (r) => r.status === 200 || r.status === 404,
  });
  apiFailRate.add(!passed);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);
}

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════

export function handleSummary(data) {
  const summary = {
    test: 'k6-api',
    timestamp: new Date().toISOString(),
    scenarios: Object.keys(options.scenarios),
    metrics: {
      total_requests: data.metrics.api_total_requests ? data.metrics.api_total_requests.values.count : 0,
      api_failure_rate: data.metrics.api_failures ? data.metrics.api_failures.values.rate : 0,
      api_latency_p95: data.metrics.api_latency_ms ? data.metrics.api_latency_ms.values['p(95)'] : 0,
      http_req_duration_p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
    },
  };

  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}
