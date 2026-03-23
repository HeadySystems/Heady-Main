// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: packages/mcp-server/src/server.js
// LAYER: packages/mcp-server
// HeadyMCP Server — JSON-RPC 2.0 over stdio
// 8 Core Tools for IDE Integration
// HEADY_BRAND:END

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const API_BASE = process.env.HEADY_API_URL
  || 'https://heady-manager-bf4q4zywhq-uc.a.run.app';
const API_KEY = process.env.HEADY_API_KEY || '';

// ═══════════════════════════════════════════════════════
// Tool Definitions — 8 Core Tools per Launch Plan §5.1
// ═══════════════════════════════════════════════════════

const TOOLS = [
  {
    name: 'heady_health',
    description: 'Full system health check with ORS (Operational Readiness Score), subsystem status, and uptime.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'heady_pulse',
    description: 'System status — all registered endpoints, active nodes, and pipeline state.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'heady_brain_query',
    description: 'Semantic search across T1 vector memory (pgvector). Returns top-k relevant memories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Max results (default: 21 = FIB[8])', default: 21 },
      },
      required: ['query'],
    },
  },
  {
    name: 'heady_generate',
    description: 'Code generation with node attribution. Uses the HCFullPipeline EXECUTE stage.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Code generation prompt' },
        language: { type: 'string', description: 'Target language (js, py, ts, etc.)', default: 'javascript' },
        context: { type: 'string', description: 'Optional file/project context' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'heady_deploy',
    description: 'Trigger φ-canary deployment. Rolls out in 6.18% → 38.2% → 61.8% → 100% stages.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service to deploy (e.g. heady-manager)' },
        branch: { type: 'string', description: 'Git branch', default: 'main' },
        canary: { type: 'boolean', description: 'Use φ-canary rollout', default: true },
      },
      required: ['service'],
    },
  },
  {
    name: 'heady_battle',
    description: 'Multi-model arena competition (Claude vs GPT vs Gemini). Returns ranked responses.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The challenge prompt for all models' },
        models: {
          type: 'array',
          items: { type: 'string' },
          description: 'Models to compete (default: all available)',
        },
        criteria: { type: 'string', description: 'Judging criteria', default: 'accuracy,clarity,completeness' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'heady_creative',
    description: 'Creative generation — images, audio, or design assets via pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Creative generation prompt' },
        type: { type: 'string', enum: ['image', 'audio', 'design'], default: 'image' },
        style: { type: 'string', description: 'Style preset', default: 'sacred-geometry' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'heady_distill',
    description: 'Knowledge distillation — extract and store learnings from a session or conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to distill into knowledge' },
        source: { type: 'string', description: 'Source attribution (e.g. session-id, file path)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
      },
      required: ['content'],
    },
  },
];

// ═══════════════════════════════════════════════════════
// API Route Mapping
// ═══════════════════════════════════════════════════════

const ROUTES = {
  heady_health:      { method: 'GET',  path: '/api/brain/health' },
  heady_pulse:       { method: 'GET',  path: '/api/system/status' },
  heady_brain_query: { method: 'POST', path: '/api/brain/search' },
  heady_generate:    { method: 'POST', path: '/api/pipeline/claude' },
  heady_deploy:      { method: 'POST', path: '/api/pipeline/deploy' },
  heady_battle:      { method: 'POST', path: '/api/battle/run' },
  heady_creative:    { method: 'POST', path: '/api/creative/generate' },
  heady_distill:     { method: 'POST', path: '/api/distill' },
};

// ═══════════════════════════════════════════════════════
// API Caller
// ═══════════════════════════════════════════════════════

async function callAPI(toolName, args) {
  const route = ROUTES[toolName];
  if (!route) throw new Error(`Unknown tool: ${toolName}`);

  const url = `${API_BASE}${route.path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'x-heady-api-key': API_KEY } : {}),
  };

  const fetchOpts = {
    method: route.method,
    headers,
    ...(route.method === 'POST' ? { body: JSON.stringify(args || {}) } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    const data = await res.json();

    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: `API Error ${res.status}: ${JSON.stringify(data)}` }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Request failed: ${err.message}` }],
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════
// MCP Server Setup
// ═══════════════════════════════════════════════════════

const server = new Server(
  {
    name: 'heady-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!ROUTES[name]) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
  }

  return callAPI(name, args);
});

// ═══════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HeadyMCP server running on stdio');
}

main().catch((err) => {
  console.error('HeadyMCP server failed:', err);
  process.exit(1);
});
