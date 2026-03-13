<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: docs/quickstarts/HEADYSERVICES.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyServices Quickstart

> The backend infrastructure powering the entire Heady ecosystem.

## Architecture Overview

```
HeadyManager (Node.js, port 3300)
├── Pipeline Engine (HCFullPipeline)
├── Supervisor (multi-agent routing)
├── Brain Service (meta-controller, ORS)
├── Checkpoint Analyzer
├── Health Checks + Cron
├── Readiness Evaluator
└── Registry API
```

## Quick Start

### Option 1: Node.js Direct
```bash
npm install
npm start
# Server running at http://localhost:3300
```

### Option 2: Docker Compose
```bash
docker compose up -d
# Starts: manager, postgres, redis
```

### Option 3: Full Stack
```bash
docker compose -f docker-compose.full.yml up -d
# Starts: all services, monitoring, workers
```

## Verify Installation

```bash
# Health check
curl http://localhost:3300/api/health
# Expected: {"ok":true,"version":"3.0.0","uptime":...}

# System status
curl http://localhost:3300/api/system/status
# Expected: {"environment":"development","production_ready":false,...}

# Registry
curl http://localhost:3300/api/registry
# Returns: full component catalog
```

## Core Services

| Service | Port | Purpose |
|---------|------|---------|
| HeadyManager | 3300 | API gateway, pipeline engine, MCP server |
| PostgreSQL | 5432 | Primary data store |
| Redis | 6379 | Session store, cache, rate limiting |
| HeadyConductor | -- | Python render worker |

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with uptime |
| `/api/system/status` | GET | Full system status |
| `/api/pipeline/run` | POST | Trigger pipeline execution |
| `/api/pipeline/state` | GET | Current pipeline state |
| `/api/nodes` | GET | List AI nodes |
| `/api/registry` | GET | Full component registry |
| `/api/brain/status` | GET | Brain status + readiness score |
| `/api/supervisor/status` | GET | Agent routing status |
| `/api/readiness/evaluate` | GET | Operational readiness probes |
| `/api/subsystems` | GET | All subsystem status |

## Configuration

All config lives in `configs/`:

| File | Purpose |
|------|---------|
| `hcfullpipeline.yaml` | Pipeline stages, checkpoints, stop rules |
| `resource-policies.yaml` | Concurrency, rate limits, cost budgets |
| `service-catalog.yaml` | Services, agents, tools, SLOs |
| `governance-policies.yaml` | Access control, security policies |
| `data-schema.yaml` | Data model (L0-L3), storage schemas |

## Environment Variables

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/heady
HEADY_API_KEY=your_api_key
ANTHROPIC_API_KEY=your_claude_key   # For Claude Code agent
PORT=3300
NODE_ENV=development
```

## Next Steps

- [Service Integration Guide](../guides/SERVICE_INTEGRATION.md) — How services connect
- [HeadyManager API Reference](../api/HEADYMANAGER_API.md) — Full endpoint docs
- [HeadyMCP Quickstart](./HEADYMCP.md) — Manager Control Plane setup
- [Checkpoint Protocol](../CHECKPOINT_PROTOCOL.md) — How the system stays in sync
