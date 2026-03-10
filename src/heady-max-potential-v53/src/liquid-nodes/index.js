/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { COMPLEXITY, RESOURCE_SPLIT, COMPRESSION_TRIGGERS, scoreComplexity, routeDecision, shouldCompress } = require('./edge-worker');
const { AGENT_STATES, TRANSITIONS, DurableAgentState } = require('./durable-agent-state');
const { PROVIDERS, ProviderHealth, routeRequest } = require('./edge-origin-router');

module.exports = {
  // Edge Worker
  COMPLEXITY, RESOURCE_SPLIT, COMPRESSION_TRIGGERS,
  scoreComplexity, routeDecision, shouldCompress,
  // Durable Agent State
  AGENT_STATES, TRANSITIONS, DurableAgentState,
  // Edge-Origin Router
  PROVIDERS, ProviderHealth, routeRequest,
};
