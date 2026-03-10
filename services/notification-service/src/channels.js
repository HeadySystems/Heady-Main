// Channel abstraction for managing different notification delivery mechanisms
// Supports WebSocket, Server-Sent Events (SSE), and other channels

class WebSocketChannel {
  constructor(logger) {
    this.logger = logger;
    this.userConnections = new Map(); // userId -> Set<WebSocket>
  }

  /**
   * Register a WebSocket connection for a user
   */
  addConnection(userId, ws) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(ws);

    // Handle disconnection
    const onClose = () => {
      this.removeConnection(userId, ws);
    };

    ws.once('close', onClose);
  }

  /**
   * Remove a WebSocket connection for a user
   */
  removeConnection(userId, ws) {
    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(ws);
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  /**
   * Send notification to all WebSocket connections for a user
   */
  send(userId, notification) {
    if (!this.userConnections.has(userId)) {
      return 0;
    }

    const connections = this.userConnections.get(userId);
    let sentCount = 0;

    for (const ws of connections) {
      if (ws.readyState === 1) { // OPEN state
        try {
          ws.send(JSON.stringify({
            type: 'notification',
            data: notification,
          }));
          sentCount++;
        } catch (err) {
          this.logger.warn({ err, userId }, 'Error sending to WebSocket');
        }
      }
    }

    return sentCount;
  }

  /**
   * Get number of active connections for a user
   */
  getConnectedCount(userId) {
    if (!this.userConnections.has(userId)) {
      return 0;
    }
    return this.userConnections.get(userId).size;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers() {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(notification) {
    let totalSent = 0;
    for (const userId of this.userConnections.keys()) {
      totalSent += this.send(userId, notification);
    }
    return totalSent;
  }

  /**
   * Close all connections for a user
   */
  closeUserConnections(userId, code = 1000, reason = 'User disconnecting') {
    if (!this.userConnections.has(userId)) {
      return;
    }

    const connections = this.userConnections.get(userId);
    for (const ws of connections) {
      try {
        ws.close(code, reason);
      } catch (err) {
        this.logger.warn({ err, userId }, 'Error closing WebSocket');
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalConnections = 0;
    for (const connections of this.userConnections.values()) {
      totalConnections += connections.size;
    }

    return {
      connectedUsers: this.userConnections.size,
      totalConnections,
    };
  }
}

class SSEChannel {
  constructor(logger) {
    this.logger = logger;
    this.userStreams = new Map(); // userId -> Set<Response>
  }

  /**
   * Register an SSE response stream for a user
   */
  addStream(userId, res) {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Set());
    }
    this.userStreams.get(userId).add(res);

    // Handle disconnection
    const onClose = () => {
      this.removeStream(userId, res);
    };

    res.once('close', onClose);
  }

  /**
   * Remove an SSE response stream for a user
   */
  removeStream(userId, res) {
    if (this.userStreams.has(userId)) {
      this.userStreams.get(userId).delete(res);
      if (this.userStreams.get(userId).size === 0) {
        this.userStreams.delete(userId);
      }
    }
  }

  /**
   * Send notification to all SSE streams for a user
   */
  send(userId, notification) {
    if (!this.userStreams.has(userId)) {
      return 0;
    }

    const streams = this.userStreams.get(userId);
    let sentCount = 0;

    for (const res of streams) {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'notification',
          data: notification,
        })}\n\n`);
        sentCount++;
      } catch (err) {
        this.logger.warn({ err, userId }, 'Error sending to SSE stream');
      }
    }

    return sentCount;
  }

  /**
   * Get number of active streams for a user
   */
  getConnectedCount(userId) {
    if (!this.userStreams.has(userId)) {
      return 0;
    }
    return this.userStreams.get(userId).size;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers() {
    return Array.from(this.userStreams.keys());
  }

  /**
   * Broadcast to all SSE streams
   */
  broadcast(notification) {
    let totalSent = 0;
    for (const userId of this.userStreams.keys()) {
      totalSent += this.send(userId, notification);
    }
    return totalSent;
  }

  /**
   * Close all streams for a user
   */
  closeUserStreams(userId) {
    if (!this.userStreams.has(userId)) {
      return;
    }

    const streams = this.userStreams.get(userId);
    for (const res of streams) {
      try {
        res.end();
      } catch (err) {
        this.logger.warn({ err, userId }, 'Error closing SSE stream');
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalStreams = 0;
    for (const streams of this.userStreams.values()) {
      totalStreams += streams.size;
    }

    return {
      connectedUsers: this.userStreams.size,
      totalStreams,
    };
  }
}

class NotificationChannelManager {
  constructor(logger) {
    this.logger = logger;
    this.wsChannel = new WebSocketChannel(logger);
    this.sseChannel = new SSEChannel(logger);
  }

  /**
   * Send notification through all channels to a user
   */
  send(userId, notification) {
    const wsSent = this.wsChannel.send(userId, notification);
    const sseSent = this.sseChannel.send(userId, notification);
    return { wsSent, sseSent, total: wsSent + sseSent };
  }

  /**
   * Broadcast notification to all connected users across all channels
   */
  broadcast(notification) {
    const wsSent = this.wsChannel.broadcast(notification);
    const sseSent = this.sseChannel.broadcast(notification);
    return { wsSent, sseSent, total: wsSent + sseSent };
  }

  /**
   * Get total connected clients for a user
   */
  getConnectedCount(userId) {
    return this.wsChannel.getConnectedCount(userId) + this.sseChannel.getConnectedCount(userId);
  }

  /**
   * Get all users with active connections
   */
  getConnectedUsers() {
    const wsUsers = new Set(this.wsChannel.getConnectedUsers());
    const sseUsers = new Set(this.sseChannel.getConnectedUsers());
    return Array.from(new Set([...wsUsers, ...sseUsers]));
  }

  /**
   * Close all connections for a user
   */
  closeUserConnections(userId, code = 1000, reason = 'User disconnecting') {
    this.wsChannel.closeUserConnections(userId, code, reason);
    this.sseChannel.closeUserStreams(userId);
  }

  /**
   * Get statistics
   */
  getStats() {
    const wsStats = this.wsChannel.getStats();
    const sseStats = this.sseChannel.getStats();

    return {
      websocket: wsStats,
      sse: sseStats,
      totalConnected: wsStats.totalConnections + sseStats.totalStreams,
    };
  }
}

module.exports = {
  WebSocketChannel,
  SSEChannel,
  NotificationChannelManager,
};
