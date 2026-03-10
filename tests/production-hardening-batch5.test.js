/**
 * Production Hardening — Batch 5 Tests
 *
 * Covers:
 *   1. CORS wildcard fallback elimination in heady-api-gateway-v2.js
 *   2. Silent failure path remediation across 5 files (14 catches total)
 *   3. Structured logging migration in site-router.js and heady-api-gateway-v2.js
 *   4. Firebase-admin placeholder hardening in onboarding auth callback
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// ── 1. CORS wildcard fallback ────────────────────────────────────────────────

describe('heady-api-gateway-v2 CORS', () => {
  const src = readFile('src/core/heady-api-gateway-v2.js');

  test('no longer falls back to wildcard "*" when origin is empty', () => {
    // The old pattern was: origin || '*'
    // The new pattern should be: origin || 'null'
    expect(src).not.toMatch(/origin\s*\|\|\s*['"]\*['"]/);
  });

  test('uses "null" instead of wildcard for missing origin', () => {
    expect(src).toContain("origin || 'null'");
  });
});

// ── 2. Silent failure remediation — heady-api-gateway-v2 lazy singletons ────

describe('heady-api-gateway-v2 lazy singleton catches', () => {
  const src = readFile('src/core/heady-api-gateway-v2.js');

  test('mesh getter logs optional_dep_missing', () => {
    expect(src).toMatch(/optional_dep_missing.*heady-service-mesh/);
  });

  test('obs getter logs optional_dep_missing', () => {
    expect(src).toMatch(/optional_dep_missing.*heady-observability/);
  });

  test('cfg getter logs optional_dep_missing', () => {
    expect(src).toMatch(/optional_dep_missing.*heady-config-server/);
  });

  test('bus getter logs optional_dep_missing', () => {
    expect(src).toMatch(/optional_dep_missing.*heady-event-bus/);
  });
});

// ── 3. Structured logging — heady-api-gateway-v2 ────────────────────────────

describe('heady-api-gateway-v2 structured logging', () => {
  const src = readFile('src/core/heady-api-gateway-v2.js');

  test('startup uses structured JSON instead of console.log', () => {
    expect(src).toContain('gateway_v2_started');
    expect(src).not.toMatch(/console\.log.*Listening on port/);
  });

  test('shutdown uses structured JSON instead of console.log', () => {
    expect(src).toContain('gateway_v2_shutdown');
    expect(src).not.toMatch(/console\.log.*draining connections/);
  });

  test('fatal error uses structured JSON instead of console.error', () => {
    expect(src).toContain('gateway_v2_fatal');
  });
});

// ── 4. Silent failure remediation — heady-auto-context.js ────────────────────

describe('heady-auto-context silent catch remediation', () => {
  const src = readFile('src/services/heady-auto-context.js');

  test('VectorMemory import catch logs debug message', () => {
    expect(src).toMatch(/VectorMemory not available/);
  });

  test('cosineSimilarity import catch logs debug message', () => {
    expect(src).toMatch(/cosineSimilarity not available/);
  });

  test('watcher per-dir catch logs debug message', () => {
    expect(src).toMatch(/dir not watchable/);
  });

  test('fs.watch outer catch logs debug message', () => {
    expect(src).toMatch(/fs\.watch not available/);
  });

  test('_gatherPriorPatterns catch logs warning', () => {
    expect(src).toMatch(/_gatherPriorPatterns failed/);
  });

  test('_gatherDomainContext catch logs warning', () => {
    expect(src).toMatch(/_gatherDomainContext readdir failed/);
  });
});

// ── 5. Silent failure remediation — bin/heady-cli.js ─────────────────────────

describe('heady-cli silent catch remediation', () => {
  const src = readFile('bin/heady-cli.js');

  test('AutoContext load catch logs structured event', () => {
    expect(src).toMatch(/cli_autocontext_load_failed/);
  });

  test('domain registry read catch logs structured event', () => {
    expect(src).toMatch(/cli_domain_registry_read_failed/);
  });

  test('history load catch logs structured event', () => {
    expect(src).toMatch(/cli_history_load_failed/);
  });

  test('history save catch logs structured event', () => {
    expect(src).toMatch(/cli_history_save_failed/);
  });
});

// ── 6. Silent failure remediation — bin/cli-auth.js ──────────────────────────

describe('cli-auth silent catch remediation', () => {
  const src = readFile('bin/cli-auth.js');

  test('loadCredentials catch logs structured event', () => {
    expect(src).toMatch(/cli_credential_load_failed/);
  });
});

// ── 7. Silent failure remediation — projection/index.js heartbeat ────────────

describe('projection service heartbeat catch', () => {
  const src = readFile('services/heady-projection/index.js');

  test('heartbeat catch logs instead of swallowing', () => {
    expect(src).toMatch(/Conductor heartbeat failed/);
    expect(src).not.toMatch(/catch\s*\{\s*\/\*\s*conductor offline\s*\*\/\s*\}/);
  });
});

// ── 8. Structured logging — site-router.js ───────────────────────────────────

describe('site-router structured logging', () => {
  const src = readFile('services/heady-web/template-engine/site-router.js');

  test('defines structuredLog, structuredWarn, structuredError helpers', () => {
    expect(src).toContain('function structuredLog(');
    expect(src).toContain('function structuredWarn(');
    expect(src).toContain('function structuredError(');
  });

  test('no remaining console.log/warn/error calls (outside comments)', () => {
    // Filter out comment lines and the jsdoc example
    const codeLines = src.split('\n').filter(l => {
      const trimmed = l.trim();
      return !trimmed.startsWith('*') && !trimmed.startsWith('//');
    }).join('\n');
    expect(codeLines).not.toMatch(/console\.(log|warn|error)\(/);
  });

  test('uses structured event names for vertical router operations', () => {
    expect(src).toContain('vertical_registry_not_found');
    expect(src).toContain('vertical_registry_reload_failed');
    expect(src).toContain('vertical_unknown_id');
    expect(src).toContain('vertical_config_load_failed');
    expect(src).toContain('vertical_router_error');
    expect(src).toContain('vertical_default_config_fatal');
    expect(src).toContain('vertical_registry_changed');
    expect(src).toContain('vertical_registry_watch_failed');
  });
});

// ── 9. Firebase-admin placeholder hardening ──────────────────────────────────

describe('onboarding auth callback hardening', () => {
  const src = readFile('services/heady-onboarding/src/app/api/auth/callback/route.ts');

  test('has HEADY_REQUIRE_FIREBASE_ADMIN production gate', () => {
    expect(src).toContain('HEADY_REQUIRE_FIREBASE_ADMIN');
  });

  test('returns 501 when firebase-admin is required but not wired', () => {
    expect(src).toContain('status: 501');
    expect(src).toContain('Server-side token verification not yet configured');
  });

  test('logs auth_callback_firebase_admin_not_wired event', () => {
    expect(src).toContain('auth_callback_firebase_admin_not_wired');
  });

  test('lookupUser catch logs structured event instead of being silent', () => {
    expect(src).toContain('lookup_user_failed');
  });
});
