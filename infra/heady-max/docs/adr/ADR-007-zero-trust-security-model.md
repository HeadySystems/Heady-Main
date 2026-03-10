# ADR-007: Zero-Trust Security Model

## Status
Accepted

## Date
2026-03-10

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Context
67 services across multiple environments (Docker, Cloud Run, Cloudflare Workers, Colab) need secure communication without assuming network-level trust. Traditional perimeter security is insufficient.

## Decision
Zero-trust security with mTLS, service identity (SPIFFE-compatible), request signing, and CSL-gated authorization for all 67 services.

## Consequences
Every inter-service request must be signed and verified. Service identities use short-lived certificates (55-minute TTL with rotation at 34 minutes, both Fibonacci). The immutable audit log uses cryptographic hash chaining.

## Related ADRs
ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-008
