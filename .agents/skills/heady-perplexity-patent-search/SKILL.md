---
name: heady-perplexity-patent-search
description: Searches, retrieves, and analyzes patent documents relevant to cannabis accessories, glass manufacturing, vaporizer technology, extraction equipment, and related IP for the Heady platform. Use when the user asks to search patents, check for prior art, analyze patent claims, assess freedom-to-operate, or research competitor IP. Triggers on phrases like "search patents", "prior art for", "patent claims analysis", "freedom to operate", "is this patented", "patent landscape for", or "competitor patents".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: legal-ip
---

# Heady Perplexity Patent Search

## When to Use This Skill

Use this skill when the user asks to:

- Search for patents related to a product, process, or technology
- Assess prior art for a novel product idea
- Analyze the claims of a specific patent
- Evaluate freedom-to-operate (FTO) for a new product design
- Map the patent landscape for a technology area
- Monitor competitor patent filings
- Identify patent holders in the cannabis accessory space
- Extract key claim language for licensing discussions

## Legal Disclaimer

This skill provides informational patent research and analysis. It does **not** constitute legal advice. For formal FTO opinions, patent filings, or IP litigation strategy, engage a registered patent attorney or agent.

## Patent Databases

Search these databases in order of relevance:

| Database | URL | Best For |
|---|---|---|
| USPTO Patent Full-Text | patents.google.com | US patents, full text search |
| Google Patents | patents.google.com | Global coverage, prior art, citations |
| Espacenet | worldwide.espacenet.com | European and international patents |
| USPTO PatFT | patft.uspto.gov | Official US patent database |
| WIPO PATENTSCOPE | patentscope.wipo.int | PCT international applications |
| Lens.org | lens.org | Open scholarly and patent search |

## CPC Classifications Relevant to Heady

| CPC Code | Domain |
|---|---|
| A24F | Smokers' requisites (pipes, holders, accessories) |
| A61M 15 | Drug delivery by inhalation |
| B65D | Containers and packaging |
| C03B | Glass manufacturing |
| F24C | Heating apparatus |
| A24B | Tobacco preparations |
| A61P 43 | Drugs for specific purposes (for pharmaceutical cross-reference) |

## Instructions

### 1. Define the Search Objective

Establish before searching:
1. **Technology description**: What is the product or process? Describe in plain language.
2. **Search type**: Prior art survey | Specific patent lookup | Landscape analysis | FTO assessment
3. **Jurisdiction scope**: US only | US + EU | Global
4. **Date range**: All time | Last 20 years (active patents only) | Last 5 years (emerging tech)
5. **Key actors**: Are there known competitors or assignees to prioritize?

### 2. Keyword and Classification Query Building

1. Extract technical terms: list all technical synonyms and variant spellings.
2. Identify the broadest and narrowest claim scope for keywords.
3. Build query variants:
   - Broad: `(pipe OR bong OR water pipe) AND (filtration OR percolator)`
   - Narrow: `"honeycomb percolator" AND "borosilicate" AND "water pipe"`
4. Map to CPC/IPC classifications as secondary filter.
5. Run 3–5 queries per technology dimension; document each query string used.

### 3. Result Screening

For each search result:
1. Record: Patent number, title, assignee, inventor(s), filing date, publication date, status (active/expired/pending).
2. Read the Abstract to assess relevance.
3. If relevant: read Claims section fully.
4. If highly relevant: read the Detailed Description for embodiment scope.
5. Classify relevance: **High** (directly covers technology) | **Medium** (overlapping elements) | **Low** (background art).

### 4. Claim Analysis

For each high-relevance patent:
1. Parse independent claims (typically Claim 1 and first claim of each independent chain).
2. Identify essential elements (every element of an independent claim must be present for infringement).
3. Map each claim element to the product/process being assessed.
4. Flag claim elements that are absent in the product — these are potential non-infringement arguments.
5. Note claim construction ambiguities that could expand or contract scope.

**Claim element table:**
```
| Claim Element | Present in Product? | Notes |
|---|---|---|
| "water filtration chamber" | Yes | Standard percolator |
| "electronically controlled heating element" | No | Product is flame-operated |
```

### 5. FTO Assessment

For freedom-to-operate analysis:
1. List all high/medium relevance active patents.
2. For each: assess whether all independent claim elements are present in the product.
3. Assign FTO risk rating: **Red** (likely infringement) | **Yellow** (possible infringement, design-around needed) | **Green** (non-infringing).
4. Suggest design-arounds for Yellow/Red items where evident.
5. Flag expired patents as prior art that cannot be infringed.

### 6. Landscape Report Format

```
## Patent Landscape: [Technology Area]
### Search Summary
- Databases searched: ...
- Queries used: ...
- Results screened: N
- Relevant patents identified: N

### Key Patent Holders (Top 5 by count)
1. [Assignee] — N patents — Focus: ...

### Technology Timeline
[Year] — [Patent] — [Key innovation]

### White Space Opportunities
[Unpatented technology areas identified]

### High-Risk Patents
[List with claim summaries and FTO rating]

### Recommended Actions
1. ...
```

## Examples

**Input:** "Search for patents on percolator water pipe designs filed in the last 10 years."

**Output:** Landscape report with query strings used, 15 most relevant patents with claim summaries, top assignees (RAZ, Graftech, GRAV Labs), and identified white space in multi-chamber recycler designs.

**Input:** "We want to make a new electric dab nail — are there active patents blocking us?"

**Output:** FTO assessment against A61M 15/00 and related classifications, Red/Yellow/Green rating for each relevant patent, design-around suggestions for Yellow-rated claims.
