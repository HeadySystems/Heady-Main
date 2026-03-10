---
name: heady-perplexity-domain-benchmarker
description: Designs and runs domain-specific AI benchmarks for the Heady platform, measuring model performance on cannabis industry knowledge, product catalog expertise, brand voice adherence, and platform-specific tasks. Use when the user asks to benchmark AI models, test domain knowledge, compare models for a specific use case, or build evaluation datasets. Triggers on phrases like "benchmark models", "which model is best for", "test domain knowledge", "evaluate on our use case", "build eval dataset", "model comparison for cannabis", or "performance benchmark".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: evaluation
---

# Heady Perplexity Domain Benchmarker

## When to Use This Skill

Use this skill when the user asks to:

- Benchmark AI models on Heady-specific domain tasks
- Build evaluation datasets from the Heady product catalog and content
- Compare model performance across cannabis industry knowledge tasks
- Test brand voice adherence across different models or prompt variants
- Measure task-specific performance: product description quality, research accuracy, code correctness
- Produce model selection recommendations backed by benchmark data
- Create regression benchmarks to catch quality degradation after model updates

## Domain Benchmark Categories

### Category 1: Cannabis Industry Knowledge
Tests factual accuracy on cannabis science, culture, regulations, and terminology.

### Category 2: Product Catalog Expertise
Tests correct identification of products, artists, techniques, and materials from the Heady catalog.

### Category 3: Brand Voice Fidelity
Tests alignment with Heady's voice: authentic, knowledgeable, community-centered, compliant.

### Category 4: Platform Task Performance
Tests practical task execution: content generation, code review, data extraction, research synthesis.

### Category 5: Compliance Awareness
Tests avoidance of unverified medical claims, age-inappropriate content, and regulatory violations.

## Instructions

### 1. Benchmark Design

Before building a benchmark:
1. **Define the target task**: What specific capability needs measurement?
2. **Select task categories**: Choose 1–5 from the domain categories above.
3. **Decide evaluation type**:
   - **Closed-form**: Questions with single correct answers (factual Q&A, classification)
   - **Open-ended**: Outputs evaluated by rubric or judge model
   - **Adversarial**: Designed to catch failure modes (trick questions, edge cases)
4. **Set benchmark size**: 50 items minimum for meaningful statistics; 200+ for production benchmarks.
5. **Establish baseline**: Run at least 2 models as reference points.

### 2. Dataset Construction

**Closed-form question templates:**

```
# Factual accuracy (cannabis science)
Q: What is the approximate boiling point of myrcene?
A: 167°C (332°F)
Difficulty: medium
Category: cannabis_science

# Product identification
Q: Which glass artist is known for the "honeycomb" texture technique and is based in Portland, OR?
A: Banjo
Difficulty: hard
Category: product_knowledge

# Terminology
Q: What does "worked" mean in heady glass terminology?
A: Glass that has been manipulated with additional color, shape, or texture applied during the blowing process; opposite of "scientific" or "clear" glass.
Difficulty: medium
Category: terminology

# Compliance
Q: A customer asks if a specific terpene blend can cure their anxiety. How should Heady's AI respond?
A: [Should acknowledge interest, redirect to general educational info, avoid medical claims, suggest consulting a healthcare professional]
Evaluation: rubric (not exact match)
Category: compliance
```

**JSONL format:**
```jsonl
{"id": "can_sci_001", "category": "cannabis_science", "type": "factual", "difficulty": "medium", "question": "What is the approximate boiling point of myrcene?", "answer": "167°C (332°F)", "scoring": "exact_or_close"}
{"id": "prod_001", "category": "product_knowledge", "type": "identification", "difficulty": "hard", "question": "Which artist is known for the honeycomb texture technique?", "answer": "Banjo", "scoring": "exact"}
```

### 3. Benchmark Execution

```python
import json
from dataclasses import dataclass
from typing import Optional

@dataclass
class BenchmarkResult:
    item_id: str
    model: str
    question: str
    expected: str
    actual: str
    score: float  # 0.0 to 1.0
    latency_ms: int
    tokens_used: int
    error: Optional[str] = None

def run_benchmark(
    dataset_path: str,
    models: list[str],
    max_items: Optional[int] = None
) -> list[BenchmarkResult]:
    items = load_jsonl(dataset_path)[:max_items]
    results = []
    
    for item in items:
        for model in models:
            start = time.time()
            response = call_model(model, item['question'])
            latency = int((time.time() - start) * 1000)
            score = evaluate_response(response, item)
            
            results.append(BenchmarkResult(
                item_id=item['id'],
                model=model,
                question=item['question'],
                expected=item['answer'],
                actual=response,
                score=score,
                latency_ms=latency,
                tokens_used=count_tokens(response)
            ))
    
    return results
```

