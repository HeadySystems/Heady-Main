# HeadyMCP Server — Fine-Tuning & Optimization Guide

> **Version:** 1.0.0 | **Author:** HeadyAI | **Date:** 2026-03-23
> **Scope:** Complete guide for fine-tuning, optimizing, and hardening all HeadyMCP services
> **IP Note:** Covered under HeadySystems Inc. provisional patent portfolio (60+ filings)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Current State Assessment](#2-current-state-assessment)
3. [SDK Modernization — registerTool Migration](#3-sdk-modernization--registertool-migration)
4. [φ-Scaled Performance Tuning](#4-φ-scaled-performance-tuning)
5. [Transport Optimization](#5-transport-optimization)
6. [Tool Design Fine-Tuning](#6-tool-design-fine-tuning)
7. [Circuit Breaker & Resilience Hardening](#7-circuit-breaker--resilience-hardening)
8. [Rate Limiting & Thought Metering](#8-rate-limiting--thought-metering)
9. [Security Hardening](#9-security-hardening)
10. [Response Format Optimization](#10-response-format-optimization)
11. [Memory & Caching Strategy](#11-memory--caching-strategy)
12. [MCP Gateway Optimization](#12-mcp-gateway-optimization)
13. [Observability & Tracing](#13-observability--tracing)
14. [Testing & Evaluation Framework](#14-testing--evaluation-framework)
15. [Deployment Canary Protocol](#15-deployment-canary-protocol)
16. [Configuration Profiles](#16-configuration-profiles)
17. [Action Items & Priority Matrix](#17-action-items--priority-matrix)

---

## 1. Architecture Overview

HeadyMCP operates as a three-tier MCP architecture connecting LLM clients to the HCFullPipeline:

```
┌────────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                     │
│  Claude Desktop ─── stdio ──┐                                      │
│  External LLMs ─── HTTP ────┤                                      │
│  HeadyBuddy ─── WebSocket ──┘                                      │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────────────┐
│                    MCP LAYER                                        │
│  ┌─────────────────────┐  ┌──────────────────────┐                 │
│  │ heady-mcp-server    │  │ mcp-gateway          │                 │
│  │ (stdio, 12 tools)   │  │ (HTTP, Cloud Run)    │                 │
│  │ Port: stdio         │  │ Port: 8081           │                 │
│  └────────┬────────────┘  └──────────┬───────────┘                 │
│           │                          │                              │
│  ┌────────┴────────────┐  ┌──────────┴───────────┐                 │
│  │ liquid-nodes-mcp    │  │ render-mcp-server    │                 │
│  │ (cloud connectors)  │  │ (deploy ops)         │                 │
│  └────────┬────────────┘  └──────────┬───────────┘                 │
└───────────┼──────────────────────────┼─────────────────────────────┘
            │                          │
┌───────────▼──────────────────────────▼─────────────────────────────┐
│                    BACKEND LAYER                                    │
│  heady-manager.js (port 3300) → HCFullPipeline (22 stages)        │
│  ├── Supervisor (multi-agent fan-out)                              │
│  ├── Brain (meta-controller)                                       │
│  ├── 17 Swarms (89 bee types, 6,765 max concurrent)               │
│  ├── 8 Native Connectors                                          │
│  └── T0/T1/T2 Memory Tiers                                        │
└────────────────────────────────────────────────────────────────────┘
```

### Service Inventory

| Service | File | Transport | Tools | Status |
|---------|------|-----------|-------|--------|
| heady-mcp-server | `mcp-servers/heady-mcp-server/index.js` | stdio | 12 | Production |
| heady-mcp-server (legacy) | `mcp-servers/heady-mcp-server.js` | stdio | 12 | Deprecated — migrate |
| liquid-nodes-mcp | `mcp-servers/liquid-nodes-mcp-server.js` | stdio | ~8 | Production |
| render-mcp-server | `mcp-servers/render-mcp-server.js` | stdio | ~4 | Production |
| mcp-gateway | `services/mcp-gateway/src/server.js` | HTTP | REST+JSON-RPC | Production |
| heady-mcp-connector | `src/services/heady-mcp-connector.js` | Internal | 5 native | Production |

---

## 2. Current State Assessment

### What's Working Well

- φ-constants used consistently for timeouts, rate limits, circuit breakers (Law 2)
- Zod validation on gateway schemas (CreateKeySchema, ToolCallSchema, JsonRpcSchema)
- Structured JSON logging to stderr (correct for stdio MCP servers)
- Circuit breaker pattern with Fibonacci-scaled thresholds
- Multi-tier config loading (API-first, filesystem fallback)
- CSL relevance scoring on tool responses
- Thought-based metered billing via Stripe
- HEADY_BRAND headers on all source files

### Critical Gaps Identified

| Gap | Severity | Impact |
|-----|----------|--------|
| Using deprecated `server.tool()` API instead of `server.registerTool()` | **HIGH** | Missing outputSchema, structuredContent, title field |
| No `outputSchema` defined on any tool | **HIGH** | Clients cannot understand response structure |
| No `structuredContent` in tool responses | **HIGH** | Only raw text returned, no machine-parseable data |
| Missing tool annotations (readOnlyHint, destructiveHint) | **MEDIUM** | Clients cannot optimize tool selection |
| No response_format parameter (JSON vs Markdown) | **MEDIUM** | Agents always get JSON, no human-readable option |
| No pagination on list-type tools | **MEDIUM** | Large responses can overwhelm context windows |
| No CHARACTER_LIMIT constant or truncation | **MEDIUM** | Unbounded response sizes |
| Circuit breaker has no half-open state | **MEDIUM** | Binary open/closed — no gradual recovery |
| Legacy CJS server still present | **LOW** | Maintenance burden, module duplication |
| No Streamable HTTP transport for remote access | **LOW** | stdio-only limits multi-client scenarios |
| Config cache never invalidates | **LOW** | Stale config on long-running sessions |

---

## 3. SDK Modernization — registerTool Migration

### Critical: Migrate from `server.tool()` to `server.registerTool()`

The current codebase uses the **deprecated** `server.tool()` API from MCP SDK v0.4.x. The modern `server.registerTool()` API provides title, outputSchema, structuredContent, and better type safety.

### Before (Current — Deprecated)

```javascript
server.tool(
  "heady_health",
  "Returns operational system health status...",
  { detailed: z.boolean().optional().describe("...") },
  async (params) => {
    const response = { status: "operational", ors_score: 82 };
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }
);
```

### After (Optimized — Modern API)

```javascript
// Zod schemas separated for reuse and clarity
const HeadyHealthInputSchema = z.object({
  detailed: z.boolean()
    .default(false)
    .describe("Include detailed per-component metrics (pipeline, supervisor, brain, connectors)"),
  response_format: z.enum(["json", "markdown"])
    .default("json")
    .describe("Output format: 'json' for machine-readable or 'markdown' for human-readable"),
}).strict();

const HeadyHealthOutputSchema = z.object({
  status: z.enum(["operational", "degraded", "error"]),
  ors_score: z.number().min(0).max(100),
  active_swarms: z.number(),
  memory_tiers: z.object({
    t0_redis: z.string(),
    t1_neon: z.string(),
    t2_qdrant: z.string(),
  }),
  circuit_breakers: z.object({
    total: z.number(),
    open: z.array(z.string()),
  }),
  csl_relevance: z.number(),
  components: z.object({
    pipeline: z.object({ status: z.string() }),
    supervisor: z.object({ status: z.string() }),
    brain: z.object({ status: z.string() }),
    connectors: z.object({ count: z.number() }),
  }).optional(),
});

server.registerTool(
  "heady_health",
  {
    title: "Heady System Health",
    description: `Returns operational system health status including ORS score (0-100),
active swarm count, memory tier utilization, and circuit breaker state.

Args:
  - detailed (boolean): Include per-component metrics (default: false)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns (JSON):
  {
    "status": "operational" | "degraded" | "error",
    "ors_score": number (0-100),
    "active_swarms": 17,
    "memory_tiers": { "t0_redis": "256MB", "t1_neon": "2GB", "t2_qdrant": "16GB" },
    "circuit_breakers": { "total": number, "open": string[] },
    "csl_relevance": number (0.0-1.0)
  }

Use when: Checking system readiness before pipeline runs, diagnosing failures.
Don't use when: You need pipeline-specific status (use heady_pipeline_status).`,
    inputSchema: HeadyHealthInputSchema,
    outputSchema: HeadyHealthOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const health = await client.get("/api/health-checks/snapshot");

      const output = {
        status: "operational",
        ors_score: health?.ors_score || 82,
        active_swarms: HEADY_SWARM_COUNT,
        memory_tiers: {
          t0_redis: health?.memory?.l0 || "256MB",
          t1_neon: health?.memory?.l1 || "2GB",
          t2_qdrant: health?.memory?.l2 || "16GB",
        },
        circuit_breakers: {
          total: client.circuitBreakers.size,
          open: Array.from(client.circuitBreakers.entries())
            .filter(([, cb]) => cb.open)
            .map(([key]) => key),
        },
        csl_relevance: calculateCSLScore({ updated: Date.now() }, "health"),
      };

      if (params.detailed) {
        output.components = {
          pipeline: health?.components?.pipeline || { status: "healthy" },
          supervisor: health?.components?.supervisor || { status: "healthy" },
          brain: health?.components?.brain || { status: "healthy" },
          connectors: health?.components?.connectors || { count: HEADY_CONNECTOR_COUNT },
        };
      }

      // Dual response: text + structuredContent
      let textContent;
      if (params.response_format === "markdown") {
        textContent = [
          `# Heady System Health`,
          ``,
          `**Status:** ${output.status} | **ORS:** ${output.ors_score}/100`,
          `**Active Swarms:** ${output.active_swarms}`,
          ``,
          `## Memory Tiers`,
          `- T0 (Redis): ${output.memory_tiers.t0_redis}`,
          `- T1 (Neon): ${output.memory_tiers.t1_neon}`,
          `- T2 (Qdrant): ${output.memory_tiers.t2_qdrant}`,
          ``,
          `## Circuit Breakers`,
          `Total: ${output.circuit_breakers.total} | Open: ${output.circuit_breakers.open.length > 0 ? output.circuit_breakers.open.join(", ") : "None"}`,
        ].join("\n");
      } else {
        textContent = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: output,
      };
    } catch (err) {
      logger.error("heady_health failed", { error: err.message });
      return {
        content: [{
          type: "text",
          text: `Error: Health check failed — ${err.message}. Try again in ${FIBONACCI[5]} seconds. If persistent, check heady-manager connectivity at ${HEADY_MANAGER_URL}/api/health`,
        }],
        isError: true,
      };
    }
  }
);
```

### Migration Checklist for All 12 Tools

| Tool | readOnlyHint | destructiveHint | idempotentHint | Priority |
|------|:---:|:---:|:---:|:---:|
| `heady_health` | ✓ | ✗ | ✓ | P0 |
| `heady_pulse` | ✓ | ✗ | ✓ | P0 |
| `heady_brain_query` | ✓ | ✗ | ✓ | P0 |
| `heady_pipeline_status` | ✓ | ✗ | ✓ | P0 |
| `heady_pipeline_run` | ✗ | ✗ | ✗ | P1 |
| `heady_swarm_status` | ✓ | ✗ | ✓ | P0 |
| `heady_connector_status` | ✓ | ✗ | ✓ | P0 |
| `heady_deploy` | ✗ | ✓ | ✗ | P1 |
| `heady_finance_summary` | ✓ | ✗ | ✓ | P2 |
| `heady_schedule_deploy` | ✗ | ✗ | ✗ | P2 |
| `heady_draft_email` | ✗ | ✗ | ✗ | P2 |
| `heady_generate_design` | ✗ | ✗ | ✗ | P2 |

---

## 4. φ-Scaled Performance Tuning

All numerical constants must derive from φ (1.618) or the Fibonacci sequence per Law 2.

### Timeout Tuning

```javascript
// Current values — already compliant, but can be refined
const PHI_TIMEOUTS = {
  connect:    Math.round(PHI * 1000),       // 1,618ms — TCP connect
  request:    Math.round(PHI ** 3 * 1000),  // 4,236ms — single API call
  pipeline:   PHI_5,                         // 11,090ms — full pipeline target
  heartbeat:  PHI_7,                         // 29,034ms — keepalive
  tool_call:  FIB[8] * 1000,               // 34,000ms — max tool execution
  gateway:    FIB[9] * 1000,               // 55,000ms — gateway timeout
};
```

### Connection Pool Tuning

```javascript
// Neon Postgres pool (mcp-gateway)
const POOL_CONFIG = {
  max: TOP_K,                                // 21 connections (FIB[7])
  idleTimeoutMillis: PHI_7,                  // 29,034ms
  connectionTimeoutMillis: Math.round(PHI_SQ * 1000), // 2,618ms
  statement_timeout: PHI_5,                  // 11,090ms
  keepAlive: true,
  keepAliveInitialDelayMillis: FIB[6] * 1000, // 13,000ms
};
```

### Worker Thread Concurrency

```javascript
// For CPU-bound tool operations (embeddings, CSL scoring)
const WORKER_CONFIG = {
  maxWorkers: FIB[5],        // 8 worker threads
  taskQueueMax: FIB[7],      // 21 queued tasks
  idleTimeout: FIB[9] * 1000, // 55s before worker shutdown
};
```

---

## 5. Transport Optimization

### Current: stdio only

The primary MCP server uses stdio transport — correct for Claude Desktop local integration.

### Add: Streamable HTTP for Remote Clients

For multi-client access (headymcp.com developer platform, HeadyBuddy, external integrations), add Streamable HTTP transport alongside stdio:

```javascript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

async function startHTTPTransport(mcpServer, port = 8082) {
  const app = express();
  app.use(express.json());

  // Health probe for Cloud Run
  app.get("/health/live", (req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", (req, res) => res.json({ status: "ready", tools: 12 }));

  // Streamable HTTP MCP endpoint
  app.post("/mcp", async (req, res) => {
    // Validate API key (Law 3 — cloud-deployed, authenticated)
    const apiKey = req.headers["x-heady-api-key"];
    if (!apiKey || !validateApiKey(apiKey)) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless for scalability
      enableJsonResponse: true,
    });

    res.on("close", () => transport.close());
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    logger.info("MCP HTTP transport started", { port });
  });
}

// Transport selection
const TRANSPORT = process.env.MCP_TRANSPORT || "stdio";
if (TRANSPORT === "http") {
  startHTTPTransport(server, parseInt(process.env.MCP_HTTP_PORT || "8082"));
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP stdio transport connected");
}
```

### Transport Selection Matrix

| Scenario | Transport | Port | Auth |
|----------|-----------|------|------|
| Claude Desktop local | stdio | N/A | Process-level |
| headymcp.com API | Streamable HTTP | 8082 | `hdy_*` API key |
| HeadyBuddy extension | Streamable HTTP | 8082 | JWT bearer |
| CI/CD pipeline | stdio | N/A | Env var |
| Colab ML runtime | Streamable HTTP | 8082 | JWT bearer |

---

## 6. Tool Design Fine-Tuning

### Tool Naming Convention

All HeadyMCP tools use the `heady_` prefix per MCP best practices to prevent collisions with other servers:

```
heady_{action}_{resource}
```

Current tools are correctly prefixed. No changes needed.

### Tool Description Standards

Every tool description must include these sections for optimal agent discoverability:

```
1. One-line summary (what it does)
2. Detailed explanation (when to use, what it covers)
3. Args (parameter names, types, constraints)
4. Returns (JSON schema with field descriptions)
5. Examples (2-3 use cases: "Use when: ...")
6. Don't use when (disambiguation from similar tools)
7. Error handling (what errors to expect)
```

### New Tools to Add

Based on the service catalog and MCP best practices, these tools should be added:

```javascript
// P0 — High-value additions
"heady_memory_search"     // Semantic search across T0/T1/T2 memory tiers
"heady_memory_write"      // Store new memory vectors with CSL scoring
"heady_config_get"        // Read pipeline/resource/governance configs
"heady_agent_status"      // Individual agent status (claude-code, builder, etc.)

// P1 — Workflow tools
"heady_pipeline_history"  // Past pipeline runs with latency/outcome
"heady_security_audit"    // Run security scan via HeadyGuard
"heady_distill"           // Trigger Stage 22 knowledge distillation

// P2 — Specialized tools
"heady_trading_account"   // Account state for Apex/Tradovate
"heady_trading_positions" // Open positions and P&L
"heady_midi_bridge"       // MIDI UMP packet translation
```

---

## 7. Circuit Breaker & Resilience Hardening

### Current Implementation Issues

The current `HeadyHttpClient` circuit breaker has two gaps:

1. No **half-open state** — it jumps from closed to open, then auto-recovers after 55s with no gradual test
2. Success recording decrements by 1 — should reset to 0 on sustained success

### Optimized Circuit Breaker (φ-Scaled, 3-State)

```javascript
const CB_STATES = { CLOSED: "closed", OPEN: "open", HALF_OPEN: "half_open" };

class PhiCircuitBreaker {
  constructor() {
    this.state = CB_STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.threshold = FIB[10];               // 89 failures to open
    this.resetTimeout = FIB[9] * 1000;      // 55s before half-open
    this.halfOpenMax = FIB[8];              // 34 test requests in half-open
    this.halfOpenSuccessRequired = FIB[7];  // 21 successes to close
  }

  canExecute() {
    if (this.state === CB_STATES.CLOSED) return true;
    if (this.state === CB_STATES.OPEN) {
      if (Date.now() - this.lastFailure.getTime() > this.resetTimeout) {
        this.state = CB_STATES.HALF_OPEN;
        this.successes = 0;
        logger.info("Circuit breaker → HALF_OPEN", { breaker: this.key });
        return true;
      }
      return false;
    }
    // HALF_OPEN: allow limited requests
    return this.successes + this.failures < this.halfOpenMax;
  }

  recordSuccess() {
    if (this.state === CB_STATES.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.halfOpenSuccessRequired) {
        this.state = CB_STATES.CLOSED;
        this.failures = 0;
        this.successes = 0;
        logger.info("Circuit breaker → CLOSED", { breaker: this.key });
      }
    } else {
      this.failures = Math.max(0, this.failures - FIB[2]); // Decay by 2
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = new Date();
    if (this.state === CB_STATES.HALF_OPEN) {
      this.state = CB_STATES.OPEN;
      logger.warn("Circuit breaker → OPEN (half-open failure)", { breaker: this.key });
    } else if (this.failures >= this.threshold) {
      this.state = CB_STATES.OPEN;
      logger.warn("Circuit breaker → OPEN", { breaker: this.key, failures: this.failures });
    }
  }
}
```

### Retry with φ-Exponential Backoff

```javascript
async function withPhiRetry(fn, maxRetries = 4) {
  const baseDelay = FIB[5] * 100; // 800ms
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.min(baseDelay * (PHI ** attempt), 30000);
      logger.warn("Retry scheduled", { attempt: attempt + 1, delay_ms: Math.round(delay) });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 8. Rate Limiting & Thought Metering

### Current Rate Limits (Fibonacci-Scaled)

| Tier | Limit | Window | Source |
|------|-------|--------|--------|
| Trial | 8 rpm | 60s | FIB[5] |
| Pilot | 21 rpm | 60s | FIB[7] |
| Public | 34 rpm | 60s | FIB[8] |
| Internal | 89 rpm | 60s | FIB[10] |

### Thought Cost Multipliers (φ-Scaled)

```javascript
const THOUGHT_COSTS = {
  embed:          1.0,               // Base unit
  search:         PHI_INV,           // 0.618 — read-only, fast
  memory_write:   PHI,               // 1.618 — write operation
  enrichment:     PHI,               // 1.618 — adds context
  pipeline_step:  PHI_SQ,            // 2.618 — full pipeline stage
  llm_inference:  PHI ** 3,          // 4.236 — expensive LLM call
  "990_parse":    PHI ** 4,          // 6.854 — specialized parser
};
```

### Optimization: Sliding Window Rate Limiter

Replace fixed-window rate limiting with a sliding window for smoother throughput:

```javascript
class PhiSlidingWindowLimiter {
  constructor(maxCalls, windowMs) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = [];
  }

  canProceed() {
    const now = Date.now();
    this.calls = this.calls.filter(ts => now - ts < this.windowMs);
    if (this.calls.length >= this.maxCalls) return false;
    this.calls.push(now);
    return true;
  }

  get remaining() {
    const now = Date.now();
    this.calls = this.calls.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxCalls - this.calls.length);
  }
}

// Per-tool rate limiters
const toolLimiters = new Map();
function getToolLimiter(toolName, tier = "public") {
  const key = `${toolName}:${tier}`;
  if (!toolLimiters.has(key)) {
    const limits = { trial: FIB[5], pilot: FIB[7], public: FIB[8], internal: FIB[10] };
    toolLimiters.set(key, new PhiSlidingWindowLimiter(
      limits[tier] || FIB[8],
      FIB[9] * 1000 // 55s window
    ));
  }
  return toolLimiters.get(key);
}
```

---

## 9. Security Hardening

### Required Upgrades

#### 9.1 Input Validation (Already Good — Extend)

All tool inputs already use Zod schemas. Extend with additional constraints:

```javascript
// Add to all string inputs
z.string()
  .min(1, "Cannot be empty")
  .max(FIB[12], `Max length is ${FIB[12]} characters`) // 233 char limit
  .refine(s => !/<script/i.test(s), "Script injection detected")
  .refine(s => !/\$\{.*\}/.test(s), "Template injection detected")
```

#### 9.2 Timing-Safe API Key Validation

Already present in `heady-manager.js` — ensure the MCP gateway also uses it:

```javascript
import crypto from "crypto";

function timingSafeValidateKey(provided, stored) {
  if (!provided || !stored) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) {
    // Compare against a dummy to maintain constant time
    const dummy = Buffer.alloc(a.length);
    crypto.timingSafeEqual(a, dummy);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
```

#### 9.3 Audit Logging for All Tool Calls

```javascript
function auditLog(toolName, params, result, meta) {
  const entry = {
    type: "mcp_tool_call",
    tool: toolName,
    params_hash: crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 16),
    success: !result.isError,
    latency_ms: meta.latency,
    correlation_id: meta.correlationId,
    agent_id: meta.agentId || "unknown",
    timestamp: new Date().toISOString(),
  };
  logger.info("audit", entry);
}
```

#### 9.4 DNS Rebinding Protection (HTTP Transport)

```javascript
// For Streamable HTTP transport
app.use((req, res, next) => {
  const host = req.headers.host;
  const allowedHosts = [
    "headymcp.com",
    "api.headymcp.com",
    "mcp.headysystems.com",
    /\.headysystems\.com$/,
    /\.run\.app$/, // Cloud Run
  ];
  const isAllowed = allowedHosts.some(h =>
    h instanceof RegExp ? h.test(host) : host === h || host.startsWith(h + ":")
  );
  if (!isAllowed) {
    return res.status(403).json({ error: "Host not allowed" });
  }
  next();
});
```

---

## 10. Response Format Optimization

### Add Dual Format Support to All Tools

```javascript
// Shared response formatter
function formatToolResponse(data, format = "json", markdownRenderer = null) {
  const output = { ...data };

  let textContent;
  if (format === "markdown" && markdownRenderer) {
    textContent = markdownRenderer(data);
  } else {
    textContent = JSON.stringify(output, null, 2);
  }

  // Enforce CHARACTER_LIMIT (Law 4 — no silent failures)
  const CHARACTER_LIMIT = FIB[12] * 100; // 23,300 chars
  if (textContent.length > CHARACTER_LIMIT) {
    textContent = textContent.slice(0, CHARACTER_LIMIT) +
      `\n\n[Truncated: ${textContent.length} → ${CHARACTER_LIMIT} chars. Use pagination or filters.]`;
  }

  return {
    content: [{ type: "text", text: textContent }],
    structuredContent: output,
  };
}
```

### Add Pagination to List Tools

```javascript
const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(FIB[10]).default(FIB[7])
    .describe(`Maximum results to return (1-${FIB[10]}, default: ${FIB[7]})`),
  offset: z.number().int().min(0).default(0)
    .describe("Number of results to skip for pagination"),
});

function paginateResults(items, limit, offset) {
  const total = items.length;
  const paged = items.slice(offset, offset + limit);
  return {
    total,
    count: paged.length,
    offset,
    items: paged,
    has_more: total > offset + paged.length,
    ...(total > offset + paged.length ? { next_offset: offset + paged.length } : {}),
  };
}
```

---

## 11. Memory & Caching Strategy

### Config Cache with φ-TTL

```javascript
class PhiCache {
  constructor(ttlMs = PHI_7) { // 29,034ms default TTL
    this.store = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    // Enforce Fibonacci-scaled max size
    if (this.store.size >= FIB[9]) { // 55 entries max
      const oldest = [...this.store.entries()]
        .sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, { value, ts: Date.now() });
  }
}

const configCache = new PhiCache(PHI_7);        // 29s for config
const responseCache = new PhiCache(FIB[6] * 1000); // 13s for tool responses
```

### Tool Response Caching

Cache read-only tool responses (heady_health, heady_pulse, etc.) to reduce backend calls:

```javascript
async function cachedToolCall(toolName, params, fetchFn) {
  const cacheKey = `${toolName}:${JSON.stringify(params)}`;
  const cached = responseCache.get(cacheKey);
  if (cached) {
    logger.info("Cache hit", { tool: toolName });
    return cached;
  }
  const result = await fetchFn();
  responseCache.set(cacheKey, result);
  return result;
}
```

---

## 12. MCP Gateway Optimization

### Current Architecture (services/mcp-gateway/src/server.js)

The gateway runs on Cloud Run (port 8081) with Express, Helmet, CORS, rate limiting, Sentry, and Postgres (Neon).

### Optimization Targets

#### 12.1 Connection Pooling

The current Postgres pool is already φ-scaled (max: 21, idle: 29,034ms). Add connection health checks:

```javascript
pool.on("error", (err) => {
  logger.error("Postgres pool error", { error: err.message });
  Sentry.captureException(err);
});

// Periodic health check
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    logger.error("Postgres health check failed", { error: err.message });
  }
}, PHI_7); // Every 29 seconds
```

#### 12.2 Thought Metering Optimization

Batch thought records to reduce DB writes:

```javascript
class ThoughtBatcher {
  constructor(flushInterval = FIB[6] * 1000) { // 13s flush interval
    this.batch = [];
    this.maxBatch = FIB[7]; // 21 thoughts per batch
    this.interval = setInterval(() => this.flush(), flushInterval);
  }

  record(thought) {
    this.batch.push(thought);
    if (this.batch.length >= this.maxBatch) this.flush();
  }

  async flush() {
    if (this.batch.length === 0) return;
    const toFlush = this.batch.splice(0);
    try {
      await pool.query(
        `INSERT INTO thoughts (api_key_id, tool_name, cost, timestamp)
         SELECT * FROM unnest($1::uuid[], $2::text[], $3::numeric[], $4::timestamptz[])`,
        [
          toFlush.map(t => t.keyId),
          toFlush.map(t => t.toolName),
          toFlush.map(t => t.cost),
          toFlush.map(t => t.timestamp),
        ]
      );
    } catch (err) {
      logger.error("Thought batch flush failed", { count: toFlush.length, error: err.message });
      // Re-queue failed thoughts
      this.batch.unshift(...toFlush);
    }
  }
}
```

#### 12.3 JSON-RPC 2.0 Batching

Support batch requests per JSON-RPC spec:

```javascript
app.post("/api/v1/jsonrpc", async (req, res) => {
  if (Array.isArray(req.body)) {
    // Batch request
    const results = await Promise.allSettled(
      req.body.map(item => handleJsonRpcRequest(item))
    );
    return res.json(results.map((r, i) =>
      r.status === "fulfilled" ? r.value : {
        jsonrpc: "2.0",
        error: { code: -32603, message: r.reason?.message || "Internal error" },
        id: req.body[i]?.id || null,
      }
    ));
  }
  // Single request
  const result = await handleJsonRpcRequest(req.body);
  return res.json(result);
});
```

---

## 13. Observability & Tracing

### Structured Logging Standards

All MCP servers already log to stderr in JSON format. Standardize the fields:

```javascript
const LOG_FIELDS = {
  service: "heady-mcp-server",
  version: "1.0.0",
  node: "HeadyMCP",       // AI node attribution
  environment: NODE_ENV,
};

function createLogger(service) {
  const write = (level, msg, data = {}) => {
    process.stderr.write(JSON.stringify({
      ...LOG_FIELDS,
      level,
      msg,
      ...data,
      ts: new Date().toISOString(),
      trace_id: data.correlation_id || crypto.randomUUID(),
    }) + "\n");
  };

  return {
    info: (msg, data) => write("info", msg, data),
    warn: (msg, data) => write("warn", msg, data),
    error: (msg, data) => write("error", msg, data),
    debug: (msg, data) => write("debug", msg, data),
  };
}
```

### Tool Call Metrics

```javascript
const toolMetrics = {
  calls: new Map(),
  record(toolName, latencyMs, success) {
    if (!this.calls.has(toolName)) {
      this.calls.set(toolName, { total: 0, errors: 0, latencies: [] });
    }
    const m = this.calls.get(toolName);
    m.total++;
    if (!success) m.errors++;
    m.latencies.push(latencyMs);
    // Keep only last FIB[10] (89) measurements
    if (m.latencies.length > FIB[10]) m.latencies.shift();
  },
  summary() {
    const result = {};
    for (const [name, m] of this.calls) {
      const sorted = [...m.latencies].sort((a, b) => a - b);
      result[name] = {
        total_calls: m.total,
        error_rate: m.errors / m.total,
        p50_ms: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95_ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99_ms: sorted[Math.floor(sorted.length * 0.99)] || 0,
      };
    }
    return result;
  },
};
```

---

## 14. Testing & Evaluation Framework

### MCP Inspector Testing

```bash
# Test stdio server locally
npx @modelcontextprotocol/inspector node mcp-servers/heady-mcp-server/index.js

# Test HTTP transport
npx @modelcontextprotocol/inspector --transport http --url http://localhost:8082/mcp
```

### Evaluation Questions (10 Required)

Create `evals/heady-mcp-eval.xml`:

```xml
<evaluation>
  <qa_pair>
    <question>Check the system health and report the ORS score. Is the system ready for a pipeline run?</question>
    <answer>Use heady_health with detailed=true. ORS ≥ 85 means ready.</answer>
  </qa_pair>
  <qa_pair>
    <question>How many swarms are currently active and what is their combined load distribution?</question>
    <answer>Use heady_swarm_status. Expected: 17 active swarms.</answer>
  </qa_pair>
  <qa_pair>
    <question>Trigger a pipeline run and monitor its progress through all 22 stages.</question>
    <answer>Use heady_pipeline_run, then heady_pipeline_status repeatedly.</answer>
  </qa_pair>
  <qa_pair>
    <question>What connectors are currently enabled and which have open circuit breakers?</question>
    <answer>Use heady_connector_status. Cross-reference with heady_health circuit_breakers.</answer>
  </qa_pair>
  <qa_pair>
    <question>Query the brain for the current architecture decisions and deployment strategy.</question>
    <answer>Use heady_brain_query with query_type="architecture".</answer>
  </qa_pair>
  <qa_pair>
    <question>Get a financial summary of API thought consumption for the current billing period.</question>
    <answer>Use heady_finance_summary. Returns thought counts by type and cost.</answer>
  </qa_pair>
  <qa_pair>
    <question>Schedule a deployment for the next Fibonacci time interval and confirm it was scheduled.</question>
    <answer>Use heady_schedule_deploy with appropriate cron expression.</answer>
  </qa_pair>
  <qa_pair>
    <question>Draft an email summarizing today's pipeline performance metrics.</question>
    <answer>Use heady_pipeline_status first, then heady_draft_email with the data.</answer>
  </qa_pair>
  <qa_pair>
    <question>Check all system endpoints and identify any that are unresponsive.</question>
    <answer>Use heady_pulse. Inspect each endpoint status in the response.</answer>
  </qa_pair>
  <qa_pair>
    <question>Generate a design asset and verify the generation request was accepted.</question>
    <answer>Use heady_generate_design with design parameters.</answer>
  </qa_pair>
</evaluation>
```

---

## 15. Deployment Canary Protocol

Deploy MCP server updates using φ-stepped canary rollouts per Law 2:

```
5% → 25% → 50% → 100%
(φ-rollout: 0.0618 → 0.382 → 0.618 → 1.0)
```

### Cloud Run Canary Configuration

```yaml
# render.yaml or Cloud Run traffic splitting
services:
  - name: heady-mcp-gateway
    env: docker
    plan: standard
    scaling:
      minInstances: 1
      maxInstances: 5
    envVars:
      - key: MCP_CANARY_WEIGHT
        value: "0.0618"  # Start at ~6%
```

### Rollout Decision Gates

| Metric | Pass Threshold | Rollback Threshold |
|--------|:---:|:---:|
| Error rate | < 1% | > 5% |
| P95 latency | < PHI_5 ms (11,090ms) | > PHI_7 ms (29,034ms) |
| Circuit breaker opens | 0 new | > 2 new |
| Thought metering accuracy | > 99% | < 95% |

---

## 16. Configuration Profiles

### Profile Hierarchy

```
distribution/mcp/configs/
├── minimal-mcp.yaml      # Free tier — read-only, 3 tools
├── default-mcp.yaml      # Standard — 12 tools, all connectors
├── dev-mcp.yaml           # Development — debug logging, relaxed limits
└── enterprise-mcp.yaml    # Enterprise — audit trails, approval gates
```

### Dynamic Config Loading

```javascript
async function loadMCPConfig(tier = "default") {
  const configPath = join(__dirname, `../../distribution/mcp/configs/${tier}-mcp.yaml`);
  try {
    const yaml = await import("js-yaml");
    const content = readFileSync(configPath, "utf8");
    return yaml.load(content);
  } catch (err) {
    logger.warn("Config load failed, using defaults", { tier, error: err.message });
    return getDefaultConfig();
  }
}
```

---

## 17. Action Items & Priority Matrix

### P0 — Critical (Do Now)

| # | Action | Files Affected | Est. Effort |
|---|--------|----------------|-------------|
| 1 | Migrate all 12 tools from `server.tool()` to `server.registerTool()` | `mcp-servers/heady-mcp-server/index.js` | 4-6 hours |
| 2 | Add `outputSchema` to all tools | Same | Included in #1 |
| 3 | Add `structuredContent` to all tool responses | Same | Included in #1 |
| 4 | Add tool annotations (readOnlyHint, destructiveHint, etc.) | Same | Included in #1 |
| 5 | Add `response_format` parameter (json/markdown) to all read tools | Same | 2 hours |
| 6 | Implement CHARACTER_LIMIT (23,300 = FIB[12] × 100) with truncation | Same + gateway | 1 hour |

### P1 — Important (This Sprint)

| # | Action | Files Affected | Est. Effort |
|---|--------|----------------|-------------|
| 7 | Upgrade circuit breaker to 3-state (closed/open/half-open) | `HeadyHttpClient` class | 2 hours |
| 8 | Add Streamable HTTP transport option | New: `src/transports/http.js` | 3 hours |
| 9 | Add pagination to heady_swarm_status, heady_connector_status | Tool handlers | 2 hours |
| 10 | Implement PhiCache for config + response caching | New: `src/cache.js` | 2 hours |
| 11 | Add audit logging to all tool calls | Tool middleware | 2 hours |
| 12 | Add tool call metrics (latency, error rate, P50/P95/P99) | New: `src/metrics.js` | 2 hours |

### P2 — Nice to Have (Next Sprint)

| # | Action | Files Affected | Est. Effort |
|---|--------|----------------|-------------|
| 13 | Add new tools (heady_memory_search, heady_security_audit, etc.) | Tool files | 8 hours |
| 14 | Implement thought batching in gateway | `services/mcp-gateway/` | 3 hours |
| 15 | Add JSON-RPC batch request support | Gateway routes | 2 hours |
| 16 | Create evaluation XML with 10 test questions | New: `evals/` | 2 hours |
| 17 | Remove legacy CJS server (`heady-mcp-server.js`) | Delete file | 30 min |
| 18 | Add DNS rebinding protection for HTTP transport | Transport middleware | 1 hour |
| 19 | Implement sliding window rate limiter | Rate limit module | 2 hours |
| 20 | Add MCP Resource registrations for static data | Tool files | 3 hours |

### Estimated Total Effort

| Priority | Hours | Sprint |
|----------|:-----:|:------:|
| P0 | ~10 hours | Current |
| P1 | ~13 hours | Current |
| P2 | ~22 hours | Next |
| **Total** | **~45 hours** | **2 sprints** |

---

## Appendix A: Environment Variables

```bash
# Core
HEADY_MANAGER_URL=https://heady-manager-bf4q4zywhq-uc.a.run.app
HEADY_API_KEY=hdy_int_xxxxxxxxxx
NODE_ENV=production

# MCP Transport
MCP_TRANSPORT=stdio          # or "http" for Streamable HTTP
MCP_HTTP_PORT=8082

# Gateway
PORT=8081
DATABASE_URL=postgres://...
JWT_SECRET=xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx

# Feature Flags
MCP_CACHE_ENABLED=true
MCP_AUDIT_LOGGING=true
MCP_CANARY_WEIGHT=1.0
```

## Appendix B: MCP SDK Version Requirements

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "zod": "^3.23.8",
    "express": "^4.21.0"
  }
}
```

**Note:** The current `package.json` specifies SDK v0.4.0. Upgrade to v1.6.1+ is required for `registerTool()`, `outputSchema`, and `structuredContent` support.

## Appendix C: Patentable Innovations

The following HeadyMCP optimizations may qualify for provisional patent filings:

1. **φ-Scaled Circuit Breaker with CSL Recovery Scoring** — Circuit breaker state transitions governed by Fibonacci thresholds with Continuous Semantic Logic relevance scoring for recovery prioritization
2. **Thought-Based Metered MCP Billing** — Per-tool-call billing using φ-weighted cost multipliers across tiered API access levels
3. **CSL-Gated Tool Response Caching** — Semantic similarity scoring to determine cache freshness beyond simple TTL expiry
4. **Fibonacci Sliding Window Rate Limiter** — Rate limiting algorithm using Fibonacci sequence for window sizing and burst capacity

---

*This document is the intellectual property of HeadySystems Inc. All architectural patterns, φ-constants, and CSL mechanisms are protected under provisional patent filings.*

*Generated by HeadyAI — the intelligence layer of the Heady™ platform.*
