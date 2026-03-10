# Notification Service - Code Highlights

## Key Implementation Details

### 1. Fibonacci Constants (notification-store.js)
```javascript
// φ (Phi) constants - golden ratio
const PHI = 1.618033988749895;
const PSI = 1 / PHI;

// Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233...
// fib(12) = 144 (max notifications per user)
const MAX_NOTIFICATIONS_PER_USER = 144;
```

### 2. LRU Eviction (notification-store.js)
```javascript
add(userId, notification) {
  const userNotifications = this.notifications.get(userId);
  userNotifications.unshift(fullNotification);
  this.notificationById.set(notification.id, fullNotification);

  // LRU eviction when exceeding max notifications per user
  if (userNotifications.length > MAX_NOTIFICATIONS_PER_USER) {
    const removed = userNotifications.pop();
    this.notificationById.delete(removed.id);
  }

  return fullNotification;
}
```

### 3. Token Re-validation on Every Message (index.js)
```javascript
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);

    // Re-validate token on every message (critical security requirement)
    const revalidation = validateToken(connectionData.token);
    if (!revalidation || !revalidation.valid) {
      logger.warn({ clientId, userId }, 'Token validation failed on message');
      ws.close(1008, 'Authentication token expired or invalid');
      return;
    }

    connectionData.lastValidated = Date.now();
    // ... handle message
  } catch (err) {
    logger.warn({ err, clientId }, 'Error processing WebSocket message');
  }
});
```

### 4. Heartbeat Ping (index.js)
```javascript
// Heartbeat/ping: fib(8)*1000 = 21,000ms
const HEARTBEAT_INTERVAL_MS = 21000;

const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping(JSON.stringify({ timestamp: Date.now() }));
  }
}, HEARTBEAT_INTERVAL_MS);
```

### 5. Channel Manager Pattern (channels.js)
```javascript
class NotificationChannelManager {
  constructor(logger) {
    this.logger = logger;
    this.wsChannel = new WebSocketChannel(logger);
    this.sseChannel = new SSEChannel(logger);
  }

  // Send notification through all channels to a user
  send(userId, notification) {
    const wsSent = this.wsChannel.send(userId, notification);
    const sseSent = this.sseChannel.send(userId, notification);
    return { wsSent, sseSent, total: wsSent + sseSent };
  }

  // Broadcast notification to all connected users across all channels
  broadcast(notification) {
    const wsSent = this.wsChannel.broadcast(notification);
    const sseSent = this.sseChannel.broadcast(notification);
    return { wsSent, sseSent, total: wsSent + sseSent };
  }
}
```

### 6. WebSocket Connection Handler (index.js)
```javascript
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const token = urlParams.get('token');

  // Validate token on connection
  const validation = validateToken(token);
  if (!validation || !validation.valid) {
    logger.warn({ clientId }, 'Invalid or missing token on connection');
    ws.close(1008, 'Invalid authentication token');
    return;
  }

  const userId = validation.userId;
  const connectionData = {
    userId,
    ws,
    token,
    clientId,
    lastValidated: Date.now(),
  };

  wsConnections.set(clientId, connectionData);
  channelManager.wsChannel.addConnection(userId, ws);

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    userId,
    timestamp: new Date().toISOString(),
  }));
});
```

### 7. POST /notify Endpoint (index.js)
```javascript
app.post('/notify', (req, res) => {
  try {
    const { userIds, type, title, body, metadata } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    const results = [];

    for (const userId of userIds) {
      const notification = {
        type,
        title,
        body,
        metadata: metadata || {},
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Store notification
      const stored = notificationStore.add(userId, notification);

      // Send through channels
      const sent = channelManager.send(userId, stored);

      results.push({
        userId,
        notificationId: stored.id,
        channels: sent,
      });

      logger.info({
        userId,
        notificationId: stored.id,
        type,
        channels: sent,
      }, 'Notification sent');
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error in /notify endpoint');
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 8. SSE Endpoint (index.js)
```javascript
app.get('/stream/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { token } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Validate token for SSE
    const validation = validateToken(token);
    if (!validation || !validation.valid) {
      logger.warn({ userId }, 'Invalid token for SSE stream');
      return res.status(401).json({ error: 'Invalid or missing authentication token' });
    }

    // Verify userId matches token
    if (validation.userId !== userId) {
      logger.warn({ userId, tokenUserId: validation.userId }, 'userId mismatch with token');
      return res.status(403).json({ error: 'userId does not match token' });
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      userId,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    // Register SSE stream
    channelManager.sseChannel.addStream(userId, res);

    // Setup keepalive ping
    const keepalive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup on close
    res.on('close', () => {
      clearInterval(keepalive);
      channelManager.sseChannel.removeStream(userId, res);
      logger.info({ userId }, 'SSE stream closed');
    });
  } catch (err) {
    logger.error({ err }, 'Error in /stream/:userId endpoint');
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 9. Graceful Shutdown (index.js)
```javascript
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});
```

### 10. Health Check (index.js)
```javascript
app.get('/_heady/health', (req, res) => {
  const stats = {
    status: 'healthy',
    service: '@heady/notification-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    channels: channelManager.getStats(),
    store: notificationStore.getStats(),
  };
  res.json(stats);
});
```

## Error Handling Pattern

All endpoints follow this pattern:
```javascript
app.endpoint('/path', (req, res) => {
  try {
    // Validate input
    if (!required_param) {
      return res.status(400).json({ error: 'Required parameter missing' });
    }

    // Process request
    const result = doSomething();

    // Return success
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error in endpoint');
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Connection Lifecycle

### WebSocket
1. Client connects with token in query string
2. Server validates token format
3. Server authenticates user from token
4. Server sends connection confirmation
5. Client receives notifications as POST /notify requests are made
6. Server re-validates token on EVERY message
7. Client sends keepalive pings every ~20 seconds
8. On close, automatic cleanup of connection

### SSE
1. Client connects with userId and token as query params
2. Server validates token and checks userId match
3. Server sets SSE headers
4. Server sends connection confirmation
5. Client receives notifications as POST /notify requests are made
6. Server sends keepalive pings every 21 seconds
7. On close, automatic cleanup of stream

## Notification Data Flow

```
POST /notify
  ↓
Validate input (userIds, type, title, body)
  ↓
For each userId:
  ├─ Create notification (UUID, timestamp)
  ├─ Store in NotificationStore (applies LRU eviction if needed)
  ├─ Send via WebSocketChannel (to all ws connections)
  ├─ Send via SSEChannel (to all sse streams)
  └─ Log result
  ↓
Return delivery results to caller
```
