# Notification Service - Usage Examples

## Starting the Service

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm install
npm start
```

### Docker
```bash
docker build -t heady-notification-service .
docker run -p 3394:3394 heady-notification-service
```

## HTTP API Examples

### Health Check
```bash
curl http://localhost:3394/_heady/health

# Response:
{
  "status": "healthy",
  "service": "@heady/notification-service",
  "uptime": 123.456,
  "timestamp": "2026-03-09T12:00:00.000Z",
  "channels": {
    "websocket": { "connectedUsers": 5, "totalConnections": 12 },
    "sse": { "connectedUsers": 3, "totalStreams": 4 },
    "totalConnected": 16
  },
  "store": {
    "userCount": 45,
    "totalNotifications": 2250,
    "unreadCount": 567,
    "maxPerUser": 144
  }
}
```

### Send Notification
```bash
curl -X POST http://localhost:3394/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user-123", "user-456"],
    "type": "info",
    "title": "New Feature Available",
    "body": "Check out our latest feature!",
    "metadata": {
      "feature": "notifications",
      "priority": "high"
    }
  }'

# Response:
{
  "success": true,
  "results": [
    {
      "userId": "user-123",
      "notificationId": "550e8400-e29b-41d4-a716-446655440000",
      "channels": { "wsSent": 2, "sseSent": 1, "total": 3 }
    },
    {
      "userId": "user-456",
      "notificationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "channels": { "wsSent": 1, "sseSent": 0, "total": 1 }
    }
  ],
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

### Get Recent Notifications
```bash
# Get last 50 notifications (default 233)
curl "http://localhost:3394/notifications/user-123?limit=50"

# Response:
{
  "userId": "user-123",
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "type": "info",
      "title": "New Feature Available",
      "body": "Check out our latest feature!",
      "metadata": { "feature": "notifications", "priority": "high" },
      "read": false,
      "createdAt": "2026-03-09T12:00:00.000Z"
    }
  ],
  "unreadCount": 5,
  "limit": 50,
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

### Mark Notification as Read
```bash
curl -X PATCH "http://localhost:3394/notifications/550e8400-e29b-41d4-a716-446655440000/read"

# Response:
{
  "success": true,
  "notification": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-123",
    "type": "info",
    "title": "New Feature Available",
    "body": "Check out our latest feature!",
    "metadata": { "feature": "notifications", "priority": "high" },
    "read": true,
    "createdAt": "2026-03-09T12:00:00.000Z"
  },
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

## WebSocket Client Examples

### JavaScript Browser Client
```javascript
// Connect with authentication token
const token = 'eyJhbGc...'; // Your JWT token
const ws = new WebSocket(`ws://localhost:3394/ws?token=${token}`);

// Handle connection
ws.addEventListener('open', (event) => {
  console.log('Connected!', event);
});

// Receive messages
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'connected') {
    console.log('Connected with clientId:', message.clientId);
  } else if (message.type === 'notification') {
    console.log('New notification:', message.data);
  } else if (message.type === 'pong') {
    console.log('Pong received:', message.timestamp);
  }
});

// Send ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 25000);

// Handle reconnection
ws.addEventListener('close', (event) => {
  if (event.code === 1008) {
    console.error('Authentication failed:', event.reason);
    // Re-authenticate and reconnect
  } else {
    // Attempt reconnection with exponential backoff
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }
});

// Handle errors
ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});
```

### Node.js WebSocket Client
```javascript
const WebSocket = require('ws');

const token = 'eyJhbGc...'; // Your JWT token
const ws = new WebSocket(`ws://localhost:3394/ws?token=${token}`);

ws.on('open', () => {
  console.log('Connected');
  
  // Send ping periodically
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 25000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});

ws.on('close', (code, reason) => {
  console.log(`Closed: ${code} - ${reason}`);
  // Reconnect logic here
});

ws.on('error', (err) => {
  console.error('Error:', err);
});
```

## Server-Sent Events (SSE) Examples

### Browser Client
```javascript
const token = 'eyJhbGc...'; // Your JWT token
const userId = 'user-123';

const eventSource = new EventSource(
  `/stream/${userId}?token=${token}`
);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Notification:', data);
});

eventSource.addEventListener('error', (event) => {
  if (event.readyState === EventSource.CLOSED) {
    console.log('SSE connection closed');
  } else {
    console.error('SSE error:', event);
  }
});
```

### Curl SSE Subscription
```bash
curl --no-buffer "http://localhost:3394/stream/user-123?token=eyJhbGc..."
```

## Advanced Usage

### Multiple Notifications
```bash
curl -X POST http://localhost:3394/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user-1", "user-2", "user-3", "user-4", "user-5"],
    "type": "system",
    "title": "System Maintenance",
    "body": "Scheduled maintenance at 2 AM",
    "metadata": {
      "scheduledTime": "2026-03-10T02:00:00Z",
      "estimatedDuration": "1 hour"
    }
  }'
```

### Monitoring Service Health
```bash
# Check service metrics continuously
watch -n 1 'curl -s http://localhost:3394/_heady/health | jq .'
```

### Batch Mark as Read
```bash
# In application: retrieve unread notifications, then mark each as read
for NOTIF_ID in $(curl -s "http://localhost:3394/notifications/user-123" | jq -r '.notifications[] | select(.read==false) | .id'); do
  curl -X PATCH "http://localhost:3394/notifications/$NOTIF_ID/read"
done
```
