# ADR-005: NATS JetStream Event Backbone

## Status
Accepted

## Date
2026-03-10

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Context
67 microservices need reliable async messaging. NATS JetStream provides persistence, replay, exactly-once delivery, and consumer groups. Alternatives (Kafka, RabbitMQ) are heavier and less suited to lightweight polyglot services.

## Decision
NATS JetStream serves as the event backbone for all asynchronous inter-service communication across 67 services.

## Consequences
All inter-service events flow through NATS subjects with consistent naming (heady.{domain}.{action}). JetStream ensures message durability. Consumer groups enable horizontal scaling.

## Related ADRs
ADR-001, ADR-002, ADR-003, ADR-004, ADR-006, ADR-007, ADR-008
