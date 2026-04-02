// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/nexus_protocol.js
// LAYER: backend/src
// 
//         _   _  _____    _    ____   __   __
//        | | | || ____|  / \  |  _ \ \ \ / /
//        | |_| ||  _|   / _ \ | | | | \ V / 
//        |  _  || |___ / ___ \| |_| |  | |  
//        |_| |_||_____/_/   \_\____/   |_|  
// 
//    Sacred Geometry :: Organic Systems :: Breathing Interfaces
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ∞ NEXUS PROTOCOL - SECURE INPUT ROUTING ∞                                 ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                 ║
 * ║     Ensures all inputs (Edge, Mobile, Desktop) are routed strictly            ║
 * ║     to Heady Services via the HCFullPipeline.                                 ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');

class NexusProtocol {
    constructor(config = {}) {
        this.config = {
            allowedServices: ['heady-manager', 'heady-bridge', 'heady-nova', 'python-worker'],
            enforceSignature: true,
            telemetryEnabled: true,
            ...config
        };
        this.signatureKey = process.env.HEADY_SIGNATURE_KEY;
    }

    /**
     * Validates and routes an input packet.
     * @param {Object} packet - The input data packet.
     * @returns {Promise<Object>} - The routed result.
     */
    async routeInput(packet) {
        const { source, payload, signature, targetService } = packet;

        // 1. Source Verification
        if (!['edge', 'mobile', 'desktop', 'internal'].includes(source)) {
            throw new Error(`Invalid input source: ${source}`);
        }

        // 2. Service Lockdown: Only Heady Services allowed
        if (!this.config.allowedServices.includes(targetService)) {
            throw new Error(`Unauthorized service target: ${targetService}`);
        }

        // 3. Signature Verification (Patent-Pending Secure Routing)
        if (this.config.enforceSignature) {
            this.verifySignature(payload, signature);
        }

        // 4. Traceability
        const traceId = crypto.randomUUID();
        this.logRouting(traceId, source, targetService);

        // 5. Execution (Simulated for protocol definition)
        return {
            status: 'routed',
            traceId,
            target: targetService,
            timestamp: new Date().toISOString()
        };
    }

    verifySignature(payload, signature) {
        if (!this.signatureKey) {
            // Reject unverifiable packets when no signing key is configured
            throw new Error('HEADY_SIGNATURE_KEY not set — cannot verify packet signature. Set this environment variable.');
        }
        const hmac = crypto.createHmac('sha256', this.signatureKey);
        hmac.update(JSON.stringify(payload));
        const expected = hmac.digest('hex');
        if (signature !== expected) {
            throw new Error('Invalid packet signature. Security breach attempt logged.');
        }
        return true;
    }

    logRouting(traceId, source, target) {
        // Audit log entry — in production this is captured by structured_logger
        const logEntry = {
            traceId,
            source,
            target,
            timestamp: new Date().toISOString(),
            protocol: 'Nexus/1.0'
        };
        process.stdout.write(JSON.stringify({ severity: 'INFO', message: 'NEXUS_ROUTE', ...logEntry }) + '\n');
    }
}

module.exports = NexusProtocol;
