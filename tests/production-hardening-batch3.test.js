'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('production hardening — batch 3', () => {

  // ── CORS: API Gateway ─────────────────────────────────────────────────────

  test('api-gateway uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'services/api-gateway.js'), 'utf8');
    expect(src).not.toMatch(/app\.use\(cors\(\)\)/);
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
    expect(src).toMatch(/origin.*cb/);
  });

  test('api-gateway uses structured logging instead of console.log banner', () => {
    const src = fs.readFileSync(path.join(ROOT, 'services/api-gateway.js'), 'utf8');
    expect(src).not.toMatch(/console\.log\(/);
    expect(src).toMatch(/structuredLog\(/);
  });

  // ── CORS: SSE Streaming ───────────────────────────────────────────────────

  test('sse-streaming uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/sse-streaming.js'), 'utf8');
    expect(src).not.toMatch(/"Access-Control-Allow-Origin":\s*"\*"/);
    expect(src).toMatch(/SSE_ALLOWED_ORIGINS/);
    expect(src).toMatch(/Vary.*Origin/);
  });

  // ── CORS: Compute Dashboard ───────────────────────────────────────────────

  test('compute-dashboard SSE uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/runtime/compute-dashboard.js'), 'utf8');
    expect(src).not.toMatch(/"Access-Control-Allow-Origin":\s*"\*"/);
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
  });

  // ── CORS: MCP Transport Worker ────────────────────────────────────────────

  test('mcp-transport worker uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'workers/mcp-transport/src/index.ts'), 'utf8');
    expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
    expect(src).toMatch(/ALLOWED_ORIGINS/);
    expect(src).toMatch(/getCorsOrigin/);
  });

  // ── CORS: Projection SSE ─────────────────────────────────────────────────

  test('projection-sse uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/projection/projection-sse.js'), 'utf8');
    expect(src).not.toMatch(/setHeader\('Access-Control-Allow-Origin',\s*'\*'\)/);
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
  });

  // ── CORS: MCP Transport (Node) ───────────────────────────────────────────

  test('mcp-transport node module uses env-driven CORS instead of wildcard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/mcp/mcp-transport.js'), 'utf8');
    expect(src).not.toMatch(/setHeader\('Access-Control-Allow-Origin',\s*'\*'\)/);
    expect(src).toMatch(/HEADY_CORS_ORIGINS/);
  });

  // ── Silent Catches → Logged ───────────────────────────────────────────────

  test('heady-infer router emits events instead of swallowing errors', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/services/heady-infer/router.js'), 'utf8');
    expect(src).not.toMatch(/catch\s*\(_\)\s*\{\s*\}/);
    expect(src).toMatch(/routing_error/);
  });

  test('self-healer logs callback errors instead of swallowing them', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/src/resilience/self-healer.js'), 'utf8');
    expect(src).toMatch(/callback_error/);
    // The three transition callbacks should all log
    const matches = src.match(/callback_error/g);
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  test('conductor-integration logs audit and weight-inject failures', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/projection/conductor-integration.js'), 'utf8');
    expect(src).toMatch(/audit_write_failed/);
    expect(src).toMatch(/conductor_group_weight_inject_failed/);
  });

  // ── Structured Logging ────────────────────────────────────────────────────

  test('cors-policy uses structured stderr instead of console.warn', () => {
    const secSrc = fs.readFileSync(path.join(ROOT, 'src/middleware/security/cors-policy.js'), 'utf8');
    const mwSrc = fs.readFileSync(path.join(ROOT, 'src/middleware/cors-policy.js'), 'utf8');
    expect(secSrc).not.toMatch(/console\.warn/);
    expect(mwSrc).not.toMatch(/console\.warn/);
    expect(mwSrc).toMatch(/process\.stderr\.write.*cors_blocked/);
    expect(secSrc).toContain("module.exports = require('../cors-policy');");
  });

  // ── Placeholder endpoints ─────────────────────────────────────────────────

  test('heady-brain chat returns 501 Not Implemented instead of fake data', () => {
    const src = fs.readFileSync(path.join(ROOT, 'services/heady-brain/src/routes/chat.ts'), 'utf8');
    expect(src).toMatch(/501/);
    expect(src).toMatch(/Not Implemented/);
    expect(src).not.toMatch(/Echo:/);
  });

  test('heady-brain analyze returns 501 Not Implemented instead of fake data', () => {
    const src = fs.readFileSync(path.join(ROOT, 'services/heady-brain/src/routes/analyze.ts'), 'utf8');
    expect(src).toMatch(/501/);
    expect(src).toMatch(/Not Implemented/);
    expect(src).not.toMatch(/Analysis placeholder/);
  });
});
