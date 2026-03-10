---
name: heady-drupal-content-sync
description: Orchestrates content synchronization between Drupal CMS and external sources (Firebase, spreadsheets, APIs, staging/production environments) for the Heady platform. Use when the user asks to sync content, import/export nodes, migrate data between environments, bulk-update Drupal entities, or connect an external data source to Drupal. Triggers on phrases like "sync content to Drupal", "import products to Drupal", "migrate from staging", "bulk update nodes", "push content from Firebase", or "export Drupal content".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: cms-integration
---

# Heady Drupal Content Sync

## When to Use This Skill

Use this skill when the user asks to:

- Synchronize product or article content from external sources into Drupal
- Export Drupal node data to Firebase, CSV, or external APIs
- Migrate content between Drupal environments (local → staging → production)
- Perform bulk operations on Drupal entities (create, update, delete)
- Set up automated content feeds from external data sources
- Resolve content conflicts between environments
- Audit content parity between source and destination

## Architecture Overview

The Heady Drupal content sync operates via three primary channels:

1. **Drupal JSON:API** — RESTful access to all Drupal entity types; preferred for programmatic reads and writes
2. **Migrate API** — Drupal's built-in migration framework for bulk historical imports
3. **Drush commands** — CLI batch processing for large-scale operations
4. **Firebase Sync Bridge** — custom webhook/listener pattern bridging Firestore document changes to Drupal

## Environment Map

| Environment | Base URL | Auth Method |
|---|---|---|
| Local | http://drupal.internal | Basic Auth / Session |
| Staging | https://staging.headyconnection.org | OAuth2 Bearer |
| Production | https://headyconnection.org | OAuth2 Bearer (limited write scope) |

## Instructions

### 1. Pre-Sync Audit

Before any sync operation:
1. Identify the source and destination (e.g., "Google Sheet → Drupal products", "Staging → Production nodes").
2. Confirm the entity type and bundle: `node/product`, `node/article`, `taxonomy_term/tags`, `media/image`.
3. Establish field mapping: source field → Drupal machine name (e.g., `product_name` → `field_product_title`).
4. Count records in source; verify no duplicates on unique key (SKU, UUID, or external ID).
5. Back up the destination database or export a snapshot before writing.

### 2. JSON:API Operations

**Authentication:**
```bash
# Get OAuth2 token
curl -X POST https://headyconnection.org/oauth/token \
  -d "grant_type=password&username=USER&password=PASS&client_id=CLIENT&client_secret=SECRET"
```

**Read nodes (GET):**
```
GET /jsonapi/node/product?filter[field_sku][value]=SKU123
Authorization: Bearer {token}
```

**Create node (POST):**
```json
POST /jsonapi/node/product
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "node--product",
    "attributes": {
      "title": "Artist Rig by Banjo",
      "field_sku": "BNJ-001",
      "field_price": {"value": 450.00, "currency_code": "USD"},
      "body": {"value": "Description here...", "format": "basic_html"},
      "status": true
    }
  }
}
```

**Update node (PATCH):**
```
PATCH /jsonapi/node/product/{uuid}
```

**Delete node (DELETE):**
```
DELETE /jsonapi/node/product/{uuid}
```

### 3. Bulk Import via Migrate API

For imports of 100+ records:

1. Define source plugin (CSV, JSON, SQL, or custom).
2. Define process plugin pipeline for field transformation.
3. Define destination plugin (Drupal entity type).

**Example migration YAML (products from CSV):**
```yaml
id: heady_product_import
label: 'Import Heady Products from CSV'
source:
  plugin: csv
  path: 'public://imports/products.csv'
  ids: [sku]
  fields:
    - { name: sku }
    - { name: title }
    - { name: price }
    - { name: description }
process:
  title: title
  field_sku: sku
  'field_price/value': price
  'body/value': description
  'body/format':
    plugin: default_value
    default_value: basic_html
destination:
  plugin: 'entity:node'
  default_bundle: product
```

**Run migration:**
```bash
drush migrate:import heady_product_import --update
drush migrate:status heady_product_import
```

### 4. Firebase → Drupal Sync

For real-time Firestore-to-Drupal synchronization:

1. **Cloud Function Trigger**: Set up a Firestore `onWrite` trigger for the target collection.
2. **Payload Transform**: Map Firestore document fields to Drupal JSON:API structure.
3. **Drupal Webhook Endpoint**: POST to a custom Drupal route (`/heady/sync/product`) protected by HMAC signature.
4. **Idempotency**: Check for existing node by `field_external_id` before create; PATCH if exists, POST if not.
5. **Error Queue**: Failed syncs written to `heady_sync_errors` Firestore collection for retry.

```javascript
// Cloud Function example
exports.syncProductToDrupal = functions.firestore
  .document('products/{productId}')
  .onWrite(async (change, context) => {
    const product = change.after.data();
    const payload = mapFirestoreToDrupal(product);
    await pushToDrupal(payload, context.params.productId);
  });
```

### 5. Staging → Production Promotion

Using Drupal's Content Sync module or Config Split:

```bash
# Export config from staging
drush cex --destination=/tmp/config-staging

# On production: import after review
drush cim --source=/tmp/config-staging --preview

# Content (not config): use UUID-based JSON:API diff tool
drush heady:content-diff --env=staging --bundle=product --since=2026-01-01
```

### 6. Conflict Resolution

When source and destination have diverged:
1. Compare by `changed` timestamp: newer record wins by default.
2. For manual overrides: flag conflict records in a review CSV.
3. Prompt user to choose: **source wins** | **destination wins** | **merge** | **skip**.
4. Log all resolved conflicts with before/after values.

### 7. Sync Verification

After any sync operation:
1. Count records in destination; compare to source count.
2. Spot-check 5 random records: verify all mapped fields are correctly populated.
3. Check for broken media references (images, files).
4. Validate URL aliases were generated.
5. Run `drush cr` to clear caches; verify content appears on site.
6. Output sync report: records created, updated, skipped, failed.

## Error Codes

| Code | Meaning | Response |
|---|---|---|
| 403 | Auth failed | Refresh OAuth token |
| 422 | Validation error | Check required fields; review field format |
| 409 | Conflict | Apply conflict resolution policy |
| 500 | Server error | Check Drupal watchdog (`drush wd-show`); retry after fix |

## Output Report Format

```
Sync completed: [timestamp]
Source: [description]
Destination: [environment/entity]
Records processed: N
  Created: N
  Updated: N
  Skipped: N
  Failed: N
Errors: [list or "none"]
Verification: PASSED / FAILED
```
