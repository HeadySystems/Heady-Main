/**
 * Feature Flags — CSL-Gated with Fibonacci Rollout
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


export interface FeatureFlag {
  readonly name: string;
  readonly enabled: boolean;
  readonly rolloutPercent: number;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly segments: ReadonlyArray<string>;
  readonly dependencies: ReadonlyArray<string>;
  readonly coherenceGate: number;
}

// Fibonacci rollout steps: 1%, 1%, 2%, 3%, 5%, 8%, 13%, 21%, 34%, 55%, 89%, 100%
export const FIBONACCI_ROLLOUT_STEPS: ReadonlyArray<number> = [
  FIB[0], FIB[1], FIB[2], FIB[3], FIB[4], FIB[5],
  FIB[6], FIB[7], FIB[8], FIB[9], FIB[10], 100
];

export class FeatureFlagManager {
  private readonly flags: Map<string, FeatureFlag> = new Map();

  create(name: string, description: string, dependencies: ReadonlyArray<string> = []): FeatureFlag {
    const flag: FeatureFlag = {
      name,
      enabled: false,
      rolloutPercent: 0,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: [],
      dependencies,
      coherenceGate: CSL_THRESHOLD
    };
    this.flags.set(name, flag);
    return flag;
  }

  isEnabled(name: string, userId: string, coherenceScore: number = 1.0): boolean {
    const flag = this.flags.get(name);
    if (!flag || !flag.enabled) return false;

    // CSL coherence gate: only enable if system coherence is above threshold
    if (coherenceScore < flag.coherenceGate) return false;

    // Check dependencies
    for (const dep of flag.dependencies) {
      if (!this.isEnabled(dep, userId, coherenceScore)) return false;
    }

    // Deterministic hash-based rollout
    const hash = this.hashUserId(userId, name);
    const bucket = hash % 100;
    return bucket < flag.rolloutPercent;
  }

  advanceRollout(name: string): FeatureFlag | null {
    const flag = this.flags.get(name);
    if (!flag) return null;

    const currentIndex = FIBONACCI_ROLLOUT_STEPS.findIndex(step => step > flag.rolloutPercent);
    if (currentIndex === -1) return flag;

    const nextPercent = FIBONACCI_ROLLOUT_STEPS[currentIndex] ?? 100;
    const updated: FeatureFlag = {
      ...flag,
      enabled: true,
      rolloutPercent: nextPercent,
      updatedAt: new Date().toISOString()
    };
    this.flags.set(name, updated);
    return updated;
  }

  setRollout(name: string, percent: number): FeatureFlag | null {
    const flag = this.flags.get(name);
    if (!flag) return null;
    const updated: FeatureFlag = {
      ...flag,
      enabled: percent > 0,
      rolloutPercent: Math.min(Math.max(percent, 0), 100),
      updatedAt: new Date().toISOString()
    };
    this.flags.set(name, updated);
    return updated;
  }

  getAll(): ReadonlyArray<FeatureFlag> {
    return Array.from(this.flags.values());
  }

  get(name: string): FeatureFlag | undefined {
    return this.flags.get(name);
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = `${userId}:${flagName}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << FIB[4]) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
