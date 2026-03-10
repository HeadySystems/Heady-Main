# ADR 007: Microservice Architecture (50+ Services)

**Status:** Accepted

## Context

Heady performs AI inference, semantic search, content orchestration, and multi-domain operations. Early monolithic designs faced challenges:
- **Scaling inference:** AI model loading/inference blocked HTTP request handlers
- **Resource contention:** ML workloads compete with I/O-bound operations for CPU/memory
- **Deployment coupling:** Bug in recommendation engine blocked deployments of authentication service
- **Observability:** Monolith logs mix 20 concerns; debugging slow requests is difficult

Requirements emerging:
- **Independent scaling:** Inference service scales to 13 instances while auth service runs on 1
- **Technology diversity:** Some services need Python (ML models), others Node.js (HTTP handlers), others Go (performance-critical parsers)
- **Fault isolation:** Database connection pool exhaustion in one service doesn't crash others
- **Concurrent development:** 20+ teams working simultaneously without merge conflicts in shared codebase

## Decision

Adopt **Domain-Driven Microservices** architecture with 50+ services on distinct ports (3310-3396):

Core service groupings:

**1. Authentication & Authorization (Ports 3310-3315)**
- `auth-service` (3310): Firebase integration, JWT validation, session management
- `authorization-service` (3311): RBAC, ACL evaluation, permission checks
- `session-manager` (3312): Session lifecycle, expiry, renewal
- `mfa-service` (3313): Multi-factor authentication (TOTP, SMS, WebAuthn)
- `audit-logger` (3314): Authentication audit trail, compliance logging

**2. Inference & AI (Ports 3316-3330)**
- `heady-brain` (3316): Core inference service, model serving, embeddings
- `model-gateway` (3317): Model router, version management, A/B testing
- `embeddings-service` (3318): Text-to-embedding transformations, caching
- `semantic-search` (3319): Vector similarity queries, ranking
- `reranker-service` (3320): Cross-encoder reranking, relevance scoring
- `classification-service` (3321): Text classification, intent detection
- `entity-extraction` (3322): NER (Named Entity Recognition)
- `summarization-service` (3323): Document summarization, abstractive summaries
- `translation-service` (3324): Multi-language translation
- `content-cache` (3325): Inference result caching, invalidation
- `model-monitor` (3326): Model latency, accuracy, drift detection

**3. Vector Storage & Indexing (Ports 3331-3335)**
- `pgvector-pool` (3331): Connection pooling, query optimization
- `embedding-indexer` (3332): Batch embedding import, HNSW index maintenance
- `vector-cleanup` (3333): Stale embedding deletion, vacuuming, reindexing
- `similarity-search-cache` (3334): Cache popular search results
- `vector-backup` (3335): Backup creation, restoration, replication monitoring

**4. Content & CMS (Ports 3336-3345)**
- `drupal-relay` (3336): Drupal JSON:API proxy, caching
- `content-service` (3337): Content retrieval, versioning, scheduling
- `media-service` (3338): Image resizing, video transcoding, CDN coordination
- `tag-service` (3339): Tagging, taxonomy management, faceted search
- `workflow-service` (3340): Editorial workflow, approvals, scheduling
- `asset-manager` (3341): File upload, virus scanning, S3 coordination
- `seo-service` (3342): SEO metadata generation, sitemap management

**5. Search & Discovery (Ports 3346-3350)**
- `elasticsearch-proxy` (3346): Elasticsearch query builder, caching
- `search-indexer` (3347): Full-text indexing, update pipeline
- `facet-aggregator` (3348): Faceted search aggregation
- `autocomplete-service` (3349): Search suggestion, prefix matching
- `analytics-search` (3350): Search analytics, trending queries

**6. User & Data (Ports 3351-3360)**
- `user-service` (3351): User profiles, preferences, settings
- `profile-service` (3352): Profile enrichment, activity tracking
- `recommendation-engine` (3353): Personalized recommendations
- `social-service` (3354): Follows, favorites, sharing
- `notification-service` (3355): Email, SMS, push notifications
- `analytics-service` (3356): User analytics, event tracking
- `export-service` (3357): Data export, report generation
- `privacy-service` (3358): GDPR/privacy data deletion, anonymization

**7. Infrastructure & Operations (Ports 3361-3375)**
- `api-gateway` (3361): Request routing, rate limiting, logging
- `service-registry` (3362): Service discovery, health checks
- `config-server` (3363): Centralized configuration management
- `logging-service` (3364): Log aggregation, filtering
- `metrics-service` (3365): Prometheus metrics collection
- `tracing-service` (3366): Distributed tracing (OpenTelemetry)
- `cache-manager` (3367): Redis cache management, invalidation
- `queue-service` (3368): Message queue (RabbitMQ/Kafka), task scheduling
- `scheduler-service` (3369): Cron jobs, recurring tasks
- `billing-service` (3370): Usage tracking, billing calculations
- `health-monitor` (3371): Service health, SLA tracking
- `deployment-service` (3372): Continuous deployment, rollback
- `backup-service` (3373): Database/file backups, replication

