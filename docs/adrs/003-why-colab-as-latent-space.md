# ADR-003: Why Colab Pro+ as Latent Space Operations

## Status: Accepted

## Context
Heady needs GPU compute for embedding generation, vector operations, model inference, and fine-tuning. Options: dedicated GPU servers, cloud GPU instances, or leveraging existing Colab Pro+ subscriptions.

## Decision
Use 3 Colab Pro+ memberships as the latent space operations backend:
- Hot runtime: A100 GPU for real-time inference and embedding
- Warm runtime: A100 GPU for batch processing and fine-tuning  
- Cold runtime: T4 GPU for analytics, experiments, backup

Connected via WebSocket bridge to colab-gateway service (port 3352) with CSL cosine routing.

## Consequences
- **Positive**: Cost-effective GPU access (3 Colab Pro+ vs dedicated GPU servers)
- **Positive**: Access to A100 GPUs without enterprise GPU contracts
- **Positive**: Flexible — can swap runtimes, change GPU types, scale up/down
- **Positive**: Development and experimentation in notebook format
- **Negative**: Runtime sessions are ephemeral (12-24h max)
- **Negative**: Network latency between Colab and Cloud Run services
- **Negative**: Requires reconnection logic and state recovery

Mitigated by: φ-backoff reconnection, task queue with fib(13)=233 depth, automatic Hot→Warm→Cold failover promotion.
