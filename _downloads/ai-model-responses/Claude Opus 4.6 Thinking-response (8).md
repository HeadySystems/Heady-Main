

# Heady™ Edge Gateway + Inference Routing — Task Extraction & Supplemental Resource Guide

## PART 1: TASKS EXTRACTED FROM `07-edge-gateway-inference.md`

I scanned your 231K-character file thoroughly. Here are the **concrete build tasks and deliverables** embedded in it:

---

### 🔧 Deliverable 1: Edge Workers (CSL-Gated Routing)
| Task | Status Indicators |
|---|---|
| Implement CSL confidence gates into every edge routing decision | `edge-worker.js` exists but CSL gating not wired in |
| Phi-scaled cache TTL (φ-based exponential TTL tiers) | Partially in `edge-embedding-cache.js` (phi^7/8/9 × 60s) |
| Deterministic inference enforcement (`temp=0, seed=42`) | Referenced in constraints, needs enforcement in all providers |
| Cloudflare Workers AI integration (BGE-small-en-v1.5, DistilBERT-SST-2-int8) | `embedAtEdge()` and `classifyAtEdge()` implemented |
| Runtime detection (Cloudflare vs Node) with fallback shims | ✅ Implemented |
| Edge-side embedding caching with `embedWithCache()` | ✅ Implemented |

### 🔧 Deliverable 2: API Gateway v2
| Task | Status Indicators |
|---|---|
| Build unified gateway routing to 7 services (Embed, Infer, Vector, Chain, Cache, Guard, Eval) | `heady-gateway.js` scaffolded with Express routes |
| Phi-scaled rate limiting | Referenced in spec, needs implementation |
| CSL-prioritized request queue | Not yet wired |
| Circuit breakers per service with health/latency/load scoring | Referenced but not in gateway code |
| Service registry with health endpoints | `/services` and `/health` endpoints exist |

### 🔧 Deliverable 3: Inference Routing (Multi-Provider)
| Task | Status Indicators |
|---|---|
| Multi-provider routing: Claude, GPT-4, Gemini, Sonar, Groq | `inference-gateway.js` has Groq provider defined, others referenced |
| CSL health scoring per provider | Needs implementation |
| Latency tracking with exponential moving averages | Referenced in `edge-origin-router.js` |
| Model racing (parallel "race" mode) | Referenced in inference-gateway spec |
| Credit-aware cost optimization (burn free resources first: Groq→Gemini→Claude→OpenAI) | Priority order defined in comments |

### 🔧 Deliverable 4: Edge Embedding Cache
| Task | Status Indicators |
|---|---|
| Two-tier LRU cache: L1 in-memory + L2 Workers KV | ✅ `EdgeEmbeddingCache` class fully implemented |
| SHA-256 deterministic cache keys | ✅ Implemented |
| Fibonacci batch eviction (fib(6)=8 entries at a time) | ✅ Implemented |
| Phi-scaled TTL per model tier | ✅ Implemented |
| Cache warming with Fibonacci batch sizes (fib(7)=13) | ✅ Implemented |
| `createCachedEmbedder()` middleware factory | ✅ Implemented |
| Metrics tracking (hit rate, L1/L2 split, KV flush) | ✅ Implemented |

### 🔧 Deliverable 5: Edge-Origin Smart Router
| Task | Status Indicators |
|---|---|
| Complexity scoring with Fibonacci-weighted factors (token estimate, tool count, message depth, etc.) | ✅ Weights defined in `edge-origin-router.js` |
| Three-tier routing: EDGE_ONLY / EDGE_PREFER / ORIGIN_ONLY | ✅ Thresholds defined via CSL scaling |
| Automatic fallback: edge failure → origin transparent to caller | Referenced, needs full implementation |

### 🔧 Deliverable 6: Test Suite
| Task | Status Indicators |
|---|---|
| Tests for routing logic | Needs creation |
| Tests for caching (L1/L2 hit/miss/eviction) | Needs creation |
| Tests for rate limiting | Needs creation |
| Tests for provider selection logic | Needs creation |
| Tests for circuit breakers | Needs creation |
| Tests for model racing | Needs creation |

