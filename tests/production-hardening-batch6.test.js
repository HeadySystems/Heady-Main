'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('vector federation structured warnings', () => {
  const src = readFile('services/heady-web/src/vector-federation.js');

  test('defines structuredWarn helper', () => {
    expect(src).toContain("function structuredWarn(event, details = {})");
    expect(src).toContain("service: 'heady-web-vector-federation'");
  });

  test('replaces replication and gossip console warnings with structured events', () => {
    expect(src).toContain('vector_replication_push_failed');
    expect(src).toContain('vector_gossip_cycle_failed');
    expect(src).toContain('vector_gossip_pull_failed');
    expect(src).toContain('vector_federated_search_peer_failed');
    expect(src).not.toMatch(/console\.(warn|log|error)\(/);
  });
});

describe('webpack and nginx wildcard CORS cleanup', () => {
  const nginx = readFile('apps/headyweb/nginx.conf');
  const shellWebpack = readFile('apps/headyweb/webpack.config.js');
  const rootWebpack = readFile('webpack.config.js');
  const templateWebpack = readFile('templates/template-heady-ui/webpack.config.js');

  test('nginx no longer emits wildcard CORS for remotes', () => {
    expect(nginx).not.toContain('Access-Control-Allow-Origin  "*"');
    expect(nginx).toContain('set $heady_allowed_origin "";');
    expect(nginx).toContain('add_header Vary "Origin" always;');
  });

  test('webpack dev servers use env-driven allowed origin instead of wildcard', () => {
    for (const src of [shellWebpack, rootWebpack, templateWebpack]) {
      expect(src).toContain('HEADY_DEV_ALLOWED_ORIGIN');
      expect(src).not.toContain("'Access-Control-Allow-Origin': '*'");
      expect(src).toContain("'Vary': 'Origin'");
    }
  });
});

describe('shared CORS policy wildcard removal', () => {
  const src = readFile('src/middleware/cors-policy.js');
  const securityReexport = readFile('src/middleware/security/cors-policy.js');

  test('public API path reflects validated origin instead of wildcard', () => {
    expect(src).toContain("event: 'cors_public_blocked'");
    expect(src).toContain("res.set('Access-Control-Allow-Origin', origin);");
    expect(src).not.toContain("res.set('Access-Control-Allow-Origin', '*');");
  });

  test('publicCors helper validates origin instead of allowing wildcard', () => {
    expect(src).toContain("function publicCors(methods = ['GET', 'POST'], opts = {})");
    expect(src).toContain("const validation = validateOrigin(origin");
    expect(src).not.toMatch(/function publicCors[\s\S]*Access-Control-Allow-Origin', '\*'/);
  });

  test('security middleware path re-exports the shared implementation', () => {
    expect(securityReexport.trim()).toBe("'use strict';\n\nmodule.exports = require('../cors-policy');");
  });
});
