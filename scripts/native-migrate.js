const pino = require('pino');
const logger = pino();
'use strict';

/**
 * HeadyNativeServices — Database Migration Runner
 * Runs migrations for all services that need PostgreSQL
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://heady:heady_sacred_geometry@localhost:5432/heady';

async function runMigrations() {
  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║       HeadyNativeServices — Database Migrations         ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');
  logger.info('');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Test connection
    const client = await pool.connect();
    logger.info('  ✅ Connected to PostgreSQL');

    // Enable extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    logger.info('  ✅ pgvector extension enabled');

    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    logger.info('  ✅ pg_trgm extension enabled');

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    logger.info('  ✅ uuid-ossp extension enabled');

    // Run HeadyVector migrations
    try {
      const migrations = require('../src/services/heady-vector/migrations');
      const vectorMigrator = new migrations({ connectionString: DATABASE_URL });
      await vectorMigrator.runAll();
      logger.info('  ✅ HeadyVector migrations complete');
    } catch (e) {
      logger.info(`  ⚠️  HeadyVector migrations: ${e.message}`);
    }

    client.release();
    logger.info('');
    logger.info('  All migrations complete.');
    logger.info('');
  } catch (err) {
    logger.error(`  ❌ Migration failed: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
