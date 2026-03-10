---
name: heady-prompt-orchestration
description: Use when orchestrating the 64-prompt catalogue, composing multi-prompt pipelines, and interpreting CSL gate decisions for deterministic AI execution.
---

# Heady™ Prompt Orchestration Skill

## Overview

Orchestrate Heady's 64-prompt deterministic system across 8 domains with CSL confidence gating.

## Prompt Domains (8 × 8 = 64 prompts)

| Domain | Prompt IDs | Focus |
|---|---|---|
| code | code-001 to code-008 | Review, debug, refactor, test, API, docs, complexity, migration |
| deploy | deploy-001 to deploy-008 | Plans, infra, CI/CD, incident, K8s, capacity, Docker, SLO |
| research | research-001 to research-008 | Synthesis, competitive, data, tech eval, market, patent, SWOT, UX |
| security | security-001 to security-008 | Threat model, vuln scan, incident, IAM, compliance, pentest, SBOM, policy |
| memory | memory-001 to memory-008 | Storage, retrieval, graph-RAG, embedding, consolidation, drift, federation, lifecycle |
| orchestration | orch-001 to orch-008 | Task decomp, swarm, agent factory, backpressure, consensus, scheduling, lifecycle, governance |
| creative | creative-001 to creative-008 | Brand voice, naming, narrative, visual, pitch, campaign, UX copy, storyboard |
| trading | trading-001 to trading-008 | Signal, risk, backtest, portfolio, sentiment, options, macro, execution |

## Usage

1. Use `heady_prompt_executor` MCP tool with `action: 'list'` to discover prompts
2. Use `action: 'execute'` with `prompt_id` and `variables` to run
3. Check the `decision` field: EXECUTE (>0.618), CAUTIOUS (>0.382), or HALT (<0.382)
4. Compose multi-domain pipelines by chaining prompt outputs as next inputs

## CSL Gate Thresholds (φ-derived)

- **EXECUTE**: confidence > PSI (0.618) — proceed with full confidence
- **CAUTIOUS**: confidence > PSI² (0.382) — proceed with warnings
- **HALT**: confidence < PSI² — stop, reconfigure, add more context
