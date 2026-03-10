/**
 * Notification Service — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type NotificationPayload, type DeliveryRecord, type UserPreferences,
  type DigestBatch, type NotificationChannel, type NotificationPriority,
  type DeliveryStatus
} from './types.js';


interface LogEntry {
  level: string;
  service: string;
  msg: string;
  timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const createLogger = (serviceName: string) => ({
  info: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'info', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  warn: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'warn', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'error', service: serviceName, msg, timestamp: new Date().toISOString(), ...meta };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
});

const logger = createLogger('notification-service');

export class NotificationRouter {
  private readonly channelHandlers: Map<NotificationChannel, ChannelHandler> = new Map();
  private readonly maxRetries: number = FIB[5]; // 5 retries
  private readonly baseRetryMs: number = FIB[6] * 1000; // 8 seconds

  registerChannel(channel: NotificationChannel, handler: ChannelHandler): void {
    this.channelHandlers.set(channel, handler);
    logger.info('channel_registered', { channel });
  }

  async send(notification: NotificationPayload): Promise<DeliveryRecord> {
    const handler = this.channelHandlers.get(notification.channel);
    if (!handler) {
      logger.error('no_handler_for_channel', { channel: notification.channel });
      return this.createFailedRecord(notification, 'no_handler');
    }

    try {
      await handler.deliver(notification);
      logger.info('notification_sent', {
        id: notification.id,
        channel: notification.channel,
        userId: notification.userId
      });
      return this.createDeliveredRecord(notification);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'unknown_error';
      logger.error('notification_failed', {
        id: notification.id,
        channel: notification.channel,
        error: errorMsg
      });
      return this.createFailedRecord(notification, errorMsg);
    }
  }

  calculateRetryBackoff(attemptCount: number): number {
    return this.baseRetryMs * Math.pow(PHI, attemptCount);
  }

  shouldRetry(record: DeliveryRecord): boolean {
    return record.status === 'failed' && record.attemptCount < this.maxRetries;
  }

  private createDeliveredRecord(n: NotificationPayload): DeliveryRecord {
    return {
      notificationId: n.id,
      channel: n.channel,
      status: 'delivered' as DeliveryStatus,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: null,
      deliveredAt: new Date().toISOString(),
      errorMessage: null,
      retryBackoffMs: 0
    };
  }

  private createFailedRecord(n: NotificationPayload, error: string): DeliveryRecord {
    const backoff = this.calculateRetryBackoff(1);
    return {
      notificationId: n.id,
      channel: n.channel,
      status: 'failed' as DeliveryStatus,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + backoff).toISOString(),
      deliveredAt: null,
      errorMessage: error,
      retryBackoffMs: backoff
    };
  }
}

export class DigestAggregator {
  private readonly buffers: Map<string, NotificationPayload[]> = new Map();
  private readonly fibIntervals: ReadonlyArray<number> = [
    FIB[7] * 60 * 1000,   // 13 minutes — fast digest
    FIB[9] * 60 * 1000,   // 34 minutes — normal digest
    FIB[11] * 60 * 1000,  // 89 minutes — slow digest
  ];

  addToDigest(notification: NotificationPayload, digestTier: number): void {
    const key = `${notification.userId}:${notification.channel}`;
    const existing = this.buffers.get(key) ?? [];
    existing.push(notification);
    this.buffers.set(key, existing);
    logger.info('added_to_digest', { userId: notification.userId, bufferSize: existing.length });
  }

  flushDigest(userId: string, channel: NotificationChannel): DigestBatch | null {
    const key = `${userId}:${channel}`;
    const buffer = this.buffers.get(key);
    if (!buffer || buffer.length === 0) return null;

    const batch: DigestBatch = {
      userId,
      notifications: [...buffer],
      batchedAt: new Date().toISOString(),
      nextDigestAt: new Date(Date.now() + this.fibIntervals[1]!).toISOString(),
      aggregationWindowMs: this.fibIntervals[1]!
    };

    this.buffers.delete(key);
    logger.info('digest_flushed', { userId, count: batch.notifications.length });
    return batch;
  }
}

export class TemplateEngine {
  private readonly templates: Map<string, string> = new Map();

  registerTemplate(name: string, template: string): void {
    this.templates.set(name, template);
  }

  render(templateName: string, variables: Readonly<Record<string, string>>): string {
    const template = this.templates.get(templateName);
    if (!template) return '';

    return Object.entries(variables).reduce(
      (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
      template
    );
  }
}

export interface ChannelHandler {
  deliver(notification: NotificationPayload): Promise<void>;
}

export class EmailHandler implements ChannelHandler {
  async deliver(notification: NotificationPayload): Promise<void> {
    logger.info('email_queued', {
      to: notification.userId,
      subject: notification.subject ?? 'Heady Notification'
    });
  }
}

export class WebhookHandler implements ChannelHandler {
  async deliver(notification: NotificationPayload): Promise<void> {
    const webhookUrl = notification.metadata['webhookUrl'];
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      throw new Error('webhook_url_required');
    }
    logger.info('webhook_dispatched', { url: webhookUrl, id: notification.id });
  }
}

export class InAppHandler implements ChannelHandler {
  async deliver(notification: NotificationPayload): Promise<void> {
    logger.info('in_app_stored', { userId: notification.userId, id: notification.id });
  }
}
