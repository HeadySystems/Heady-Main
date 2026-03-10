const { v4: uuidv4 } = require('uuid');

// φ (Phi) constants - golden ratio
const PHI = 1.618033988749895;
const PSI = 1 / PHI;

// Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233...
// fib(12) = 144 (max notifications per user)
const MAX_NOTIFICATIONS_PER_USER = 144;

class NotificationStore {
  constructor() {
    this.notifications = new Map(); // userId -> [ notifications ]
    this.notificationById = new Map(); // id -> notification
  }

  /**
   * Add a notification to the store
   * Applies LRU eviction if limit is exceeded
   */
  add(userId, notification) {
    if (!notification.id) {
      notification.id = uuidv4();
    }

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    const userNotifications = this.notifications.get(userId);
    const fullNotification = {
      id: notification.id,
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata || {},
      read: notification.read === true,
      createdAt: notification.createdAt || new Date().toISOString(),
    };

    userNotifications.unshift(fullNotification);
    this.notificationById.set(notification.id, fullNotification);

    // LRU eviction when exceeding max notifications per user
    if (userNotifications.length > MAX_NOTIFICATIONS_PER_USER) {
      const removed = userNotifications.pop();
      this.notificationById.delete(removed.id);
    }

    return fullNotification;
  }

  /**
   * Get notifications for a user (most recent first)
   * Default limit: fib(13) = 233
   */
  getByUser(userId, limit = 233) {
    if (!this.notifications.has(userId)) {
      return [];
    }

    const userNotifications = this.notifications.get(userId);
    return userNotifications.slice(0, Math.min(limit, userNotifications.length));
  }

  /**
   * Mark a notification as read
   */
  markRead(id) {
    const notification = this.notificationById.get(id);
    if (notification) {
      notification.read = true;
      return notification;
    }
    return null;
  }

  /**
   * Get unread count for a user
   */
  getUnreadCount(userId) {
    if (!this.notifications.has(userId)) {
      return 0;
    }

    const userNotifications = this.notifications.get(userId);
    return userNotifications.filter((n) => !n.read).length;
  }

  /**
   * Get a single notification by ID
   */
  getById(id) {
    return this.notificationById.get(id) || null;
  }

  /**
   * Delete notifications older than specified time (in ms)
   * Used for cleanup
   */
  cleanup(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const cutoff = now - maxAgeMs;

    for (const [userId, notifications] of this.notifications.entries()) {
      const filtered = notifications.filter((n) => {
        const notificationTime = new Date(n.createdAt).getTime();
        const shouldKeep = notificationTime > cutoff;
        if (!shouldKeep) {
          this.notificationById.delete(n.id);
        }
        return shouldKeep;
      });

      if (filtered.length === 0) {
        this.notifications.delete(userId);
      } else {
        this.notifications.set(userId, filtered);
      }
    }
  }

  /**
   * Get store statistics (for monitoring)
   */
  getStats() {
    let totalNotifications = 0;
    let userCount = 0;
    let unreadCount = 0;

    for (const [userId, notifications] of this.notifications.entries()) {
      userCount++;
      totalNotifications += notifications.length;
      unreadCount += notifications.filter((n) => !n.read).length;
    }

    return {
      userCount,
      totalNotifications,
      unreadCount,
      maxPerUser: MAX_NOTIFICATIONS_PER_USER,
    };
  }
}

module.exports = {
  NotificationStore,
  MAX_NOTIFICATIONS_PER_USER,
  PHI,
  PSI,
};
