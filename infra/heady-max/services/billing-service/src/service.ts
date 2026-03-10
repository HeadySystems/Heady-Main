/**
 * Billing Service — Core Business Logic
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type PricingPlan, type PlanTier, type PlanLimits,
  type Subscription, type UsageRecord, type UsageSummary,
  type Invoice, type InvoiceLineItem, type CreditBalance,
  type AuditEntry, type UsageType
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

const logger = createLogger('billing-service');

// φ-tier pricing: derived from PHI * base multiplier
export const PRICING_PLANS: Record<PlanTier, PricingPlan> = {
  free: {
    tier: 'free',
    name: 'Heady Free',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    features: ['Basic AI access', 'Community support', 'Limited embeddings'],
    limits: {
      apiCallsPerMonth: FIB[10] * FIB[8],          // 55 * 21 = 1155
      embeddingsPerMonth: FIB[9] * FIB[7],          // 34 * 13 = 442
      inferenceMinutesPerMonth: FIB[7],              // 13 minutes
      storageGb: FIB[3],                             // 2 GB
      maxTeamMembers: FIB[1]                         // 1
    }
  },
  pro: {
    tier: 'pro',
    name: 'Heady Pro',
    monthlyPriceUsd: Math.round(PHI * FIB[8] * 100) / 100,    // PHI * 21 ≈ $33.98
    annualPriceUsd: Math.round(PHI * FIB[8] * FIB[8] * 100) / 100, // PHI * 21 * 21 ≈ $713.54 (annual discount via Fibonacci)
    features: ['Full AI access', 'Priority support', 'Unlimited embeddings', 'Custom models', 'Team workspace'],
    limits: {
      apiCallsPerMonth: FIB[14] * FIB[10],         // 377 * 55 = 20735
      embeddingsPerMonth: FIB[13] * FIB[10],        // 233 * 55 = 12815
      inferenceMinutesPerMonth: FIB[11],             // 89 minutes
      storageGb: FIB[8],                             // 21 GB
      maxTeamMembers: FIB[7]                         // 13
    }
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Heady Enterprise',
    monthlyPriceUsd: Math.round(PHI * FIB[11] * FIB[3] * 100) / 100, // PHI * 89 * 2 ≈ $287.81
    annualPriceUsd: Math.round(PHI * FIB[11] * FIB[3] * FIB[8] * 100) / 100, // annual: ≈ $6044.02
    features: ['Everything in Pro', 'Dedicated infrastructure', 'SLA', 'Custom integrations', 'SSO/SAML', 'Audit logs', 'Priority GPU'],
    limits: {
      apiCallsPerMonth: FIB[16] * FIB[13],         // 987 * 233 = 229971
      embeddingsPerMonth: FIB[15] * FIB[13],        // 610 * 233 = 142130
      inferenceMinutesPerMonth: FIB[14],             // 377 minutes
      storageGb: FIB[11],                            // 89 GB
      maxTeamMembers: FIB[10]                        // 55
    }
  }
};

export class UsageMeter {
  private readonly buckets: Map<string, UsageRecord[]> = new Map();
  private readonly fibBucketSizes: ReadonlyArray<number> = FIB.slice(5, 12); // [5, 8, 13, 21, 34, 55, 89]

  record(usage: UsageRecord): void {
    const key = `${usage.userId}:${usage.usageType}:${this.getCurrentPeriod()}`;
    const bucket = this.buckets.get(key) ?? [];
    bucket.push(usage);
    this.buckets.set(key, bucket);
    logger.info('usage_recorded', { userId: usage.userId, type: usage.usageType, quantity: usage.quantity });
  }

  getSummary(userId: string): UsageSummary {
    const period = this.getCurrentPeriod();
    const getTotal = (type: UsageType): number => {
      const key = `${userId}:${type}:${period}`;
      const records = this.buckets.get(key) ?? [];
      return records.reduce((sum, r) => sum + r.quantity, 0);
    };

    const apiCalls = getTotal('api_calls');
    const embeddings = getTotal('embeddings');
    const inferenceMinutes = getTotal('inference');
    const storageGb = getTotal('storage');
    const computeMinutes = getTotal('compute');

    const totalCredits = apiCalls * PSI + embeddings * PSI * PSI + inferenceMinutes * PHI + storageGb + computeMinutes * PHI;

    return {
      userId,
      period,
      apiCalls,
      embeddings,
      inferenceMinutes,
      storageGb,
      totalCreditsUsed: Math.round(totalCredits * 100) / 100,
      creditsRemaining: 0
    };
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

export class CreditSystem {
  private readonly balances: Map<string, CreditBalance> = new Map();
  private readonly conversionRate: number = PHI; // 1 credit = PHI units of usage

  getBalance(userId: string): CreditBalance {
    return this.balances.get(userId) ?? {
      userId,
      balance: 0,
      conversionRate: this.conversionRate,
      lastUpdated: new Date().toISOString()
    };
  }

  addCredits(userId: string, amount: number): CreditBalance {
    const current = this.getBalance(userId);
    const updated: CreditBalance = {
      ...current,
      balance: current.balance + amount,
      lastUpdated: new Date().toISOString()
    };
    this.balances.set(userId, updated);
    logger.info('credits_added', { userId, amount, newBalance: updated.balance });
    return updated;
  }

  deductCredits(userId: string, amount: number): { success: boolean; balance: CreditBalance } {
    const current = this.getBalance(userId);
    if (current.balance < amount) {
      return { success: false, balance: current };
    }
    const updated: CreditBalance = {
      ...current,
      balance: current.balance - amount,
      lastUpdated: new Date().toISOString()
    };
    this.balances.set(userId, updated);
    return { success: true, balance: updated };
  }
}

export class InvoiceGenerator {
  generate(
    userId: string,
    tenantId: string,
    subscription: Subscription,
    usage: UsageSummary
  ): Invoice {
    const plan = PRICING_PLANS[subscription.plan];
    const lineItems: InvoiceLineItem[] = [
      {
        description: `${plan.name} - ${subscription.cycle} subscription`,
        quantity: 1,
        unitPrice: subscription.cycle === 'monthly' ? plan.monthlyPriceUsd : plan.annualPriceUsd / FIB[8],
        amount: subscription.cycle === 'monthly' ? plan.monthlyPriceUsd : plan.annualPriceUsd / FIB[8],
        usageType: 'subscription' as const
      }
    ];

    if (usage.apiCalls > plan.limits.apiCallsPerMonth) {
      const overage = usage.apiCalls - plan.limits.apiCallsPerMonth;
      const overagePrice = overage * PSI * PSI / FIB[10]; // φ-scaled overage pricing
      lineItems.push({
        description: 'API call overage',
        quantity: overage,
        unitPrice: PSI * PSI / FIB[10],
        amount: Math.round(overagePrice * 100) / 100,
        usageType: 'api_calls' as const
      });
    }

    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      invoiceId: crypto.randomUUID(),
      userId,
      tenantId,
      status: 'open',
      amountDue: Math.round(totalAmount * 100) / 100,
      amountPaid: 0,
      currency: 'usd',
      lineItems,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      createdAt: new Date().toISOString(),
      paidAt: null
    };
  }
}

export class AuditTrail {
  private readonly entries: AuditEntry[] = [];

  log(action: string, userId: string, amount: number, metadata: Record<string, string | number | boolean> = {}): AuditEntry {
    const entry: AuditEntry = {
      entryId: crypto.randomUUID(),
      action,
      userId,
      amount,
      currency: 'usd',
      timestamp: new Date().toISOString(),
      metadata
    };
    this.entries.push(entry);
    logger.info('audit_entry', { action, userId, amount });
    return entry;
  }

  getEntries(userId: string): ReadonlyArray<AuditEntry> {
    return this.entries.filter(e => e.userId === userId);
  }
}
