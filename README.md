# Heady Systems

> Self-aware, self-correcting intelligence infrastructure.
> 20 AI nodes · 12-stage pipeline · Monte Carlo validation · Sacred Geometry at every layer.

[![License](https://img.shields.io/badge/license-Proprietary-blue)]()
[![Node](https://img.shields.io/badge/node-20%2B-green)]()
[![MCP](https://img.shields.io/badge/MCP-v3.2_Orion-purple)]()

## Quick Start

```bash
git clone https://github.com/HeadyMe/Heady-8f71ffc8.git ~/Heady
cd ~/Heady
cp .env.example .env          # fill in API keys
npm install
node heady-manager.js          # http://localhost:3301
```

## Architecture

```
heady-manager.js          # Node.js MCP Server & API Gateway (port 3300)
├── src/                  # Core pipeline engine & agents
├── backend/              # Python worker & MCP servers
├── frontend/             # React UI (Vite + TailwindCSS)
├── HeadyAcademy/         # AI Nodes & Tools
├── configs/              # YAML configuration
├── scripts/              # Automation (Sync, Build, Deploy)
└── workers/              # Edge workers
```

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────┐
│                    AI GATEWAY                         │
│          (Auth · Rate Limit · Router)                 │
└──────────┬───────────────────────────┬───────────────┘
           │                           │
     ┌─────▼─────┐             ┌───────▼───────┐
     │ HeadyBrain │────────────▶  HeadySoul    │
     │ (Reasoning)│             │ (Alignment)  │
     └─────┬─────┘             └───────┬───────┘
           │                           │
     ┌─────▼─────────────────────────▼──────┐
     │           HeadyBattle (QA Gate)       │
     │  HeadySims (Monte Carlo Validation)   │
     └──────────────┬───────────────────────┘
                    │
     ┌──────────────▼──────────────────────┐
     │         Arena Mode (A/B Eval)        │
     │   Winners auto-promoted to prod      │
     └──────────────┬──────────────────────┘
                    │
     ┌──────────────▼──────────────────────┐
     │         HeadyVinci (Learning)        │
     │     Pattern spotting & memory        │
     └─────────────────────────────────────┘
```

## Agent Roster

| Category | Agents |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/pulse` | System pulse with layer info |
| `GET /api/system/status` | Full system status |
| `POST /api/pipeline/run` | Trigger pipeline run |
| `GET /api/pipeline/state` | Current pipeline state |
| `GET /api/nodes` | List all AI nodes |
| `POST /api/system/production` | Activate production mode |

## Deployment

Deployed via [Render.com](https://render.com) using `render.yaml`.

## License

Proprietary - Heady Systems
