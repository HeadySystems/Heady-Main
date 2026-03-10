Based on a deep scan of your attached `07-edge-gateway-inference.md` codebase architecture, I've extracted the outstanding tasks and implementation requirements for the Heady Latent OS. 

Following the task breakdown, I have compiled a curated list of academic papers (from arXiv, Wiley, and Hugging Face) focused on edge AI inference, gateway routing, and latency optimization to add to your research zip.

### 📋 Extracted Tasks & Action Items (Heady Edge Gateway)

**Core Deliverables (To Be Built)**
*   **[ ] Edge Workers:** Implement CSL-gated routing, phi-scaled cache TTLs, and deterministic inference enforcement (forcing `temp=0` and `seed=42`).
*   **[ ] API Gateway v2:** Deploy the unified gateway featuring phi-scaled rate limiting, CSL-prioritized request queues, and circuit breaker patterns.
*   **[ ] Inference Routing:** Complete multi-provider logic (Claude, GPT-4, Gemini, Sonar), including CSL health scoring, latency ring-buffer tracking, and model racing modes.
*   **[ ] Edge Embedding Cache:** Build out zero round-trip similarity search, CSL-gated invalidation, and phi-scaled cache warming (using Fibonacci batch sizing).
*   **[ ] Test Suite:** Implement comprehensive tests validating routing logic, caching, rate limiting, provider selection, circuit breakers, and model racing.

**Code-Level Next Steps & Configurations**
*   **[ ] Optimization Constraints:** Ensure edge-compute layer strictly adheres to the sub-100ms latency target across routing decisions.
*   **[ ] Production Security:** Tighten the `ALLOWED_ORIGINS` CORS configuration inside `edge-inference-worker.js` prior to production deployment.
*   **[ ] Daemon Dependencies:** Run `npm install easymidi` to resolve the missing dependency for the MIDI hardware bridge in `heady-edge-daemon.js`.
*   **[ ] Auth Configuration:** Ensure the `EDGE_DAEMON_TOKEN` environment variable is strictly mapped across edge instances for the local hardware tether.
*   **[ ] Metrics Persistence:** Hook up the async metrics flush to Workers KV (based on the `METRICS_FLUSH_INTERVAL_MS` phi-scaled interval).

---

### 📚 Academic & Hugging Face Resources (For your Research Zip)

I've sourced several highly relevant, recent papers that directly map to your work on multi-model routing, edge gateway orchestration, and latency-optimized inference. You can download these PDFs to compile your research zip.

#### 1. LLM Routing & Multi-Provider Gateways (Hugging Face & arXiv)
*   **BEST-Route: Adaptive LLM Routing with Test-Time Optimal Compute [36]**
    *   *Link:* [arXiv:2506.22716](https://arxiv.org/abs/2506.22716) 
    *   *Relevance:* Explores a routing framework across popular LLM platforms (like Hugging Face) using a reference model (e.g., GPT-4o) and cost-efficient alternatives. Maps directly to your `InferenceGateway` and complexity-weighted tiering (`EDGE_PREFER`, `ORIGIN_ONLY`).
*   **Edge-Cloud Routing for Text-to-Image Model with Token-Level Multi-Routing [37]**
    *   *Link:* [arXiv:2411.13787](https://arxiv.org/abs/2411.13787)
    *   *Relevance:* Discusses cascading LLM routing based on the confidence of responses and predictive routing, which mirrors your CSL (Confidence Semantic Logic) gating mechanisms.

#### 2. Edge AI Inference & Latency Optimization
*   **SLICE: SLO-Driven Scheduling for LLM Inference on Edge Computing Devices [38]**
    *   *Link:* [arXiv:2510.18544](https://arxiv.org/abs/2510.18544)
    *   *Relevance:* Specifically targets Time to First Token (TTFT) and end-to-end latency optimizations for edge devices processing real-time tasks. Perfectly aligns with your sub-100ms constraint.
*   **SynergAI: Edge-to-Cloud Synergy for Architecture-Driven High-Performance Orchestration [39]**
    *   *Link:* [arXiv:2509.12252](https://arxiv.org/abs/2509.12252)
    *   *Relevance:* Outlines an orchestration framework for dynamically shifting inference serving across heterogeneous edge-to-cloud infrastructures, similar to your `EdgeOriginRouter` (`_callEdge` vs `_callOrigin`).
*   **Cognitive Edge Computing: Optimizing Large Models and AI Agents for Pervasive Deployment [40]**
    *   *Link:* [arXiv:2501.03265](https://arxiv.org/abs/2501.03265) *(via Semantic Scholar)*
    *   *Relevance:* A comprehensive survey mapping out on-device inference, context compression, dynamic routing, and cloud-edge collaborative architectures. 

#### 3. Federated Learning & Edge Gateways (Wiley Research)
*   **Unified Adaptive Deep Classification for Industrial Real-Time Situation... [41]**
    *   *Link:* [Wiley Online Library](https://onlinelibrary.wiley.com/doi/10.1002/cpe.6488)
    *   *Relevance:* Looks at deploying federated learning frameworks specifically to edge gateways to guarantee high flexibility and exact real-time inference.
*   **Machine Learning‐Based Time‐Series Data Analysis in Edge... [42]**
    *   *Link:* [Wiley Online Library](https://onlinelibrary.wiley.com/doi/10.1155/2022/5988164)
    *   *Relevance:* Analyzes isolation forest algorithms at the edge gateway coupled with sequential transmissions to cloud services. Very close parallel to your `heady-edge-daemon.js` bridging local hardware (MIDI/files) to the Heady cloud.
*   **EdgeMesh: A Hybrid Distributed Training Mechanism [43]**
    *   *Link:* [Wiley Online Library](https://onlinelibrary.wiley.com/doi/10.1002/ett.4706)
    *   *Relevance:* Details network load reduction across edge gateway nodes using knowledge distillation and hybrid inference routing.