// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/llm-fallback-chain.js
// LAYER: backend/src — intelligence routing
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ CANONICAL LLM FALLBACK CHAIN ∞                                        ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                        ║
 * ║     SINGLE SOURCE OF TRUTH for LLM provider ordering.                       ║
 * ║                                                                               ║
 * ║     Resolves architecture drift: the env template, IP skill file, and        ║
 * ║     orchestration skill all had DIFFERENT fallback chains.                   ║
 * ║     This file is the canonical answer.                                       ║
 * ║                                                                               ║
 * ║     Chain: Gemini → Azure → Workers AI → Anthropic → OpenAI → Groq          ║
 * ║     Selection: Cost-optimized, latency-aware, φ-backoff on failure          ║
 * ║                                                                               ║
 * ║     Ref: HeadyAI Improvements Report §4A                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const PHI = 1.618033988749895;

/**
 * Canonical LLM Fallback Chain
 * 
 * Order rationale:
 *   1. Gemini Flash-Lite — cheapest, fastest, primary per architecture docs
 *   2. Azure GPT-4o-mini — Microsoft enterprise SLA, secondary
 *   3. Workers AI Llama — edge-local, no egress cost, Cloudflare-native
 *   4. Anthropic Claude — highest quality reasoning, expensive
 *   5. OpenAI GPT-4o — broad capability, expensive
 *   6. Groq Llama — fastest inference, limited context, last resort
 */
const LLM_FALLBACK_CHAIN = [
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite',
    env: 'GOOGLE_AI_API_KEY',
    costPer1kTokens: 0.00005,
    maxTokens: 1048576,
    tier: 'primary',
    notes: 'Cheapest, fastest. Primary per architecture docs.',
  },
  {
    provider: 'azure',
    model: 'gpt-4o-mini',
    env: 'AZURE_OPENAI_API_KEY',
    endpointEnv: 'AZURE_OPENAI_ENDPOINT',
    costPer1kTokens: 0.00015,
    maxTokens: 128000,
    tier: 'secondary',
    notes: 'Microsoft enterprise SLA. Secondary.',
  },
  {
    provider: 'workers-ai',
    model: 'llama-3.1-8b-instruct',
    env: 'WORKERS_AI_TOKEN',
    gatewayEnv: 'CF_AI_GATEWAY_URL',
    costPer1kTokens: 0.0,
    maxTokens: 128000,
    tier: 'tertiary',
    notes: 'Edge-local, zero egress. Cloudflare-native.',
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    env: 'ANTHROPIC_API_KEY',
    costPer1kTokens: 0.003,
    maxTokens: 200000,
    tier: 'fallback',
    notes: 'Highest quality reasoning. Use for complex tasks.',
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    env: 'OPENAI_API_KEY',
    costPer1kTokens: 0.005,
    maxTokens: 128000,
    tier: 'fallback',
    notes: 'Broad capability baseline.',
  },
  {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    env: 'GROQ_API_KEY',
    costPer1kTokens: 0.00059,
    maxTokens: 131072,
    tier: 'emergency',
    notes: 'Fastest inference. Limited availability. Last resort.',
  },
];

/**
 * Get the first available provider based on environment variables.
 * @returns {Object} The first provider with a configured API key
 * @throws {Error} If no providers are configured
 */
function getAvailableProvider() {
  for (const provider of LLM_FALLBACK_CHAIN) {
    if (process.env[provider.env]) {
      return provider;
    }
  }
  throw new Error(
    '[LLM] No providers configured. Set at least one of: ' +
    LLM_FALLBACK_CHAIN.map(p => p.env).join(', ')
  );
}

/**
 * Get all configured providers in fallback order.
 * @returns {Object[]} Array of configured providers
 */
function getConfiguredProviders() {
  return LLM_FALLBACK_CHAIN.filter(p => process.env[p.env]);
}

/**
 * Select provider by task complexity using CSL cosine thresholds.
 * - CRITICAL (>= 0.927): Use Anthropic or OpenAI for best quality
 * - HIGH (>= 0.882): Use Azure or above
 * - MEDIUM (>= 0.809): Use any available (standard chain)
 * - LOW (>= 0.691): Use cheapest (Gemini, Workers AI)
 * 
 * @param {number} complexity - CSL complexity score 0-1
 * @returns {Object} Selected provider
 */
function selectByComplexity(complexity) {
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    throw new Error('[LLM] No providers configured.');
  }

  if (complexity >= 0.927) {
    // Critical: prefer Anthropic → OpenAI → best available
    const quality = configured.find(p => p.provider === 'anthropic')
      || configured.find(p => p.provider === 'openai')
      || configured.find(p => p.provider === 'azure');
    return quality || configured[0];
  }

  if (complexity >= 0.882) {
    // High: prefer Azure → Anthropic
    const high = configured.find(p => p.provider === 'azure')
      || configured.find(p => p.provider === 'anthropic');
    return high || configured[0];
  }

  if (complexity < 0.691) {
    // Low: prefer cheapest
    const cheap = configured.find(p => p.provider === 'gemini')
      || configured.find(p => p.provider === 'workers-ai')
      || configured.find(p => p.provider === 'groq');
    return cheap || configured[0];
  }

  // Medium: use standard chain order
  return configured[0];
}

/**
 * Calculate phi-backoff delay for provider retries.
 * @param {number} attempt - Zero-indexed attempt number
 * @returns {number} Delay in milliseconds
 */
function phiRetryDelay(attempt) {
  return Math.round(1000 * Math.pow(PHI, attempt + 1));
}

/**
 * Get a route status summary.
 * @returns {Object} Status of the LLM routing chain
 */
function routeStatus() {
  const configured = getConfiguredProviders();
  const primary = configured[0] || null;

  return {
    chainLength: LLM_FALLBACK_CHAIN.length,
    configured: configured.length,
    primary: primary ? `${primary.provider}/${primary.model}` : 'NONE',
    available: configured.map(p => ({
      provider: p.provider,
      model: p.model,
      tier: p.tier,
      costPer1kTokens: p.costPer1kTokens,
    })),
    missing: LLM_FALLBACK_CHAIN
      .filter(p => !process.env[p.env])
      .map(p => ({ provider: p.provider, env: p.env })),
  };
}

module.exports = {
  LLM_FALLBACK_CHAIN,
  getAvailableProvider,
  getConfiguredProviders,
  selectByComplexity,
  phiRetryDelay,
  routeStatus,
  PHI,
};
