'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('probe orchestrator hardening', () => {
  const src = readFile('services/heady-health/probe-orchestrator.js');

  test('uses shared structured logger instead of console output', () => {
    expect(src).toContain("const { getLogger } = require('../../src/services/structured-logger');");
    expect(src).toContain("const logger = getLogger('heady-health-probe-orchestrator');");
    expect(src).not.toMatch(/console\.(log|warn|error)\(/);
  });

  test('derives probe intervals and request timeouts from fibonacci helpers', () => {
    expect(src).toContain('const { fib } = require(\'../../src/shared/phi-math\');');
    expect(src).toContain('const DEFAULT_PROBE_INTERVALS = Object.freeze({');
    expect(src).toContain('ping: fib(6) * 1000');
    expect(src).toContain('functional: fib(9) * 1000');
    expect(src).toContain('e2e: fib(13) * 1000');
    expect(src).toContain('visual: fib(15) * 1000');
    expect(src).toContain('sweep: fib(19) * 1000');
    expect(src).toContain('const DEFAULT_TIMEOUTS = Object.freeze({');
    expect(src).toContain('head: fib(7) * 1000');
    expect(src).toContain('get: fib(8) * 1000');
    expect(src).toContain('headers: fib(7) * 1000');
  });

  test('logs sweep lifecycle and exports defaults for reuse', () => {
    expect(src).toContain("event: 'probe_sweep_started'");
    expect(src).toContain("event: 'probe_result'");
    expect(src).toContain("event: 'probe_sweep_summary'");
    expect(src).toContain("event: 'probe_cli_complete'");
    expect(src).toContain("event: 'probe_cli_failed'");
    expect(src).toContain("event: 'probe_cli_usage'");
    expect(src).toContain('module.exports = { ProbeOrchestrator, DEFAULT_PROBE_INTERVALS, DEFAULT_TIMEOUTS };');
  });

  test('applies bounded request timeouts to all HTTP helper paths', () => {
    expect(src).toContain('timeout: this.requestTimeouts.head');
    expect(src).toContain('timeout: this.requestTimeouts.get');
    expect(src).toContain('timeout: this.requestTimeouts.headers');
    expect(src).toContain("req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });");
  });
});
