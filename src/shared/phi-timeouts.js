// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/shared/phi-timeouts.js                                ║
// ║  LAYER: shared                                                   ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * φ-Derived Timeout Constants
 *
 * All timeouts are derived from the golden ratio (φ ≈ 1.618033988749895)
 * to eliminate arbitrary magic numbers per the FIXED-VALUE-AUDIT and
 * phi-math-foundation principles.
 *
 * φⁿ × 1000 (rounded to integer milliseconds):
 *   φ¹ = 1618    φ² = 2618    φ³ = 4236    φ⁴ = 6854
 *   φ⁵ = 11090   φ⁶ = 17944   φ⁷ = 29034   φ⁸ = 46979
 *
 * These match hcfullpipeline.json stage/step timeouts exactly.
 */

const PHI = 1.618033988749895;

/** φ¹ × 1000 — ultra-short operations (health pings, quick checks) */
const PHI_TIMEOUT_MICRO = Math.round(Math.pow(PHI, 1) * 1000);   // 1618

/** φ² × 1000 — very short operations (cache lookups, simple queries) */
const PHI_TIMEOUT_TINY = Math.round(Math.pow(PHI, 2) * 1000);    // 2618

/** φ³ × 1000 — short operations (DB queries, governance checks) */
const PHI_TIMEOUT_SHORT = Math.round(Math.pow(PHI, 3) * 1000);   // 4236

/** φ⁴ × 1000 — medium operations (embedding, bee spawn, recon scan) */
const PHI_TIMEOUT_MEDIUM = Math.round(Math.pow(PHI, 4) * 1000);  // 6854

/** φ⁵ × 1000 — default step timeout (verification, self-awareness) */
const PHI_TIMEOUT_DEFAULT = Math.round(Math.pow(PHI, 5) * 1000); // 11090

/** φ⁶ × 1000 — long operations (arena, trial sandbox, optimization) */
const PHI_TIMEOUT_LONG = Math.round(Math.pow(PHI, 6) * 1000);    // 17944

/** φ⁷ × 1000 — pipeline-level default (continuous search, evolution) */
const PHI_TIMEOUT_PIPELINE = Math.round(Math.pow(PHI, 7) * 1000); // 29034

/** φ⁸ × 1000 — LLM call maximum */
const PHI_TIMEOUT_LLM = Math.round(Math.pow(PHI, 8) * 1000);     // 46979

/** Graceful shutdown — same as default step timeout (φ⁵ × 1000) */
const SHUTDOWN_TIMEOUT_MS = PHI_TIMEOUT_DEFAULT;                   // 11090

/** Retry backoff sequence: φ¹×1000, φ²×1000, φ³×1000 */
const PHI_BACKOFF_MS = [PHI_TIMEOUT_MICRO, PHI_TIMEOUT_TINY, PHI_TIMEOUT_SHORT];

module.exports = {
    PHI,
    PHI_TIMEOUT_MICRO,
    PHI_TIMEOUT_TINY,
    PHI_TIMEOUT_SHORT,
    PHI_TIMEOUT_MEDIUM,
    PHI_TIMEOUT_DEFAULT,
    PHI_TIMEOUT_LONG,
    PHI_TIMEOUT_PIPELINE,
    PHI_TIMEOUT_LLM,
    SHUTDOWN_TIMEOUT_MS,
    PHI_BACKOFF_MS
};
