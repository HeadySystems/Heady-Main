# Heady System Audit and Upgrade Brief

## User intent
Bring the Heady system to maximum operational quality across architecture, liquid node orchestration, async parallel execution, vector-space alignment, auth correctness, site/link integrity, and clear documentation. Treat this as a production hardening and systems-completion effort, not a narrow patch.

## Primary repositories confirmed
Public repos visible under HeadyMe:
- https://github.com/HeadyMe/headyme-core
- https://github.com/HeadyMe/headysystems-core
- https://github.com/HeadyMe/headyconnection-core
- https://github.com/HeadyMe/headyos-core
- https://github.com/HeadyMe/headymcp-core
- https://github.com/HeadyMe/headybuddy-core
- https://github.com/HeadyMe/headyapi-core
- https://github.com/HeadyMe/headyio-core
- https://github.com/HeadyMe/headybot-core
- https://github.com/HeadyMe/heady-docs
- plus production/deployment repos visible publicly

Use judgment to determine which repo is the best primary control-plane repo versus supporting repos. If one repo is clearly the monorepo/control plane, prioritize it first, then patch any critical cross-repo mismatches in the most relevant supporting repos.

## High-level objectives
1. Audit architecture for missing or broken liquid-node patterns, async orchestration paths, swarm or bee integration points, and vector-space operating assumptions.
2. Remove or replace broken local/dev-only assumptions in production paths, especially localhost contamination, broken internal links, brittle auth flows, and incomplete UI states.
3. Ensure sites, auth, routing, nav links, and documentation pathways are functional, discoverable, and coherent.
4. Improve documentation quality and organization so core system capabilities, services, auth model, architecture, deployment, and usage paths are easy to understand.
5. Verify changes with tests, builds, linting, and any available health checks.

## Non-negotiable engineering laws
- No partial stubs or placeholder implementations in delivered work.
- No localhost, 127.0.0.1, or hardcoded dev URLs in production-facing code or docs.
- No wildcard CORS in production paths.
- All config must come from environment/config validation layers.
- All services should expose health endpoints if the architecture supports services.
- Structured logs over console debugging in production code.
- Fix root causes, not cosmetic symptoms.
- Prefer concurrency for independent tasks.
- Use mathematically derived constants where the codebase already expresses that pattern.
- Respect existing Heady naming, swarm, bee, vector, MCP, and liquid-architecture conventions where present.

## Architecture-specific goals
- Confirm whether there is an orchestrator, conductor, bee-factory, swarm registry, vector-memory layer, graph memory, projection engine, cloud orchestrator, and/or buddy/device bridge.
- If missing in critical user-facing flows, add or wire the minimal complete implementation needed to make the system coherent.
- Ensure async task execution paths are actually parallel where dependency-free.
- Ensure any agent routing is capability-based or relevance-based, not arbitrary subjective priority tiers, unless existing business logic explicitly requires otherwise.
- If there are config constants or queue/pool sizes using arbitrary numbers, improve them where safe and local to the touched area.
- Look for integration opportunities for latent space ops and 3 Colab Pro+ runtime orchestration only if the repo already has abstractions for remote runtimes, compute pools, workers, or provider routing. Do not invent fantasy integrations with no deployment path.

## UI and documentation goals
- Audit all major UIs for broken states, incomplete flows, bad navigation, dead links, inconsistent auth entry points, and poor discoverability.
- Ensure pages needed by users or operators are reachable from the main navigation or docs hub.
- Ensure auth links, callback paths, login/logout/profile/account flows, and protected routes are consistent.
- Improve documentation IA: getting started, architecture overview, services map, auth, deployment, troubleshooting, and API/docs links should be easy to find.
- If docs are split across repos, create or improve clear index pages and cross-links.

## Verification expectations
At minimum, run the project’s relevant test, build, lint, and typecheck commands where available.
Also validate:
- key routes/pages render
- major links resolve correctly
- auth-related route wiring is coherent
- docs navigation works
- any service health endpoints respond if runnable locally in the agent environment

## Deliverables expected from coding agents
For each repo touched, provide:
- summary of findings
- files changed
- what was fixed or added
- verification commands run and their results
- remaining gaps that require external credentials, infrastructure, or product decisions

## Preferred work style
- Be aggressive but precise.
- Make complete, deployable improvements.
- If scope is too large for one pass, prioritize the control plane/core repo, docs hub, and the most user-visible broken flows first.
- Save any audit notes or structured findings into workspace files for parent review.