---

## PART 2: SUPPLEMENTAL FILES FOR YOUR ZIP BUNDLE

Below are **categorized resources** from Hugging Face, arXiv, IEEE, Wiley, and Cloudflare — organized by the technical domain they support in your Heady build. I've included direct download/reference URLs.

---

### 📂 Category A: BGE Embedding Models (Your Edge Workers Use These)

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| A1 | **BGE M3-Embedding Paper** — Multi-Lingual, Multi-Functionality, Multi-Granularity | arXiv (BAAI) | `https://arxiv.org/pdf/2402.03216.pdf` | The foundational paper for the BGE family your edge workers use (`bge-small-en-v1.5`). Covers self-knowledge distillation, dense/sparse/ColBERT retrieval[1] |
| A2 | **BAAI/bge-small-en-v1.5** Model Card | Hugging Face | `https://huggingface.co/BAAI/bge-small-en-v1.5` | Direct reference for the embedding model in your `EMBED_MODEL` constant[2] |
| A3 | **BAAI/bge-m3** Model Card | Hugging Face | `https://huggingface.co/BAAI/bge-m3` | Multi-functionality reference — could upgrade your edge embeddings to support sparse + dense + ColBERT simultaneously[3] |
| A4 | **BAAI/bge-en-icl** (In-Context Learning Embeddings) | Hugging Face | `https://huggingface.co/BAAI/bge-en-icl` | Next-gen BGE with in-context learning for better retrieval[4] |
| A5 | **Granite Embedding Models** (IBM) | arXiv | `https://arxiv.org/pdf/2502.20204.pdf` | Apache 2.0 alternative enterprise embeddings — benchmark comparison with BGE[5] |
| A6 | **Improving Text Embeddings with LLMs** | arXiv | `https://arxiv.org/pdf/2401.00368.pdf` | Synthetic data training for embeddings — SOTA on BEIR/MTEB[6] |
| A7 | **Hugging Face Text Embeddings Inference (TEI)** Toolkit | GitHub | `https://github.com/huggingface/text-embeddings-inference` | Production deployment toolkit for serving BGE and other embedding models at scale[7] |

---

### 📂 Category B: DistilBERT / Classification at the Edge

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| B1 | **DistilBERT-base-uncased-finetuned-SST-2** Model Card | Hugging Face | `https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english` | Your `CLASSIFY_MODEL` uses the int8 quantized version of this exact model. 91.3% accuracy on SST-2[8] |
| B2 | **DistilBERT SST-2 Quantized + Pruned** (Intel Neural Compressor) | Hugging Face | `https://huggingface.co/echarlaix/distilbert-sst2-inc-dynamic-quantization-magnitude-pruning-0.1` | Dynamic quantization + 10% magnitude pruning — directly relevant to your int8 edge deployment[9] |
| B3 | **ONNX-Optimized DistilBERT SST-2** | Hugging Face | `https://huggingface.co/optimum/distilbert-base-uncased-finetuned-sst-2-english` | ONNX runtime-optimized version for faster edge inference[10] |
| B4 | **DistilBERT Documentation** | Hugging Face | `https://huggingface.co/docs/transformers/en/model_doc/distilbert` | Architecture reference for knowledge distillation approach[11] |

---

