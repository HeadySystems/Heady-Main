/**
 * Routing, Docs, and Auth Hardening Pass — Targeted Tests
 * Generated: 2026-03-10 by Heady™ Autonomous Cycle (Batch 8)
 *
 * Validates:
 *   1. domain-router.js — all audited public domains resolve correctly
 *   2. ui-registry.js — all audited domains have UI entries
 *   3. vertical-registry.json — structural consistency and canonical/alias correctness
 *   4. domain-registry.js — all audited domains are registered
 *   5. site-router.js — default fallback emits structured warning
 */

'use strict';

const path = require('path');
const fs   = require('fs');

/* ── Helpers ────────────────────────────────────────────────────────── */

function loadModuleSafe(relPath) {
  const abs = path.resolve(__dirname, '..', relPath);
  try { return require(abs); } catch { return null; }
}

/* ── 1. domain-router.js ──────────────────────────────────────────── */

describe('domain-router — audited public domains', () => {
  let domainRouter;

  beforeAll(() => {
    domainRouter = loadModuleSafe('services/heady-web/src/services/domain-router.js');
  });

  test('module loads without throwing', () => {
    expect(domainRouter).not.toBeNull();
  });

  test('exports resolveDomain and getDomainMap', () => {
    expect(typeof domainRouter.resolveDomain).toBe('function');
    expect(typeof domainRouter.getDomainMap).toBe('function');
  });

  const expectedDomains = [
    ['headyme.com',            'antigravity'],
    ['headysystems.com',       'landing'],
    ['headyos.com',            'heady-os'],
    ['headyconnection.org',    'vector-explorer'],
    ['headyconnection.com',    'vector-explorer'],
    ['headyfinance.com',       'investments'],
    ['headyex.com',            'exchange'],
    ['admin.headysystems.com', 'admin-dashboard'],
  ];

  test.each(expectedDomains)(
    'resolveDomain(%s) → uiId=%s',
    (hostname, expectedUiId) => {
      const result = domainRouter.resolveDomain(hostname);
      expect(result).not.toBeNull();
      expect(result.uiId).toBe(expectedUiId);
    },
  );

  test('getDomainMap includes all audited domains', () => {
    const map = domainRouter.getDomainMap();
    for (const [domain] of expectedDomains) {
      expect(domain in map).toBe(true);
    }
  });

  test('headyconnection.com does NOT resolve to headyme', () => {
    const result = domainRouter.resolveDomain('headyconnection.com');
    expect(result).not.toBeNull();
    expect(result.uiId).not.toBe('antigravity');
  });

  test('headyex.com does NOT resolve to headyme', () => {
    const result = domainRouter.resolveDomain('headyex.com');
    expect(result).not.toBeNull();
    expect(result.uiId).not.toBe('antigravity');
  });

  test('admin.headysystems.com does NOT resolve to headyex', () => {
    const result = domainRouter.resolveDomain('admin.headysystems.com');
    expect(result).not.toBeNull();
    expect(result.uiId).not.toBe('exchange');
  });
});

/* ── 2. ui-registry.js ────────────────────────────────────────────── */

describe('ui-registry — audited domains have UI entries', () => {
  let uiRegistry;

  beforeAll(() => {
    uiRegistry = loadModuleSafe('services/heady-web/src/services/ui-registry.js');
  });

  test('module loads without throwing', () => {
    expect(uiRegistry).not.toBeNull();
  });

  const auditedDomains = [
    'headyme.com',
    'headysystems.com',
    'headyos.com',
    'headyconnection.org',
    'headyconnection.com',
    'headyfinance.com',
    'headyex.com',
    'admin.headysystems.com',
  ];

  test.each(auditedDomains)(
    'resolveUI(%s) returns a non-null config',
    (hostname) => {
      const cfg = uiRegistry.resolveUI(hostname);
      expect(cfg).not.toBeNull();
      expect(cfg.uiId).toBeDefined();
    },
  );

  test('headyconnection.com maps to vector-explorer, not antigravity', () => {
    const cfg = uiRegistry.resolveUI('headyconnection.com');
    expect(cfg.uiId).toBe('vector-explorer');
  });

  test('admin.headysystems.com maps to admin-dashboard', () => {
    const cfg = uiRegistry.resolveUI('admin.headysystems.com');
    expect(cfg.uiId).toBe('admin-dashboard');
  });
});

/* ── 3. vertical-registry.json ────────────────────────────────────── */

