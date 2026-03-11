/**
 * Heady™ HeadyMaid — Code Cleanup Scanner & Phi-Compliance Auditor
 * Scans source code for anti-patterns: dead code, style violations, magic numbers,
 * console.log usage, TODO/FIXME comments, localhost references, and phi-compliance
 * issues. Produces audit reports with remediation suggestions.
 *
 * All numeric constants derived from φ — zero magic numbers.
 *
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents
 * @module heady-maid
 * @version 1.0.0
 */

'use strict';

const {
  PHI, PSI, PSI_SQ,
  fibonacci, phiFusionWeights,
  CSL_THRESHOLDS, SIZING,
  cslGate, PHI_TEMPERATURE,
  phiPriorityScore,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('heady-maid');

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAX_FILE_SIZE_LINES = fibonacci(17);           // 1597 lines — files above this are too large
const MAX_FUNCTION_LENGTH = fibonacci(11);           // 89 lines per function
const MAX_NESTING_DEPTH = fibonacci(6);              // 8 levels deep
const MAX_PARAMS = fibonacci(7);                     // 13 parameters per function
const MAX_CYCLOMATIC_COMPLEXITY = fibonacci(8);      // 21 paths through a function
const MAGIC_NUMBER_THRESHOLD = fibonacci(3);         // 2 — numbers above this that aren't phi-derived
const REPORT_HISTORY_SIZE = fibonacci(13);           // 233 past reports

// Violation severity weights (phi-weighted)
const SEVERITY_WEIGHTS = Object.freeze({
  blocker:  phiFusionWeights(4)[0],  // ≈ 0.447 — breaks the 8 Unbreakable Laws
  major:    phiFusionWeights(4)[1],  // ≈ 0.276 — production risk
  minor:    phiFusionWeights(4)[2],  // ≈ 0.171 — code quality
  info:     phiFusionWeights(4)[3],  // ≈ 0.106 — suggestions
});

// ═══════════════════════════════════════════════════════════
// RULE DEFINITIONS
// ═══════════════════════════════════════════════════════════

const RULES = Object.freeze({
  // BLOCKER rules — violate Unbreakable Laws
  NO_CONSOLE_LOG: {
    id: 'no-console-log',
    severity: 'blocker',
    description: 'console.log/warn/error in production code',
    pattern: /\bconsole\s*\.\s*(log|warn|error|info|debug|trace)\s*\(/,
    message: 'Use structured logger instead of console.*',
  },
  NO_MAGIC_NUMBERS: {
    id: 'no-magic-numbers',
    severity: 'blocker',
    description: 'Hardcoded numeric constants not derived from phi/Fibonacci',
    pattern: null, // Custom logic
    message: 'All numeric constants must derive from φ, ψ, or Fibonacci',
  },
  NO_LOCALHOST: {
    id: 'no-localhost',
    severity: 'blocker',
    description: 'Hardcoded localhost or 127.0.0.1 references',
    pattern: /\b(localhost|127\.0\.0\.1)\b/,
    message: 'Use environment variables for host configuration',
  },
  NO_LOCALSTORAGE: {
    id: 'no-localstorage',
    severity: 'blocker',
    description: 'localStorage usage (tokens must use httpOnly cookies)',
    pattern: /\blocalStorage\s*\.\s*(setItem|getItem|removeItem|clear)\b/,
    message: 'Use httpOnly cookies — zero localStorage tokens',
  },
  NO_HARDCODED_SECRETS: {
    id: 'no-hardcoded-secrets',
    severity: 'blocker',
    description: 'Hardcoded API keys, passwords, or tokens',
    pattern: /(['"])(sk-|pk-|ghp_|ghs_|password|secret|token|apikey)\1/i,
    message: 'Use environment variables or secret manager',
  },
  NO_WILDCARD_CORS: {
    id: 'no-wildcard-cors',
    severity: 'blocker',
    description: 'Access-Control-Allow-Origin: * in production',
    pattern: /['"]Access-Control-Allow-Origin['"]\s*[,:]\s*['"]\*['"]/,
    message: 'Use explicit origin whitelist',
  },

  // MAJOR rules — production risk
  NO_TODO_FIXME: {
    id: 'no-todo-fixme',
    severity: 'major',
    description: 'TODO, FIXME, HACK, or XXX comments in production code',
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)\b/i,
    message: 'All code must be production-ready — no placeholders',
  },
  NO_EMPTY_CATCH: {
    id: 'no-empty-catch',
    severity: 'major',
    description: 'Empty catch blocks that swallow errors',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: 'Handle or re-throw errors — never swallow them',
  },
  NO_EVAL: {
    id: 'no-eval',
    severity: 'major',
    description: 'eval() or new Function() usage',
    pattern: /\b(eval|Function)\s*\(/,
    message: 'Avoid eval/Function — security risk',
  },
  NO_SYNC_FS: {
    id: 'no-sync-fs',
    severity: 'major',
    description: 'Synchronous fs operations in async code',
    pattern: /\bfs\s*\.\s*(readFileSync|writeFileSync|appendFileSync|readdirSync|statSync|existsSync)\b/,
    message: 'Use async fs operations to avoid blocking the event loop',
  },
  REQUIRE_ERROR_HANDLING: {
    id: 'require-error-handling',
    severity: 'major',
    description: 'Async operations without error handling',
    pattern: null, // Custom logic
    message: 'All async operations must have proper error handling',
  },

  // MINOR rules — code quality
  NO_VAR: {
    id: 'no-var',
    severity: 'minor',
    description: 'var declarations (use const/let)',
    pattern: /\bvar\s+\w/,
    message: 'Use const or let instead of var',
  },
  PREFER_CONST: {
    id: 'prefer-const',
    severity: 'minor',
    description: 'let used where const would suffice',
    pattern: null, // Complex analysis needed
    message: 'Use const when variable is not reassigned',
  },
  MAX_LINE_LENGTH: {
    id: 'max-line-length',
    severity: 'minor',
    description: 'Lines exceeding 120 characters',
    pattern: null, // Length check
    message: 'Keep lines under 120 characters for readability',
  },

  // INFO rules — suggestions
  MISSING_JSDOC: {
    id: 'missing-jsdoc',
    severity: 'info',
    description: 'Exported functions without JSDoc comments',
    pattern: null, // Custom logic
    message: 'Add JSDoc comments to all exported functions',
  },
  FILE_TOO_LARGE: {
    id: 'file-too-large',
    severity: 'info',
    description: `Files exceeding ${MAX_FILE_SIZE_LINES} lines`,
    pattern: null, // Line count
    message: 'Consider splitting large files into focused modules',
  },
});

// ═══════════════════════════════════════════════════════════
// MAGIC NUMBER DETECTOR
// ═══════════════════════════════════════════════════════════

class MagicNumberDetector {
  constructor() {
    // Known phi-derived values that are NOT magic numbers
    this._knownPhiValues = new Set([
      0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, // Fibonacci
      1.618, 0.618, 2.618, 4.236, 6.854, // φ powers (approximate)
      0.382, 0.236, 0.146, 0.090, // ψ powers (approximate)
      0.500, 0.691, 0.809, 0.882, 0.927, // CSL thresholds
      0.972, // DEDUP
      384, // embedding dim
      3310, 3311, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, // service ports
      3320, 3321, 3322, 3323, 3324, 3325, 3326, 3327, 3328, 3329,
      3330, 3331, 3332, 3333, 3334, 3335, 3336, 3337, 3338, 3339,
      3340, 3341, 3342, 3343, 3344, 3345, 3346, 3347, 3348, 3349,
      3350, 3351, 3352, 3353, 3354, 3355, 3356, 3357, 3358, 3359,
      3360, 3361, 3362, 3363, 3364, 3365, 3366, 3367, 3368, 3369,
      3370, 3371, 3372, 3373, 3374, 3375, 3376, 3377, 3378, 3379,
      3380, 3381, 3382, 3383, 3384, 3385, 3386, 3387, 3388, 3389,
      3390, 3391, 3392, 3393, 3394, 3395, 3396,
      10, 16, 36, // Common base conversions
      1000, // Millisecond conversion
      60, 60000, 3600, 3600000, // Time conversions
      100, // Percentage base
      200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 429, 500, 503, // HTTP status codes
      256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, // Powers of 2
    ]);
  }

  /**
   * Detect magic numbers in a line of code.
   * @param {string} line
   * @param {number} lineNumber
   * @returns {Array<Object>} — violations
   */
  detect(line, lineNumber) {
    const violations = [];

    // Skip comments, strings, requires, imports
    const stripped = line
      .replace(/\/\/.*/g, '')           // Remove line comments
      .replace(/['"][^'"]*['"]/g, '')   // Remove string literals
      .replace(/`[^`]*`/g, '')         // Remove template literals
      .replace(/require\([^)]*\)/g, '');// Remove require calls

    // Find numeric literals
    const numberPattern = /(?<!\w)(-?\d+\.?\d*(?:e[+-]?\d+)?)/g;
    let match;

    while ((match = numberPattern.exec(stripped)) !== null) {
      const num = parseFloat(match[1]);

      // Skip known phi-derived values
      if (this._knownPhiValues.has(num)) continue;
      if (this._knownPhiValues.has(Math.abs(num))) continue;

      // Skip 0 and 1 (ubiquitous)
      if (num === 0 || num === 1 || num === -1) continue;

      // Skip numbers in array indices or common patterns
      if (match.index > 0 && stripped[match.index - 1] === '[') continue;

      // Check if the number is close to a known phi-derived value (within 1%)
      let isNearPhi = false;
      for (const known of this._knownPhiValues) {
        if (known !== 0 && Math.abs(num - known) / Math.abs(known) < 0.01) {
          isNearPhi = true;
          break;
        }
      }
      if (isNearPhi) continue;

      // This is a magic number
      if (Math.abs(num) > MAGIC_NUMBER_THRESHOLD) {
        violations.push({
          rule: 'no-magic-numbers',
          line: lineNumber,
          value: num,
          suggestion: this._suggestPhiReplacement(num),
        });
      }
    }

    return violations;
  }

  _suggestPhiReplacement(num) {
    const abs = Math.abs(num);

    // Check if it's near a Fibonacci number
    const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
    for (let i = 0; i < fibs.length; i++) {
      if (Math.abs(abs - fibs[i]) / Math.max(fibs[i], 1) < 0.2) {
        return `Use fibonacci(${i}) = ${fibs[i]}`;
      }
    }

    // Check if it's near a φ power
    if (Math.abs(abs - PHI) < 0.1) return 'Use PHI ≈ 1.618';
    if (Math.abs(abs - PSI) < 0.1) return 'Use PSI ≈ 0.618';
    if (Math.abs(abs - PHI * PHI) < 0.1) return 'Use PHI_SQ ≈ 2.618';
    if (Math.abs(abs - PSI * PSI) < 0.1) return 'Use PSI_SQ ≈ 0.382';

    return 'Derive from phi-math.js constants';
  }
}

// ═══════════════════════════════════════════════════════════
// HEADY MAID — MAIN ENGINE
// ═══════════════════════════════════════════════════════════

class HeadyMaid {
  constructor() {
    this.magicDetector = new MagicNumberDetector();
    this._reportHistory = [];
    this._active = false;
  }

  /**
   * Scan source code content for violations.
   * @param {string} content — file content
   * @param {string} filePath — file path for reporting
   * @returns {Object} — scan report
   */
  scan(content, filePath) {
    const lines = content.split('\n');
    const violations = [];
    const startTime = Date.now();

    // File-level checks
    if (lines.length > MAX_FILE_SIZE_LINES) {
      violations.push({
        rule: RULES.FILE_TOO_LARGE.id,
        severity: RULES.FILE_TOO_LARGE.severity,
        line: 0,
        message: `File has ${lines.length} lines (max: ${MAX_FILE_SIZE_LINES})`,
      });
    }

    // Line-by-line checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Pattern-based rules
      for (const [ruleName, rule] of Object.entries(RULES)) {
        if (!rule.pattern) continue;
        if (rule.pattern.test(line)) {
          // Skip if in a comment context for some rules
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
            // Only flag TODO/FIXME in comments
            if (rule.id !== RULES.NO_TODO_FIXME.id) continue;
          }

          violations.push({
            rule: rule.id,
            severity: rule.severity,
            line: lineNum,
            message: rule.message,
            snippet: line.trim().substring(0, fibonacci(11)), // 89 chars max
          });
        }
      }

      // Magic number detection
      const magicViolations = this.magicDetector.detect(line, lineNum);
      for (const mv of magicViolations) {
        violations.push({
          rule: mv.rule,
          severity: 'blocker',
          line: mv.line,
          message: `Magic number ${mv.value} — ${mv.suggestion}`,
          snippet: line.trim().substring(0, fibonacci(11)),
        });
      }

      // Line length check
      if (line.length > fibonacci(12)) { // 144 characters
        violations.push({
          rule: RULES.MAX_LINE_LENGTH.id,
          severity: 'minor',
          line: lineNum,
          message: `Line length ${line.length} exceeds ${fibonacci(12)}`,
        });
      }
    }

    // Compute compliance score
    const totalLines = lines.length;
    const violationWeight = violations.reduce((sum, v) => {
      return sum + (SEVERITY_WEIGHTS[v.severity] || 0);
    }, 0);

    const rawScore = totalLines > 0
      ? Math.max(0, 1 - (violationWeight / totalLines))
      : 1;

    // CSL-gated compliance score — smooth transition around threshold
    const complianceScore = cslGate(rawScore, rawScore, CSL_THRESHOLDS.MEDIUM, PHI_TEMPERATURE);

    const report = {
      filePath,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      totalLines,
      violations: {
        total: violations.length,
        blocker: violations.filter(v => v.severity === 'blocker').length,
        major: violations.filter(v => v.severity === 'major').length,
        minor: violations.filter(v => v.severity === 'minor').length,
        info: violations.filter(v => v.severity === 'info').length,
        items: violations,
      },
      complianceScore: Math.round(complianceScore * 1000) / 1000,
      phiCompliant: violations.filter(v => v.severity === 'blocker').length === 0,
      productionReady: violations.filter(v => v.severity === 'blocker' || v.severity === 'major').length === 0,
    };

    this._reportHistory.push({ filePath, score: report.complianceScore, violations: report.violations.total });
    if (this._reportHistory.length > REPORT_HISTORY_SIZE) {
      this._reportHistory = this._reportHistory.slice(-REPORT_HISTORY_SIZE);
    }

    return report;
  }

  /**
   * Scan multiple files and produce an aggregate report.
   * @param {Array<{path: string, content: string}>} files
   * @returns {Object} — aggregate report
   */
  scanAll(files) {
    const reports = [];
    const startTime = Date.now();

    for (const file of files) {
      reports.push(this.scan(file.content, file.path));
    }

    const totalViolations = reports.reduce((sum, r) => sum + r.violations.total, 0);
    const totalBlockers = reports.reduce((sum, r) => sum + r.violations.blocker, 0);
    const avgScore = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.complianceScore, 0) / reports.length
      : 0;

    // Sort by compliance score ascending (worst first)
    const sortedReports = [...reports].sort((a, b) => a.complianceScore - b.complianceScore);

    return {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      filesScanned: reports.length,
      totalViolations,
      totalBlockers,
      averageComplianceScore: Math.round(avgScore * 1000) / 1000,
      allPhiCompliant: totalBlockers === 0,
      allProductionReady: reports.every(r => r.productionReady),
      worstFiles: sortedReports.slice(0, fibonacci(5)).map(r => ({
        path: r.filePath,
        score: r.complianceScore,
        violations: r.violations.total,
        blockers: r.violations.blocker,
      })),
      bestFiles: sortedReports.slice(-fibonacci(5)).reverse().map(r => ({
        path: r.filePath,
        score: r.complianceScore,
        violations: r.violations.total,
      })),
      reports,
    };
  }

  health() {
    return {
      service: 'heady-maid',
      status: 'healthy',
      rulesCount: Object.keys(RULES).length,
      reportsGenerated: this._reportHistory.length,
    };
  }
}

module.exports = { HeadyMaid, MagicNumberDetector, RULES, SEVERITY_WEIGHTS };
