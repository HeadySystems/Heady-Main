# ADR-010: Multi-Model Orchestration — No Single AI Provider

## Status

Accepted

## Date

2024-10-21

## Context

The Heady™ platform is fundamentally an AI-powered ecosystem. AI capabilities are central to nearly every service: inference, embedding, memory retrieval, search, content generation, music creation (heady-midi), visual art (heady-vinci), and agent orchestration.

Relying on a single AI provider creates:
- Vendor lock-in: pricing changes or API deprecations affect the entire platform
- Availability risk: a single provider outage disables all AI functionality
- Capability gaps: no single provider excels at all tasks (text, code, vision, music, embeddings)
- Innovation lag: locked into one provider's release cycle

The platform needs:
- Text generation (multiple quality tiers)
- Code generation and analysis
- Image understanding and generation
- Music/MIDI generation
- Embedding generation (384-dimensional for pgvector)
- Real-time conversational AI
- Search and knowledge retrieval

We evaluated:

1. **Single provider (OpenAI)**: Simplest integration, broadest capability set
2. **Single provider (Google)**: Deep GCP integration with existing Firebase/Cloud Run
3. **Multi-model orchestration**: Route requests to the optimal model for each task type

## Decision

We adopt multi-model orchestration with dedicated gateway services for each provider, coordinated by a central ai-router. All models are concurrent equals — no model is "primary" or "fallback."

Service architecture:

| Service | Port | Provider/Purpose |
|---------|------|-----------------|
| ai-router | 3350 | Central routing — dispatches to model gateways based on task type |
| model-gateway | 3352 | Multi-model abstraction layer |
| google-mcp | 3361 | Google AI (Gemini) via Model Context Protocol |
| perplexity-mcp | 3363 | Perplexity AI for search-augmented generation |
| jules-mcp | 3364 | Jules AI for code analysis and generation |
| huggingface-gateway | 3365 | HuggingFace Inference API for open-source models |
| colab-gateway | 3366 | Google Colab for notebook-based computation |
| silicon-bridge | 3367 | Silicon-based compute integration |

Routing strategy (in ai-router):
- Task type determines which gateways receive the request
- All qualifying gateways process concurrently (concurrent-equals)
- Results are merged via CSL-gated fusion, not selected by ranking
- No gateway is marked as "primary" or "fallback"

Model selection by task domain:

| Task | Qualifying Gateways |
|------|-------------------|
| Text generation | google-mcp, huggingface-gateway |
| Code analysis | jules-mcp, google-mcp |
| Embeddings (384-dim) | huggingface-gateway, google-mcp |
| Search-augmented QA | perplexity-mcp |
| Notebook execution | colab-gateway |
| Visual/creative AI | heady-vinci (uses multiple backends) |
| Music generation | heady-midi (uses multiple backends) |

Embedding standardization:
- All embedding models must produce 384-dimensional vectors (VECTOR_DIM constant)
- Models that produce different dimensions are projected to 384 via heady-projection service
- This ensures all embeddings are compatible with pgvector HNSW indexes

Circuit breaker per gateway:
- Each gateway has an independent Fibonacci circuit breaker (threshold=21, reset=89s)
- A failing gateway is temporarily excluded without affecting other gateways
- The ai-router tracks gateway health independently

## Consequences

### Benefits
- No single point of AI failure: one provider's outage doesn't disable the platform
- Task-optimized: each task type routes to the models that handle it well
- Cost optimization: open-source models (HuggingFace) reduce costs for embedding generation
- Innovation access: new models from any provider can be integrated as additional gateways
- Concurrent processing: multiple models process simultaneously, producing richer results
- Consistent interface: model-gateway provides a unified API regardless of backend provider

### Costs
- Complexity: 8 AI-related services vs. a single SDK integration
- Consistency: different models produce different outputs for the same prompt
- Cost: concurrent processing across multiple providers multiplies API costs
- Embedding alignment: models from different providers may produce semantically different embeddings

### Mitigations
- model-gateway normalizes response formats across all providers
- heady-projection service handles embedding dimension alignment to 384-dim
- Circuit breakers prevent cost runaway when a provider returns errors
- Bulkhead patterns (max concurrent=55) limit parallel API calls
- ai-router can be configured to send to a single gateway per task type if cost reduction is needed
- All gateways share the same HeadyAutoContext, structuredLog, and health check patterns
