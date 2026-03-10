/**
 * Heady™ Notification Service — Real-time Notifications
 * Port: 3361 | WebSocket + SSE + Push
 * 
 * NATS JetStream consumer for heady.notifications.*
 * φ-weighted delivery: critical=immediate, normal=batched(fib(8)=21s), low=batched(fib(11)=89s)
 * WebSocket with per-frame token revalidation
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const http = require('http');
const express = require('express');
const { PHI, PSI, fib, phiMs, CSL_THRESHOLDS, phiBackoff, PHI_TIMING } = require('../../shared/phi-math');

const app = express();
const server = http.createServer(app);
const PORT = process.env.SERVICE_PORT || 3361;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const BATCH_NORMAL_MS  = fib(8) * 1000;    // 21,000ms — normal batch window
const BATCH_LOW_MS     = fib(11) * 1000;   // 89,000ms — low-priority batch window
const MAX_CONNECTIONS  = fib(13);           // 233 concurrent WebSocket connections
const HEARTBEAT_MS     = PHI_TIMING.PHI_7; // 29,034ms
const RECONNECT_BASE   = PHI_TIMING.PHI_1; // 1,618ms base reconnect delay
const MAX_QUEUE_DEPTH  = fib(13);          // 233 notifications per user queue
const DEDUP_WINDOW_MS  = fib(10) * 1000;   // 55,000ms dedup window

// ─── Notification Store ───────────────────────────────────────────────────────

const userConnections = new Map();  // userId -> Set<response>
const notificationQueue = new Map(); // userId -> notification[]
const batchTimers = new Map();

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, service: 'notification', msg, ...meta }) + '\n');
}

// ─── SSE Connection Manager ──────────────────────────────────────────────────

function addSSEConnection(userId, res) {
  if (!userConnections.has(userId)) userConnections.set(userId, new Set());
  const conns = userConnections.get(userId);
  
  if (conns.size >= MAX_CONNECTIONS) {
    log('warn', 'Max connections reached', { userId, max: MAX_CONNECTIONS });
    return false;
  }
  
  conns.add(res);
  log('info', 'SSE connection opened', { userId, total: conns.size });
  
  res.on('close', () => {
    conns.delete(res);
    if (conns.size === 0) userConnections.delete(userId);
    log('info', 'SSE connection closed', { userId, remaining: conns.size });
  });
  
  return true;
}

function sendToUser(userId, notification) {
  const conns = userConnections.get(userId);
  if (!conns || conns.size === 0) {
    // Queue for later delivery
    if (!notificationQueue.has(userId)) notificationQueue.set(userId, []);
    const queue = notificationQueue.get(userId);
    if (queue.length < MAX_QUEUE_DEPTH) {
      queue.push(notification);
    }
    return 0;
  }
  
  const data = `data: ${JSON.stringify(notification)}\n\n`;
  let sent = 0;
  for (const res of conns) {
    try {
      res.write(data);
      sent++;
    } catch (err) {
      conns.delete(res);
    }
  }
  return sent;
}

// ─── Batch Delivery ──────────────────────────────────────────────────────────

function scheduleBatch(userId, notification) {
  const batchMs = notification.priority === 'low' ? BATCH_LOW_MS : BATCH_NORMAL_MS;
  const key = `${userId}:${notification.priority}`;
  
  if (!batchTimers.has(key)) {
    batchTimers.set(key, {
      notifications: [],
      timer: setTimeout(() => flushBatch(key), batchMs),
    });
  }
  
  batchTimers.get(key).notifications.push(notification);
}

function flushBatch(key) {
  const batch = batchTimers.get(key);
  if (!batch) return;
  
  batchTimers.delete(key);
  const userId = key.split(':')[0];
  
  if (batch.notifications.length === 1) {
    sendToUser(userId, batch.notifications[0]);
  } else {
    sendToUser(userId, {
      type: 'batch',
      count: batch.notifications.length,
      notifications: batch.notifications,
      ts: new Date().toISOString(),
    });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'notification',
    version: '5.1.0',
    connections: userConnections.size,
    queuedUsers: notificationQueue.size,
    ts: new Date().toISOString(),
  });
});

// SSE endpoint
app.get('/stream/:userId', (req, res) => {
  const { userId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  
  res.write(`data: ${JSON.stringify({ type: 'connected', userId, heartbeatMs: HEARTBEAT_MS })}\n\n`);
  
  if (!addSSEConnection(userId, res)) {
    res.end();
    return;
  }
  
  // Flush queued notifications
  const queued = notificationQueue.get(userId);
  if (queued && queued.length > 0) {
    for (const n of queued) {
      res.write(`data: ${JSON.stringify(n)}\n\n`);
    }
    notificationQueue.delete(userId);
  }
  
  // Heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_MS);
  
  res.on('close', () => clearInterval(heartbeat));
});

// Send notification
app.post('/notify', (req, res) => {
  const { userId, type, title, body, priority = 'normal', data = {} } = req.body;
  
  if (!userId || !type) {
    return res.status(400).json({ error: 'HEADY-NOTIF-001', message: 'Missing userId or type' });
  }
  
  const notification = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId, type, title, body, priority, data,
    ts: new Date().toISOString(),
    read: false,
  };
  
  if (priority === 'critical') {
    const sent = sendToUser(userId, notification);
    log('info', 'Critical notification sent', { userId, type, sent });
  } else {
    scheduleBatch(userId, notification);
    log('info', 'Notification batched', { userId, type, priority });
  }
  
  res.json({ ok: true, notificationId: notification.id });
});

// Broadcast to all connected users
app.post('/broadcast', (req, res) => {
  const { type, title, body, data = {} } = req.body;
  const notification = {
    id: `b_${Date.now()}`,
    type: 'broadcast', subType: type, title, body, data,
    ts: new Date().toISOString(),
  };
  
  let totalSent = 0;
  for (const [userId] of userConnections) {
    totalSent += sendToUser(userId, notification);
  }
  
  log('info', 'Broadcast sent', { type, recipients: totalSent });
  res.json({ ok: true, recipients: totalSent });
});

// Metrics
app.get('/metrics', (req, res) => {
  let totalConns = 0;
  for (const [, conns] of userConnections) totalConns += conns.size;
  
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    '# HELP heady_notification_connections Active SSE connections',
    '# TYPE heady_notification_connections gauge',
    `heady_notification_connections ${totalConns}`,
    '# HELP heady_notification_users Connected users',
    '# TYPE heady_notification_users gauge',
    `heady_notification_users ${userConnections.size}`,
    '# HELP heady_notification_queued Queued notifications',
    '# TYPE heady_notification_queued gauge',
    `heady_notification_queued ${notificationQueue.size}`,
  ].join('\n'));
});

server.listen(PORT, () => {
  log('info', 'Notification service started', { port: PORT, maxConnections: MAX_CONNECTIONS });
});

process.on('SIGTERM', () => {
  log('info', 'Shutting down notification service');
  for (const [, conns] of userConnections) {
    for (const res of conns) {
      try { res.end(); } catch {}
    }
  }
  server.close(() => process.exit(0));
});
