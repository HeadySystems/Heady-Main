const pino = require('pino');
const logger = pino();
#!/usr/bin/env node
/**
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 * 
 * ═══ Heady™ Patent Test Runner ═══
 * Runs all test suites for patent implementations.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testsDir = path.join(__dirname, 'tests');
const testFiles = fs.readdirSync(testsDir)
    .filter(f => f.startsWith('test-') && f.endsWith('.js'))
    .sort();

logger.info('═══════════════════════════════════════════════════════');
logger.info('  Heady™ Patent Implementation Test Suite');
logger.info('  © 2026 Heady™Systems Inc.');
logger.info('═══════════════════════════════════════════════════════');
logger.info(`\n  Found ${testFiles.length} test suites\n`);

let totalPassed = 0;
let totalFailed = 0;
let failedSuites = [];

for (const file of testFiles) {
    const filePath = path.join(testsDir, file);
    const label = file.replace('test-', '').replace('.js', '');
    
    try {
        const output = execSync(`node "${filePath}"`, {
            timeout: 30000,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        
        // Parse pass/fail from output
        const passMatch = output.match(/(\d+)\s*(?:passed|✓|PASS)/i);
        const failMatch = output.match(/(\d+)\s*(?:failed|✗|FAIL)/i);
        const passed = passMatch ? parseInt(passMatch[1]) : 0;
        const failed = failMatch ? parseInt(failMatch[1]) : 0;
        
        totalPassed += passed;
        totalFailed += failed;
        
        const status = failed === 0 ? '✓ PASS' : '✗ FAIL';
        logger.info(`  ${status}  ${label.padEnd(30)} ${passed} passed, ${failed} failed`);
        
        if (failed > 0) failedSuites.push(file);
    } catch (err) {
        totalFailed++;
        failedSuites.push(file);
        logger.info(`  ✗ FAIL  ${label.padEnd(30)} ERROR: ${err.message.split('\n')[0]}`);
    }
}

logger.info('\n═══════════════════════════════════════════════════════');
logger.info(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
logger.info('═══════════════════════════════════════════════════════');

if (failedSuites.length > 0) {
    logger.info(`\n  Failed suites: ${failedSuites.join(', ')}`);
    process.exit(1);
} else {
    logger.info('\n  All tests passed. ✓');
    process.exit(0);
}