### 📂 Category C: Edge AI Inference & LLM at the Edge

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| C1 | **"Sometimes Painful but Certainly Promising": LM Inference at the Edge** | arXiv | `https://arxiv.org/pdf/2503.09114.pdf` | Comprehensive evaluation of generative LM inference on CPU/GPU edge devices — memory, speed, energy trade-offs[12] |
| C2 | **Lightweight Explainability for RAG Pipelines at the Edge** | IEEE | `https://ieeexplore.ieee.org/document/11393707/` | Uses bge-small + MiniLM on edge with <8% latency overhead — directly mirrors your stack[13] |
| C3 | **Edge-Cloud Polarization and Collaboration: Comprehensive Survey** | arXiv | `https://arxiv.org/pdf/2111.06061.pdf` | Foundational survey on cloud-edge AI collaboration architectures[14] |
| C4 | **Towards Edge General Intelligence via LLMs** | arXiv | `https://arxiv.org/pdf/2410.18125.pdf` | Centralized, hybrid, and decentralized edge LLM system designs + SLM benchmarks[15] |
| C5 | **Empowering Edge Intelligence: On-Device AI Models Survey** | arXiv | `https://arxiv.org/pdf/2503.06027.pdf` | Covers quantization, pruning, NAS for edge deployment[16] |
| C6 | **Customizing LLMs for Efficient Latency-Aware Inference at the Edge** | USENIX ATC 2025 | `https://www.usenix.org/system/files/atc25-tian.pdf` | Latency-aware customization techniques for edge LLM serving[17] |
| C7 | **Cloudflare: How We Built Infire (Most Efficient AI Inference Engine)** | Cloudflare Blog | `https://blog.cloudflare.com/cloudflares-most-efficient-ai-inference-engine/` | Continuous batching, paged KV-cache, Rust-based — the engine running under your Workers AI calls[18] |
| C8 | **Workers AI Speed Boost: Speculative Decoding + Prefix Caching** | Cloudflare Blog | `https://blog.cloudflare.com/workers-ai-improvements/` | 2-4x inference speedup with speculative decoding — directly impacts your `proxyToOrigin` paths[19] |

---

### 📂 Category D: Multi-Provider LLM Routing & Model Racing

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| D1 | **Efficient Routing of Inference Requests across LLM Instances (NSGA-II)** | arXiv | `https://arxiv.org/html/2507.15553v2` | Multi-objective routing across edge+cloud LLMs — balances quality, cost, latency. Directly applicable to your Groq→Gemini→Claude→OpenAI priority chain[20] |
| D2 | **UniRoute: Universal Model Routing for Efficient LLM Inference** | OpenReview/arXiv | `https://openreview.net/pdf?id=ka82fvJ5f1` | Dynamic routing with Pareto-optimal cost-risk selection across previously unobserved LLMs[21] |
| D3 | **SpecRouter: Adaptive Routing for Multi-Level Speculative Decoding** | arXiv | `https://arxiv.org/pdf/2505.07680.pdf` | Adaptive model chain scheduling — dynamic inference "paths" through cascaded models with real-time feedback. This IS model racing[22] |
| D4 | **Router-R1: Teaching LLMs Multi-Round Routing and Aggregation** | OpenReview | `https://openreview.net/forum?id=DWf4vroKWJ` | RL-based framework for multi-model routing and response aggregation[23] |
| D5 | **Multi-Provider Generative AI Gateway (AWS Reference Architecture)** | AWS + GitHub | `https://github.com/aws-solutions-library-samples/guidance-for-multi-provider-generative-ai-gateway-on-aws` | Production reference architecture with LiteLLM, ALB, and multi-provider routing[24] |
| D6 | **Efficient Multi-Tier Routing of LLM Inference** | SSRN | `https://papers.ssrn.com/sol3/Delivery.cfm/5402224.pdf?abstractid=5402224` | Adaptive multi-tier routing framework requiring no retraining[25] |

---

### 📂 Category E: Embedding Caching & Similarity Search

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| E1 | **Proximity: Approximate Caching for Faster RAG** | arXiv | `https://arxiv.org/html/2503.05530v3` | LSH-based approximate cache with LRU eviction per bucket — directly relevant to your `EdgeEmbeddingCache`[26][27] |
| E2 | **VectorQ: Adaptive Semantic Prompt Caching** | arXiv | `https://arxiv.org/html/2502.03771v1` | Similarity threshold-based cache hit/miss for embedding queries[28] |
| E3 | **Ensemble Embedding Approach for Semantic Similarity** | arXiv | `https://arxiv.org/html/2507.07061v1` | Meta-encoder combining multiple embedding models for improved cache retrieval[29] |
| E4 | **HET: Scaling Huge Embedding Model Training via Cache** | arXiv | `https://arxiv.org/pdf/2112.07221.pdf` | Embedding cache framework exploiting skewed popularity distributions[30] |
| E5 | **Distributed Embedding Indexing for Real-Time Vector Search** | IEEE | `https://ieeexplore.ieee.org/document/11300507/` | End-to-end vector embedding pipeline with HuggingFace sentence-transformers, real-time + batch modes[31] |

