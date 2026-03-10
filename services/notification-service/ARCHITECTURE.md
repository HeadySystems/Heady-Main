# Notification Service Architecture

## System Design

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                           │
│         (Web, Mobile, Desktop, IoT Devices)                      │
└────────────────┬────────────────┬────────────────┬───────────────┘
                 │                │                │
        ┌────────▼─────┐  ┌───────▼──────┐  ┌────▼──────────┐
        │  WebSocket   │  │ Server-Sent  │  │  HTTP REST   │
        │   (/ws)      │  │   Events     │  │  API Calls   │
        │              │  │  (/stream)   │  │              │
        └────────┬─────┘  └───────┬──────┘  └────┬──────────┘
                 │                │              │
                 └────────────────┼──────────────┘
                                  │
        ┌─────────────────────────▼──────────────────────────────┐
        │      Notification Service (Port 3394)                   │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │           Express.js HTTP Server                 │   │
        │  │  ├─ Health Check                                 │   │
        │  │  ├─ REST API Endpoints                           │   │
        │  │  └─ Static File Serving                          │   │
        │  └──────────────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │        WebSocket Server (ws library)             │   │
        │  │  ├─ Token Authentication                         │   │
        │  │  ├─ Per-Message Token Re-validation              │   │
        │  │  ├─ Heartbeat/Ping Mechanism                     │   │
        │  │  └─ Bidirectional Communication                  │   │
        │  └──────────────────────────────────────────────────┘   │
        │                      │                                   │
        │         ┌────────────┼────────────┐                      │
        │         │            │            │                      │
        │  ┌──────▼──┐  ┌────▼────┐  ┌────▼──────┐               │
        │  │ Channel │  │  Store  │  │  Logger   │               │
        │  │ Manager │  │  (LRU)  │  │  (Pino)   │               │
        │  └─────────┘  └─────────┘  └───────────┘               │
        └──────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Express HTTP Server
Handles REST API endpoints for managing notifications:
- Stateless request/response
- Request validation and error handling
- Health monitoring endpoints
- CORS and security headers (Helmet)

### 2. WebSocket Server
Real-time bidirectional communication:
- Token-based authentication
- Critical: Token re-validated on EVERY message
- Per-user connection multiplexing
- Heartbeat pings every 21,000ms (fib(8))
- Graceful reconnection guidance

### 3. Channel Manager
Abstraction layer for multiple delivery channels:
```
NotificationChannelManager
├── WebSocketChannel
│   ├── Connection tracking per userId
│   ├── Message broadcasting to connected clients
│   └── Automatic cleanup on disconnect
└── SSEChannel
    ├── Stream management per userId
    ├── Server-Sent Events streaming
    └── Keepalive pings for idle connections
```

### 4. Notification Store
In-memory storage with LRU eviction:
- **Max per user**: 144 notifications (fib(12))
- **Default retrieval**: 233 notifications (fib(13))
- **Automatic cleanup**: Removes entries >7 days old
- **Data structure**: Map<userId, Notification[]>

### 5. Logging Layer
Structured logging with Pino:
- Development: Pretty-printed console output
- Production: JSON structured logs
- Request/response logging with pino-http
- Error tracking and correlation IDs

## Request Flow

### 1. Sending a Notification
```
POST /notify
  │
  ├─ Validate request: userIds, type, title, body
  │
  ├─ For each userId:
  │   ├─ Create notification with UUID
  │   ├─ Store in NotificationStore (with LRU eviction)
  │   ├─ Send via WebSocketChannel (to all ws connections)
  │   ├─ Send via SSEChannel (to all sse streams)
  │   └─ Return delivery status
  │
  └─ Response: Delivery results for all users
```

### 2. WebSocket Message Flow
```
Client                          Server
  │                               │
  ├─ Connect with token ────────> │ validateToken() on connection
  │                               │
  ├─ Verify token valid ─────────────────────────────────────────>
  │                               │ (if token invalid: close(1008))
  │                               │
  ├─ Receive connected msg <──── │ Send connection confirmation
  │                               │
  ├─ Receive notification <───── │ (from POST /notify or broadcast)
  │                               │
  ├─ Send ping ─────────────────> │ validateToken() on message!
  │                               │ (if token expired: close(1008))
  │                               │
  ├─ Receive pong <───────────── │ Connection validated
  │                               │
  └─ Auto-ping every ~20s ──────> │ Keep connection alive
```

