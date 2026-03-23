// ═══════════════════════════════════════════════════════════════════
// HEADY MCP PROXY — headymcp.com
// ∞ Sacred Geometry :: Universal MCP Gateway ∞
//
// HeadySystems Inc. — Eric Haywood, Founder
// Deploy: headymcp.com (Cloud Run)
//
// Full-spec MCP Proxy:
//   - 14 MCP tools via HTTP + SSE (JSON-RPC 2.0)
//   - Prefixed API keys (hdy_int_, hdy_plt_, hdy_pub_, hdy_trl_)
//   - Fibonacci-tiered rate limits (8/21/34/89 RPM)
//   - Per-thought metered billing (φ-scaled pricing)
//   - 5-stage developer onboarding
//   - .well-known/mcp.json discovery
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════
// §1 — φ CONSTANTS & FIBONACCI
// ═══════════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
const VERSION = '1.0.0';
const SERVICE_NAME = 'heady-mcp-proxy';

// ═══════════════════════════════════════════════════════════════════
// §2 — API KEY TIERS (Prefixed Keys)
// ═══════════════════════════════════════════════════════════════════

const KEY_TIERS = {
  'hdy_int_': {
    name: 'internal',
    rpm: FIB[11],       // 89 RPM
    burst: FIB[12],     // 144
    thoughtsPerMonth: Infinity,
    dailyLimit: Infinity,
    description: 'Internal HeadySystems services',
  },
  'hdy_plt_': {
    name: 'pilot',
    rpm: FIB[8],        // 21 RPM
    burst: FIB[9],      // 34
    thoughtsPerMonth: 50_000,
    dailyLimit: 5_000,
    description: 'Founder\'s Pilot Program members',
  },
  'hdy_pub_': {
    name: 'public',
    rpm: FIB[9],        // 34 RPM
    burst: FIB[10],     // 55
    thoughtsPerMonth: 100_000,
    dailyLimit: 10_000,
    description: 'Public API access',
  },
  'hdy_trl_': {
    name: 'trial',
    rpm: FIB[6],        // 8 RPM
    burst: FIB[7],      // 13
    thoughtsPerMonth: 1_000,
    dailyLimit: 100,
    description: 'Free trial tier',
  },
};

function getKeyTier(apiKey) {
  if (!apiKey) return null;
  for (const [prefix, tier] of Object.entries(KEY_TIERS)) {
    if (apiKey.startsWith(prefix)) return { ...tier, prefix };
  }
  // Fallback for non-prefixed keys (legacy)
  return { ...KEY_TIERS['hdy_trl_'], prefix: 'legacy_', name: 'legacy' };
}

// ═══════════════════════════════════════════════════════════════════
// §3 — PER-THOUGHT BILLING (φ-Scaled)
// ═══════════════════════════════════════════════════════════════════

const THOUGHT_PRICING = {
  embed:          { multiplier: 1.0,           cost: 0.000100, desc: 'Text → vector(384) embedding' },
  search:         { multiplier: PHI,           cost: 0.000162, desc: 'Semantic similarity search (HNSW cosine)' },
  memory_write:   { multiplier: PHI,           cost: 0.000162, desc: 'T1 memory vector upsert + CSL scoring' },
  enrichment:     { multiplier: PHI * PHI,     cost: 0.000262, desc: 'CSL scoring + gate classification' },
  pipeline_step:  { multiplier: PHI ** 3,      cost: 0.000424, desc: 'Single HCFullPipeline stage' },
  swarm_dispatch: { multiplier: PHI ** 4,      cost: 0.000685, desc: 'Bee task dispatch to swarm' },
  llm_inference:  { multiplier: PHI ** 5,      cost: 0.001109, desc: 'LLM call (Gemini→Azure→Workers AI)' },
  parse_990:      { multiplier: PHI ** 4,      cost: 0.000685, desc: 'IRS 990 XML → structured JSON' },
  design_gen:     { multiplier: PHI ** 6,      cost: 0.001794, desc: 'Canva design generation' },
};

