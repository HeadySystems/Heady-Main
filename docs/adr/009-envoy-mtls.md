# ADR-009: Envoy Sidecar for mTLS Between Services

## Status

Accepted

## Date

2024-10-15

## Context

The Heady™ platform runs 58 services on the heady-mesh Docker network. In development, services communicate over plain HTTP within the Docker bridge network. In production (Cloud Run, us-east1), services must communicate securely with mutual authentication.

Requirements:
- Encrypt all inter-service traffic (defense in depth — even within private networks)
- Mutual authentication: services verify each other's identity, not just the server's
- Zero application-code changes: the service code (Express.js) should not handle TLS
- Certificate rotation without service restarts
- Observability integration with existing OpenTelemetry tracing
- Fibonacci-timed health checks and retry policies

We evaluated:

1. **Application-level TLS**: Each Express.js service terminates TLS directly
2. **Linkerd**: Lightweight service mesh with transparent mTLS
3. **Istio**: Full-featured service mesh with Envoy sidecars
4. **Envoy sidecar (standalone)**: Envoy proxy as a sidecar without full Istio control plane

## Decision

We deploy Envoy proxy as a sidecar container alongside each service for mutual TLS (mTLS) between all 58 services.

Architecture:
```
[Service A :3310] → [Envoy Sidecar :15001] ──mTLS──→ [Envoy Sidecar :15001] → [Service B :3311]
```

Configuration (from shared/envoy-sidecar.yaml):
- Listener on port 15001 for outbound traffic interception
- Listener on port 15006 for inbound traffic termination
- mTLS with X.509 certificates issued by internal CA
- SDS (Secret Discovery Service) for automatic certificate rotation
- Circuit breaker: max_connections=55, max_pending=89 (Fibonacci)
- Retry policy: num_retries=5 (Fibonacci), per_try_timeout=8s (Fibonacci)
- Health check: interval=13s, timeout=5s (Fibonacci)
- Access logging with correlation ID propagation (X-Correlation-Id header)

Certificate management:
- Internal CA generates per-service certificates
- Certificate lifetime: 89 hours (Fibonacci) — forces regular rotation
- SDS automatically provisions new certificates before expiry
- SPIFFE identity format: `spiffe://headysystems.com/{service-name}`

OpenTelemetry integration:
- Envoy propagates W3C Trace Context headers (traceparent, tracestate)
- Envoy generates spans for each proxied request, linked to the service's traces
- Spans include: upstream cluster, response code, retry count, circuit breaker state

Production deployment on Cloud Run:
- Each Cloud Run service has a sidecar container running Envoy
- Cloud Run's built-in networking handles external TLS termination
- Envoy handles service-to-service mTLS within the VPC

Development:
- Envoy sidecars are optional in docker-compose (can be enabled via profile)
- Services communicate directly over heady-mesh in development
- The envoy-sidecar.yaml config is shared across all services

## Consequences

### Benefits
- Zero application changes: Express.js services remain plain HTTP; Envoy handles all TLS
- Mutual authentication: compromised credentials for one service cannot impersonate another
- Automatic rotation: 89-hour certificate lifetime ensures frequent rotation without manual intervention
- Observability: Envoy metrics (request count, latency histogram, error rate) integrate with Prometheus
- Fibonacci policies: all retry counts, timeouts, and connection limits use Fibonacci values
- SPIFFE identity: standardized workload identity compatible with the broader SPIFFE ecosystem

### Costs
- Resource overhead: each Envoy sidecar consumes ~50MB RAM and minor CPU
- Debugging complexity: network issues now involve both the service and its sidecar
- Certificate infrastructure: requires running an internal CA
- Latency: mTLS handshake adds 1-3ms per new connection (amortized by connection pooling)

### Mitigations
- Envoy's resource footprint is minimal compared to the services themselves
- Access logs include correlation IDs for cross-sidecar debugging
- The internal CA runs as a simple container alongside Consul
- Connection pooling (max_connections=55 per upstream) minimizes TLS handshake overhead
- Development mode skips Envoy entirely — direct HTTP on heady-mesh
