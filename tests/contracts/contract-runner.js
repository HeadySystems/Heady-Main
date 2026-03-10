/**
 * Contract Test Runner — Discovers and runs contract test files
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const contractDir = __dirname;
let passed = 0;
let failed = 0;

const files = fs.readdirSync(contractDir).filter(f => f.endsWith('.test.js'));

for (const file of files) {
  const tests = require(path.join(contractDir, file));
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      passed++;
      process.stdout.write(JSON.stringify({ level: 'info', test: name, file, status: 'pass' }) + '\n');
    } catch (err) {
      failed++;
      process.stdout.write(JSON.stringify({ level: 'error', test: name, file, status: 'fail', error: err.message }) + '\n');
    }
  }
}

process.stdout.write(JSON.stringify({
  level: 'info',
  message: 'Contract tests complete',
  passed,
  failed,
  total: passed + failed
}) + '\n');

process.exit(failed > 0 ? 1 : 0);