// Thought type mapping for each MCP tool
const TOOL_THOUGHT_TYPE = {
  heady_health:        'search',
  heady_pulse:         'search',
  heady_brain_query:   'search',
  heady_memory_search: 'search',
  heady_pipeline:      'pipeline_step',
  heady_generate:      'llm_inference',
  heady_bee_spawn:     'swarm_dispatch',
  heady_battle:        'llm_inference',
  heady_creative:      'design_gen',
  heady_distill:       'memory_write',
  heady_wisdom:        'search',
  heady_csl_gate:      'enrichment',
  heady_coherence_check: 'enrichment',
  heady_deploy:        'pipeline_step',
};

// In-memory thought ledger (backed by Neon in production)
const thoughtLedger = new Map(); // key → { totalThoughts, totalCost, entries[] }

function recordThought(apiKey, toolName, durationMs) {
  const thoughtType = TOOL_THOUGHT_TYPE[toolName] || 'search';
  const pricing = THOUGHT_PRICING[thoughtType];
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    tool: toolName,
    thoughtType,
    cost: pricing.cost,
    durationMs,
    apiKey: apiKey?.slice(0, 12) + '…',
  };

  const ledger = thoughtLedger.get(apiKey) || { totalThoughts: 0, totalCost: 0, entries: [] };
  ledger.totalThoughts++;
  ledger.totalCost += pricing.cost;
  ledger.entries.push(entry);
  // Keep last 1000 entries per key
  if (ledger.entries.length > 1000) ledger.entries = ledger.entries.slice(-500);
  thoughtLedger.set(apiKey, ledger);

  return entry;
}

// ═══════════════════════════════════════════════════════════════════
// §4 — 5-STAGE DEVELOPER ONBOARDING
// ═══════════════════════════════════════════════════════════════════

const ONBOARDING_STAGES = [
  { id: 'identity', name: 'Identity', description: 'Create developer account and verify email' },
  { id: 'logic',    name: 'Logic',    description: 'Learn CSL gates and φ-mathematics' },
  { id: 'data',     name: 'Data',     description: 'Connect data sources and configure memory' },
  { id: 'keys',     name: 'Keys',     description: 'Generate API keys and set rate limits' },
  { id: 'deploy',   name: 'Deploy',   description: 'Deploy first MCP integration' },
];

// In-memory developer accounts (backed by Neon in production)
const developerAccounts = new Map();

function generateApiKey(tier = 'trl') {
  const prefixMap = { int: 'hdy_int_', plt: 'hdy_plt_', pub: 'hdy_pub_', trl: 'hdy_trl_' };
  const prefix = prefixMap[tier] || 'hdy_trl_';
  return prefix + crypto.randomBytes(24).toString('hex');
}

// ═══════════════════════════════════════════════════════════════════
// §5 — BACKEND CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const HEADY_MANAGER_URL = process.env.HEADY_MANAGER_URL
  || process.env.HEADY_API_URL
  || 'https://heady-manager-bf4q4zywhq-uc.a.run.app';

const HEADY_API_KEY = process.env.HEADY_API_KEY || '';

// ═══════════════════════════════════════════════════════════════════
// §6 — MCP TOOL REGISTRY (14 Tools)
// ═══════════════════════════════════════════════════════════════════

