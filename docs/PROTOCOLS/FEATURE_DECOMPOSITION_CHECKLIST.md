# HEADY FEATURE DECOMPOSITION & EXECUTION CHECKLIST

**Purpose:** A step-by-step guide to applying the Heady Optimization Protocol to any new feature or system build.
**Executor:** Architect / Lead Agent
**Output:** A validated, executable Task Graph.

---

## PHASE 1: DEFINITION (The "What" and "Why")
*Timebox: 30-60 mins*

- [ ] **1. Define the One-Sentence Goal:**
    -   *Format:* "Ship [Feature X] to [User Group Y] by [Date Z] with [Constraint W]."
    -   *Example:* "Ship v1 of HeadyMaid to 50 beta users by Friday with zero API cost."

- [ ] **2. Identify Key Constraints:**
    -   *Budget:* Max $ / compute limits.
    -   *Quality:* Critical strictness (e.g., Patent-safe, Zero-knowledge).
    -   *Resources:* Available agents/humans.

- [ ] **3. Select Decomposition Frame:**
    -   [ ] **Vertical Slice:** (Recommended) Thin end-to-end (UI -> Backend -> DB).
    -   [ ] **User Story:** Scenario-based.
    -   [ ] **Functional:** Service-based (only for deep backend work).

---

## PHASE 2: DECOMPOSITION (The "Breakdown")
*Timebox: 1-2 hours*

- [ ] **4. Top-Level Chunks:**
    -   List 3-7 major components/milestones.
    -   *Check:* Do these cover 100% of the "Done" definition?

- [ ] **5. Recursive Refinement (The Loop):**
    -   For each chunk, ask: "What are the 3-10 sub-tasks needed?"
    -   Continue until **EVERY** task meets the **Atomic Criteria**:
        -   [ ] Duration: 2-4 hours.
        -   [ ] Outcome: Binary "Done" (Test/Artifact).
        -   [ ] Owner: Single Agent/Person.
        -   [ ] Independent: Can run with mocks.

- [ ] **6. Prune & Sanitize:**
    -   [ ] Remove "Thinking" tasks (convert to "Draft Spec").
    -   [ ] Split "And" tasks.
    -   [ ] Standardize depth (level the tree).

---

## PHASE 3: ORCHESTRATION DESIGN (The "Plan")
*Timebox: 30-60 mins*

- [ ] **7. Dependency Mapping:**
    -   Draw the DAG (Directed Acyclic Graph).
    -   Identify **Blocking** dependencies (Must finish A before B).
    -   Identify **Soft** dependencies (B needs draft of A).

- [ ] **8. Critical Path Analysis:**
    -   Estimate duration for each node.
    -   Find the longest path (The Critical Path).
    -   *Action:* Assign best resources (Top Agents) to this path.

- [ ] **9. Parallelization Opportunities:**
    -   Identify branches that can run concurrently.
    -   *Action:* Queue these for background agents.

---

## PHASE 4: EXECUTION SETUP (The "Build")
*Timebox: Ongoing*

- [ ] **10. Queue Configuration:**
    -   Create/Assign Topics in the Message Bus (Redis/EventBridge).
    -   Set Priority levels (High/Normal/Batch).

- [ ] **11. Agent/Worker Assignment:**
    -   Map tasks to specific skills/roles (e.g., "Coder" vs "Researcher").
    -   Provision necessary compute/containers.

- [ ] **12. Observability Check:**
    -   Ensure "Start", "Complete", and "Fail" events are logged.
    -   Verify dashboard visibility for this workflow.

---

## PHASE 5: REVIEW & FEEDBACK (The "Tuning")
*Cadence: Weekly or per-sprint*

- [ ] **13. Metric Review:**
    -   Check P95 Latency and Error Rates.
    -   Identify bottlenecks (Tasks taking > 4 hours).

- [ ] **14. Protocol Adjustment:**
    -   Did we decompose too small? (Overhead > Work)
    -   Did we decompose too big? (Blockers/Failures)
    -   *Action:* Update the Decomposition Frame for next time.

---

## EXAMPLE: "BUILD LOGIN SYSTEM"

**1. Top Level:**
*   Frontend UI
*   Backend API
*   Database Schema

**2. Decomposition (Atomic):**
*   *Frontend:*
    *   [ ] Implement "Sign In" Form Component (2h)
    *   [ ] Implement "Forgot Password" Modal (2h)
    *   [ ] Connect Form to Mock API (1h)
*   *Backend:*
    *   [ ] Define User Model & Migration (1h)
    *   [ ] Implement `/login` Endpoint with JWT (3h)
    *   [ ] Write Unit Tests for Auth (2h)

**3. Execution:**
*   *Parallel:* Frontend Form & Backend Model can start same time.
*   *Critical Path:* Backend API must be done before Frontend Integration.
