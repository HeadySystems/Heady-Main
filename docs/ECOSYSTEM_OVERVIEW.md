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
<!-- ║  FILE: docs/ECOSYSTEM_OVERVIEW.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady Ecosystem Overview

> One unified organism with many faces.

## The Four Brands

The Heady ecosystem is built as a single liquid platform expressed through four complementary brands:

### HeadyMe
**Personal AI Platform** — Your intelligent companion for daily life.
- HeadyBuddy: AI assistant overlay (desktop + mobile)
- Personal dashboards, task management, context awareness
- Voice-activated: "Hey Heady"

### HeadySystems
**Enterprise Infrastructure** — The engine that powers everything.
- HeadyManager: Node.js MCP server and API gateway
- HCFullPipeline: Orchestration engine with checkpoint protocol
- AI Nodes: JULES, OBSERVER, BUILDER, ATLAS, PYTHIA
- Registry, Brain, Readiness, Health packages

### HeadyConnection
**Nonprofit & Community** — Social impact through technology.
- HeadyConnectionKits: Packaged tools for nonprofits
- Community resources and guides
- Accessibility-first design patterns

### Heady-AI
**AI Research & Models** — Intelligence layer for the ecosystem.
- Claude Code agent integration
- Monte Carlo optimization
- Pattern recognition and self-learning
- Imagination engine for creative problem-solving

## Products & Applications

| Product | Type | Status | Directory |
|---------|------|--------|-----------|
| HeadyManager | Backend | Active | `heady-manager.js` |
| HeadyBuddy Desktop | Electron App | Active | `headybuddy/` |
| HeadyBuddy Mobile | Android | Active | `headybuddy-mobile/` |
| HeadyAI-IDE | Custom IDE | Building | `HeadyAI-IDE/` |
| HeadyBrowser | Chrome Extension | Active | `extensions/chrome/` |
| HeadyBrowser Desktop | Electron Browser | Building | `headybrowser-desktop/` |
| HeadyAcademy | Learning Platform | Building | `HeadyAcademy/` |
| HeadyMCP Website | Landing Page | Active | `websites/sites/headymcp.com/` |
| Frontend Dashboard | React UI | Active | `frontend/` |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATIONS                        │
│  HeadyBuddy   HeadyAI-IDE   HeadyBrowser   Mobile   Dashboard  │
├─────────────────────────────────────────────────────────────────┤
│                    HEADY MANAGER (port 3300)                    │
│  Express API Gateway · MCP Server · Pipeline Engine             │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ Pipeline │ Supervis │  Brain   │ Registry │  Health/Readiness   │
│ Engine   │ or Agent │ Service  │   API    │  Checkpoint Proto   │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│                        AI NODE LAYER                            │
│   JULES    OBSERVER    BUILDER    ATLAS    PYTHIA               │
├─────────────────────────────────────────────────────────────────┤
│                       DATA & INFRA                              │
│  PostgreSQL · Redis · HeadyRegistry · YAML Configs              │
│  Render.com · Docker · Cloudflare · GitHub Actions              │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-Site Journeys

### New User Journey
1. **Discover** → HeadyMCP landing page or HeadySystems website
2. **Explore** → Frontend dashboard shows ecosystem map
3. **Try** → HeadyBuddy quick start (desktop pill or mobile bubble)
4. **Learn** → HeadyAcademy learning tracks
5. **Build** → HeadyAI-IDE for development

### Developer Journey
1. `npm start` → HeadyManager runs on port 3300
2. Visit `http://localhost:3300` → Full dashboard with ActivityBar
3. Click AI Nodes → See JULES, OBSERVER, BUILDER, ATLAS, PYTHIA
4. Click Pipeline → Run HCFullPipeline
5. Use HeadyBuddy → Chat with the AI companion

## Key Configurations

All system behavior is driven by versioned YAML configs:

| Config | Controls |
|--------|----------|
| `configs/hcfullpipeline.yaml` | Pipeline stages, checkpoints, stop rules |
| `configs/resource-policies.yaml` | Concurrency, rate limits, circuit breakers |
| `configs/service-catalog.yaml` | Service definitions, SLOs, integrations |
| `configs/governance-policies.yaml` | Access control, security, cost governance |
| `configs/data-schema.yaml` | Data model layers (L0-L3) |
| `configs/concepts-index.yaml` | Pattern tracking (implemented/planned) |

## Quickstart Index

| Guide | What You Learn | Time |
|-------|----------------|------|
| [HeadyBuddy](quickstarts/HEADYBUDDY.md) | AI companion setup (desktop + mobile) | 15 min |
| [HeadyServices](quickstarts/HEADYSERVICES.md) | Backend infrastructure | 10 min |
| [HeadyAI-IDE](quickstarts/HEADYIDE.md) | Custom IDE setup | 20 min |
| [HeadyBrowser](quickstarts/HEADYBROWSER.md) | Browser extension | 10 min |
| [HeadyMCP](quickstarts/HEADYMCP.md) | Manager Control Plane | 15 min |
| [Heady API](quickstarts/HEADY_API_QUICKSTART.md) | API interaction | 10 min |

## Design Principles

1. **Sacred Geometry Aesthetic** — Rounded, organic, breathing interfaces
2. **Liquid Dynamic** — Everything feels like one system, not separate products
3. **Context-Aware** — UIs adapt based on user state and system health
4. **No Dead Ends** — Every page suggests a next action
5. **Deterministic** — Same inputs produce same outputs (seeded randomness)
6. **Non-Regression** — Changes must improve clarity, capability, or security
