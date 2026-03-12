# Changelog

## 1.0.0 (2026-03-12)


### Features

* 8 production modules — liquid orchestrator, remote compute, self-optimizer, SDK services ([9ec4ecf](https://github.com/HeadySystems/Heady-Main/commit/9ec4ecfacb8c28608974996b70bdf0537127bafa))
* add Notion Knowledge Vault integration + 3 synced notebooks ([59a4308](https://github.com/HeadySystems/Heady-Main/commit/59a43087465739c7bc5c0da8e6cf0faf1ec7ba80))
* Budget Router FinOps engine, secret-scanning CI, hardened gitignore, roadmap rewrite ([ab80310](https://github.com/HeadySystems/Heady-Main/commit/ab80310efc523ea5160fc41ec389570c62bd428d))
* Claude SDK smart routing + security headers + systemd service ([16109ed](https://github.com/HeadySystems/Heady-Main/commit/16109ed2c52b36347363cfa3d96cecaf3f5e625a))
* custom package builder + vector federation + all modules ([a77c418](https://github.com/HeadySystems/Heady-Main/commit/a77c4183271cca70dea99b3b880a34e1e1085840))
* distributed sharded vector memory + φ system-wide ([88c38aa](https://github.com/HeadySystems/Heady-Main/commit/88c38aab0a9d452f12441370cc082501f57ce3ce))
* distributed sharded vector memory + φ timing system-wide ([5dd8581](https://github.com/HeadySystems/Heady-Main/commit/5dd85816c276bfb1355215079743428dc9714463))
* expand MCP server to 30 tools, fix brain route connectivity, add service stubs + memory receipts ([7a0323c](https://github.com/HeadySystems/Heady-Main/commit/7a0323cf21fa49d94e3fb83f44d92638f6624f4c))
* federated vector memory — edge + gcloud + colab + local ([59bfe7f](https://github.com/HeadySystems/Heady-Main/commit/59bfe7f5102beaeb5d59ef1b47dc591f57f98105))
* generate 14 unique branded sites, fix all ecosystem serve paths, add site generator ([304c758](https://github.com/HeadySystems/Heady-Main/commit/304c758c5db89df8ed7997180d1a8f50cb74dc0f))
* HeadyConductor — federated liquid routing hub ([40ba880](https://github.com/HeadySystems/Heady-Main/commit/40ba880e019c3380623afb14aa930e5694a464c8))
* HeadyMemory — 3D persistent vector memory system ([81db13c](https://github.com/HeadySystems/Heady-Main/commit/81db13c28d695e131301c99832ca5a20d74d7b14))
* HeadyRegistry confidence system + adaptive scan ([ae180e5](https://github.com/HeadySystems/Heady-Main/commit/ae180e5b19ce47e4175c2c19a41def00ee07828f))
* HeadyValidator pre-action protocol — always checks before dispatch ([2523045](https://github.com/HeadySystems/Heady-Main/commit/2523045f0dd86f3e0fd4106db93f0dbae4191ed5))
* **memory:** Qdrant live writes + chat ingestion + Notion audit notebook ([8ed43e0](https://github.com/HeadySystems/Heady-Main/commit/8ed43e02dd00a1f9230e537485ea25e8f4d1799a))
* MIN_CONCURRENT=150 HeadySupervisors always active ([cd8efbe](https://github.com/HeadySystems/Heady-Main/commit/cd8efbe1ef9b27ff5f5bd5215ee84a20516a6908))
* **resilience:** add circuit breakers, caching, pooling, rate limiting, retry + security hardening ([daa82a3](https://github.com/HeadySystems/Heady-Main/commit/daa82a3fc246630aad5484bcb4d974d47e0b2242))
* vector-augmented response pipeline + φ intervals ([8faf268](https://github.com/HeadySystems/Heady-Main/commit/8faf2684b69a900e72a26a14035d3ba7080acc57))
* vector-augmented response pipeline + φ intervals + registry ([90af01b](https://github.com/HeadySystems/Heady-Main/commit/90af01bd32bf4dd259cf1b622273070157eaced9))
* **wave1:** Notion routes in manager, MCP tool [#31](https://github.com/HeadySystems/Heady-Main/issues/31), Dockerfile port fix, git sync hook ([52019fe](https://github.com/HeadySystems/Heady-Main/commit/52019fe9b5ddda9884e8fedbac249092ccbc3e5d))
* **wave2:** real routers, continuous Notion audit, fix node-fetch dep ([ca26277](https://github.com/HeadySystems/Heady-Main/commit/ca26277b497a93c16de9be6ad8b919cf9be249bd))
* **wave2:** real Soul/Battle/HCFP routers, CF token stored, npm audit fix ([325b2fe](https://github.com/HeadySystems/Heady-Main/commit/325b2fe49b35df62e2ca4d240dece0aeb2d497b7))
* **wave3:** circuit breaker, auto-tuning pool, hot/cold cache patterns ([7a09017](https://github.com/HeadySystems/Heady-Main/commit/7a090174606d8a92e475af19454538e94381b003))
* **wave4+:** evolved HeadyLens + HeadyConductor + 1ime1.com deployed ([4e22dd3](https://github.com/HeadySystems/Heady-Main/commit/4e22dd38aaf4ec1a19ccd517a7420b1a21d83623))
* **wave4:** ops, maintenance, lens, vinci real routers (stubs 15→11) ([0cc68bc](https://github.com/HeadySystems/Heady-Main/commit/0cc68bc0a8884994f228510232d769e926f510dd))


### Bug Fixes

* 3D spatial vector storage + orchestrator wiring + continuous heartbeat ([8f01919](https://github.com/HeadySystems/Heady-Main/commit/8f01919babff06ed2830f494b823f631a457a2fe))
* add missing services/ modules (core-api, brain_api, hc_sys_orchestrator) ([925a241](https://github.com/HeadySystems/Heady-Main/commit/925a24161dfd47970d79c6388a600131828b34e0))
* correct Bosgame P6 hardware specs in ecosystem.config.js (32GB RAM, 8C/16T) ([1058a1f](https://github.com/HeadySystems/Heady-Main/commit/1058a1f46d3c8be97712939f51bc2eff045fa4a9))
* correct Bosgame P6 specs to 32GB RAM in CPO docs ([de889be](https://github.com/HeadySystems/Heady-Main/commit/de889bef1b041c25bf891d861b0cf52b3d9755aa))
* deep-scan rewrite of exec brief — 28 source modules, 224 configs, all file sizes ([0c558b4](https://github.com/HeadySystems/Heady-Main/commit/0c558b44ec6ef1e7811e8f16f2c30df6d2f29706))
* expand Infrastructure (7→15 rows) and AI Subscriptions with full Cloudflare edge stack ([3ef3abe](https://github.com/HeadySystems/Heady-Main/commit/3ef3abec380b98bdaa0f17ef820a270962656b92))
* remove HTTP loopback deadlock, enforce memory-first rule ([ff13da3](https://github.com/HeadySystems/Heady-Main/commit/ff13da30071f12e159ba822bedfe3dd1475f8837))
* rename Headypromoter → HeadyPromoter (PascalCase consistency) ([81c36ce](https://github.com/HeadySystems/Heady-Main/commit/81c36ce72aa5686c76a97c6034045eacfc8326ee))
* wrap swagger UI in try/catch for resilient container startup ([e0f17e8](https://github.com/HeadySystems/Heady-Main/commit/e0f17e8aa87e3418956847df7f1944e8641d769c))

## [3.0.0] - 2026-02-22

### Added
- **Claude SDK Smart Routing** — Replaced raw HTTPS with `@anthropic-ai/sdk`
  - Complexity analyzer: automatic model selection (haiku 4.5 → sonnet 4 → opus 4)
  - Extended thinking for high/critical complexity queries
  - Dual-org failover ($30 headysystems → $60 headyconnection)
  - Per-request cost tracking at `/api/brain/claude-usage`
- **Security Headers** — Enabled via Helmet
  - Content Security Policy with approved sources
  - Strict-Transport-Security (1 year, includeSubDomains)
  - X-Content-Type-Options, Referrer-Policy
- **Systemd Service** — `configs/heady-manager.service` for auto-start on boot
- **Resource Watchdog** — Cron-based process monitor (every 2 min)

### Changed
- Upgraded haiku model from deprecated 3.5 to 4.5
- CORS now environment-configurable via `ALLOWED_ORIGINS`

### Fixed
- Workspace config pointed to root `/` causing system-wide file indexing

## [2.0.0] - 2026-02-21

### Added
- Voice-to-text Web Speech API widget for HeadyBuddy
- Firebase Auth (Google Sign-In) integration
- 3D Vector Memory sync
- Mobile-optimized mic button (44px touch target)

### Security
- Audited all API tokens — no hardcoded secrets
- `.gitignore` added to HeadyBuddy for `.env` protection