const MCP_TOOLS = [
  {
    name: 'heady_health', category: 'system',
    description: 'Full system health check with ORS (Operational Readiness Score), subsystem status, and uptime.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    route: { method: 'GET', path: '/api/brain/health' },
  },
  {
    name: 'heady_pulse', category: 'system',
    description: 'System status — all registered endpoints, active nodes, and pipeline state.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    route: { method: 'GET', path: '/api/system/status' },
  },
  {
    name: 'heady_brain_query', category: 'memory',
    description: 'Semantic search across T1 vector memory (pgvector 384D). Returns top-k relevant memories with CSL cosine gating.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Max results (default: 21 = FIB[8])', default: 21 },
        threshold: { type: 'number', description: 'CSL cosine similarity threshold', default: 0.618 },
      },
      required: ['query'],
    },
    route: { method: 'POST', path: '/api/brain/search' },
  },
  {
    name: 'heady_memory_search', category: 'memory',
    description: 'Semantic vector search across personal latent space using CSL cosine gating (384D pgvector HNSW).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }, topK: { type: 'integer', default: 21 },
        threshold: { type: 'number', default: 0.618 },
      },
      required: ['query'],
    },
    route: { method: 'POST', path: '/api/brain/search' },
  },
  {
    name: 'heady_pipeline', category: 'pipeline',
    description: 'Run the full 21-stage HCFullPipeline on any task. Returns signed output with coherence score.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'The task to process through all 21 pipeline stages' },
        mode: { type: 'string', enum: ['fast', 'full', 'arena', 'learning'], default: 'full' },
      },
      required: ['task'],
    },
    route: { method: 'POST', path: '/api/pipeline/run' },
  },
  {
    name: 'heady_generate', category: 'pipeline',
    description: 'Code generation with node attribution. Uses the HCFullPipeline EXECUTE stage.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' }, language: { type: 'string', default: 'javascript' },
        context: { type: 'string' },
      },
      required: ['prompt'],
    },
    route: { method: 'POST', path: '/api/pipeline/claude' },
  },
  {
    name: 'heady_bee_spawn', category: 'agents',
    description: 'Spawn a specialized HeadyBee agent (26 types) for async task execution with phi-backoff retry.',
    inputSchema: {
      type: 'object',
      properties: {
        beeType: {
          type: 'string',
          enum: [
            'agents-bee', 'auth-provider-bee', 'brain-bee', 'config-bee',
            'connectors-bee', 'creative-bee', 'deployment-bee', 'documentation-bee',
            'governance-bee', 'health-bee', 'intelligence-bee', 'lifecycle-bee',
            'mcp-bee', 'memory-bee', 'middleware-bee', 'ops-bee', 'orchestration-bee',
            'pipeline-bee', 'resilience-bee', 'routes-bee', 'security-bee',
            'services-bee', 'sync-projection-bee', 'telemetry-bee',
            'vector-ops-bee', 'vector-template-bee',
          ],
        },
        task: { type: 'string' }, priority: { type: 'number', default: 0.618 },
      },
      required: ['beeType', 'task'],
    },
    route: { method: 'POST', path: '/api/bee/spawn' },
  },
  {
    name: 'heady_battle', category: 'battle',
    description: 'Multi-model arena competition (Claude vs GPT vs Gemini). Returns ranked responses.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        models: { type: 'array', items: { type: 'string' } },
        criteria: { type: 'string', default: 'accuracy,clarity,completeness' },
      },
      required: ['prompt'],
    },
    route: { method: 'POST', path: '/api/battle/run' },
  },
  {
    name: 'heady_creative', category: 'creative',
    description: 'Creative generation — images, audio, or design assets via pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        type: { type: 'string', enum: ['image', 'audio', 'design'], default: 'image' },
        style: { type: 'string', default: 'sacred-geometry' },
      },
      required: ['prompt'],
    },
    route: { method: 'POST', path: '/api/creative/generate' },
  },
  {
    name: 'heady_distill', category: 'knowledge',
    description: 'Knowledge distillation — extract and store learnings from a session.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' }, source: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['content'],
    },
    route: { method: 'POST', path: '/api/distill' },
  },
  {
    name: 'heady_wisdom', category: 'knowledge',
    description: 'Query the wisdom knowledge base for patterns, anti-patterns, and design decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string', enum: ['patterns', 'anti-patterns', 'design-decisions', 'errors'] },
      },
      required: ['query'],
    },
    route: { method: 'POST', path: '/api/wisdom/query' },
  },
  {
    name: 'heady_csl_gate', category: 'csl',
    description: 'Evaluate CSL cosine similarity between two semantic inputs.',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'string' }, b: { type: 'string' },
        threshold: { type: 'number', default: 0.809 },
      },
      required: ['a', 'b'],
    },
    route: { method: 'POST', path: '/api/csl/gate' },
  },
  {
    name: 'heady_coherence_check', category: 'csl',
    description: 'Score semantic coherence of output against intended design. Returns CSL level.',
    inputSchema: {
      type: 'object',
      properties: { output: { type: 'string' }, intendedDesign: { type: 'string' } },
      required: ['output', 'intendedDesign'],
    },
    route: { method: 'POST', path: '/api/csl/coherence' },
  },
  {
    name: 'heady_deploy', category: 'deployment',
    description: 'Trigger φ-canary deployment. Rolls out in 6.18% → 38.2% → 61.8% → 100% stages.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string' }, branch: { type: 'string', default: 'main' },
        canary: { type: 'boolean', default: true },
      },
      required: ['service'],
    },
    route: { method: 'POST', path: '/api/pipeline/deploy' },
  },
];

