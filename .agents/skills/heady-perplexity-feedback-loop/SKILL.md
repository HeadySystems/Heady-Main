---
name: heady-perplexity-feedback-loop
description: Implements structured feedback collection, analysis, and continuous improvement loops for AI-generated outputs and agent pipelines in the Heady platform. Use when the user asks to collect feedback on AI outputs, set up user rating systems, analyze quality signals, improve models from feedback, or close the loop between output quality and system improvement. Triggers on phrases like "collect feedback", "feedback loop", "improve from ratings", "thumbs up down system", "output quality signals", "user feedback on AI", "close the loop", or "learn from corrections".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: ai-quality
---

# Heady Perplexity Feedback Loop

## When to Use This Skill

Use this skill when the user asks to:

- Design a feedback collection system for AI-generated content or agent outputs
- Implement user rating interfaces (thumbs up/down, star ratings, corrections)
- Analyze feedback signals to identify systematic output failures
- Build retraining datasets from user corrections
- Set up automated quality monitors triggered by feedback trends
- Produce feedback-driven improvement reports
- Close the loop: feedback → analysis → prompt/system improvement → re-evaluation

## Feedback Loop Architecture

```
[AI Output] → [User Sees Output]
                    ↓
            [Feedback Capture]
            (explicit + implicit)
                    ↓
            [Signal Storage] → Firestore
                    ↓
            [Analysis Pipeline]
            (aggregate + classify)
                    ↓
            [Improvement Actions]
            (prompt tuning, RAG update, training data)
                    ↓
            [Regression Eval] → [Deploy if passed]
```

## Feedback Signal Types

| Type | Collection Method | Signal Strength |
|---|---|---|
| **Explicit thumbs up/down** | UI button click | Medium |
| **Star rating (1–5)** | Post-output rating prompt | Medium-High |
| **Correction submission** | "Suggest a correction" form | Very High |
| **Copy/share action** | Implicit positive signal | Low |
| **Regenerate request** | Implicit negative signal | Medium |
| **Time-on-output** | Dwell time analytics | Low |
| **Expert review** | Human annotator score | Very High |

## Instructions

### 1. Feedback Schema Design

Define the Firestore schema for feedback records:

```typescript
interface FeedbackRecord {
  id: string;                        // Auto-generated
  timestamp: Timestamp;
  pipeline_id: string;               // e.g., "blog-generation", "product-description"
  output_id: string;                 // Reference to the AI output
  session_id: string;                // User session (anonymized if needed)
  user_id?: string;                  // Authenticated user UID (optional)
  
  // Explicit feedback
  rating?: 1 | 2 | 3 | 4 | 5;      // Star rating
  thumbs?: 'up' | 'down';
  correction?: string;               // User's corrected version
  comment?: string;                  // Free-text comment
  categories?: FeedbackCategory[];   // Classified issue types
  
  // Implicit signals
  regenerated: boolean;              // User clicked regenerate
  copied: boolean;
  dwell_seconds?: number;
  
  // Metadata
  prompt_version: string;            // Which prompt template was used
  model: string;                     // Which model generated the output
  context_length: number;
}

type FeedbackCategory = 
  | 'factual_error' 
  | 'wrong_tone' 
  | 'off_topic'
  | 'too_long'
  | 'too_short'
  | 'missing_info'
  | 'formatting'
  | 'brand_voice';
```

### 2. UI Feedback Component (React)

```jsx
function FeedbackWidget({ outputId, pipelineId }) {
  const [rating, setRating] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState('');

  const submitFeedback = async (data) => {
    await addDoc(collection(db, 'feedback'), {
      output_id: outputId,
      pipeline_id: pipelineId,
      timestamp: serverTimestamp(),
      ...data
    });
  };

  return (
    <div className="feedback-widget">
      <button onClick={() => { setRating('up'); submitFeedback({ thumbs: 'up' }); }}>
        👍
      </button>
      <button onClick={() => { setRating('down'); setShowCorrection(true); submitFeedback({ thumbs: 'down' }); }}>
        👎
      </button>
      {showCorrection && (
        <form onSubmit={() => submitFeedback({ correction })}>
          <textarea
            placeholder="How could this be improved?"
            value={correction}
            onChange={e => setCorrection(e.target.value)}
          />
          <button type="submit">Submit correction</button>
        </form>
      )}
    </div>
  );
}
```