---

### 📂 Category F: Circuit Breakers & API Gateway Patterns

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| F1 | **Circuit Breakers, Discovery, and API Gateways in Microservices** (Montesi & Weber) | arXiv | `https://arxiv.org/pdf/1609.05830.pdf` | THE canonical academic treatment of circuit breaker + API gateway + service discovery patterns[32][33] |
| F2 | **Microservices Architecture: Design Patterns and Scalability** | Academic Journal | `https://fepbl.com/index.php/csitrj/article/view/1554` | Comprehensive survey: API Gateway, Circuit Breaker, Service Discovery, Strangler Fig patterns[34] |
| F3 | **Experimental Evaluation of Architectural Software Performance Design Patterns in Microservices** | arXiv | `https://arxiv.org/pdf/2409.03792.pdf` | Gateway Aggregation, Gateway Offloading, Pipe and Filters — benchmarked[35] |
| F4 | **API Patterns: Performance and Reliability Analysis** | Zenodo/Academic | `https://zenodo.org/record/7994295/files/2023131243.pdf` | Measures impact of Rate Limit, Load Balancing, Request Bundle patterns and their combinations[44] |

---

### 📂 Category G: Golden Ratio / Fibonacci in Computing (Your Sacred Geometry)

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| G1 | **Application of Phi (φ), the Golden Ratio, in Computing** | IEEE Xplore | `https://ieeexplore.ieee.org/document/10813171/` | Directly addresses golden ratio application in computing systems — validates your φ-scaled architecture[45] |
| G2 | **Golden Ratio-Inspired Subgradient Extragradient Algorithms** | Wiley | `https://onlinelibrary.wiley.com/doi/10.1002/mma.70532` | Wiley publication on golden ratio technique for optimization with self-adaptive step sizes[46] |
| G3 | **Fibonacci Sequence-Based Optimization with Advanced Computing** | Nature/Springer | `https://www.nature.com/articles/s41598-023-28367-9` | φ-based optimization improving algorithm accuracy + parallel processing[47] |
| G4 | **Golden Ratio Method for Secure Cryptographic Applications** | MDPI | `https://www.mdpi.com/2297-8747/23/4/58/pdf` | Fibonacci/golden ratio methods in security — aligns with your security layer[48] |

---

### 📂 Category H: Wiley-Published References

| # | Resource | Source | URL | Why It Matters |
|---|---|---|---|---|
| H1 | **Comprehensive Survey on LLM-Based Network Management** | Wiley (Intl Journal of Network Mgmt) | `https://onlinelibrary.wiley.com/doi/10.1002/nem.70029` | LLM services as lightweight microservices through API — network management orchestration[49] |
| H2 | **μTOSCA Toolchain: Mining, Analyzing Microservice Architectures** | Wiley (Software: Practice & Experience) | `https://onlinelibrary.wiley.com/doi/pdfdirect/10.1002/spe.2974` | Automated analysis of microservice-based architectures using TOSCA standard[50] |
| H3 | **Systematic Scalability Analysis for Microservices Granularity** | Wiley (Software: Practice & Experience) | `https://onlinelibrary.wiley.com/doi/full/10.1002/spe.3069` | Scalability analysis for microservices interacting through API gateways[51] |
| H4 | **Edge Computing in Healthcare Using ML** | Wiley (WIREs Data Mining) | `https://wires.onlinelibrary.wiley.com/doi/10.1002/widm.70069` | Edge computing + ML survey from Wiley covering deployment patterns[52] |
| H5 | **Golden Ratio-Inspired Algorithms** (repeated for Wiley emphasis) | Wiley (Mathematical Methods) | `https://onlinelibrary.wiley.com/doi/10.1002/mma.70532` | Your Sacred Geometry pattern has academic backing from Wiley[46] |

