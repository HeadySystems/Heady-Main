# CLAUDE.md — HeadySystems/Heady-Main

## What This Repo Is

Heady-Main is a **snapshot of the Heady "Sacred Geometry" monorepo** — a hybrid
Node.js/Python AI-orchestration platform (Express manager, Python workers, React
UIs, Cloudflare edge workers). The last commit is from **2026-03-29** and is an
auto-sync commit ("Auto-commit: resolve dirty tree to enable auto-sync"); this
repo is a **legacy/sync mirror, not an active development target**.

- In the HeadySystems ecosystem, **`HeadySystems/heady-ai` is the source of
  truth**, with Heady-Main serving as a production mirror downstream of
  `Heady-Staging`. This repo's own docs do not state that relationship —
  `README_SYSTEM.md` instead describes multi-remote "Nexus" distribution across
  `HeadySystems/Heady`, `HeadyMe/Heady`, and `HeadySystems/sandbox` via
  `nexus_deploy.ps1` — but the commit history and auto-sync artifacts are
  consistent with a mirror role.
- **If your task is to create or change platform functionality, do it in
  `HeadySystems/heady-ai`.** Legitimate uses of this repo: retrieving historical
  code/docs, auditing past state, and documentation fixes like this file.

## Repository Structure

| Path | Purpose |
|------|---------|
| `backend/` | ESM Express app (`backend/index.js`) — the actual `npm start` entry; includes `python_worker/` and its own `package.json` |
| `frontend/` | React admin UI (`heady-admin-ui`: Monaco editor, xterm) |
| `src/` | Node core modules: `hc_supervisor.js`, `hc_brain.js`, `hc_ai_nodes.js`, `nexus_protocol.js`, `phi_circuit_breaker.js`, `structured_logger.js`, `routes/`, plus Python `heady_project/` |
| `workers/` | Cloudflare Workers: per-domain edge workers (`headysystems-com`, `headyme-com`, etc.), `heady-sync` (Linear↔Slack), `gateway-worker`, `heartbeat.js` |
| `services/` | `heady-auth`, `heady-mcp`, `heady-vault` service packages |
| `packages/` | `hc-browser`, `heady-music`, `mcp-server`, `phi-math-foundation`, `widget` |
| `HeadyAcademy/` | Python agent suite (`HeadyMaster.py`, `HeadyBrain.py`, `HeadyConductor.py`, …) with `Students/`, `Tools/`, `Vault/` |
| `desktop-overlay/` | Electron + React desktop companion ("HeadyE") |
| `scripts/` | Ops scripts — Node utilities (`brand_headers.js`, `gitignore_audit.js`) and Windows PowerShell automation (`HCFullPipeline.ps1`, `hc.ps1`, deploy scripts) |
| `docs/` | Protocol and architecture docs (`PROTOCOLS/`, domain registry, MCP guides) |
| `migrations/` | SQL migrations (production tables, heady-sync tables) |
| `notebooks/` | Google Colab GPU protocol notebook (see `COLAB_PROTOCOL.md`) |
| `tests/` | Jest `unit/` and `integration/` tests |
| `heady-manager.js`, `heady-cli.js` | Root MCP server / CLI entry points |
| `render.yaml` | Render.com deployment blueprint |
| `docker-compose.mcp.yml` | MCP server containers (contains machine-specific volume paths from the original dev machine — legacy) |

Root-level `*.ps1` / `*.bat` files (`hcautobuild.ps1`, `heady_sync.ps1`,
`nexus_deploy.ps1`, `hc.bat`, …) are Windows-workstation automation for the
original build/sync workflow and are not runnable in a Linux checkout.

## Tech Stack (verified from source)

- **Node.js ≥ 22** (`engines` in `package.json`, `.nvmrc`); CommonJS at root,
  ESM in `backend/`; `pnpm-lock.yaml` lockfiles at root, `backend/`,
  `frontend/`, `desktop-overlay/`
- **Express + MCP SDK** (`@modelcontextprotocol/sdk`), `better-sqlite3`,
  `dockerode`, `js-yaml`
- **Python 3.x** workers (Hugging Face inference, build orchestration, HeadyAcademy agents)
- **React 18** frontends; **Electron** desktop overlay
- **Cloudflare Workers** (per-worker `wrangler.toml`)
- **Postgres + pgvector** (`scripts/migrate_pgvector_hnsw.sql`, `migrations/`)
- **CI:** GitHub Actions (`deploy-all-workers.yml`, `fix-gcp-secrets.yml`, `linear-ci-failure.yml`)

## Commands (verified against package.json)

```bash
npm start            # node backend/index.js  (Express backend)
npm run dev          # concurrently: backend + frontend dev servers
npm test             # jest --passWithNoTests
npm run lint         # eslint . --max-warnings 0
npm run heady        # node heady-cli.js  (CLI: heady <category>:<action>)
npm run brand:check  # verify HEADY_BRAND headers
npm run hooks:install
```

Note: `AGENTS.md` and `README.md` describe `npm start` as launching
`heady-manager.js`; the actual `package.json` entry is `backend/index.js`.
Trust `package.json` — the prose docs predate the current layout.

## Conventions (from AGENTS.md — read it in full)

- Every source file starts with a `HEADY_BRAND:BEGIN` / `HEADY_BRAND:END` header block
- φ-math: `const PHI = 1.618033988749895` — never hardcode `1.618`; CSL cosine
  gates at 0.618 / 0.691 / 0.809 / 0.882 / 0.927; Fibonacci-derived timeouts
- Structured JSON logging (`src/structured_logger.js`) — no bare `console.log` in production code
- Express middleware order: shutdown → logger → CSP → JSON → CORS → routes
- Ed25519 signatures on pipeline outputs
- No hardcoded secrets — configuration via environment variables
  (`.env.example` / `.env.template` list the expected keys: `HEADY_API_KEY`,
  `HF_TOKEN`, `DATABASE_URL`, `PORT`, `HEADY_CORS_ORIGINS`, admin-IDE and GPU settings)

## Key Docs

- `AGENTS.md` — agent-facing project overview and conventions
- `README.md` — admin IDE, API endpoints, HF inference, security model
- `README_SYSTEM.md` — monorepo "Trinity" structure and Nexus distribution
- `SYSTEM_ARCHITECTURE.md` — node/worktree architecture (written for the original Windows environment)
- `docs/PROTOCOLS/` — HCFullPipeline protocol series
