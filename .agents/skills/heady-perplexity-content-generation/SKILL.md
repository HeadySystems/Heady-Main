---
name: heady-perplexity-content-generation
description: Generates brand-aligned content for the Heady Connection platform including product descriptions, blog posts, social media copy, email campaigns, SEO metadata, and educational cannabis content. Use when the user asks to write, draft, generate, create, or produce any form of text content. Triggers on phrases like "write a blog post", "product description for", "social media post about", "email campaign for", "draft copy for", "create content about", or "write SEO description".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: content
---

# Heady Perplexity Content Generation

## When to Use This Skill

Use this skill when the user asks to:

- Write product descriptions for cannabis accessories, glass art, or headshop inventory
- Draft blog posts and educational articles about cannabis culture and science
- Create social media captions and posts (Instagram, Facebook, X/Twitter)
- Generate email newsletters and promotional campaigns
- Produce SEO title tags, meta descriptions, and structured data markup
- Write customer-facing FAQs and knowledge base articles
- Generate UX microcopy: button labels, empty states, error messages, tooltips
- Draft press releases, event announcements, or brand stories

## Brand Voice — Heady Connection

Content must consistently reflect these voice attributes:

| Attribute | Meaning |
|---|---|
| **Knowledgeable** | Cite accurate cannabis science and culture facts; never guess |
| **Authentic** | Direct, real language; avoid corporate jargon and puffery |
| **Community-centered** | Celebrate artisan glass culture; honor the craft and the makers |
| **Inclusive** | Welcoming to all experience levels; never condescending |
| **Compliant** | No unverified medical claims; follow applicable advertising standards |

**Tone spectrum**: Informative and warm for educational content; enthusiastic and community-focused for social; professional and clear for transactional content.

## Instructions

### 1. Content Brief Intake

Establish these parameters before writing:
1. **Content type**: product copy, blog, social, email, SEO, FAQ, UX copy
2. **Target audience**: new customers, collectors, connoisseurs, gift buyers
3. **Keyword targets**: primary and secondary SEO terms (if applicable)
4. **Length target**: character/word range or platform spec
5. **Tone modifiers**: celebratory, educational, urgency-driven, conversational
6. **Legal constraints**: no medical claims; age-gating reminder for ads; state-specific language where needed

### 2. Product Description Writing

For cannabis accessories and glass art:
1. Lead with the most compelling differentiator (artist, technique, material, function).
2. Describe form: dimensions, materials, color/finish, unique visual characteristics.
3. Describe function: what it does, how to use it, maintenance notes.
4. Include maker/brand story if product is artist-made or limited edition.
5. Close with availability signal (in stock, limited run, made-to-order).
6. Append 3–5 SEO-relevant tags.

**Format:**
```
[Headline — 60 chars max]
[2–3 sentence opening — hook and primary differentiator]
[Feature paragraph — materials, dimensions, function]
[Artist/Brand note if applicable]
[Availability + CTA]
[SEO Tags: ...]
```

### 3. Blog Post & Educational Article Writing

1. Research the topic before writing (use heady-perplexity-deep-research if needed).
2. Structure: Hook → Background → Main Content → Takeaways → CTA.
3. Use headers (H2, H3) for scannability; aim for one H2 per 300 words.
4. Incorporate primary keyword naturally in: title, first paragraph, one H2, meta description.
5. Include at least one internal link suggestion (e.g., "see our [Terpene Guide]").
6. Target reading level: Grade 8–10 (Flesch-Kincaid).
7. End with a clear CTA: shop, subscribe, share, or comment.

### 4. Social Media Content

**Instagram:**
- Caption: 125–200 words; hook in first line (before "more" fold); 5–8 hashtags
- Mix: 40% educational, 30% product/promotion, 30% community/culture

**Facebook:**
- 40–80 words; question or statement hook; one CTA; 2–3 hashtags max

**X/Twitter:**
- Under 280 chars; punchy; use 1–2 targeted hashtags; link if applicable

**Content pillars for Heady Connection social:**
1. Artist Spotlight — feature a glass artist and their work
2. Terpene/Strain Science — educational snippets
3. New Arrivals — product showcase with price and link
4. Community Moments — events, meetups, customer photos
5. Culture & History — cannabis culture stories and milestones

### 5. Email Campaigns

Structure for promotional emails:
```
Subject line: [Benefit/curiosity hook, 40–55 chars] | A/B variant included
Preview text: [Extends subject, 85–100 chars]
Header: [Headline — 8 words max]
Body: [2–3 short paragraphs; personal, conversational]
CTA button: [Action verb + object — e.g., "Shop New Arrivals"]
Footer: [Unsubscribe | Address | Legal]
```

### 6. SEO Metadata

For each page:
- **Title tag**: 50–60 characters; primary keyword near front; brand name at end
- **Meta description**: 150–160 characters; include primary keyword; natural CTA; no truncation
- **OG tags**: title (same as title tag), description (same as meta), image alt text
- **Schema markup**: suggest appropriate type (Product, Article, FAQPage, LocalBusiness)

### 7. Compliance Checks

Before delivering any content:
- [ ] No unqualified medical or therapeutic claims
- [ ] No statements implying FDA approval or medical treatment
- [ ] Age-appropriate language; no content targeted at minors
- [ ] State/jurisdiction-specific claims are accurate and labeled
- [ ] Artist names and brand names spelled correctly (verify against product catalog)

## Examples

**Input:** "Write a product description for a heady collab piece between artists Banjo and Elbo."

**Output:**
```
Banjo × Elbo — Limited Collab Rig

Two titans of the heady glass scene came together for this once-in-a-lineup collab rig.
Banjo's signature honeycomb texture meets Elbo's iconic color work in a piece that's
as functional as it is collectible. Borosilicate construction, 14mm female joint,
built-in recycler perc. Approx. 8" tall. Certificate of authenticity included.

Limited to 3 pieces — once they're gone, they're gone.
[Shop This Piece]

Tags: heady glass, collab rig, Banjo glass, Elbo glass, limited edition dab rig
```
