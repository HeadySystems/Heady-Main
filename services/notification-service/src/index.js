const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const WebSocket = require('ws');
const pinoHttp = require('pino-http');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');
const { NotificationStore } = require('./notification-store');
const { NotificationChannelManager } = require('./channels');

// φ (Phi) constants - golden ratio
const PHI = 1.618033988749895;

// Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233...
// fib(8) = 21 (heartbeat ping interval in seconds)
const HEARTBEAT_INTERVAL_MS = 21000;

// fib(13) = 233 (default recent notifications to retrieve)
const DEFAULT_LIMIT = 233;

// Service configuration
const PORT = process.env.PORT || 3394;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || (NODE_ENV === 'development' ? 'debug' : 'info'),
  transport: NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Initialize stores and channels
const notificationStore = new NotificationStore();
const channelManager = new NotificationChannelManager(logger);

// Track WebSocket connections
const wsConnections = new Map(); // clientId -> { userId, ws, token, lastValidated }

/**
 * Validate token - placeholder implementation
 * In production, this should validate against JWT/session backend
 */
function validateToken(token) {
  if (!token) return null;

  // Simple validation: token format check
  // In production, verify against JWT or session store
  try {
    // For now, we'll accept any non-empty token
    // Production should decode and verify JWT or check session
    const parts = token.split('.');
    if (parts.length === 3) {
      // Looks like a JWT
      return { valid: true, userId: extractUserIdFromToken(token) };
    }
    // Fallback: accept as valid if present
    return { valid: true, userId: token.split(':')[0] || 'user' };
  } catch (err) {
    return null;
  }
}

/**
 * Extract userId from token (placeholder)
 */
function extractUserIdFromToken(token) {
  try {
    // In production, decode JWT properly
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.sub || payload.userId || 'unknown';
    }
  } catch (err) {
    logger.debug({ err }, 'Failed to extract userId from token');
  }
  return 'unknown';
}

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const token = urlParams.get('token');

  logger.info({ clientId, token: !!token }, 'WebSocket connection received');

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

  logger.info({ clientId, userId }, 'WebSocket authenticated and registered');

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    userId,
    timestamp: new Date().toISOString(),
  }));

  // Setup heartbeat/ping
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping(JSON.stringify({ timestamp: Date.now() }));
    }
  }, HEARTBEAT_INTERVAL_MS);

  /**
   * Message handler - re-validate token on every message
   */
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

      // Handle ping/pong for keepalive
      if (message.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          clientId,
          timestamp: Date.now(),
        }));
        return;
      }

      logger.debug({ clientId, messageType: message.type }, 'WebSocket message received');
    } catch (err) {
      logger.warn({ err, clientId }, 'Error processing WebSocket message');
    }
  });

  /**
   * Error handler
   */
  ws.on('error', (err) => {
    logger.error({ err, clientId, userId }, 'WebSocket error');
  });

  /**
   * Close handler
   */
  ws.on('close', (code, reason) => {
    clearInterval(heartbeat);
    wsConnections.delete(clientId);
    logger.info({ clientId, userId, code, reason }, 'WebSocket connection closed');
  });
});

/**
 * Health check endpoint
 */
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

/**
 * Send notification to user(s)
 * POST /notify
 * Body: { userIds: string[], type, title, body, metadata? }
 */
app.post('/notify', (req, res) => {
  try {
    const { userIds, type, title, body, metadata } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    if (!type || !title || !body) {
      return res.status(400).json({ error: 'type, title, and body are required' });
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

/**
 * Get recent notifications for a user
 * GET /notifications/:userId?limit=233
 */
app.get('/notifications/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, DEFAULT_LIMIT);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const notifications = notificationStore.getByUser(userId, limit);
    const unreadCount = notificationStore.getUnreadCount(userId);

    res.json({
      userId,
      notifications,
      unreadCount,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error in /notifications/:userId endpoint');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mark notification as read
 * PATCH /notifications/:id/read
 */
app.patch('/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const notification = notificationStore.markRead(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    logger.info({ notificationId: id, userId: notification.userId }, 'Notification marked as read');

    res.json({
      success: true,
      notification,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error in /notifications/:id/read endpoint');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Server-Sent Events endpoint for real-time notifications
 * GET /stream/:userId?token=...
 */
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

    logger.info({ userId }, 'SSE stream opened');

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

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Graceful shutdown
 */
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

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Periodic cleanup (remove old notifications)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  notificationStore.cleanup();
  logger.debug('Notification store cleanup completed');
}, CLEANUP_INTERVAL_MS);

/**
 * Start server
 */
server.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: NODE_ENV,
    heartbeat: `${HEARTBEAT_INTERVAL_MS}ms`,
    defaultLimit: DEFAULT_LIMIT,
  }, `Notification service started on port ${PORT}`);
});

module.exports = { app, server, notificationStore, channelManager };
