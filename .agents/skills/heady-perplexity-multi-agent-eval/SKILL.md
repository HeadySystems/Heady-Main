---
name: heady-perplexity-multi-agent-eval
description: Designs, runs, and interprets multi-agent evaluation frameworks where multiple AI agents cross-evaluate each other's outputs or collaborate on quality assessment for the Heady platform. Use when the user asks to run multi-agent evaluations, have agents judge each other, build consensus scoring, or use adversarial agent setups. Triggers on phrases like "multi-agent eval", "agents judge each other", "consensus scoring", "adversarial evaluation", "panel of judges", "cross-agent review", "LLM-as-judge multi-agent", or "agent debate".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: evaluation
---

# Heady Perplexity Multi-Agent Eval

## When to Use This Skill

Use this skill when the user asks to:

- Run evaluations where multiple AI agents score or critique outputs
- Implement panel-of-judges scoring for high-stakes outputs
- Set up adversarial evaluation (one agent argues for, one against)
- Build debate-style evaluation to surface output weaknesses
- Aggregate scores from diverse agent perspectives for robust quality signals
- Identify evaluation blind spots that single-judge evals miss
- Benchmark outputs using specialized domain-expert agent personas
- Generate consensus or dissent reports from multi-agent review

## Multi-Agent Eval Patterns

### Pattern 1: Panel of Judges
N independent agents score the same output on shared rubric → aggregate scores → consensus report.

### Pattern 2: Adversarial Debate
Agent A defends the output; Agent B attacks it. Moderator agent summarizes strengths and fatal flaws.

### Pattern 3: Specialization Panel
Each agent has a domain specialization (factual accuracy expert, tone expert, legal/compliance expert) → combine specialized scores.

### Pattern 4: Cascading Review
Agent A reviews the output → Agent B reviews Agent A's review (meta-review) → final score incorporates both levels.

### Pattern 5: Tournament Ranking
Multiple outputs compete in pairwise comparisons → Elo-style ranking emerges from agent vote counts.

## Instructions

### 1. Panel Configuration

Define the evaluation panel before running:

```yaml
panel_config:
  pipeline_id: "product-description-eval"
  task_description: "Evaluate product descriptions for heady glass accessories"
  
  agents:
    - id: judge_factual
      role: "Factual Accuracy Expert"
      persona: "You are a cannabis accessories industry expert with deep knowledge of glass art, materials, and technical terminology."
      dimensions: [factual_accuracy, specificity]
      weight: 0.35
      
    - id: judge_brand
      role: "Brand Voice Specialist"
      persona: "You are Heady Connection's brand guardian. You know the platform voice deeply: authentic, knowledgeable, community-centered."
      dimensions: [tone_style, alignment]
      weight: 0.35
      
    - id: judge_ux
      role: "Conversion Copywriter"
      persona: "You optimize copy for clarity, persuasion, and conversion. You judge whether this text would make a customer want to buy."
      dimensions: [cohesion, specificity]
      weight: 0.30
      
  aggregation: weighted_mean  # Options: mean, weighted_mean, median, majority_vote
  min_agreement_threshold: 0.70  # Below this = flag for human review
```

### 2. Agent Prompt Templates

**Judge prompt structure:**
```
You are {agent.persona}

Your task: Evaluate the following AI-generated {task_type} on these dimensions:
{dimensions_with_rubric}

## Content to Evaluate
---
{output_text}
---

## Original Prompt / Brief
---
{original_prompt}
---

## Your Evaluation
Provide scores for each dimension (1-5 scale) and a brief justification (2-3 sentences each).
Also provide an OVERALL SCORE (1-5) and 2-3 specific improvement recommendations.

Respond in this exact JSON format:
{
  "agent_id": "{agent.id}",
  "dimension_scores": {
    "dimension_name": {"score": N, "justification": "..."}
  },
  "overall_score": N,
  "recommendations": ["...", "...", "..."],
  "fatal_flaws": ["..." | empty array],
  "standout_strengths": ["...", "...", "..."]
}
```

### 3. Adversarial Debate Setup