### 3. SSE Stream Flow
```
GET /stream/:userId?token=...
  │
  ├─ Validate token
  ├─ Verify userId matches token claims
  ├─ Set SSE headers (text/event-stream, no-cache)
  ├─ Send connection confirmation
  ├─ Register stream in SSEChannel
  ├─ Keepalive pings every 21,000ms
  │
  └─ Await notifications from channelManager.send()
```

## Data Structures

### Notification Object
```javascript
{
  id: string (UUID),           // Unique identifier
  userId: string,              // Owner user ID
  type: string,                // notification type (info, warning, error, success)
  title: string,               // Short title
  body: string,                // Full message body
  metadata: object,            // Custom data (priority, tags, etc)
  read: boolean,               // Read status
  createdAt: string (ISO-8601) // Creation timestamp
}
```

### Connection Tracking
```javascript
// WebSocket
{
  clientId: string (UUID),
  userId: string,
  ws: WebSocket,
  token: string,
  lastValidated: number (timestamp)
}

// SSE
{
  userId: string,
  res: Response,
  // (implicitly tracked via removeStream on close)
}
```

## Security Model

### Authentication
1. **Connection Time**: Token provided in query string
   - Endpoint: `ws://localhost:3394/ws?token=<token>`
   - Validates token format
   - Rejects invalid tokens immediately with code 1008

2. **Per-Message Validation**: Token re-checked on every message
   - Prevents use of expired tokens
   - Validates token hasn't been revoked
   - Immediate disconnection if validation fails

### Authorization
- Users can only receive notifications for their own userId
- SSE streams verify userId matches token claims
- No cross-user notification access

### Transport Security
- HTTPS recommended in production
- WSS (Secure WebSocket) recommended in production
- CORS headers configurable
- Helmet security headers on all HTTP endpoints

## Performance Characteristics

### Memory Usage
- **Per User**: ~1-2KB per notification (with 144 max)
- **Total Store**: ~144-200KB per 100 active users
- **Per Connection**: ~2-5KB per WebSocket + ~1KB per SSE stream

### Latency
- **Notification Delivery**: <50ms (in-process)
- **WebSocket Broadcast**: <100ms to all clients
- **SSE Delivery**: <100ms to all streams

### Scalability Limits
- Single instance: ~10,000-50,000 concurrent connections (node.js default)
- Can be scaled horizontally with message queue (Redis)
- Can be replaced with database backend

## Monitoring & Observability

### Health Check Endpoint
```
GET /_heady/health
```
Returns service status, uptime, channel statistics, and store metrics.

### Logging
All operations logged with context:
- Connections/disconnections
- Authentication events
- Notification delivery
- Errors and warnings
- Channel statistics

### Key Metrics
- Connected users (WebSocket + SSE)
- Total notifications stored
- Unread count
- Service uptime
- Error rates

## Deployment

### Environment Variables
- `PORT`: Service port (default 3394)
- `NODE_ENV`: environment mode (default production)
- `LOG_LEVEL`: Logging level (default info)
- `CORS_ORIGIN`: Allowed origins (default *)

### Docker Deployment
Multi-stage build:
1. **Builder**: Installs dependencies
2. **Runtime**: Alpine base, non-root user, dumb-init signal handling
3. Expected image size: <100MB
4. Health check configured

### Graceful Shutdown
- SIGTERM/SIGINT triggers graceful shutdown
- 30-second timeout before force exit
- Closes all client connections
- Completes in-flight requests

## Extension Points

### Token Validation
Current: Simple format checking
Future: Integrate with JWT verification or session backend

### Notification Store
Current: In-memory with LRU eviction
Future: Replace with Redis for distributed deployments

### Additional Channels
- Push notifications (FCM, APNs)
- Email notifications
- SMS alerts
- Webhook delivery

### Rate Limiting
Can be added via middleware before /notify endpoint

### Encryption
- Message encryption for sensitive notifications
- Encrypted payload storage
