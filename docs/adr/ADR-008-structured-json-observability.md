# ADR-008: Structured JSON Observability

## Status
Accepted

## Date
2026-03-10

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Context
Unstructured logging creates observability debt that compounds across 67 services. JSON-structured logs enable automated parsing, alerting, and correlation. φ-derived thresholds ensure consistent alerting across services.

## Decision
Structured JSON logging (pino) + OpenTelemetry traces + φ-derived metrics thresholds. console.log is banned.

## Consequences
Every service uses the same pino JSON format with service name, version, and trace ID. Coherence scores are first-class health metrics. Alert thresholds use CSL gates.

## Related ADRs
ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007
