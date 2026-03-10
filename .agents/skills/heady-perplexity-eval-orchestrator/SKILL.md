---
name: heady-perplexity-eval-orchestrator
description: Orchestrates structured evaluations of AI model outputs, agent responses, and automated pipeline results for the Heady platform using Perplexity-based scoring and multi-criteria rubrics. Use when the user asks to evaluate, score, grade, compare, or benchmark AI outputs, agent responses, or automation results. Triggers on phrases like "evaluate this output", "score the responses", "compare model outputs", "run an eval", "judge these results", "quality assessment", or "benchmark these answers".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: evaluation
---

# Heady Perplexity Eval Orchestrator

## When to Use This Skill

Use this skill when the user asks to:

- Evaluate the quality of AI-generated content, code, or research
- Score and compare outputs from multiple model runs
- Design evaluation rubrics for AI pipelines
- Run A/B comparisons of prompt variants
- Assess factual accuracy, coherence, and usefulness of responses
- Produce structured eval reports for model selection decisions
- Set up continuous evaluation pipelines for production AI features
- Grade agent task completion against defined success criteria

## Evaluation Framework

Heady uses a multi-dimensional scoring framework called **FACTS**:

| Dimension | Weight | Criteria |
|---|---|---|
| **F**actual Accuracy | 30% | Claims are correct; citations are valid; no hallucinations |
| **A**lignment | 25% | Output matches the intent and scope of the prompt |
| **C**ohesion | 20% | Logical flow; no contradictions; clear structure |
| **T**one & Style | 15% | Matches required voice, register, and brand guidelines |
| **S**pecificity | 10% | Concrete, actionable details vs. vague generalities |

Default scoring scale: **1–5** per dimension (5 = excellent, 1 = unacceptable). Weighted total = 1–5.0.

## Instructions

### 1. Define the Evaluation Job

Before running evals:
1. **Task type**: What was the AI asked to do? (content generation, code, research, Q&A, analysis)
2. **Rubric**: Use FACTS default, a custom rubric, or a domain-specific checklist.
3. **Evaluation mode**:
   - **Single output**: Score one response
   - **Comparative**: Rank N responses to the same prompt
   - **Regression**: Compare new output to a baseline reference
4. **Reference answer**: Is there a known ground-truth or gold standard?
5. **Evaluator**: AI judge (self-eval) | Human-in-the-loop | Hybrid

### 2. Rubric Design

For custom rubrics, define each dimension as:
```yaml
dimension:
  name: "Factual Accuracy"
  description: "All claims are verifiable and correct"
  weight: 0.30
  scale:
    5: "All claims verified; no errors detected"
    4: "Minor inaccuracies; not materially misleading"
    3: "Some unverified claims; 1–2 factual errors"
    2: "Multiple factual errors; requires significant correction"
    1: "Fundamentally incorrect; cannot be used as-is"
  auto_check: ["citation_count", "fact_match_score"]
```

### 3. Single Output Evaluation

For each dimension in the rubric:
1. Read the output and the original prompt.
2. Apply the rubric criteria to assign a 1–5 score.
3. Write a 1–2 sentence justification for each score.
4. Flag specific text passages that drove the score (positive and negative).
5. Calculate weighted total score.

**Output format:**
```
## Eval Report — [Task ID / Timestamp]

### Input Summary
Prompt: [truncated or summarized]
Output length: N words / N lines of code

### Dimension Scores
| Dimension | Score | Weight | Weighted | Notes |
|---|---|---|---|---|
| Factual Accuracy | 4 | 30% | 1.20 | Citation present but one stat unverified |
| Alignment | 5 | 25% | 1.25 | Fully addresses the prompt |
| Cohesion | 4 | 20% | 0.80 | Minor repetition in paragraph 3 |
| Tone & Style | 5 | 15% | 0.75 | Matches Heady brand voice |
| Specificity | 3 | 10% | 0.30 | Recommendations could be more actionable |

**Total Score: 4.30 / 5.0 — PASS**

### Key Issues
- [WARNING] Paragraph 2: Statistic "cannabis market grew 40% in 2025" lacks source.

### Recommendations
1. Verify and cite the market growth statistic.
2. Add 2–3 specific actionable steps in the recommendations section.
```

### 4. Comparative Evaluation (A/B/N)

When comparing multiple outputs to the same prompt:
1. Score each output independently using the rubric.
2. Rank outputs by total weighted score.
3. Produce a comparison matrix.
4. Write a narrative recommendation: which output to use and why.
5. Identify the best-performing elements from each output for synthesis.

**Comparison matrix:**
```
| Dimension | Output A | Output B | Output C | Winner |
|---|---|---|---|---|
| Factual Accuracy | 4.0 | 3.5 | 4.5 | C |
| Alignment | 4.5 | 5.0 | 4.0 | B |
| Cohesion | 3.5 | 4.0 | 4.5 | C |
| Tone & Style | 5.0 | 4.5 | 4.0 | A |
| Specificity | 3.0 | 4.0 | 4.5 | C |
| **Total** | **4.05** | **4.20** | **4.30** | **C** |
```

### 5. Regression Evaluation

When comparing a new output to a baseline:
1. Score both new and baseline on the same rubric.
2. Calculate delta per dimension.
3. Flag regressions (negative delta > 0.5) as blocking issues.
4. Flag improvements for documentation.
5. Produce a pass/fail decision based on regression threshold (default: total delta ≥ -0.3 = fail).

### 6. Automated Eval Signals

Beyond rubric scoring, collect these automated signals where possible:

| Signal | Method |
|---|---|
| Hallucination risk | Check citations against source; flag unverified proper nouns |
| Toxicity | Screen for harmful, offensive, or non-compliant content |
| Reading level | Flesch-Kincaid; flag if >3 grades from target |
| Brand compliance | Keyword match against prohibited words list |
| Code correctness | Static analysis or test execution for code outputs |
| Citation quality | Verify URLs are accessible and match claimed content |

### 7. Batch Eval Pipeline

For evaluating 10+ outputs programmatically:
1. Format inputs as JSONL: `{"id": "...", "prompt": "...", "output": "..."}`
2. Apply rubric scoring in parallel (process up to 20 at a time).
3. Aggregate results: mean, median, min, max, std dev per dimension.
4. Produce histogram of total scores.
5. Export results as CSV with full dimension scores and flags.

**Batch summary format:**
```
Batch Eval Complete: [N] outputs
Mean Score: X.XX | Median: X.XX | Std Dev: X.XX
Pass Rate (≥3.5): XX%
Dimension Weaknesses: [top 2 lowest-scoring dimensions]
Flagged for Human Review: [N outputs below 2.5]
```

### 8. Continuous Eval Integration

For production pipelines:
1. Define eval triggers: every N outputs, on every deploy, or on demand.
2. Set pass thresholds per use case (content: ≥3.5; code: ≥4.0; legal/compliance: ≥4.5).
3. Store eval results in Firestore: `eval_results/{pipeline_id}/{run_id}`.
4. Alert via webhook if score drops below threshold.
5. Track score trends over time with weekly summary reports.

## Examples

**Input:** "Evaluate these 3 product descriptions for our new dab rig and pick the best one."

**Output:** Three-way comparison matrix using FACTS rubric, narrative recommendation for winner, merged best-of synthesis with identified elements from each.

**Input:** "Set up a continuous eval for our blog post generation pipeline. Alert me if quality drops."

**Output:** Eval pipeline configuration, Firestore schema for results, webhook alert spec, and sample eval report template.
