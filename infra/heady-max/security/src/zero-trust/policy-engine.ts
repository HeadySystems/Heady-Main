/**
 * Zero-Trust Policy Engine — CSL-Gated Authorization
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly policyId: string;
  readonly coherenceScore: number;
  readonly timestamp: string;
}

export interface ServiceIdentity {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly spiffeId: string;
  readonly certificateHash: string;
  readonly trustLevel: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface RequestContext {
  readonly sourceService: string;
  readonly targetService: string;
  readonly method: string;
  readonly path: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly sourceIp: string;
  readonly requestSignature: string;
  readonly timestamp: string;
}

export class PolicyEngine {
  private readonly policies: Map<string, Policy> = new Map();
  private readonly serviceIdentities: Map<string, ServiceIdentity> = new Map();
  private readonly auditLog: PolicyDecision[] = [];

  evaluate(context: RequestContext): PolicyDecision {
    const identity = this.serviceIdentities.get(context.sourceService);

    // Verify service identity exists
    if (!identity) {
      return this.deny(context, 'unknown_service_identity');
    }

    // Verify certificate not expired
    if (new Date(identity.expiresAt).getTime() < Date.now()) {
      return this.deny(context, 'expired_certificate');
    }

    // Verify trust level meets CSL threshold
    if (identity.trustLevel < CSL_THRESHOLD) {
      return this.deny(context, 'insufficient_trust_level');
    }

    // Verify request signature
    if (!this.verifyRequestSignature(context)) {
      return this.deny(context, 'invalid_request_signature');
    }

    // Check specific policies
    const policy = this.findMatchingPolicy(context);
    if (policy && !policy.evaluate(context)) {
      return this.deny(context, `policy_denied: ${policy.name}`);
    }

    return this.allow(context);
  }

  registerService(identity: ServiceIdentity): void {
    this.serviceIdentities.set(identity.serviceName, identity);
  }

  registerPolicy(policy: Policy): void {
    this.policies.set(policy.name, policy);
  }

  private verifyRequestSignature(context: RequestContext): boolean {
    if (!context.requestSignature) return false;
    const payload = `${context.sourceService}:${context.targetService}:${context.method}:${context.path}:${context.timestamp}`;
    const expectedSig = crypto.createHmac('sha256', process.env.INTER_SERVICE_SECRET ?? 'heady-dev-secret')
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(context.requestSignature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  }

  private findMatchingPolicy(context: RequestContext): Policy | undefined {
    for (const policy of this.policies.values()) {
      if (policy.matches(context)) return policy;
    }
    return undefined;
  }

  private allow(context: RequestContext): PolicyDecision {
    const decision: PolicyDecision = {
      allowed: true,
      reason: 'all_checks_passed',
      policyId: 'zero-trust-default',
      coherenceScore: 1.0,
      timestamp: new Date().toISOString()
    };
    this.auditLog.push(decision);
    return decision;
  }

  private deny(context: RequestContext, reason: string): PolicyDecision {
    const decision: PolicyDecision = {
      allowed: false,
      reason,
      policyId: 'zero-trust-default',
      coherenceScore: 0,
      timestamp: new Date().toISOString()
    };
    this.auditLog.push(decision);
    return decision;
  }

  getAuditLog(): ReadonlyArray<PolicyDecision> {
    return [...this.auditLog];
  }
}

export interface Policy {
  readonly name: string;
  matches(context: RequestContext): boolean;
  evaluate(context: RequestContext): boolean;
}

export class RateLimitPolicy implements Policy {
  readonly name: string;
  private readonly counts: Map<string, { count: number; windowStart: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(name: string, trustLevel: number) {
    this.name = name;
    // φ-based rate limits: higher trust = more requests
    const fibIndex = Math.min(Math.floor(trustLevel * FIB.length), FIB.length - 1);
    this.windowMs = FIB[8] * 1000;             // 21 second window
    this.maxRequests = FIB[fibIndex] ?? FIB[5]; // Fibonacci-scaled by trust
  }

  matches(_context: RequestContext): boolean {
    return true; // Rate limit applies to all requests
  }

  evaluate(context: RequestContext): boolean {
    const key = `${context.sourceService}:${context.sourceIp}`;
    const now = Date.now();
    const entry = this.counts.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.counts.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxRequests) return false;
    entry.count++;
    return true;
  }
}
