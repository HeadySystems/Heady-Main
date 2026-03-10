const pino = require('pino');
const logger = pino();
/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
const { SecretRotation } = require('../src/security/secret-rotation');

logger.info("🛡️ [Heady-Pipeline] Initializing Automated Secret Rotation Daemon");

async function runRotationSweep() {
    logger.info(`[${new Date().toISOString()}] Executing scheduled rotation...`);
    try {
        const status = await SecretRotation.auditSecrets();
        logger.info("Rotation Status:", JSON.stringify(status, null, 2));
    } catch (err) {
        logger.error("Rotation failure:", err.message);
    }
}

// Run immediately
runRotationSweep();

// Run every 12 hours
setInterval(runRotationSweep, 12 * 60 * 60 * 1000);

logger.info("✅ Secret Rotation Daemon is now active in background memory.");
