# AGENTS.md — Heady™ Cognitive Operating System

> This file describes the Heady project for AI coding agents.

## Project Overview

Heady is a 21-stage autonomous AI orchestration platform built with Node.js
and Python. It uses Continuous Semantic Logic (CSL) with cosine similarity
gates (threshold: 0.618 = 1/φ), Sacred Geometry ring topology for agent
orchestration, and 384D pgvector embeddings for semantic memory.

## Architecture

- **Core Runtime**: Node.js ≥22 (heady-manager.js)
- **Frontend**: React (frontend/)
- **Workers**: Cloudflare Workers (src/workers/)
- **Database**: Neon Postgres with pgvector HNSW
- **Cache**: Upstash Redis (T0), Neon pgvector (T1)
- **CI/CD**: GitHub Actions (.github/workflows/)

## Key Directories

```
├── heady-manager.js          # Main server entry point
├── heady-cli.js              # CLI: heady <category>:<action>
├── src/
│   ├── hc_supervisor.js      # Task routing to AI nodes
│   ├── nexus_protocol.js     # Secure input routing
│   ├── hc_ai_nodes.js        # 20 AI node definitions
│   ├── hc_brain.js           # Core reasoning engine
│   ├── phi_circuit_breaker.js # Fibonacci-threshold circuit breaker
│   ├── graceful_shutdown.js  # 34s phi-timeout shutdown
│   ├── structured_logger.js  # JSON structured logging
│   ├── observability_coherence.js # CSL coherence scoring
│   ├── csp_nonce_middleware.js # Per-request CSP nonces
│   ├── command-registry.js   # 89-command shortcut registry
│   ├── workers/heady-session/ # Durable Objects worker
│   └── routes/               # Express routes
├── configs/
│   ├── command-registry.yaml # 89 shortcut commands
│   ├── composite-workflows.yaml # 21 composite workflows
│   ├── automation-shortcuts.yaml # Event/schedule triggers
│   └── buddy-command-map.yaml # NLP → command mapping
├── scripts/
│   ├── migrate_pgvector_hnsw.sql # HNSW index migration
│   └── gitignore_audit.js    # Security audit script
├── shared/
│   └── design-tokens.css     # φ-derived CSS design system
├── docs/                     # Documentation
├── frontend/                 # React frontend
└── .github/                  # CI workflows, CODEOWNERS, PR template
```

## Key Commands

```bash
npm start                # Start heady-manager.js
npm test                 # Run tests
npm run dev              # Start backend + frontend
npm run heady            # Run CLI
node heady-cli.js --help # CLI help
```

## φ-Math Constants

All thresholds in the system derive from the golden ratio:
- φ = 1.618033988749895
- ψ = 1/φ = 0.618033988749895 (CSL minimum threshold)
- CSL gates: MINIMUM=0.618, LOW=0.691, MEDIUM=0.809, HIGH=0.882, CRITICAL=0.927
- Fibonacci timeouts: 4236ms, 11090ms, 29034ms, 76013ms, 199005ms, 521002ms
- Circuit breaker: 5 failures (F5), 34s recovery (F9×1000), 3 half-open calls (F4)

## Coding Conventions

- All files start with `// HEADY_BRAND:BEGIN` header block
- Use `const PHI = 1.618033988749895` — never hardcode 1.618
- CSL cosine similarity replaces boolean logic
- Ed25519 signatures on pipeline outputs
- Structured JSON logging (never bare console.log in production)
- Express middleware order: shutdown → logger → CSP → JSON → CORS → routes

## Pipeline Stages (22)

1-5: Reconnaissance (concurrent), 6-9: Sequential chain,
10-11: Execution, 12-18: Metacognition supercluster (concurrent),
19-22: Commit & distill

## Testing

```bash
npm test                 # Jest with --passWithNoTests
npm run lint             # ESLint
```
