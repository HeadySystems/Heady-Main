# ADR-002: Why 50+ Microservices

## Status: Accepted

## Context
The Heady platform needs to support inference, memory, agents, orchestration, security, monitoring, web, data, integration, and specialized services. The question is whether to build a monolith or decompose into services.

## Decision
Decompose into 55 microservices organized by domain, each with its own port (3310-3396), Dockerfile, health check, and metrics endpoint. Services communicate via NATS JetStream for async and HTTP/gRPC for sync.

## Consequences
- **Positive**: Independent scaling per service (heady-brain needs more resources than heady-midi)
- **Positive**: Isolated failure domains (one service crash doesn't take down everything)
- **Positive**: Independent deployment (update heady-memory without redeploying heady-brain)
- **Positive**: Clear ownership boundaries for future team scaling
- **Negative**: Operational complexity (55 services to monitor, deploy, debug)
- **Negative**: Network latency between services
- **Negative**: Data consistency challenges across distributed state

Mitigated by: Envoy sidecar for mTLS and circuit breaking, NATS for reliable messaging, φ-backoff for retry resilience, comprehensive observability.
