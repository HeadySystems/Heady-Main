---
name: heady-perplexity-deep-research
description: Conducts multi-source, citation-grounded deep research using Perplexity for the Heady platform. Use when the user asks for comprehensive research reports, literature reviews, market analysis, topic deep-dives, or factual synthesis across multiple sources. Triggers on phrases like "research", "deep dive", "find everything about", "comprehensive report on", "literature review", "what do we know about", or "summarize research on".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: research
---

# Heady Perplexity Deep Research

## When to Use This Skill

Use this skill when the user asks to:

- Produce comprehensive, multi-source research reports
- Conduct academic or scientific literature reviews
- Investigate market trends and industry data
- Fact-check claims against authoritative sources
- Synthesize conflicting information from multiple perspectives
- Build annotated bibliographies
- Answer complex multi-part questions requiring cross-domain knowledge
- Generate research briefs for internal decision-making

## Research Methodology

Deep research follows a structured, iterative process:

1. **Query decomposition** — break the topic into atomic sub-questions
2. **Source triangulation** — gather evidence from at least 3 independent source categories
3. **Synthesis** — reconcile findings, flag contradictions, assign confidence levels
4. **Citation** — every factual claim links to a verifiable source
5. **Review** — self-audit for coverage gaps before delivering

## Instructions

### 1. Define Research Scope

Before searching:
1. Restate the user's question as a precise research objective.
2. Identify the required output type: summary, full report, data table, comparison matrix, timeline, or recommendation brief.
3. Set temporal scope: specify if research should be limited to date ranges (e.g., last 5 years).
4. Note any required primary source types: peer-reviewed papers, government data, industry reports, news, primary interviews.
5. Identify the audience and depth level: executive summary vs. technical deep-dive.

### 2. Query Decomposition

Break the main topic into 3–8 sub-questions:
- **Background**: What is the context and history?
- **Current state**: What is the most recent authoritative information?
- **Data**: What quantitative evidence exists?
- **Contrasting views**: What are the counterarguments or alternative perspectives?
- **Implications**: What are the actionable insights?
- **Gaps**: What is unknown or disputed?

### 3. Source Collection

For each sub-question:
1. Formulate 2–3 distinct search queries varying terminology.
2. Prioritize source categories in order: peer-reviewed > government/institutional > established news > industry reports > expert commentary.
3. Collect minimum 3 sources per sub-question; target 5+ for high-stakes research.
4. Record full citation data: title, author(s), publication, date, URL/DOI.
5. Note source reliability indicators: publication prestige, author credentials, peer review status, recency.

### 4. Synthesis

1. Group findings by sub-question.
2. For each group, write a synthesis paragraph combining insights from all sources.
3. Mark claims with confidence levels:
   - **High**: Consistent across 3+ independent authoritative sources
   - **Medium**: Supported by 1–2 credible sources, not contradicted
   - **Low**: Single source, opinion-based, or from low-reliability outlet
4. Explicitly note contradictions and explain the discrepancy.
5. Flag information with dates older than 3 years for recency caveat.

### 5. Report Structure

Use this structure for full research reports:

```
## Executive Summary (150–300 words)
## Background & Context
## Key Findings
  ### Finding 1 [Confidence: High]
  ### Finding 2 [Confidence: Medium]
  ...
## Data & Evidence
## Contradictions & Disputes
## Gaps & Unknowns
## Recommendations / Implications
## Sources (numbered, full citation with URL)
```

### 6. Quality Checks

Before delivering the report:
- [ ] Every factual claim has at least one inline citation
- [ ] No claim relies solely on a low-reliability source
- [ ] Date-sensitive data is flagged if older than 2 years
- [ ] Contradictions are explicitly addressed, not silently averaged
- [ ] Executive summary accurately reflects body content
- [ ] Word count meets the requested depth (default 800–2000 words for full report)

## Output Formats

- **Quick brief**: 300–500 words, bullet findings, top 5 sources
- **Standard report**: 800–1500 words, structured sections, full citations
- **Deep-dive report**: 2000–5000 words, all sections, data tables, annotated bibliography
- **Data matrix**: Tabular comparison of entities across defined dimensions

## Examples

**Input:** "Research the current state of cannabis terpene science for a technical audience."

**Decomposition:**
1. What are terpenes and their biosynthetic pathways in cannabis?
2. What peer-reviewed evidence exists for terpene-cannabinoid interactions (entourage effect)?
3. What analytical methods are used to measure terpene profiles?
4. What are leading terpene databases and chemotype classification systems?
5. What are the current regulatory considerations for terpene labeling?

**Output:** Full technical report, 2000+ words, 15+ citations from peer-reviewed journals and institutional sources.