const TOOL_DEFINITIONS = MCP_TOOLS.map(({ route, ...tool }) => tool);

// ═══════════════════════════════════════════════════════════════════
// §7 — CORS & DOMAINS
// ═══════════════════════════════════════════════════════════════════

const HEADY_DOMAINS = [
  'headysystems.com', 'headyme.com', 'headymcp.com', 'headyconnection.org',
  'headyio.com', 'headyfinance.com', 'headybuddy.com', 'headybot.com',
  'headyapi.com', 'headylens.com', 'headyai.com', 'heady-ai.com',
];

const ALLOWED_ORIGINS = new Set([
  ...HEADY_DOMAINS.flatMap(d => [`https://${d}`, `https://www.${d}`]),
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3300', 'http://localhost:8080', 'http://localhost:8090'] : []),
]);

// ═══════════════════════════════════════════════════════════════════
// §8 — EXPRESS APP
// ═══════════════════════════════════════════════════════════════════

const app = express();
app.use(express.static(join(__dirname, 'public'), { maxAge: '1h', etag: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.set('trust proxy', true);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Heady-Api-Key, X-MCP-Session-Id, Mcp-Session-Id');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Heady-Service', 'mcp-proxy-v1');
  next();
});

// ═══════════════════════════════════════════════════════════════════
// §9 — AUTH + TIERED RATE LIMITING
// ═══════════════════════════════════════════════════════════════════

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-heady-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (apiKey) {
    const tier = getKeyTier(apiKey);
    req.apiKey = apiKey;
    req.tier = tier;
    req.actor = `${tier.name}:${apiKey.slice(0, 12)}…`;
    return next();
  }

  // Session cookie fallback (HeadyAuth)
  const session = req.cookies?.['__Host-heady_session'] || req.cookies?.['heady_session'];
  if (session) {
    req.apiKey = `session_${session.slice(0, 16)}`;
    req.tier = KEY_TIERS['hdy_pub_']; // session users get public tier
    req.actor = `session:${session.slice(0, 8)}…`;
    return next();
  }

  // Dev mode
  if (process.env.NODE_ENV !== 'production') {
    req.apiKey = 'dev_access';
    req.tier = KEY_TIERS['hdy_int_']; // dev gets internal tier
    req.actor = 'dev-access';
    return next();
  }

  res.status(401).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Authentication required. Provide X-Heady-Api-Key header with hdy_[tier]_ prefix.' },
    id: null,
  });
}

// Fibonacci-tiered rate limiting
const rateBuckets = new Map();
const WINDOW_MS = 60_000;

