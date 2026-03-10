# ADR 005: Drupal CMS for Multi-Site Content Management

**Status:** Accepted

## Context

Heady operates 9 distinct content domains, each with unique content types and workflows:
1. Main product site (blog, documentation, FAQs)
2. Enterprise features portal
3. Research center (whitepapers, case studies)
4. API documentation (OpenAPI schemas, examples)
5. Partner ecosystem (partner profiles, certifications)
6. Support center (knowledge base, ticket tracking)
7. Learning platform (courses, tutorials, interactive content)
8. Community forum (user-generated content, discussions)
9. Brand standards (visual guidelines, brand assets)

Requirements:
- **Multi-site management:** Single backend for 9 properties with shared user base
- **JSON:API access:** All content as structured JSON for frontend consumption
- **Content type flexibility:** Each domain has different content schemas (articles, videos, products, people, etc.)
- **Workflow support:** Editorial review, scheduling, versioning for some domains
- **Extensibility:** Custom content types without modifying core
- **Search integration:** Full-text and faceted search across domains
- **Localization ready:** Support for multi-language content (future requirement)
- **Export/migration:** Ability to extract content for archival or migration

Alternatives considered:
1. **Custom headless CMS:** Built-in flexibility but 6-12 month development cycle
2. **Contentful:** Good JSON:API, expensive at scale (9 spaces × cost per space)
3. **Strapi:** Simpler but limited multi-site capabilities
4. **Drupal:** Mature ecosystem, proven multi-site setup, JSON:API core module, free/open source

## Decision

Deploy **Drupal 10** (LTS release) as centralized CMS:

Architecture:
```
Drupal Multisite (single codebase, 9 site databases)
  ├─ Main Site (14 content types)
  ├─ Enterprise Portal (12 content types)
  ├─ Research Center (8 content types)
  ├─ API Docs (11 content types)
  ├─ Partner Ecosystem (9 content types)
  ├─ Support Center (7 content types)
  ├─ Learning Platform (13 content types)
  ├─ Community Forum (6 content types)
  └─ Brand Standards (5 content types)

Total: 13 core content types + 40 custom types
```

Content types implemented:
1. Article (title, body, author, tags, featured image)
2. BlogPost (title, excerpt, body, publish date, category)
3. Page (title, body, path, menu placement)
4. Video (title, YouTube/Vimeo URL, transcript, duration)
5. Product (name, description, pricing, features, image gallery)
6. Person (name, title, bio, profile image, social links)
7. WhitePaper (title, PDF, download count, category)
8. CaseStudy (title, company, challenge, solution, results)
9. FAQ (question, answer, category, related items)
10. APIEndpoint (path, method, parameters, response schema, example)
11. Course (title, lessons, duration, skill level, enrollment)
12. Certification (title, requirements, exam details, badge)
13. Resource (title, description, file/URL, resource type)

Integration architecture:
```
Drupal CMS (Port 8080)
  ├─ JSON:API (REST endpoints for all content types)
  ├─ User system (shared OAuth2 with Firebase)
  ├─ Media library (images, PDFs, videos)
  ├─ Search API (Elasticsearch integration)
  └─ Webhooks (trigger updates to frontend)

Consumers:
  ├─ heady-web (Next.js, consumes JSON:API)
  ├─ heady-api (Content service, caches JSON:API responses)
  ├─ heady-search (Elasticsearch indexer)
  └─ heady-ai (Semantic analysis of content)
```

Core modules enabled:
- **Core:** JSON:API, REST, Views, Entity, Field, Text, Media
- **Admin:** Admin UI, Toolbar, Admin Views
- **Search:** Search API, Elasticsearch Connector
- **Workflow:** Content Moderation (optional per site)
- **Performance:** Internal Page Cache, Dynamic Page Cache, Big Pipe
- **Security:** Role-Based Access Control (RBAC), Login Security, Automated Logout
- **Custom:** Heady Custom Module (content hooks, webhooks)

JSON:API endpoints:
```
GET /api/articles?filter[status]=published&include=author,tags
GET /api/articles/{id}
GET /api/blogs?sort=-publish_date&page[limit]=21
GET /api/products/{id}/related
GET /api/search?q=kubernetes&filter[type]=article&filter[domain]=docs
```

Content workflow:
```
Author creates draft
  ↓
Submission to moderation queue
  ↓
Editorial review (status: pending_review)
  ↓
Approved or rejected
  ↓
If approved: scheduled publish or immediate publish
  ↓
Content indexed in Elasticsearch
  ↓
Webhook triggers frontend cache invalidation
```

## Consequences

**Positive:**
- Single backend for 9 domains reduces operational overhead
- JSON:API is standardized, reduces custom API development
- Drupal community provides modules for common needs (search, cache, security)
- Multisite setup shares codebase but maintains independent content/users per domain
- RBAC supports different editorial teams per domain
- Content versioning and moderation built-in
- Drupal's hook system enables custom features without forking core
- Free/open source; no per-site licensing costs

**Negative:**
- Drupal has learning curve; PHP-based, may not align with JavaScript-primary team
- Performance tuning required for 9 sites simultaneously (caching, indexing)
- Upgrade path can be complex for heavily customized sites
- Multi-site setup adds operational complexity (9 databases to backup/monitor)
- JSON:API introduces network latency (consumers must make HTTP requests vs in-process function calls)
- Some simple queries inefficient with JSON:API (prevents client-side query optimization)

**Operational requirements:**
- **Hosting:** Kubernetes cluster with 3 Drupal pods, PostgreSQL, Elasticsearch, Redis
- **Backup:** Automated nightly DB + filesystem snapshots, 30-day retention, cross-region replica
- **Monitoring:** PHP-FPM metrics, database query time, JSON:API response latency
- **Updates:** Drupal security updates applied within 72 hours; module updates tested before production
- **Performance:** Cache warm-up on deployment; JSON:API responses cached in Redis (1 hour TTL)
- **Search:** Elasticsearch reindexing nightly; search latency target <500ms for 100K documents

**Content governance:**
- Domain admins manage site-specific settings, roles, permissions
- Central admin manages core Drupal updates, modules, infrastructure
- Editorial teams receive training on content moderation workflow
- Content migration: CSV import tools provided for bulk migration from old systems

## Related Decisions
- [ADR 006: Firebase Auth with Cross-Domain Relay](./006-firebase-auth.md)
