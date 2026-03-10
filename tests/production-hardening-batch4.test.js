'use strict';

/**
 * Production Hardening Batch 4 — Tests
 *
 * Covers:
 *   - Silent catch block remediation (9 files)
 *   - Structured logging migration (heady-vector server)
 *   - CORS wildcard elimination (7 active endpoints/configs)
 *   - Placeholder hardening (respawn-controller, quarantine-manager)
 *   - Operator documentation (public-domain-health runbook)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ═══ Silent catch block remediation ══════════════════════════════════════════

describe('Silent catch blocks — batch 4', () => {
  test('swarm-coordinator subscriber catch logs errors', () => {
    const src = readSrc('swarm-coordinator.js');
    expect(src).toMatch(/swarm_subscriber_error/);
    expect(src).not.toMatch(/try\s*\{\s*handler\(env\);\s*\}\s*catch\s*\(_\)\s*\{\s*\}/);
  });

  test('infer response-cache warm catch logs errors', () => {
    const src = readSrc('src/services/heady-infer/response-cache.js');
    expect(src).toMatch(/cache_warm_entry_failed/);
  });

  test('openai provider stream parse catch logs errors', () => {
    const src = readSrc('src/services/heady-infer/providers/openai.js');
    expect(src).toMatch(/openai_stream_parse_error/);
  });

  test('local provider stream parse catch logs errors', () => {
    const src = readSrc('src/services/heady-infer/providers/local.js');
    expect(src).toMatch(/local_stream_parse_error/);
  });

  test('groq provider stream parse catch logs errors', () => {
    const src = readSrc('src/services/heady-infer/providers/groq.js');
    expect(src).toMatch(/groq_stream_parse_error/);
  });

  test('google provider stream parse catch logs errors', () => {
    const src = readSrc('src/services/heady-infer/providers/google.js');
    expect(src).toMatch(/google_stream_parse_error/);
  });

  test('projection-swarm audit dir catch logs errors', () => {
    const src = readSrc('src/projection/projection-swarm.js');
    expect(src).toMatch(/swarm_audit_dir_failed/);
  });

  test('cloud-conductor-integration audit write catch logs errors', () => {
    const src = readSrc('src/projection/cloud-conductor-integration.js');
    expect(src).toMatch(/cloud_conductor_audit_write_failed/);
  });
});

// ═══ Structured logging — heady-vector ══════════════════════════════════════

describe('Structured logging — heady-vector server', () => {
  test('server.js uses structuredLog/structuredError instead of console.*', () => {
    const src = readSrc('services/heady-vector/server.js');
    expect(src).toMatch(/structuredLog/);
    expect(src).toMatch(/structuredError/);
    expect(src).not.toMatch(/console\.(log|error|warn)/);
  });

  test('server.js emits JSON boot event', () => {
    const src = readSrc('services/heady-vector/server.js');
    expect(src).toMatch(/listening/);
    expect(src).toMatch(/structuredLog/);
  });

  test('server.js CORS uses env-driven origins not wildcard', () => {
    const src = readSrc('services/heady-vector/server.js');
    expect(src).toMatch(/HEADY_CORS_ORIGINS|CORS_ORIGIN/);
    expect(src).not.toMatch(/origin:\s*['"]?\*['"]?\s*,/);
  });
});

// ═══ CORS wildcard elimination — batch 4 ════════════════════════════════════

describe('CORS wildcard elimination — batch 4', () => {
  test('colab-mcp-bridge SSE uses env-driven CORS', () => {
    const src = readSrc('src/mcp/colab-mcp-bridge.js');
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
    expect(src).toMatch(/_mcpBridgeOrigins/);
    // No more raw wildcard in headers
    const headerWildcards = (src.match(/'Access-Control-Allow-Origin':\s*'\*'/g) || []).length;
    expect(headerWildcards).toBe(0);
  });

  test('service-routes.js does not use wildcard CORS', () => {
    const src = readSrc('src/bootstrap/service-routes.js');
    expect(src).not.toMatch(/Access-Control-Allow-Origin",\s*"\*"/);
  });

  test('dynamic-site-server uses env-driven CORS', () => {
    const src = readSrc('src/core/dynamic-site-server.js');
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
    expect(src).toMatch(/Vary.*Origin/i);
  });

  test('auth-page-server uses env-driven CORS', () => {
    const src = readSrc('src/auth/auth-page-server.js');
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
    expect(src).toMatch(/Vary.*Origin/i);
  });

  test('edge-worker uses static allowlist CORS', () => {
    const src = readSrc('src/edge/edge-worker.js');
    expect(src).toMatch(/_edgeAllowedOrigins/);
    expect(src).not.toMatch(/headers\.set\('Access-Control-Allow-Origin',\s*'\*'\)/);
  });

  test('domain-registry removes wildcard CORS from API config', () => {
    const src = readSrc('src/config/domain-registry.js');
    // Should no longer have origins: ['*'] or Allow-Origin: '*' in the headyapi entry
    expect(src).not.toMatch(/origins:\s*\['\*'\]/);
    expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
  });

  test('edge domain-router removes wildcard CORS header from config', () => {
    const src = readSrc('src/edge/domain-router.js');
    expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
  });

  test('sdk-services SSE uses env-driven CORS', () => {
    const src = readSrc('src/integrations/sdk-services.js');
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
    expect(src).toMatch(/_sdkOrigins/);
  });
});

// ═══ Placeholder hardening ══════════════════════════════════════════════════

describe('Placeholder hardening — batch 4', () => {
  test('respawn-controller restartService returns false (not silently true)', () => {
    const src = readSrc('services/heady-health/resilience/respawn-controller.js');
    expect(src).toMatch(/return false/);
    expect(src).toMatch(/no restart mechanism is wired/);
    expect(src).not.toMatch(/\/\/ Placeholder - implement/);
  });

  test('quarantine-manager logs when isolation not wired', () => {
    const src = readSrc('services/heady-health/resilience/quarantine-manager.js');
    expect(src).toMatch(/isolation not yet wired/);
    expect(src).not.toMatch(/\/\/ TODO: Remove from MCP router/);
  });
});

// ═══ Operator documentation ═════════════════════════════════════════════════

describe('Operator documentation — batch 4', () => {
  test('public-domain-health runbook exists', () => {
    const runbook = path.join(ROOT, 'docs/runbooks/public-domain-health.md');
    expect(fs.existsSync(runbook)).toBe(true);
    const content = fs.readFileSync(runbook, 'utf8');
    expect(content).toMatch(/522/);
    expect(content).toMatch(/headyme\.com/);
    expect(content).toMatch(/Cloudflare/);
    expect(content).toMatch(/Cloud Run/);
  });
});
