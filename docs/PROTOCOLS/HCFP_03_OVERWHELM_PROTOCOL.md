# OVERWHELM PROTOCOL (10 MILLION TASKS)
## HCFullPipeline Protocol 03

### 1. CORE PRINCIPLE
**Humans cannot do 10 million tasks simultaneously.**
The system must never validate the anxiety of "everything at once." It must strictly enforce a **Sequential Bottleneck**.

### 2. THE RULES
1.  **The Finite Surface:** The "Today" view can hold maximum **3-7 items**. No exceptions.
2.  **The Queue:** Everything else lives in "Backlog," "Someday," or "Scheduled." These are *storage*, not *action*.
3.  **The Micro-Step:** Large tasks must be broken down until the next step is < 15 minutes.

### 3. DATA MODEL: MASTER POOL vs. SURFACE
*   **Master Pool (Postgres):** Capable of holding 10M+ rows.
    *   Fields: `id`, `priority_score`, `urgency`, `impact`, `queue` (Backlog/Today).
*   **Surface (UI/Cache):** Restricted view.
    *   `SELECT * FROM tasks WHERE queue = 'today' LIMIT 7`.

### 4. PRIORITIZATION ALGORITHM (The Sieve)
When the user dumps 100 things, the AI runs this function:
```python
def prioritize(tasks, bandwidth):
    scored_tasks = []
    for t in tasks:
        score = (t.impact * 0.6) + (t.urgency * 0.4)
        if t.is_blocking_others: score += 10
        scored_tasks.append(score)
    
    scored_tasks.sort(desc=True)
    return scored_tasks[:bandwidth] # Returns top 3-5
```

### 5. "OVERWHELM MODE" BEHAVIOR
**Trigger:** User phrases like "I have a million things," "I'm drowning," or >20 items added rapidly.

**AI Response Protocol:**
1.  **Stop:** Do not list the tasks.
2.  **Validate:** "I hear the volume. It feels heavy."
3.  **Narrow:** "We are not doing 100 things. We are doing **one**. Let's pick the one that makes the most noise stop."
4.  **Hide:** Explicitly state: "I have safely hidden the other 99 items. They are safe, but they are not here."

### 6. MONTE CARLO PLANNING
Instead of static due dates, use probability:
*   **Input:** 5 tasks with estimated range (e.g., "10-30 mins").
*   **Simulation:** Run 1000 days.
*   **Output:** "There is an 85% chance you finish these 3 tasks by 5 PM. Task 4 is unlikely."
*   **Action:** Auto-bump Task 4 to tomorrow to prevent failure feeling.

### 7. UX CONSTRAINTS
*   **No Red Badges:** Do not show "99+ Overdue".
*   **Collapsed Lists:** Backlog is always collapsed by default.
*   **Single-Task Mode:** A "Focus" view that shows ONLY the current active item, blocking out all others.
