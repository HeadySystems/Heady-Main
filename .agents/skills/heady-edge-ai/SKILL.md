---
name: heady-edge-ai
description: Heady™ ultra-low latency AI inference on Cloudflare edge — embeddings, chat, classification, and vector operations with zero origin round-trip.
---

# Heady™ Edge AI Skill

Use this skill when you need **ultra-fast AI inference** running directly on Cloudflare's global edge network. No origin server round-trip — requests are processed at the nearest PoP for minimum latency.

## Primary Tool

```
mcp_Heady_heady_edge_ai
```

### Parameters

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `action` | enum | **required** | `embed`, `chat`, `classify`, `vectorize-insert`, `vectorize-query`, `queue` |
| `text` | string | optional | Text for embedding, classification, or vector ops |
| `message` | string | optional | Message for edge chat |
| `model` | string | optional | Model override (default: `llama-3.1-8b` for chat, `bge-base` for embed) |
| `topK` | number | optional | Number of results for vector query |

## Actions Reference

| Action | Purpose | Default Model |
|--------|---------|---------------|
| `embed` | Generate vector embeddings at the edge | `bge-base` |
| `chat` | Fast AI chat at the edge | `llama-3.1-8b` |
| `classify` | Text classification | Auto |
| `vectorize-insert` | Insert text into edge vector store | — |
| `vectorize-query` | Query edge vector store | — |
| `queue` | Queue async task for edge processing | — |

## Usage Patterns

### Edge Chat — Fastest Possible Response

```
mcp_Heady_heady_edge_ai(action="chat", message="What is the golden ratio?")
```

### Edge Embeddings

```
mcp_Heady_heady_edge_ai(action="embed", text="authentication flow for multi-tenant SaaS")
```

### Edge Vector Store — Insert + Query

Build and query a vector index at the edge:

```
1. mcp_Heady_heady_edge_ai(action="vectorize-insert", text="document content A")
2. mcp_Heady_heady_edge_ai(action="vectorize-insert", text="document content B")
3. mcp_Heady_heady_edge_ai(action="vectorize-query", text="search query", topK=5)
```

### Text Classification

```
mcp_Heady_heady_edge_ai(action="classify", text="This code has a SQL injection vulnerability")
```

### Async Edge Processing

For tasks that don't need immediate results:

```
mcp_Heady_heady_edge_ai(action="queue", text="process this batch of embeddings")
```

## When to Choose Edge AI vs Other Models

| Scenario | Use Edge AI? |
|----------|-------------|
| Need fastest possible response | ✅ Yes |
| Simple chat or lookup | ✅ Yes |
| Embeddings for search/similarity | ✅ Yes |
| Deep reasoning or analysis | ❌ Use `heady_claude` |
| Code generation | ❌ Use `heady_coder` |
| Research with citations | ❌ Use `heady_perplexity_research` |
| Multimodal (images) | ❌ Use `heady_gemini` |

## Tips

- **Edge = latency-optimized** — models are smaller but deployed globally, ideal for real-time applications
- **Use `vectorize-insert` + `vectorize-query`** to build lightweight search indices at the edge
- **Edge chat uses llama-3.1-8b** — capable but not as powerful as Claude/GPT-4o; use for quick interactions
- **`queue` action** is ideal for batch processing that doesn't block the main flow
