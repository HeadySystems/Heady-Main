# Notification Service - Build Notes

## Overview
Real-time notification service with WebSocket + SSE + in-app delivery for the Heady™ platform.

## Files Created

```
services/notification-service/
├── package.json              # Dependencies and scripts
├── Dockerfile                # Multi-stage build, non-root, node:20-alpine
├── .dockerignore             # Docker build optimization
└── src/
    ├── index.js              # Express + WebSocket server (452 lines)
    ├── notification-store.js # In-memory store with LRU eviction (152 lines)
    └── channels.js           # Channel abstraction layer (320 lines)
```

## Key Features

### φ (Phi) Constants & Fibonacci Numbers
- **HEARTBEAT_INTERVAL_MS**: 21,000ms (fib(8) = 21)
- **MAX_NOTIFICATIONS_PER_USER**: 144 (fib(12))
- **DEFAULT_LIMIT**: 233 (fib(13))
- All hardcoded per requirements

### HTTP Endpoints
- `GET /_heady/health` - Health check with stats
- `POST /notify` - Send notifications to users
- `GET /notifications/:userId` - Retrieve recent notifications
- `PATCH /notifications/:id/read` - Mark as read
- `GET /stream/:userId` - SSE endpoint for real-time updates

### WebSocket Server (/ws)
- Token authentication on connection (query string)
- **Token re-validation on EVERY message** (critical security feature)
- Heartbeat ping every 21,000ms
- Auto-reconnect suggestion in close frames
- Auto-cleanup on connection close

### Notification Store
- In-memory storage per userId
- LRU eviction at 144 notifications per user
- Automatic cleanup of notifications older than 7 days
- Unread count tracking

### Channel Manager
- **WebSocketChannel**: Manages ws connections per userId
- **SSEChannel**: Manages SSE response streams per userId
- **NotificationChannelManager**: Unified interface for all channels
- Multi-channel delivery (sends to all active connections)

### Error Handling
- Comprehensive try-catch blocks
- Structured logging with Pino
- Graceful SIGTERM/SIGINT shutdown
- Production-ready validation

### Docker
- Multi-stage build (builder + runtime)
- node:20-alpine base image
- Non-root user (nodejs:1001)
- Health check endpoint
- Proper signal handling with dumb-init
- Expected size: <100MB

## Port
Service runs on port 3394 (configurable via PORT env var)

## Environment Variables
- `PORT` (default: 3394)
- `NODE_ENV` (default: production)
- `LOG_LEVEL` (default: info in prod, debug in dev)
- `CORS_ORIGIN` (default: *)

## Scripts
- `npm start` - Production mode
- `npm run dev` - Development mode with logging

## Security Features
1. Helmet security headers on all HTTP endpoints
2. CORS support with configurable origin
3. Token validation on WS connection
4. **Token re-validation on every WS message** (prevents expired token misuse)
5. Immediate rejection of invalid/expired tokens
6. Rate limiting can be added via middleware

## Performance
- In-memory store (can be replaced with Redis)
- Efficient LRU eviction strategy
- Heartbeat at optimal φ-scaled intervals
- Non-blocking I/O throughout

## Production Readiness
✓ No TODO or FIXME comments
✓ No stub implementations
✓ Comprehensive error handling
✓ Structured logging
✓ Graceful shutdown
✓ Health checks
✓ Security headers
✓ Multi-stage Docker build
✓ Non-root Docker user
✓ Signal handling
