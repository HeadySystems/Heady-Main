# Heady™ Latent OS — Documentation Hub

> **Version 5.3.0** | © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
> Zero Magic Numbers — Every constant derives from φ (golden ratio) or Fibonacci

Welcome to the comprehensive documentation for the Heady™ Latent OS — a sovereign AI platform built on Sacred Geometry, Continuous Semantic Logic (CSL), and φ-derived architecture.

---

## Quick Navigation

| Section | Description | Audience |
|---------|-------------|----------|
| [Getting Started](getting-started/README.md) | Setup, first run, and core concepts | New developers |
| [Architecture](architecture/README.md) | System design, topology, data flow | Engineers & Architects |
| [API Reference](api-reference/README.md) | All service endpoints and schemas | Backend developers |
| [Services Guide](services/README.md) | Individual service documentation | DevOps & Backend |
| [Security](security/README.md) | Auth, CSP, cross-domain, tokens | Security engineers |
| [Phi Compliance](phi-compliance/README.md) | φ-math rules, CSL thresholds, scoring | All contributors |
| [ADRs](adrs/README.md) | Architectural Decision Records | Architects |
| [Runbooks](runbooks/README.md) | Operational procedures | SRE & DevOps |
| [Error Codes](ERROR_CODES.md) | Standardized error reference | All developers |
| [Changelog](../CHANGES.md) | Version history | Everyone |

---

## The 9 Heady Domains

| Domain | Role | Pool | CSL Gate |
|--------|------|------|----------|
| [headyme.com](https://headyme.com) | Command Center | Hot | 0.809 (MEDIUM) |
| [headysystems.com](https://headysystems.com) | Architecture Engine | Warm | 0.882 (HIGH) |
| [headyconnection.org](https://headyconnection.org) | Nonprofit Hub | Warm | 0.618 (ψ) |
| [headybuddy.org](https://headybuddy.org) | AI Companion | Hot | 0.809 (MEDIUM) |
| [headymcp.com](https://headymcp.com) | MCP Layer | Hot | 0.927 (CRITICAL) |
| [headyio.com](https://headyio.com) | Developer Platform | Warm | 0.691 (LOW) |
| [headybot.com](https://headybot.com) | Automation Hub | Warm | 0.809 (MEDIUM) |
| [headyapi.com](https://headyapi.com) | API Gateway | Hot | 0.927 (CRITICAL) |
| [headyai.com](https://headyai.com) | Intelligence Hub | Hot | 0.882 (HIGH) |

---

## Core Principles

1. **Zero Magic Numbers** — Every constant derives from φ (1.618...) or Fibonacci sequences
2. **Sacred Geometry Topology** — Node placement follows geometric ring architecture
3. **CSL Gates** — Continuous Semantic Logic replaces boolean decisions
4. **httpOnly Cookies Only** — No localStorage for tokens. Ever.
5. **No Wildcard CORS** — Explicit origin whitelist for all 9 domains
6. **Structured JSON Logging** — No console.log in production code
7. **φ-Derived Timing** — Backoff, TTLs, intervals all use φ-scaling
8. **51 Provisional Patents** — IP-protected innovations throughout

---

## File Structure Overview

```
heady-max-potential/
├── shared/                    # Shared modules (φ-math, domains)
│   ├── phi-math.js            # φ/Fibonacci constants & functions
│   └── heady-domains.js       # Canonical 9-domain registry
├── src/                       # Core platform modules
│   ├── csl/                   # Continuous Semantic Logic engine
│   ├── resilience/            # Circuit breaker, backoff, self-healing
│   ├── memory/                # Vector memory, embeddings, context
│   ├── orchestration/         # Conductor, scheduler, pool manager
│   ├── pipeline/              # HCFullPipeline (HCFP) stages
│   ├── bees/                  # Agent factory, swarm coordinator
│   ├── governance/            # Budget tracking, backpressure, gates
│   ├── core/                  # Event bus, logger, health probes
│   ├── security/              # Auth, CSRF, tokens, CSP, validation
│   ├── middleware/            # Express middleware stack
│   ├── liquid-nodes/          # Cloudflare edge, Durable Objects
│   ├── utils/                 # Error classes, config, retry helper
│   ├── auto-success/          # Auto-success engine
│   └── bootstrap/             # System bootstrap, HeadyManager
├── services/                  # Microservices (each with Dockerfile)
│   ├── api-gateway/           # Port 3370 — unified API entry point
│   ├── auth-session/          # Port 3360 — authentication & sessions
│   ├── domain-router/         # Port 3366 — cross-domain routing
│   ├── notification/          # Port 3361 — notifications
│   ├── analytics/             # Port 3362 — analytics pipeline
│   ├── scheduler/             # Port 3363 — task scheduling
│   ├── search/                # Port 3364 — vector search
│   └── onboarding/            # Port 3365 — user onboarding
├── colab-integration/         # Google Colab bridge for GPU workloads
├── security/                  # Standalone security modules
├── observability/             # OpenTelemetry, Prometheus metrics
├── infrastructure/            # Docker, Envoy, Consul, Grafana, CI/CD
├── configs/                   # YAML configurations
├── tests/                     # Unit & integration tests
├── docs/                      # ← You are here
└── scripts/                   # φ-compliance checker
```