describe('vertical-registry.json — structural consistency', () => {
  let registry;

  beforeAll(() => {
    const regPath = path.resolve(__dirname, '..', 'services/heady-web/template-engine/vertical-registry.json');
    const raw = fs.readFileSync(regPath, 'utf8');
    registry = JSON.parse(raw);
  });

  test('parses without error', () => {
    expect(registry).toBeDefined();
    expect(Array.isArray(registry.verticals)).toBe(true);
  });

  test('headysystems has its own config_path, not headyme/config.json', () => {
    const hs = registry.verticals.find(v => v.vertical_id === 'headysystems');
    expect(hs).toBeDefined();
    expect(hs.config_path).not.toBe('headyme/config.json');
    expect(hs.config_path).toBe('headysystems/config.json');
  });

  test('headyconnection canonical domain is .org, not .com', () => {
    const hc = registry.verticals.find(v => v.vertical_id === 'headyconnection');
    expect(hc).toBeDefined();
    expect(hc.domain).toBe('headyconnection.org');
    expect(hc.aliases).toContain('headyconnection.com');
  });

  test('admin.headysystems.com is listed as a headysystems alias', () => {
    const hs = registry.verticals.find(v => v.vertical_id === 'headysystems');
    expect(hs.aliases).toContain('admin.headysystems.com');
  });

  test('every vertical has a unique vertical_id', () => {
    const ids = registry.verticals.map(v => v.vertical_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every active vertical has a config_path', () => {
    const active = registry.verticals.filter(v => v.status === 'active');
    for (const v of active) {
      expect(v.config_path).toBeTruthy();
    }
  });
});

/* ── 4. domain-registry.js — audited domains are registered ─────── */

describe('domain-registry.js — audited domains present', () => {
  let DOMAIN_DEFINITIONS;

  beforeAll(() => {
    // domain-registry.js uses ESM export syntax but is tested via the raw text
    // We parse it structurally instead
    const filePath = path.resolve(__dirname, '..', 'src/config/domain-registry.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract all domain: '...' values
    const domainRegex = /domain:\s+'([^']+)'/g;
    const aliasRegex  = /aliases:\s+\[([^\]]*)\]/g;

    const domains = [];
    let m;
    while ((m = domainRegex.exec(content)) !== null) domains.push(m[1]);

    const aliases = [];
    while ((m = aliasRegex.exec(content)) !== null) {
      const entries = m[1].match(/'[^']+'/g) || [];
      aliases.push(...entries.map(s => s.replace(/'/g, '')));
    }

    DOMAIN_DEFINITIONS = { domains, aliases, allHosts: [...domains, ...aliases] };
  });

  const requiredDomains = [
    'headyme.com',
    'headysystems.com',
    'headyos.com',
    'headyconnection.org',
    'headyfinance.com',
    'headyex.com',
  ];

  test.each(requiredDomains)(
    '%s is a registered canonical domain',
    (domain) => {
      expect(DOMAIN_DEFINITIONS.domains).toContain(domain);
    },
  );

  test('headyconnection.com is an alias of headyconnection.org', () => {
    expect(DOMAIN_DEFINITIONS.aliases).toContain('headyconnection.com');
  });

  test('admin.headysystems.com is an alias of headysystems.com', () => {
    expect(DOMAIN_DEFINITIONS.aliases).toContain('admin.headysystems.com');
  });
});

/* ── 5. site-router.js — default fallback warning ────────────────── */

describe('site-router.js — default fallback emits warning', () => {
  let siteRouter;

  beforeAll(() => {
    siteRouter = loadModuleSafe('services/heady-web/template-engine/site-router.js');
  });

  test('module loads without throwing', () => {
    expect(siteRouter).not.toBeNull();
  });

  test('VerticalResolver falls back with structured warning for unknown domain', () => {
    const stderrWrites = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (msg) => { stderrWrites.push(msg); return true; };

    try {
      const resolver = new siteRouter.VerticalResolver({
        registryPath: path.resolve(__dirname, '..', 'services/heady-web/template-engine/vertical-registry.json'),
      });
      const result = resolver.resolveVerticalId('totally-unknown-domain.example.com');
      expect(result).toBe('headyme'); // still falls back to default
      // Check that a warning was emitted
      const warningEmitted = stderrWrites.some(w => w.includes('vertical_default_fallback'));
      expect(warningEmitted).toBe(true);
    } finally {
      process.stderr.write = origWrite;
    }
  });

  test('VerticalResolver does NOT warn for known domains', () => {
    const stderrWrites = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (msg) => { stderrWrites.push(msg); return true; };

    try {
      const resolver = new siteRouter.VerticalResolver({
        registryPath: path.resolve(__dirname, '..', 'services/heady-web/template-engine/vertical-registry.json'),
      });
      const result = resolver.resolveVerticalId('headyme.com');
      expect(result).toBe('headyme');
      const fallbackWarning = stderrWrites.some(w => w.includes('vertical_default_fallback'));
      expect(fallbackWarning).toBe(false);
    } finally {
      process.stderr.write = origWrite;
    }
  });
});

/* ── 6. docs discoverability ──────────────────────────────────────── */

describe('docs discoverability — key docs exist', () => {
  const docFiles = [
    'docs/README.md',
    'docs/QUICK_REFERENCE.md',
    'docs/runbooks/heady-web.md',
    'docs/runbooks/heady-manager.md',
    'docs/runbooks/heady-auth.md',
    'docs/runbooks/heady-memory.md',
    'docs/runbooks/public-domain-health.md',
  ];

  test.each(docFiles)(
    '%s exists',
    (docPath) => {
      const abs = path.resolve(__dirname, '..', docPath);
      expect(fs.existsSync(abs)).toBe(true);
    },
  );

  test('docs/README.md contains a domain routing section', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '..', 'docs/README.md'), 'utf8');
    expect(content).toMatch(/[Dd]omain.*[Rr]out/);
  });
});
