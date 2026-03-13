<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: docs/guides/SERVICE_INTEGRATION.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady Service Integration

## Core Services
```mermaid
graph TB
    subgraph "Client Applications"
        A[HeadyBuddy Mobile]
        B[HeadyBrowser Extension]
        C[HeadyIDE Plugin]
        D[HeadyManager Dashboard]
    end
    
    subgraph "API Gateway"
        E[Load Balancer<br/>nginx/HAProxy<br/>Rate: 10k req/s]
        F[Auth Service<br/>OAuth2/JWT<br/>Token TTL: 1h]
        G[Rate Limiter<br/>Redis-based<br/>100 req/min/key]
        H[API Versioning<br/>v1/v2 Support]
    end
    
    subgraph "Core Services"
        I[Sync Service<br/>Real-time WebSocket<br/>Max Connections: 50k]
        J[HeadyAI Processing<br/>ML Pipeline<br/>GPU-accelerated]
        K[Analytics Engine<br/>Event Stream<br/>Real-time Aggregation]
        L[Notification Service<br/>Push/Email/SMS<br/>Multi-channel]
        M[Monte Carlo Planner<br/>Simulation Engine<br/>10k iterations/s]
    end
    
    subgraph "Data Layer"
        N[(User Database<br/>PostgreSQL<br/>Primary + Replicas)]
        O[(Session Store<br/>Redis<br/>TTL: 24h)]
        P[Cache Layer<br/>Redis/Memcached<br/>5min TTL]
        Q[File Storage<br/>S3/MinIO<br/>CDN-backed]
        R[(Metrics DB<br/>InfluxDB<br/>30-day Retention)]
    end
    
    subgraph "Message Queue"
        S[Event Bus<br/>RabbitMQ/Kafka<br/>Partitioned Topics]
    end
    
    subgraph "Monitoring & Observability"
        T[Logging<br/>ELK Stack<br/>Centralized Logs]
        U[Metrics<br/>Prometheus<br/>15s Scrape Interval]
        V[Tracing<br/>Jaeger<br/>Distributed Tracing]
        W[Alerting<br/>PagerDuty/Slack<br/>SLA Monitoring]
    end
    
    subgraph "Security & Compliance"
        X[WAF<br/>ModSecurity<br/>OWASP Rules]
        Y[Secrets Manager<br/>Vault/AWS Secrets<br/>Auto-rotation]
        Z[Audit Logger<br/>Immutable Logs<br/>Compliance Trail]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    E --> X
    X --> F
    F --> Y
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> M
    I --> N
    I --> O
    I --> P
    I --> S
    J --> N
    J --> Q
    J --> S
    K --> N
    K --> R
    K --> S
    M --> N
    M --> S
    S --> L
    L --> A
    L --> B
    L --> C
    L --> D
    
    F -.-> Z
    I -.-> Z
    J -.-> Z
    M -.-> Z
    
    classDef clientApp fill:#e1f5ff,stroke:#0066cc,stroke-width:2px
    classDef aiService fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    classDef dataStore fill:#f0f0f0,stroke:#666,stroke-width:2px
    classDef messaging fill:#ffe1f5,stroke:#cc0066,stroke-width:2px
    classDef monitoring fill:#e1ffe1,stroke:#00cc66,stroke-width:2px
    classDef alert fill:#ffe1e1,stroke:#cc0000,stroke-width:2px
    classDef security fill:#fff9e1,stroke:#ccaa00,stroke-width:2px
    
    class A,B,C,D clientApp
    class J,M aiService
    class N,O,P,Q,R dataStore
    class S messaging
    class T,U,V monitoring
    class W alert
    class X,Y,Z security
```

## Service Level Objectives (SLOs)

| Service | Availability | Latency (p95) | Throughput |
|---------|-------------|---------------|------------|
| Sync Service | 99.95% | < 100ms | 50k concurrent |
| HeadyAI Processing | 99.9% | < 500ms | 1k req/s |
| Monte Carlo Planner | 99.9% | < 2s | 100 req/s |
| Analytics Engine | 99.95% | < 200ms | 5k events/s |
| Notification Service | 99.5% | < 1s | 10k msg/s |

## Data Flow Patterns

### 1. Real-time Sync Flow
```
Client → WebSocket → Sync Service → Event Bus → [AI Processing, Analytics, Storage]
```

### 2. AI Processing Pipeline
```
Request → Queue → GPU Workers → Model Inference → Result Cache → Response
```

### 3. Analytics Aggregation
```
Events → Stream Processor → Time-series DB → Dashboard/Alerts
```

### 4. Client-to-Service Flow
```
HeadyBuddy ──┐
HeadyBrowser ─┼──→ Sync Service ──→ HeadyAI Processing ──→ Data Storage
HeadyIDE ─────┘
```

## Integration Points

### Authentication
All clients authenticate through the central auth service using JWT tokens:
- Token TTL: 1 hour with refresh
- API keys for service-to-service calls (timing-safe validation)
- Rate limiting: 100 requests/min/key via Redis

### Data Sync
Real-time synchronization via WebSocket:
- Max concurrent connections: 50k
- Event bus: partitioned topics for scalability
- Cross-device state sync for HeadyBuddy

### AI Processing
Unified API endpoint for all AI workloads:
- GPU-accelerated model inference
- Result caching for repeated queries
- Circuit breakers on external API calls (Claude, etc.)

### Direct Routing Protocol
Internal service-to-service calls use direct routing (no proxy):
- Use `@heady/networking` client with `proxy: false`
- Minimizes latency for Supervisor-to-Agent communication
- External calls go through circuit breakers with retry + backoff

## Monitoring & Observability

| Layer | Tool | Configuration |
|-------|------|---------------|
| Logging | Structured JSON | All services emit structured logs |
| Metrics | Prometheus-compatible | 15s scrape interval |
| Tracing | Distributed tracing | Correlation IDs across services |
| Alerting | Slack/PagerDuty | SLA breach notifications |

## Configuration

Service connections are defined in `configs/service-catalog.yaml`. Each service registers:
- Endpoint URL and health check path
- SLO targets (availability, latency, throughput)
- Circuit breaker thresholds
- Rate limit policies
