export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const PHI_SQUARED = PHI ** 2;
export const PHI_CUBED = PHI ** 3;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765] as const;
export const CSL_THRESHOLDS = {
  MINIMUM: 0.5,
  LOW: 0.691,
  MEDIUM: 0.809,
  HIGH: 0.882,
  CRITICAL: 0.927,
  DEDUP: 0.972,
} as const;
