const pino = require('pino');
const logger = pino();
/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
/**
 * scripts/security/rotate-secrets.js
 * CLI runner for Secret Rotation audits and alerts.
 */

const { SecretRotation } = require('../../src/security/secret-rotation');
const path = require('path');

const rotation = new SecretRotation();

async function main() {
    const args = process.argv.slice(2);
    const isAudit = args.includes('--audit');
    const isJson = args.includes('--json');

    const report = rotation.audit();

    if (isJson) {
        logger.info(JSON.stringify(report, null, 2));
        return;
    }

    logger.info(`\n═══ Heady Secret Audit [${report.auditedAt}] ═══`);
    logger.info(`Score: ${report.score} (${report.healthy.length}/${report.total} healthy)`);

    if (report.expired.length > 0) {
        logger.info('\n❌ EXPIRED SECRETS (Rotate ASAP):');
        report.expired.forEach(s => {
            logger.info(`  - ${s.name.padEnd(20)} [Provider: ${s.provider}] (Age: ${s.ageDays}d, Expiry: 0d)`);
            if (s.rotationUrl) logger.info(`    URL: ${s.rotationUrl}`);
        });
    }

    if (report.warning.length > 0) {
        logger.info('\n⚠️  WARNING: Secrets Expiring Soon:');
        report.warning.forEach(s => {
            logger.info(`  - ${s.name.padEnd(20)} [Provider: ${s.provider}] (Age: ${s.ageDays}d, Expires in: ${s.daysUntilExpiry}d)`);
        });
    }

    if (report.healthy.length === report.total) {
        logger.info('\n✅ All secrets are healthy and within rotation bounds.');
    }

    logger.info('\n═══ Audit Complete ═══\n');
}

main().catch(logger.error);