function rateLimit(req, res, next) {
  const key = req.apiKey || req.ip;
  const tier = req.tier;
  const maxRpm = tier?.rpm || FIB[6]; // fallback to trial (8 RPM)
  const now = Date.now();

  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;

  res.header('X-RateLimit-Limit', String(maxRpm));
  res.header('X-RateLimit-Remaining', String(Math.max(0, maxRpm - bucket.count)));
  res.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  res.header('X-Heady-Tier', tier?.name || 'unknown');

  if (bucket.count > maxRpm) {
    return res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Rate limit exceeded for ${tier?.name || 'unknown'} tier. Max ${maxRpm} req/min.`,
        data: { limit: maxRpm, tier: tier?.name, resetAt: new Date(bucket.resetAt).toISOString() },
      },
      id: req.body?.id || null,
    });
  }

  next();
}

// Clean up stale buckets every φ⁷ms (~29s)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt + WINDOW_MS) rateBuckets.delete(key);
  }
}, Math.round(PHI ** 7));

// ═══════════════════════════════════════════════════════════════════
// §10 — SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const sessions = new Map();

function getOrCreateSession(req) {
  let sessionId = req.headers['x-mcp-session-id'] || req.headers['mcp-session-id'];
  if (sessionId && sessions.has(sessionId)) {
    return { sessionId, session: sessions.get(sessionId) };
  }

  sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    actor: req.actor,
    tier: req.tier?.name,
    toolCalls: 0,
    thoughts: 0,
  };
  sessions.set(sessionId, session);
  setTimeout(() => sessions.delete(sessionId), FIB[8] * 60_000); // 21 min TTL
  return { sessionId, session };
}

// ═══════════════════════════════════════════════════════════════════
// §11 — TOOL CALL PROXY
// ═══════════════════════════════════════════════════════════════════

async function proxyToolCall(toolName, args, req) {
  const tool = MCP_TOOLS.find(t => t.name === toolName);
  if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${toolName}` }] };

  const startTime = Date.now();
  const { method, path } = tool.route;
  const url = `${HEADY_MANAGER_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(HEADY_API_KEY ? { 'x-heady-api-key': HEADY_API_KEY } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIB[9] * 1000); // 34_000ms

  try {
    const fetchOpts = {
      method, headers, signal: controller.signal,
      ...(method === 'POST' ? { body: JSON.stringify(args || {}) } : {}),
    };

    const res = await fetch(url, fetchOpts);
    const data = await res.json();
    const durationMs = Date.now() - startTime;

    // Record thought
    const thought = recordThought(req.apiKey, toolName, durationMs);

    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: `API Error ${res.status}: ${JSON.stringify(data)}` }],
        _meta: { thoughtId: thought.id, cost: thought.cost, durationMs },
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      _meta: { thoughtId: thought.id, cost: thought.cost, durationMs, tier: req.tier?.name },
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    recordThought(req.apiKey, toolName, durationMs);
    return { isError: true, content: [{ type: 'text', text: `Proxy error: ${err.message}` }] };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════════
// §12 — JSON-RPC 2.0 HANDLER
// ═══════════════════════════════════════════════════════════════════

async function handleJsonRpc(req, body) {
  const { method, params, id } = body;

  switch (method) {
    case 'initialize': {
      const { sessionId } = getOrCreateSession(req);
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: 'heady-mcp', version: VERSION },
          capabilities: { tools: { listChanged: false } },
          sessionId,
          tier: req.tier?.name,
        },
        id,
      };
    }

    case 'notifications/initialized':
      return null;

    case 'tools/list':
      return { jsonrpc: '2.0', result: { tools: TOOL_DEFINITIONS }, id };

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) return { jsonrpc: '2.0', error: { code: -32602, message: 'Missing tool name' }, id };
      const result = await proxyToolCall(name, args, req);
      return { jsonrpc: '2.0', result, id };
    }

    case 'ping':
      return { jsonrpc: '2.0', result: {}, id };

    default:
      return { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id };
  }
}

// ═══════════════════════════════════════════════════════════════════
// §13 — MCP TRANSPORT ROUTES
// ═══════════════════════════════════════════════════════════════════

// Streamable HTTP (primary)
app.post('/mcp', requireAuth, rateLimit, async (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        const result = await handleJsonRpc(req, item);
        if (result) results.push(result);
      }
      return res.json(results);
    }
    const result = await handleJsonRpc(req, body);
    if (!result) return res.status(204).end();
    if (result.result?.sessionId) res.header('Mcp-Session-Id', result.result.sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id: req.body?.id || null });
  }
});

// SSE (legacy)
app.get('/mcp/sse', requireAuth, (req, res) => {
  const { sessionId } = getOrCreateSession(req);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'Mcp-Session-Id': sessionId,
  });
  const messageUrl = `${req.protocol}://${req.get('host')}/mcp/messages?sessionId=${sessionId}`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);
  const keepAlive = setInterval(() => res.write(': keepalive\n\n'), FIB[7] * 1000);
  req.on('close', () => { clearInterval(keepAlive); sessions.delete(sessionId); });
});