**8. Domain-Specific Services (Ports 3376-3396)**
- `blog-orchestrator` (3376): Blog domain orchestration
- `docs-orchestrator` (3377): Documentation domain orchestration
- `forum-orchestrator` (3378): Community forum domain orchestration
- `ecommerce-orchestrator` (3379): Product catalog domain orchestration
- [Additional domain orchestrators for remaining 5 domains] (3380-3385)

Service boundaries (Domain-Driven Design):

Each service owns:
- **Data:** Service-specific database or schema (no shared databases)
- **API:** REST/gRPC endpoints, Zod schema validation
- **Configuration:** Service-specific environment variables (no shared config)
- **Deployment:** Independent Docker image, Kubernetes deployment, rolling updates

Inter-service communication:
- **Synchronous:** REST (HTTP) or gRPC for request-response
- **Asynchronous:** Message queue (RabbitMQ) for event-driven workflows
- **Service discovery:** Kubernetes DNS (service-name.namespace.svc.cluster.local)

Example workflow (User search → Results):
```
api-gateway (3361)
  ↓ POST /search?q=kubernetes
search-indexer (3346) [Elasticsearch]
  ↓ Query results (top 100)
semantic-search (3319) [Vector similarity reranking]
  ↓ Reranked results
heady-brain (3316) [Optional: confidence scoring]
  ↓ Final results with scores
user-service (3351) [Personalization]
  ↓ Personalized ranking
response → client
```

Deployment model:
```yaml
# Kubernetes deployment per service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: heady-brain
  namespace: heady-services
spec:
  replicas: 13  # FIB[7]
  selector:
    matchLabels:
      app: heady-brain
  template:
    spec:
      containers:
      - name: heady-brain
        image: heady/heady-brain:latest
        ports:
        - containerPort: 3316
        env:
        - name: REDIS_HOST
          value: redis.heady-services.svc.cluster.local
        - name: PGVECTOR_POOL_PORT
          value: "3331"
        livenessProbe:
          httpGet:
            path: /health
            port: 3316
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3316
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Consequences

**Positive:**
- **Independent scaling:** heady-brain scales to 13 instances; auth-service stays at 1
- **Technology diversity:** Python services use FastAPI; Node.js services use Express; Go services use Gin
- **Fault isolation:** Database connection pool exhaustion in user-service doesn't affect search-service
- **Fast deployments:** Deploying search-indexer doesn't require testing entire monolith
- **Team autonomy:** Content team owns drupal-relay and content-service; AI team owns heady-brain
- **Observability:** Each service has distinct logs, metrics, traces (easier debugging)

**Negative:**
- **Operational complexity:** 50+ services to deploy, monitor, and maintain
- **Distributed debugging:** Request spans 5+ services; debugging slow responses requires tracing
- **Network latency:** Inter-service calls add ~5-20ms per hop (monolith was in-process)
- **Eventual consistency:** Distributed transactions are complex; database consistency is eventual, not strong
- **Service discovery complexity:** Service port mapping (3310-3396) must be documented and enforced
- **Cascading failures:** If service-registry crashes, service discovery fails for all consumers

**Operational requirements:**
- **Service registry:** Kubernetes service discovery (built-in) or Consul
- **API gateway:** Reverse proxy (nginx/Envoy) at port 80/443, routes requests to services
- **Health checks:** Every service implements `/health` and `/ready` endpoints
- **Monitoring:** Prometheus metrics from each service, Grafana dashboards per service
- **Logging:** Structured JSON logs to ELK stack; correlation IDs propagate across services
- **Tracing:** OpenTelemetry instrumentation; trace requests end-to-end
- **Rate limiting:** Per-service and per-user rate limits in api-gateway
- **Circuit breakers:** Service-to-service calls use circuit breaker pattern (Polly, resilience4j)

**Development workflow:**
- Service template provided (Dockerfile, package.json, tsconfig, health check)
- Development: run services locally with docker-compose or Tilt
- Testing: unit tests per service; integration tests via test containers
- Pull requests: CI runs tests + linting + security scanning per changed service
- Deployment: git push triggers CI/CD; ArgoCD applies Kubernetes manifests

## Related Decisions
- [ADR 001: Phi-Scaled Architecture](./001-phi-scaled-architecture.md)
- [ADR 002: Concurrent Equals](./002-concurrent-equals.md)
- [ADR 004: pgvector Over Pinecone](./004-pgvector-over-pinecone.md)