```python
ADVOCATE_PROMPT = """
You are a defender of this output. Your job is to make the strongest possible case 
for why this output is high quality and meets the brief. Identify its strengths,
explain why potential weaknesses are actually acceptable trade-offs, and argue 
why it should be approved.

Output to defend:
{output_text}

Provide a structured defense in under 300 words.
"""

CRITIC_PROMPT = """
You are a rigorous quality critic. Your job is to find every flaw, risk, and 
shortcoming in this output. Be specific and cite exact passages. Focus on:
- Factual errors or unverified claims
- Brand voice violations
- Missing information the user needs
- Logical inconsistencies
- Any compliance or legal risks

Output to critique:
{output_text}

Provide a structured critique in under 300 words.
"""

MODERATOR_PROMPT = """
You have read both a defense and a critique of the same AI output. 
Your job is to produce a final balanced verdict.

Defense: {defense}
Critique: {critique}

Provide:
1. Which arguments were most compelling (defense vs. critique)
2. Net quality score (1-5)
3. Pass/Fail/Conditional decision
4. If Conditional: exactly what must be fixed
"""
```

### 4. Aggregation Methods

**Weighted mean:**
```python
def aggregate_weighted_mean(agent_results: list, panel_config: dict) -> float:
    agent_weights = {a['id']: a['weight'] for a in panel_config['agents']}
    total_weight = sum(agent_weights.values())
    weighted_sum = sum(
        r['overall_score'] * agent_weights[r['agent_id']]
        for r in agent_results
    )
    return weighted_sum / total_weight
```

**Agreement measurement:**
```python
def measure_agreement(scores: list[float]) -> float:
    """Returns 1.0 if all scores identical, lower as scores diverge."""
    max_possible_range = 4.0  # 5 - 1
    actual_range = max(scores) - min(scores)
    return 1.0 - (actual_range / max_possible_range)
```

**Majority vote (for categorical decisions):**
```python
def majority_vote(decisions: list[str]) -> str:
    """For pass/fail/conditional decisions."""
    return Counter(decisions).most_common(1)[0][0]
```

### 5. Dissent Handling

When agents significantly disagree (agreement < 0.70):
1. Log the dissent with agent IDs and scores.
2. Extract the specific claims causing disagreement.
3. Either:
   - **Auto-resolve**: Add a tie-breaker agent with broader domain knowledge
   - **Escalate**: Flag for human review with full agent justifications surfaced
4. Never silently average-out a major disagreement — it hides signal.

```python
def handle_dissent(results: list, threshold: float = 0.70) -> dict:
    scores = [r['overall_score'] for r in results]
    agreement = measure_agreement(scores)
    if agreement < threshold:
        return {
            "status": "DISSENT",
            "agreement_score": agreement,
            "agent_scores": {r['agent_id']: r['overall_score'] for r in results},
            "dissenting_agent": min(results, key=lambda r: r['overall_score'])['agent_id'],
            "dissent_reasons": extract_dissent_reasons(results),
            "action": "human_review"
        }
```

### 6. Tournament Ranking (Multi-Output)

For ranking N outputs against each other:

```python
def run_tournament(outputs: list[str], judge_agent, n_rounds: int = 3) -> dict:
    """Pairwise comparisons → Elo rating."""
    elo_ratings = {i: 1500 for i in range(len(outputs))}
    
    for round_num in range(n_rounds):
        pairs = generate_random_pairs(len(outputs))
        for i, j in pairs:
            winner = judge_agent.compare(outputs[i], outputs[j])
            elo_ratings[i], elo_ratings[j] = update_elo(
                elo_ratings[i], elo_ratings[j], 
                k=32, won=(winner == i)
            )
    
    ranked = sorted(elo_ratings.items(), key=lambda x: x[1], reverse=True)
    return {"rankings": ranked, "ratings": elo_ratings}
```

### 7. Multi-Agent Eval Report Format

```
## Multi-Agent Evaluation Report
Pipeline: {pipeline_id}
Evaluation Date: {date}
Output ID: {output_id}

### Panel Summary
| Agent | Role | Score | Top Concern |
|---|---|---|---|
| judge_factual | Factual Expert | 4.2 | Unverified stat in para 2 |
| judge_brand | Brand Voice | 3.8 | Slightly too formal |
| judge_ux | Conversion Expert | 4.5 | Strong CTA |

**Aggregate Score: 4.15 / 5.0**
**Agreement: 0.82 (High)**
**Decision: PASS — minor revisions suggested**

### Consensus Strengths
1. ...
2. ...

### Required Fixes (before publish)
1. ...

### Optional Improvements
1. ...
```

## Examples

**Input:** "Run a 3-judge evaluation on these 5 product descriptions and pick the best one."

**Output:** Panel configuration for 3 specialized judges, 5 scored outputs, aggregate rankings, tournament Elo results, and narrative recommendation for the winner.

**Input:** "Set up an adversarial eval for our AI blog posts before we publish them."

**Output:** Advocate + Critic + Moderator agent configuration, integration spec for blog pipeline, sample evaluation report with pass/fail decision logic.