// SSE message endpoint
app.post('/mcp/messages', requireAuth, rateLimit, async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid or expired session' }, id: req.body?.id || null });
    }
    const result = await handleJsonRpc(req, req.body);
    if (!result) return res.status(204).end();
    res.json(result);
  } catch (err) {
    res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id: req.body?.id || null });
  }
});

// ═══════════════════════════════════════════════════════════════════
// §14 — ONBOARDING ROUTES (5-Stage Flow)
// ═══════════════════════════════════════════════════════════════════

// GET /api/onboarding/stages — list all stages
app.get('/api/onboarding/stages', (req, res) => {
  res.json({ ok: true, stages: ONBOARDING_STAGES, totalStages: 5 });
});

// POST /api/onboarding/start — begin onboarding
app.post('/api/onboarding/start', express.json(), (req, res) => {
  const { email, name, organization } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const devId = crypto.randomUUID();
  const trialKey = generateApiKey('trl');

  const account = {
    id: devId,
    email,
    name: name || email.split('@')[0],
    organization: organization || null,
    currentStage: 'identity',
    completedStages: ['identity'],
    apiKeys: [{ key: trialKey, tier: 'trial', createdAt: new Date().toISOString(), active: true }],
    createdAt: new Date().toISOString(),
    thoughtBudget: 1_000,
    thoughtsUsed: 0,
  };

  developerAccounts.set(devId, account);
  developerAccounts.set(email, account); // index by email too

  res.json({
    ok: true,
    developerId: devId,
    apiKey: trialKey,
    currentStage: 'identity',
    nextStage: 'logic',
    message: 'Welcome to HeadyMCP! Your trial API key is ready. Complete all 5 stages to unlock full access.',
  });
});

// POST /api/onboarding/advance — advance to next stage
app.post('/api/onboarding/advance', express.json(), (req, res) => {
  const { developerId, stageId } = req.body;
  const account = developerAccounts.get(developerId);
  if (!account) return res.status(404).json({ error: 'Developer account not found' });

  const stageIndex = ONBOARDING_STAGES.findIndex(s => s.id === stageId);
  if (stageIndex === -1) return res.status(400).json({ error: `Unknown stage: ${stageId}` });

  if (!account.completedStages.includes(stageId)) {
    account.completedStages.push(stageId);
  }

  const nextIndex = stageIndex + 1;
  const nextStage = nextIndex < ONBOARDING_STAGES.length ? ONBOARDING_STAGES[nextIndex] : null;
  account.currentStage = nextStage?.id || 'complete';

  // Upgrade key tier on completion
  if (account.completedStages.length === 5) {
    const pilotKey = generateApiKey('plt');
    account.apiKeys.push({ key: pilotKey, tier: 'pilot', createdAt: new Date().toISOString(), active: true });
    account.thoughtBudget = 50_000;
  }

  res.json({
    ok: true,
    completedStages: account.completedStages,
    currentStage: account.currentStage,
    nextStage: nextStage?.id || null,
    progress: `${account.completedStages.length}/5`,
    ...(account.completedStages.length === 5 ? {
      upgraded: true,
      newApiKey: account.apiKeys[account.apiKeys.length - 1].key,
      newTier: 'pilot',
      message: '🎉 Onboarding complete! You\'ve been upgraded to Pilot tier with 50,000 thoughts/month.',
    } : {}),
  });
});

