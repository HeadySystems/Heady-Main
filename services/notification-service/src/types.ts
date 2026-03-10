/**
 * Notification Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface NotificationPayload {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly channel: NotificationChannel;
  readonly priority: NotificationPriority;
  readonly template: string;
  readonly variables: Readonly<Record<string, string>>;
  readonly subject?: string;
  readonly body: string;
  readonly createdAt: string;
  readonly scheduledAt?: string;
  readonly expiresAt: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface DeliveryRecord {
  readonly notificationId: string;
  readonly channel: NotificationChannel;
  readonly status: DeliveryStatus;
  readonly attemptCount: number;
  readonly lastAttemptAt: string;
  readonly nextRetryAt: string | null;
  readonly deliveredAt: string | null;
  readonly errorMessage: string | null;
  readonly retryBackoffMs: number;
}

export interface UserPreferences {
  readonly userId: string;
  readonly enabledChannels: ReadonlyArray<NotificationChannel>;
  readonly quietHoursStart: number;
  readonly quietHoursEnd: number;
  readonly digestEnabled: boolean;
  readonly digestIntervalMs: number;
  readonly maxPerHour: number;
}

export interface DigestBatch {
  readonly userId: string;
  readonly notifications: ReadonlyArray<NotificationPayload>;
  readonly batchedAt: string;
  readonly nextDigestAt: string;
  readonly aggregationWindowMs: number;
}

export interface NotificationHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly queueDepth: number;
  readonly deliveryRate: number;
  readonly failureRate: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
