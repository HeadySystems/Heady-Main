/**
 * Smoke Test Runner — Quick validation of deployed services
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const http = require('http');

const PHI = 1.6180339887498948;

/** Service endpoints to verify */
const SERVICES = [
  { name: 'heady-soul', port: 3310 },
  { name: 'heady-brains', port: 3311 },
  { name: 'heady-conductor', port: 3312 },
  { name: 'heady-gateway', port: 3340 },
  { name: 'heady-health', port: 3328 },
  { name: 'schema-registry', port: 3370 },
  { name: 'feature-flags', port: 3371 },
  { name: 'nats-bridge', port: 3372 },
  { name: 'session-server', port: 3373 },
];

const BASE = process.env.BASE_URL || 'localhost';
const TIMEOUT_MS = Math.round(PHI * PHI * PHI * 1000);

/**
 * Check a single service health endpoint
 * @param {Object} service
 * @returns {Promise<{name: string, status: string, latency: number}>}
 */
function checkHealth(service) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get({
      hostname: BASE,
      port: service.port,
      path: '/healthz',
      timeout: TIMEOUT_MS
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          name: service.name,
          status: res.statusCode === 200 ? 'pass' : 'fail',
          httpStatus: res.statusCode,
          latency: Date.now() - start
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: service.name,
        status: 'fail',
        error: err.message,
        latency: Date.now() - start
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        status: 'fail',
        error: 'timeout',
        latency: TIMEOUT_MS
      });
    });
  });
}

async function main() {
  const targetService = process.argv.find(a => a.startsWith('--service='));
  const targets = targetService
    ? SERVICES.filter(s => s.name === targetService.split('=')[1])
    : SERVICES;

  process.stdout.write(JSON.stringify({
    level: 'info',
    message: 'Smoke tests starting',
    services: targets.length,
    timeout: TIMEOUT_MS
  }) + '\n');

  const results = await Promise.all(targets.map(checkHealth));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  for (const result of results) {
    process.stdout.write(JSON.stringify({ level: result.status === 'pass' ? 'info' : 'error', ...result }) + '\n');
  }

  process.stdout.write(JSON.stringify({
    level: failed > 0 ? 'error' : 'info',
    message: 'Smoke tests complete',
    passed,
    failed,
    total: results.length
  }) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