// GET /api/onboarding/status/:id — check onboarding progress
app.get('/api/onboarding/status/:id', (req, res) => {
  const account = developerAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Developer not found' });

  res.json({
    ok: true,
    developerId: account.id,
    email: account.email,
    currentStage: account.currentStage,
    completedStages: account.completedStages,
    progress: `${account.completedStages.length}/5`,
    apiKeys: account.apiKeys.map(k => ({ ...k, key: k.key.slice(0, 16) + '…' })),
    thoughtBudget: account.thoughtBudget,
    thoughtsUsed: account.thoughtsUsed,
  });
});

// ═══════════════════════════════════════════════════════════════════
// §15 — BILLING ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/billing/pricing — thought pricing table
app.get('/api/billing/pricing', (req, res) => {
  res.json({
    ok: true, currency: 'USD', model: 'per-thought',
    pricing: Object.entries(THOUGHT_PRICING).map(([type, p]) => ({
      type, cost: p.cost, phiMultiplier: p.multiplier.toFixed(4), description: p.desc,
    })),
    tiers: Object.entries(KEY_TIERS).map(([prefix, t]) => ({
      prefix, name: t.name, rpm: t.rpm, burst: t.burst,
      thoughtsPerMonth: t.thoughtsPerMonth, description: t.description,
    })),
  });
});

// GET /api/billing/usage — usage for an API key
app.get('/api/billing/usage', requireAuth, (req, res) => {
  const ledger = thoughtLedger.get(req.apiKey) || { totalThoughts: 0, totalCost: 0, entries: [] };
  const tier = req.tier;

  res.json({
    ok: true,
    apiKey: req.apiKey.slice(0, 16) + '…',
    tier: tier?.name,
    usage: {
      totalThoughts: ledger.totalThoughts,
      totalCost: `$${ledger.totalCost.toFixed(6)}`,
      monthlyLimit: tier?.thoughtsPerMonth,
      remaining: tier?.thoughtsPerMonth === Infinity ? 'unlimited' : Math.max(0, tier.thoughtsPerMonth - ledger.totalThoughts),
    },
    recentEntries: ledger.entries.slice(-20),
  });
});

// ═══════════════════════════════════════════════════════════════════
// §16 — DISCOVERY & REGISTRY
// ═══════════════════════════════════════════════════════════════════

app.get('/api/tools', (req, res) => {
  const tools = MCP_TOOLS.map(({ route, ...t }) => t);
  res.json({
    ok: true, service: SERVICE_NAME, version: VERSION,
    toolCount: tools.length, categories: [...new Set(MCP_TOOLS.map(t => t.category))], tools,
  });
});

app.get('/api/tools/:name', (req, res) => {
  const tool = MCP_TOOLS.find(t => t.name === req.params.name);
  if (!tool) return res.status(404).json({ error: `Tool "${req.params.name}" not found` });
  const { route, ...t } = tool;
  const thoughtType = TOOL_THOUGHT_TYPE[t.name];
  const pricing = THOUGHT_PRICING[thoughtType];
  res.json({ ok: true, tool: t, billing: { thoughtType, costPerCall: pricing?.cost } });
});

app.get('/.well-known/mcp.json', (req, res) => {
  res.json({
    schema_version: '1.0',
    server: { name: 'heady-mcp', version: VERSION, description: 'HeadyMCP — Universal MCP Proxy', vendor: 'HeadySystems Inc.', homepage: 'https://headymcp.com' },
    endpoints: { streamable_http: 'https://headymcp.com/mcp', sse: 'https://headymcp.com/mcp/sse' },
    authentication: { type: 'api_key', header: 'X-Heady-Api-Key', key_prefixes: Object.keys(KEY_TIERS) },
    tools: TOOL_DEFINITIONS.map(t => ({ name: t.name, description: t.description, category: t.category })),
    rate_limits: Object.entries(KEY_TIERS).map(([prefix, t]) => ({ tier: t.name, prefix, rpm: t.rpm })),
    billing: { model: 'per-thought', currency: 'USD', base_cost: 0.0001, phi_scaling: true },
    onboarding: { stages: ONBOARDING_STAGES.map(s => s.id), endpoint: '/api/onboarding/start' },
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    claude_desktop: {
      mcpServers: { heady: { command: 'npx', args: ['-y', '@heady-ai/mcp-server@latest'], env: { HEADY_API_KEY: 'hdy_plt_YOUR_KEY', HEADY_ENDPOINT: 'https://headymcp.com/mcp' } } },
    },
    remote_http: {
      mcpServers: { heady: { url: 'https://headymcp.com/mcp', headers: { 'X-Heady-Api-Key': 'hdy_plt_YOUR_KEY' } } },
    },
    key_tiers: Object.entries(KEY_TIERS).map(([prefix, t]) => ({ prefix, tier: t.name, rpm: t.rpm, thoughts: t.thoughtsPerMonth })),
  });
});

