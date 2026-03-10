/**
 * Billing Service — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export type PlanTier = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type UsageType = 'api_calls' | 'embeddings' | 'inference' | 'storage' | 'compute';

export interface PricingPlan {
  readonly tier: PlanTier;
  readonly name: string;
  readonly monthlyPriceUsd: number;
  readonly annualPriceUsd: number;
  readonly features: ReadonlyArray<string>;
  readonly limits: PlanLimits;
}

export interface PlanLimits {
  readonly apiCallsPerMonth: number;
  readonly embeddingsPerMonth: number;
  readonly inferenceMinutesPerMonth: number;
  readonly storageGb: number;
  readonly maxTeamMembers: number;
}

export interface Subscription {
  readonly subscriptionId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly plan: PlanTier;
  readonly cycle: BillingCycle;
  readonly stripeSubscriptionId: string;
  readonly status: 'active' | 'past_due' | 'canceled' | 'trialing';
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly createdAt: string;
}

export interface UsageRecord {
  readonly userId: string;
  readonly tenantId: string;
  readonly usageType: UsageType;
  readonly quantity: number;
  readonly timestamp: string;
  readonly metadata: Readonly<Record<string, string | number>>;
}

export interface UsageSummary {
  readonly userId: string;
  readonly period: string;
  readonly apiCalls: number;
  readonly embeddings: number;
  readonly inferenceMinutes: number;
  readonly storageGb: number;
  readonly totalCreditsUsed: number;
  readonly creditsRemaining: number;
}

export interface Invoice {
  readonly invoiceId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly status: InvoiceStatus;
  readonly amountDue: number;
  readonly amountPaid: number;
  readonly currency: 'usd';
  readonly lineItems: ReadonlyArray<InvoiceLineItem>;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly createdAt: string;
  readonly paidAt: string | null;
}

export interface InvoiceLineItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly amount: number;
  readonly usageType: UsageType | 'subscription';
}

export interface CreditBalance {
  readonly userId: string;
  readonly balance: number;
  readonly conversionRate: number;
  readonly lastUpdated: string;
}

export interface AuditEntry {
  readonly entryId: string;
  readonly action: string;
  readonly userId: string;
  readonly amount: number;
  readonly currency: string;
  readonly timestamp: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface BillingHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly activeSubscriptions: number;
  readonly pendingInvoices: number;
  readonly revenueThisMonth: number;
  readonly uptime: number;
  readonly coherenceScore: number;
}
