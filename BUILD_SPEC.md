# Heady Build Specification

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## CRITICAL RULES (UNBREAKABLE)
- ZERO magic numbers — ALL numeric constants MUST derive from φ (1.618...) or Fibonacci sequence
- No localhost in production configs — use env vars or service discovery
- No TODO/FIXME/placeholder comments — everything production-ready
- No `any` types in TypeScript — full strict typing
- No localStorage for tokens. EVER. — httpOnly cookies only
- No console.log — structured JSON logging only (use pino or winston with JSON format)
- Concurrent-equals architecture — no priority/ranking language
- Author: Eric Haywood / HeadySystems Inc.

## φ Constants (must use these)
```typescript
const PHI = 1.618033988749895;
const PSI = 1 / PHI; // ≈ 0.618033988749895
const CSL_THRESHOLD = 0.618;
const PHI_SQUARED = PHI * PHI; // ≈ 2.618
const PHI_CUBED = PHI * PHI * PHI; // ≈ 4.236
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
```

## Health Check Intervals (Fibonacci-based)
- Fast services: interval 5s, timeout 3s, retries 3, start_period 8s
- Standard services: interval 8s, timeout 5s, retries 5, start_period 13s
- Heavy services: interval 13s, timeout 8s, retries 8, start_period 21s

## Logging Pattern
```typescript
import pino from 'pino';
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: { level: (label: string) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'SERVICE_NAME', version: '1.0.0' }
});
```

## Port Assignments (from architecture spec)
- postgres: 5432, redis: 6379, nats: 4222/8222/6222
- envoy-proxy: 3310, consul: 8500, pgbouncer: 6432
- heady-brain: 3311, heady-brains: 3312, heady-infer: 3313
- ai-router: 3314, model-gateway: 3315, api-gateway: 3316
- domain-router: 3317, heady-manager: 3318, heady-conductor: 3319
- hcfullpipeline-executor: 3320, heady-embed: 3321, heady-memory: 3322
- heady-vector: 3323, heady-projection: 3324, heady-cache: 3325
- search-service: 3326, heady-bee-factory: 3327, heady-hive: 3328
- heady-federation: 3329, heady-soul: 3330, auto-success-engine: 3331
- heady-chain: 3332, prompt-manager: 3333, heady-guard: 3334
- heady-security: 3335, heady-governance: 3336, secret-gateway: 3337
- auth-session-server: 3338, heady-check: 3339, heady-health: 3340
- heady-eval: 3341, heady-maintenance: 3342, heady-testing: 3343
- observability-kernel: 3344, notification-service: 3345
- heady-web: 3346, heady-buddy: 3347, heady-ui: 3348
- heady-onboarding: 3349, heady-pilot-onboarding: 3350
- heady-task-browser: 3351, analytics-service: 3352
- billing-service: 3353, mcp-server: 3354
- google-mcp: 3355, memory-mcp: 3356, perplexity-mcp: 3357
- jules-mcp: 3358, huggingface-gateway: 3359
- colab-gateway: 3360, silicon-bridge: 3361
- discord-bot: 3362, scheduler-service: 3363
- migration-service: 3364, asset-pipeline: 3365
