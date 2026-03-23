<!-- HEADY_BRAND:BEGIN -->
<!-- HEADY SYSTEMS :: SACRED GEOMETRY -->
<!-- FILE: docs/PROTOCOLS/HCFP_02_ARCHITECTURE.md -->
<!-- LAYER: docs -->
<!--  -->
<!--         _   _  _____    _    ____   __   __ -->
<!--        | | | || ____|  / \  |  _ \ \ \ / / -->
<!--        | |_| ||  _|   / _ \ | | | | \ V /  -->
<!--        |  _  || |___ / ___ \| |_| |  | |   -->
<!--        |_| |_||_____/_/   \_\____/   |_|   -->
<!--  -->
<!--    Sacred Geometry :: Organic Systems :: Breathing Interfaces -->
<!-- HEADY_BRAND:END -->

# HCFULLPIPELINE ARCHITECTURE
## HCFullPipeline Protocol 02

### 1. HIGH-LEVEL CONCEPT
**"Fractal Pipeline":** The architecture mirrors the user's mental model—one central "Brain" (HeadyBuddy) serving multiple "Bodies" (Interfaces), connected by a nervous system of APIs and Events.

### 2. LAYER 1: EXPERIENCE (The Bodies)
*   **Mobile Apps (Android/iOS):** Native or React Native shells. Focus on Voice and Push Notifications.
*   **Web Companion:** Next.js based chat interface with rich UI (calendar views, boards).
*   **Browser Extension:** Overlay sidebar that injects HeadyBuddy into any URL.
*   **Widgets:** Lightweight JS snippets for partner sites.

### 3. LAYER 2: ORCHESTRATION (The Nervous System)
*   **API Gateway:** `heady-manager.js` (Node/Express) handles routing.
*   **Endpoints:**
    *   `POST /api/chat`: Main conversation loop.
    *   `POST /api/plan`: Monte Carlo planning engine.
    *   `POST /api/memory`: Vector storage/retrieval.
*   **Real-time:** WebSocket/SSE for syncing state across devices instantly.

### 4. LAYER 3: INTELLIGENCE (The Brain)
*   **Tier 1 (Reasoning):** Cloud LLM (GPT-4o/Claude 3.5) for complex planning and emotional depth.
*   **Tier 2 (Reflex):** Local/Small LLM (Llama-3-8B) for quick classification, routing, and privacy-sensitive chat.
*   **Planning Engine:** Python worker running Monte Carlo simulations on task lists to predict realistic completion times.

### 5. LAYER 4: DATA & MEMORY
*   **Short-term:** Redis cache for conversation context window.
*   **Long-term (Episodic):** Postgres (JSONB) for structured logs (Journal, Tasks).
*   **Long-term (Semantic):** pgvector with HNSW index for embedding-based recall ("What did I say about my anxiety last week?"). See ADR-003.
*   **Universal Task Pool:** A single database table holding *all* tasks from *all* sources, normalized.

### 6. LAYER 5: GOVERNANCE & SAFETY
*   **Pre-filters:** Regex and logic checks for PII leaks or banned topics.
*   **Post-filters:** LLM-based evaluation of response safety/tone.
*   **Impact Metrics:** Logging for "Social Good" (Time saved, Stress reduced) to feed the redistribution engine.

### 7. STACK RECOMMENDATION
*   **Frontend:** Next.js + React + Tailwind (Sacred Geometry Design System).
*   **Backend:** Node.js (Orchestrator) + Python (Worker/AI).
*   **Database:** PostgreSQL (Supabase or Render).
*   **Vector:** pgvector.
*   **Infra:** Render.com Blueprint (IaC).
