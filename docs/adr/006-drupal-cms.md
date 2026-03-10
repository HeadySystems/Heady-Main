# ADR-006: Drupal for Content Management

## Status

Accepted

## Date

2024-09-21

## Context

The Heady™ platform operates 9 sites, each serving different user segments and content needs:

- **headysystems.com**: Corporate site — products, pricing, case studies
- **headyme.com**: Personal AI assistant portal
- **headyfinance.com**: Financial intelligence and analysis
- **headyos.com**: Operating system documentation and downloads
- **headyex.com**: Exchange and marketplace
- **headyconnection.com**: Community and networking (commercial)
- **headyconnection.org**: Community and networking (non-profit/open-source)
- **heady-ai**: AI research and model documentation
- **admin**: Internal administration dashboard

Content management requirements:
- Multi-site content management from a single CMS instance
- Structured content types (articles, documentation, product pages, case studies)
- Content API for headless delivery to static site generators
- Role-based access control for content editors
- Content revision history and editorial workflow
- Taxonomy and tagging for cross-site content relationships
- Multilingual support (future requirement)
- Integration with the platform's pgvector database for AI-enhanced content search

We evaluated:

1. **WordPress**: Most popular CMS, PHP-based, extensive plugin ecosystem
2. **Strapi**: Headless CMS, Node.js-based, API-first
3. **Contentful**: Managed headless CMS SaaS
4. **Drupal**: Enterprise CMS, PHP-based, powerful content modeling and multi-site

## Decision

We use Drupal 10 as the content management system for all 9 sites, deployed as a Docker container connected to the heady-mesh network.

Configuration:
- Image: `drupal:10`
- Port: 8080 (local development)
- Database: PostgreSQL (shared instance, separate `heady_drupal` database)
- Custom modules: mounted from `drupal-config/web/modules/custom`
- Network: heady-mesh (same as all 58 services)

Drupal provides content to sites via:
1. JSON:API module (core in Drupal 10) for headless content delivery
2. Custom REST endpoints for AI-enhanced content queries
3. Webhook integration with notification-service for content change events

Content architecture:
- Each of the 9 sites has a dedicated Drupal "site" configuration
- Shared taxonomy vocabularies enable cross-site content relationships
- Content types are defined per-site with shared base fields
- Editorial workflow uses Drupal's Content Moderation module

## Consequences

### Benefits
- Enterprise-grade content modeling: Drupal's entity/field system is the most powerful in any CMS
- Multi-site native: Drupal supports multiple sites from a single codebase
- JSON:API built-in: Drupal 10 ships with JSON:API for headless content delivery
- Extensible: custom modules in PHP can integrate with the platform's services
- Security track record: Drupal's security team is among the most responsive in open source
- Content moderation: built-in editorial workflow without plugins
- Established ecosystem: thousands of contributed modules for SEO, media, accessibility

### Costs
- PHP runtime: adds a different language/runtime to the otherwise Node.js platform
- Resource overhead: Drupal is heavier than headless-only alternatives
- Learning curve: Drupal's architecture is complex compared to simpler CMS options
- Database usage: requires its own database schema alongside the vector database

### Mitigations
- Drupal runs as a Docker container with the same lifecycle as all other services
- Content delivery is API-first: sites consume JSON:API, not Drupal's rendered HTML
- The drupal-config directory contains all custom module code, version-controlled
- Separate database (`heady_drupal`) prevents schema conflicts with heady_vector
- Drupal's caching layer (page cache, dynamic page cache) minimizes resource overhead
