const pino = require('pino');
const logger = pino();
#!/usr/bin/env node
/**
 * Heady™ Endpoint Validation Script
 * Verifies all documented endpoints are reachable and properly configured
 * Usage: node scripts/validate-endpoints.js
 */

const https = require('https');
const http = require('http');

const ENDPOINTS = {
  production: [
    { url: 'https://headyme.com', name: 'HeadyMe Admin', required: true },
    { url: 'https://headysystems.com', name: 'HeadySystems', required: true },
    { url: 'https://headyconnection.org', name: 'HeadyConnection', required: true },
    { url: 'https://headyio.com', name: 'HeadyIO Docs', required: true },
    { url: 'https://headymcp.com', name: 'HeadyMCP', required: true },
    { url: 'https://headybuddy.org', name: 'HeadyBuddy', required: true },
    { url: 'https://headybot.com', name: 'HeadyBot', required: true },
  ],
  backend: [
    { url: 'https://heady-manager-609590223909.us-central1.run.app/health', name: 'Heady Manager', required: false },
    { url: 'https://heady.headyme.com', name: 'Edge Proxy', required: false },
  ],
  deprecated: [
    { url: 'https://headyme-heady-ai.hf.space', name: 'HF Heady AI', required: false },
    { url: 'https://headyme-heady-demo.hf.space', name: 'HF Heady Demo', required: false },
  ]
};

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(endpoint.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'HeadyEndpointValidator/1.0' }
    }, (res) => {
      resolve({
        ...endpoint,
        status: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 400,
        headers: res.headers,
      });
    });

    req.on('error', (err) => {
      resolve({
        ...endpoint,
        status: 0,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...endpoint,
        status: 0,
        success: false,
        error: 'Timeout',
      });
    });
  });
}

async function validateAll() {
  logger.info('🔍 Heady Endpoint Validation\n');
  logger.info('═'.repeat(70));

  let totalChecks = 0;
  let passedChecks = 0;
  let criticalFails = 0;

  for (const [category, endpoints] of Object.entries(ENDPOINTS)) {
    logger.info(`\n📂 ${category.toUpperCase()}\n`);

    for (const endpoint of endpoints) {
      totalChecks++;
      const result = await checkEndpoint(endpoint);

      const icon = result.success ? '✅' : '❌';
      const statusText = result.status || 'UNREACHABLE';

      logger.info(`${icon} ${result.name}`);
      logger.info(`   URL: ${result.url}`);
      logger.info(`   Status: ${statusText}`);

      if (result.error) {
        logger.info(`   Error: ${result.error}`);
      }

      if (result.success) {
        passedChecks++;
        if (result.headers['x-heady-version']) {
          logger.info(`   Version: ${result.headers['x-heady-version']}`);
        }
      } else if (result.required) {
        criticalFails++;
        logger.info(`   ⚠️  CRITICAL: Required endpoint is down!`);
      }

      logger.info('');
    }
  }

  logger.info('═'.repeat(70));
  logger.info(`\n📊 SUMMARY\n`);
  logger.info(`Total Checks: ${totalChecks}`);
  logger.info(`Passed: ${passedChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);
  logger.info(`Failed: ${totalChecks - passedChecks}`);
  logger.info(`Critical Failures: ${criticalFails}`);

  if (criticalFails > 0) {
    logger.info('\n❌ VALIDATION FAILED: Critical endpoints are down!');
    process.exit(1);
  } else if (passedChecks === totalChecks) {
    logger.info('\n✅ ALL ENDPOINTS VERIFIED');
    process.exit(0);
  } else {
    logger.info('\n⚠️  VALIDATION PASSED WITH WARNINGS');
    process.exit(0);
  }
}

validateAll().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
