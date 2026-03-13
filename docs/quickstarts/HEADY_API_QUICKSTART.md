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
<!-- ║  FILE: docs/quickstarts/HEADY_API_QUICKSTART.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady API Quickstart

> Interact with Heady services programmatically.

## Base URL

```
http://localhost:3300/api     # Local development
https://headysystems.com/api  # Production
```

## Authentication

All API calls require a valid API key passed via header:

```bash
curl -H "X-API-Key: $HEADY_API_KEY" http://localhost:3300/api/health
```

For user-facing flows, authenticate with JWT:

```bash
# Login
curl -X POST http://localhost:3300/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_user", "password":"your_pass"}'
# Returns: {"token":"eyJhbGciOiJIUzI1NiIs..."}

# Use token for subsequent requests
curl -H "Authorization: Bearer <token>" http://localhost:3300/api/system/status
```

## Core Endpoints

### Health & Status
```bash
# Health check
curl /api/health
# {"ok":true,"version":"3.0.0","uptime":12345}

# Full system status
curl /api/system/status
# {"environment":"development","production_ready":false,"capabilities":{...}}

# All subsystems
curl /api/subsystems
```

### Pipeline
```bash
# Trigger a pipeline run
curl -X POST /api/pipeline/run
# {"runId":"run-abc123","status":"started"}

# Get current state
curl /api/pipeline/state

# View stage dependency graph
curl /api/pipeline/dag

# View run history
curl /api/pipeline/history
```

### AI Nodes & Supervisor
```bash
# List AI nodes
curl /api/nodes
# [{"id":"jules","name":"JULES","role":"Builder","status":"active"}, ...]

# Supervisor status
curl /api/supervisor/status

# Route a task to the best agent
curl -X POST /api/supervisor/route \
  -H "Content-Type: application/json" \
  -d '{"type":"build","description":"Deploy frontend to production"}'
```

### Registry
```bash
# Full registry catalog
curl /api/registry

# Lookup a specific component
curl /api/registry/component/heady-manager

# List by category
curl /api/registry/environments
curl /api/registry/docs
curl /api/registry/notebooks
curl /api/registry/patterns
curl /api/registry/workflows
curl /api/registry/ai-nodes
```

### Brain & Readiness
```bash
# Brain status with readiness score
curl /api/brain/status

# Auto-tune concurrency based on error rate
curl -X POST /api/brain/tune \
  -H "Content-Type: application/json" \
  -d '{"errorRate":0.05}'

# Run readiness probes
curl /api/readiness/evaluate
```

### Claude Code Agent
```bash
# Ad-hoc Claude execution
curl -X POST /api/pipeline/claude \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Analyze the auth module for security issues"}'

# Code analysis
curl -X POST /api/pipeline/claude/analyze \
  -H "Content-Type: application/json" \
  -d '{"paths":["src/routes/"]}'

# Security audit
curl -X POST /api/pipeline/claude/security
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": true,
  "message": "Description of what went wrong",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request (check your payload) |
| 401 | Unauthorized (check API key or token) |
| 429 | Rate limited (wait and retry) |
| 500 | Internal error (check server logs) |

## Rate Limits

- **Default**: 100 requests/minute per API key
- **Pipeline runs**: 10/minute
- **Claude agent**: 20/minute
- Rate limit headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Next Steps

- [HeadyManager API Reference](../api/HEADYMANAGER_API.md) — Full endpoint documentation
- [Service Integration](../guides/SERVICE_INTEGRATION.md) — Architecture and data flows
- [HeadyServices Quickstart](./HEADYSERVICES.md) — Set up the backend