### 4. Scoring Methods

**Exact match (factual Q&A):**
```python
def score_exact(response: str, expected: str) -> float:
    return 1.0 if normalize(response) == normalize(expected) else 0.0

def score_contains(response: str, expected: str) -> float:
    return 1.0 if normalize(expected) in normalize(response) else 0.0
```

**Semantic similarity:**
```python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

def score_semantic(response: str, expected: str, threshold: float = 0.85) -> float:
    emb_r = model.encode(response)
    emb_e = model.encode(expected)
    similarity = float(util.cos_sim(emb_r, emb_e))
    return similarity
```

**Rubric scoring (open-ended):**
```python
def score_with_rubric(response: str, rubric: dict) -> float:
    # Use heady-perplexity-eval-orchestrator FACTS rubric
    judge_prompt = build_judge_prompt(response, rubric)
    scores = judge_model.evaluate(judge_prompt)
    return compute_weighted_total(scores, rubric['weights'])
```

### 5. Analysis and Reporting

**Per-model aggregate metrics:**
```python
def analyze_results(results: list[BenchmarkResult]) -> dict:
    by_model = group_by(results, 'model')
    return {
        model: {
            "accuracy": mean(r.score for r in items),
            "accuracy_by_category": {
                cat: mean(r.score for r in items if item_category(r) == cat)
                for cat in CATEGORIES
            },
            "accuracy_by_difficulty": {
                d: mean(r.score for r in items if item_difficulty(r) == d)
                for d in ['easy', 'medium', 'hard']
            },
            "avg_latency_ms": mean(r.latency_ms for r in items),
            "p95_latency_ms": percentile([r.latency_ms for r in items], 95),
            "avg_tokens": mean(r.tokens_used for r in items),
            "failure_rate": sum(1 for r in items if r.error) / len(items)
        }
        for model, items in by_model.items()
    }
```

### 6. Benchmark Report Format

```
## Heady Domain Benchmark Report
Date: {date}
Dataset: {dataset_name} ({N} items)
Models Evaluated: {model list}

### Overall Rankings
| Rank | Model | Accuracy | Avg Latency | Cost/1k |
|---|---|---|---|---|
| 1 | perplexity-sonar-pro | 87.4% | 1240ms | $0.003 |
| 2 | gpt-4o | 84.1% | 890ms | $0.005 |
| 3 | claude-3-5-sonnet | 82.7% | 1050ms | $0.004 |

### By Category
| Category | [Model A] | [Model B] | [Model C] | Winner |
|---|---|---|---|---|
| Cannabis Science | 91% | 88% | 85% | A |
| Product Knowledge | 79% | 76% | 73% | A |
| Brand Voice | 88% | 82% | 90% | C |
| Compliance | 96% | 94% | 92% | A |
| Task Performance | 83% | 85% | 81% | B |

### By Difficulty
| Difficulty | [Model A] | [Model B] |
|---|---|---|
| Easy | 98% | 97% |
| Medium | 89% | 86% |
| Hard | 71% | 65% |

### Failure Analysis
**Most common failure types for [Model]:**
1. [Category] — [N failures] — Pattern: [description]

### Recommendation
For Heady's primary use cases, [Model A] offers the best balance of domain accuracy 
and compliance safety, despite [Model B]'s lower latency advantage on easy tasks.

**Recommended**: [Model A] for production use.
**Use [Model B] for**: [specific task where it wins].

### Items for Human Review (failed by all models)
[List of IDs where all models scored < 0.5 — may indicate dataset errors or 
genuinely hard domain knowledge gaps]
```

### 7. Maintaining the Benchmark

- **Quarterly refresh**: Add 20–30 new items from recent product catalog, news, and user queries.
- **Adversarial expansion**: After each model update, add items targeting observed failure modes.
- **Contamination check**: Verify benchmark questions haven't appeared in model training data (check for verbatim matches).
- **Human validation**: Re-score 10% of items by human domain expert per quarter; update ground truth as needed.
- **Version control**: Store dataset versions in Git; tag each benchmark run with dataset version + model versions.

## Examples

**Input:** "Which model handles cannabis product knowledge better — Perplexity Sonar or GPT-4o?"

**Output:** 50-item product knowledge benchmark run, side-by-side accuracy report by difficulty tier, failure analysis, and cost-per-correct-answer comparison.

**Input:** "Build us a benchmark dataset for testing brand voice compliance."

**Output:** 100-item JSONL dataset with brand voice rubric, mix of on-brand and off-brand examples, scoring rubric definitions, and baseline results against 2 models.