### 3. Feedback Analysis Pipeline

Run analysis weekly (or on-demand after significant feedback volume):

**Step 1: Aggregate signals**
```python
def aggregate_feedback(pipeline_id: str, date_range: tuple) -> dict:
    records = fetch_feedback(pipeline_id, date_range)
    return {
        "total": len(records),
        "thumbs_up_rate": sum(1 for r in records if r.thumbs == 'up') / len(records),
        "avg_rating": mean(r.rating for r in records if r.rating),
        "regeneration_rate": sum(1 for r in records if r.regenerated) / len(records),
        "correction_rate": sum(1 for r in records if r.correction) / len(records),
        "top_categories": Counter(
            cat for r in records for cat in (r.categories or [])
        ).most_common(5)
    }
```

**Step 2: Classify free-text feedback**
```python
# Use LLM to classify correction text into categories
def classify_feedback(correction_text: str) -> list[str]:
    prompt = f"""Classify this feedback into categories from: 
    [factual_error, wrong_tone, off_topic, too_long, too_short, missing_info, formatting, brand_voice]
    
    Feedback: "{correction_text}"
    
    Return JSON array of matching categories."""
    return llm.classify(prompt)
```

**Step 3: Identify failure clusters**
- Group low-rated outputs by: prompt_version, model, context type.
- Find the prompt version or model with below-threshold performance.
- Surface the 10 worst-rated outputs with their corrections for human review.

### 4. Improvement Action Types

Based on analysis results, trigger the appropriate action:

| Finding | Action |
|---|---|
| Thumbs-down rate > 25% | Immediate prompt audit; escalate to human review |
| Category "factual_error" > 10% | Trigger RAG knowledge base review (heady-perplexity-rag-optimizer) |
| Category "wrong_tone" > 15% | Update brand voice instructions in prompt |
| Category "too_long" > 20% | Add output length constraint to prompt |
| Regeneration rate > 20% | A/B test new prompt variant |
| Model X consistently lower | Switch default model for this pipeline |

### 5. Few-Shot Training Data Collection

When corrections are submitted:
1. Validate correction quality (minimum 20 chars; categorized by human or LLM).
2. Create a few-shot example pair: `{prompt, bad_output, good_output}`.
3. Store in Firestore `training_examples/{pipeline_id}` collection.
4. After collecting 50+ examples per pipeline, format as JSONL for fine-tuning or few-shot prompt injection.

```python
def build_few_shot_examples(pipeline_id: str, min_quality: float = 4.0) -> list:
    corrections = fetch_corrections(pipeline_id, min_quality)
    return [
        {
            "prompt": c.original_prompt,
            "bad_output": c.original_output,
            "correction": c.correction,
            "categories": c.categories
        }
        for c in corrections
    ]
```

### 6. Feedback Dashboard Metrics

Track these KPIs per pipeline:

| Metric | Target | Alert Threshold |
|---|---|---|
| Thumbs-up rate | ≥ 80% | < 65% |
| Average star rating | ≥ 4.0 | < 3.0 |
| Correction rate | < 5% | > 15% |
| Regeneration rate | < 10% | > 25% |
| Factual error rate | < 2% | > 8% |

### 7. Feedback Loop Closure Checklist

Each improvement cycle must document:
- [ ] Feedback window analyzed: [date range]
- [ ] Total feedback records reviewed: N
- [ ] Root causes identified: [list]
- [ ] Prompt changes made: [description or diff]
- [ ] RAG updates made: [if applicable]
- [ ] Post-change eval score: [before vs. after]
- [ ] Deployed to production: [date]
- [ ] Monitoring period set: [N days post-deploy watch period]

## Examples

**Input:** "Set up a feedback system for our blog post generator — I want to see when users are unhappy."

**Output:** Firestore schema, React feedback widget component, Cloud Function to trigger alert when thumbs-down rate exceeds 25% in any 24-hour window, weekly analysis script.

**Input:** "Analyze last month's feedback on product descriptions. What's broken?"

**Output:** Aggregated metrics report, top failure categories, 5 sample worst-rated outputs with corrections, and 3 specific prompt improvement recommendations.
