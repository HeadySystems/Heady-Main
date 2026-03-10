'use strict';

const fs = require('fs');
const { logger } = require('./logger');

const REQUIRED = [
  { key: 'PORT', validate: v => !isNaN(v) && v > 0 && v < 65536, default: '3301' },
  { key: 'NODE_ENV', validate: v => ['development', 'staging', 'production'].includes(v), default: 'development' },
  { key: 'JWT_SECRET', validate: v => v.length >= 32 },
  { key: 'EMBEDDINGS_PROVIDER', validate: v => ['ollama', 'openai', 'vertex', 'anthropic'].includes(v), default: 'openai' },
  { key: 'MEMORY_STORE_PATH', validate: v => v.length > 0, default: './data/memory' },
  { key: 'MCP_BEARER_TOKEN', validate: v => v.length >= 32 },
];

function validateEnv() {
  let valid = true;
  const missing = [];

  for (const { key, validate, default: defaultVal } of REQUIRED) {
    let val = process.env[key];

    // Apply defaults for non-production or when explicitly allowed
    if (!val && defaultVal) {
      process.env[key] = defaultVal;
      val = defaultVal;
    }

    if (!val || !validate(val)) {
      missing.push(key);
      valid = false;
    }
  }

  if (missing.length > 0) {
    logger.error(`[EnvValidator] Missing or invalid: ${missing.join(', ')}`);
  } else {
    logger.info('[EnvValidator] All required environment variables validated');
  }

  // Ensure required data directories exist
  const dirs = ['data/memory', 'data/logs', 'data/checkpoints'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return valid;
}

module.exports = { validateEnv };