---

## PART 3: RECOMMENDED ZIP STRUCTURE

```
heady-edge-gateway-reference-bundle/
├── 00-source/
│   ├── 07-edge-gateway-inference.md          ← your attached file
│   └── Heady_Service_Reference.docx          ← your attached file
├── 01-embedding-models/
│   ├── bge-m3-embedding-paper.pdf            ← A1
│   ├── granite-embedding-models.pdf          ← A5
│   ├── improving-text-embeddings-llms.pdf    ← A6
│   └── HF-MODEL-CARDS.md                    ← links to A2,A3,A4,B1-B4
├── 02-edge-inference/
│   ├── lm-inference-at-edge.pdf              ← C1
│   ├── lightweight-rag-explainability-edge.pdf  ← C2
│   ├── edge-cloud-collaboration-survey.pdf   ← C3
│   ├── towards-edge-general-intelligence.pdf ← C4
│   ├── on-device-ai-models-survey.pdf        ← C5
│   ├── latency-aware-edge-llm-usenix.pdf    ← C6
│   └── CF-BLOG-REFERENCES.md                ← links to C7,C8
├── 03-llm-routing/
│   ├── efficient-routing-nsga2.pdf           ← D1
│   ├── uniroute-universal-model-routing.pdf  ← D2
│   ├── specrouter-adaptive-speculative.pdf   ← D3
│   ├── router-r1-multi-round.pdf             ← D4
│   ├── multi-tier-routing-llm.pdf            ← D6
│   └── aws-multi-provider-gateway-README.md  ← D5
├── 04-embedding-caching/
│   ├── proximity-approximate-caching-rag.pdf ← E1
│   ├── vectorq-semantic-prompt-caching.pdf   ← E2
│   ├── ensemble-embedding-similarity.pdf     ← E3
│   ├── het-embedding-cache-framework.pdf     ← E4
│   └── distributed-embedding-indexing.pdf    ← E5
├── 05-circuit-breaker-gateway/
│   ├── circuit-breakers-discovery-gateways.pdf  ← F1
│   ├── microservices-design-patterns.pdf     ← F2
│   ├── gateway-performance-patterns.pdf      ← F3
│   └── api-patterns-reliability-analysis.pdf ← F4
├── 06-sacred-geometry-phi/
│   ├── phi-golden-ratio-in-computing-ieee.pdf   ← G1
│   ├── golden-ratio-optimization-wiley.pdf      ← G2
│   ├── fibonacci-optimization-advanced-computing.pdf ← G3
│   └── golden-ratio-cryptography.pdf            ← G4
└── 07-wiley-publications/
    ├── llm-network-management-wiley.pdf      ← H1
    ├── utosca-microservice-analysis-wiley.pdf ← H2
    ├── microservices-scalability-wiley.pdf    ← H3
    └── edge-computing-healthcare-wiley.pdf   ← H4
```

---

## SUMMARY

**30 downloadable resources** mapped to your 6 build deliverables:

| Heady Deliverable | Supporting Resources |
|---|---|
| Edge Workers + BGE/DistilBERT | A1-A7, B1-B4, C7-C8 |
| API Gateway v2 + Circuit Breakers | F1-F4, H1-H3 |
| Inference Routing + Model Racing | D1-D6 |
| Edge Embedding Cache | E1-E5 |
| Edge-Origin Router | C1-C6 |
| Sacred Geometry (φ/Fibonacci) | G1-G4 |

All PDF links are direct-download where possible. The Hugging Face model cards (A2-A4, B1-B3) should be saved as markdown or HTML snapshots. The Cloudflare blog posts (C7-C8) can be saved via browser print-to-PDF.