const pino = require('pino');
const logger = pino();
#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ Project Sites CLI ══════════════════════════════════════════════
 *
 * Runs the full site projection pipeline:
 *   site-registry.json → site-projection-renderer → services/heady-web/sites/
 *
 * Usage:
 *   node scripts/project-sites.js            # Project all sites
 *   node scripts/project-sites.js --verbose  # With detailed output
 *
 * Source of truth: src/sites/site-registry.json (latent space)
 * Output: services/heady-web/sites/{slug}/index.html (dev projections)
 */

'use strict';

const path = require('path');
const renderer = require(path.join(__dirname, '../src/projection/site-projection-renderer'));

const verbose = process.argv.includes('--verbose');

logger.info('');
logger.info('╔══════════════════════════════════════════════════════════════╗');
logger.info('║  HeadySystems Site Projection Engine                        ║');
logger.info('║  Source: site-registry.json (latent space)                  ║');
logger.info('║  Target: services/heady-web/sites/ (dev projections)       ║');
logger.info('╚══════════════════════════════════════════════════════════════╝');
logger.info('');

try {
    const { projected, errors } = renderer.projectToDevFolder();

    logger.info(`✅ Projected ${projected.length} sites:\n`);
    projected.forEach((p, i) => logger.info(`   ${i + 1}. ${p}`));

    if (errors.length > 0) {
        logger.info(`\n⚠️  ${errors.length} errors:\n`);
        errors.forEach(e => logger.info(`   ✗ ${e}`));
    }

    if (verbose) {
        const allSites = renderer.renderAllSites();
        logger.info('\n── Detailed Report ──\n');
        for (const [domain, data] of Object.entries(allSites)) {
            if (data.html) {
                const lines = data.html.split('\n').length;
                logger.info(`  ${domain}`);
                logger.info(`    slug: ${data.slug}`);
                logger.info(`    bytes: ${data.bytes}`);
                logger.info(`    lines: ${lines}`);
                logger.info(`    sacredGeometry: ${data.sacredGeometry}`);
                logger.info(`    accent: ${data.accent}`);
                logger.info('');
            }
        }
    }

    logger.info(`\n🎯 All sites are now synced as dev projections.`);
    logger.info(`   Source of truth: src/sites/site-registry.json`);
    logger.info(`   Edit the registry, not the HTML files.\n`);

    process.exit(errors.length > 0 ? 1 : 0);
} catch (e) {
    logger.error(`\n❌ Projection failed: ${e.message}\n`);
    if (verbose) logger.error(e.stack);
    process.exit(1);
}