// ═══════════════════════════════════════════════════════════════════
// §17 — HEALTH & STATUS
// ═══════════════════════════════════════════════════════════════════

app.get('/health', async (req, res) => {
  let backendOk = false;
  try {
    const c = new AbortController(); setTimeout(() => c.abort(), 5000);
    const r = await fetch(`${HEADY_MANAGER_URL}/api/brain/health`, { signal: c.signal });
    backendOk = r.ok;
  } catch { /* unreachable */ }

  res.json({
    service: SERVICE_NAME, version: VERSION,
    status: backendOk ? 'healthy' : 'degraded',
    backend: backendOk ? 'connected' : 'unreachable',
    backendUrl: HEADY_MANAGER_URL,
    tools: MCP_TOOLS.length, activeSessions: sessions.size,
    transports: ['streamable-http', 'sse'],
    keyTiers: Object.values(KEY_TIERS).map(t => t.name),
    billing: 'per-thought',
    onboarding: '5-stage',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/mcp/status', (req, res) => {
  const totalThoughts = [...thoughtLedger.values()].reduce((sum, l) => sum + l.totalThoughts, 0);
  const totalRevenue = [...thoughtLedger.values()].reduce((sum, l) => sum + l.totalCost, 0);

  res.json({
    ok: true, service: SERVICE_NAME, version: VERSION, protocol: '2025-03-26',
    transports: ['streamable-http', 'sse'],
    tools: MCP_TOOLS.length,
    categories: [...new Set(MCP_TOOLS.map(t => t.category))],
    activeSessions: sessions.size,
    activeDevelopers: developerAccounts.size / 2, // divided by 2 because we double-index
    totalThoughts,
    totalRevenue: `$${totalRevenue.toFixed(6)}`,
    endpoints: {
      mcp: '/mcp', sse: '/mcp/sse', messages: '/mcp/messages',
      discovery: '/.well-known/mcp.json', tools: '/api/tools', config: '/api/config',
      onboarding: '/api/onboarding/start', billing: '/api/billing/pricing',
      usage: '/api/billing/usage',
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// §18 — SERVER START
// ═══════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || '8080', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[heady-mcp] ✓ MCP Proxy v${VERSION} listening on :${PORT}`);
  console.log(`[heady-mcp] ✓ ${MCP_TOOLS.length} tools registered`);
  console.log(`[heady-mcp] ✓ Transports: Streamable HTTP (/mcp) + SSE (/mcp/sse)`);
  console.log(`[heady-mcp] ✓ API Key Tiers: ${Object.values(KEY_TIERS).map(t => `${t.name}(${t.rpm}rpm)`).join(', ')}`);
  console.log(`[heady-mcp] ✓ Per-Thought Billing: ${Object.keys(THOUGHT_PRICING).length} thought types, φ-scaled`);
  console.log(`[heady-mcp] ✓ Onboarding: 5-stage (Identity→Logic→Data→Keys→Deploy)`);
  console.log(`[heady-mcp] ✓ Backend: ${HEADY_MANAGER_URL}`);
  console.log(`[heady-mcp] ✓ Discovery: /.well-known/mcp.json`);
});

export default app;
