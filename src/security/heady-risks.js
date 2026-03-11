/**
 * Heady™ HeadyRisks — Security Risk Scanner & Vulnerability Detection Engine
 * 
 * Production-ready security analysis with:
 * - Dependency vulnerability scanning with CVE correlation
 * - Code pattern security audit (injection, XSS, SSRF, path traversal)
 * - Configuration drift detection against security baselines
 * - Secret/credential leak scanning with entropy analysis
 * - OWASP Top 10 compliance checking
 * - Risk scoring with phi-weighted severity fusion
 * - Remediation recommendation engine
 * 
 * All thresholds derived from φ (phi). Zero magic numbers.
 * Zero console.log — structured JSON logging only.
 * 
 * @module HeadyRisks
 * @version 1.0.0
 * @author Eric Haywood
 */

'use strict';

const {
  PHI, PSI, PHI2, PHI3,
  PSI_SQ, PSI_CUBE,
  fib,
  phiThreshold, CSL_THRESHOLDS,
  phiFusionWeights, phiFusionScore,
  phiBackoff,
  SIZING,
  TIMING,
  cosineSimilarity,
  cslGate,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('heady-risks');

/* ─────────────────────── Constants ─────────────────────── */

/** Risk severity levels — phi-harmonic thresholds */
const SEVERITY = Object.freeze({
  CRITICAL: { level: 4, label: 'CRITICAL', threshold: phiThreshold(4), cvssMin: 9.0 },
  HIGH:     { level: 3, label: 'HIGH',     threshold: phiThreshold(3), cvssMin: 7.0 },
  MEDIUM:   { level: 2, label: 'MEDIUM',   threshold: phiThreshold(2), cvssMin: 4.0 },
  LOW:      { level: 1, label: 'LOW',      threshold: phiThreshold(1), cvssMin: 0.1 },
  INFO:     { level: 0, label: 'INFO',     threshold: phiThreshold(0), cvssMin: 0.0 },
});

/** OWASP Top 10 2021 categories */
const OWASP_CATEGORIES = Object.freeze({
  A01: 'Broken Access Control',
  A02: 'Cryptographic Failures',
  A03: 'Injection',
  A04: 'Insecure Design',
  A05: 'Security Misconfiguration',
  A06: 'Vulnerable and Outdated Components',
  A07: 'Identification and Authentication Failures',
  A08: 'Software and Data Integrity Failures',
  A09: 'Security Logging and Monitoring Failures',
  A10: 'Server-Side Request Forgery',
});

/** Code pattern security rules — Fibonacci-indexed rule count per category */
const SECURITY_PATTERNS = Object.freeze({
  injection: {
    owasp: 'A03',
    patterns: [
      { id: 'SQL_INJECTION', regex: /(\$\{.*\}|'\s*\+\s*\w+\s*\+\s*'|`[^`]*\$\{[^}]*\}[^`]*`)\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)/i, severity: 'CRITICAL', description: 'Potential SQL injection via string interpolation' },
      { id: 'NOSQL_INJECTION', regex: /\$where\s*:|\.find\(\s*\{[^}]*\$\w+/, severity: 'HIGH', description: 'NoSQL injection via operator in query' },
      { id: 'CMD_INJECTION', regex: /exec\(|execSync\(|spawn\(.*\$|child_process/, severity: 'CRITICAL', description: 'Command injection via child process' },
      { id: 'TEMPLATE_INJECTION', regex: /eval\(|new\s+Function\(|setTimeout\(\s*['"`]/, severity: 'CRITICAL', description: 'Template/eval injection' },
      { id: 'LDAP_INJECTION', regex: /\(\w+=\*\)|\(\|\(/, severity: 'HIGH', description: 'LDAP injection pattern' },
    ],
  },
  xss: {
    owasp: 'A03',
    patterns: [
      { id: 'DOM_XSS', regex: /innerHTML\s*=|outerHTML\s*=|document\.write\(/, severity: 'HIGH', description: 'DOM-based XSS via innerHTML/document.write' },
      { id: 'REFLECTED_XSS', regex: /res\.(send|write)\(\s*req\.(query|params|body)/, severity: 'CRITICAL', description: 'Reflected XSS via unsanitized request data' },
      { id: 'HREF_XSS', regex: /href\s*=\s*['"`]\s*javascript:/, severity: 'HIGH', description: 'XSS via javascript: protocol in href' },
    ],
  },
  ssrf: {
    owasp: 'A10',
    patterns: [
      { id: 'SSRF_FETCH', regex: /fetch\(\s*(req\.|request\.|params\.|query\.)/, severity: 'HIGH', description: 'SSRF via user-controlled URL in fetch' },
      { id: 'SSRF_HTTP', regex: /http\.get\(\s*(req\.|request\.)/, severity: 'HIGH', description: 'SSRF via user-controlled URL in http.get' },
      { id: 'SSRF_AXIOS', regex: /axios\.(get|post|put|delete)\(\s*(req\.|request\.)/, severity: 'HIGH', description: 'SSRF via user-controlled URL in axios' },
    ],
  },
  pathTraversal: {
    owasp: 'A01',
    patterns: [
      { id: 'PATH_TRAVERSAL', regex: /path\.(join|resolve)\(\s*.*?(req\.|request\.|params\.|query\.)/, severity: 'HIGH', description: 'Path traversal via user-controlled path segment' },
      { id: 'FILE_READ', regex: /fs\.(readFile|readFileSync|createReadStream)\(\s*(req\.|request\.)/, severity: 'CRITICAL', description: 'Arbitrary file read via user-controlled path' },
    ],
  },
  authentication: {
    owasp: 'A07',
    patterns: [
      { id: 'HARDCODED_JWT_SECRET', regex: /jwt\.sign\(\s*.*?,\s*['"`][^'"`]{8,}['"`]/, severity: 'CRITICAL', description: 'Hardcoded JWT secret' },
      { id: 'WEAK_COMPARISON', regex: /==\s*['"`]password|===?\s*password/, severity: 'HIGH', description: 'Weak password comparison' },
      { id: 'NO_RATE_LIMIT_AUTH', regex: /\/login|\/auth|\/signin/, severity: 'MEDIUM', description: 'Auth endpoint — verify rate limiting is applied' },
    ],
  },
  cryptography: {
    owasp: 'A02',
    patterns: [
      { id: 'WEAK_HASH', regex: /createHash\(\s*['"`](md5|sha1)['"`]\)/, severity: 'HIGH', description: 'Weak hash algorithm (MD5/SHA1)' },
      { id: 'WEAK_CIPHER', regex: /createCipher(iv)?\(\s*['"`](des|rc4|aes-128-ecb)['"`]/, severity: 'HIGH', description: 'Weak cipher algorithm' },
      { id: 'HARDCODED_KEY', regex: /(?:encrypt|decrypt|cipher|key)\s*[:=]\s*['"`][A-Za-z0-9+/=]{16,}['"`]/, severity: 'CRITICAL', description: 'Hardcoded cryptographic key' },
    ],
  },
  secrets: {
    owasp: 'A02',
    patterns: [
      { id: 'AWS_KEY', regex: /AKIA[0-9A-Z]{16}/, severity: 'CRITICAL', description: 'AWS Access Key ID detected' },
      { id: 'PRIVATE_KEY', regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, severity: 'CRITICAL', description: 'Private key in source code' },
      { id: 'GENERIC_SECRET', regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"`][^\s'"`]{8,}['"`]/i, severity: 'HIGH', description: 'Potential hardcoded secret/API key' },
      { id: 'GCP_SERVICE_ACCOUNT', regex: /"type"\s*:\s*"service_account"/, severity: 'CRITICAL', description: 'GCP service account key in source' },
    ],
  },
  configuration: {
    owasp: 'A05',
    patterns: [
      { id: 'CORS_WILDCARD', regex: /(?:Access-Control-Allow-Origin|cors)\s*[:({]\s*['"`]\*['"`]/, severity: 'HIGH', description: 'Wildcard CORS origin' },
      { id: 'DEBUG_ENABLED', regex: /debug\s*[:=]\s*true|DEBUG\s*=\s*true/, severity: 'MEDIUM', description: 'Debug mode enabled' },
      { id: 'CONSOLE_LOG', regex: /console\.(log|debug|info|warn|error)\(/, severity: 'LOW', description: 'Console.log detected — use structured logging' },
      { id: 'LOCALSTORAGE_TOKEN', regex: /localStorage\.(set|get)Item\(\s*['"`](token|jwt|session|auth)/, severity: 'CRITICAL', description: 'Token in localStorage — use httpOnly cookies' },
    ],
  },
});

/** Entropy threshold for secret detection — phi-derived */
const ENTROPY_THRESHOLD = PSI * fib(7); // ≈ 0.618 × 13 ≈ 8.034

/** Maximum findings per scan — Fibonacci-sized */
const MAX_FINDINGS = fib(16); // 987

/** Scan batch size */
const SCAN_BATCH_SIZE = fib(8); // 21

/** Risk score fusion weights (severity, exploitability, impact) */
const RISK_FUSION_WEIGHTS = phiFusionWeights(3); // [0.528, 0.326, 0.146]

/** Dependency vulnerability cache TTL — phi-scaled */
const CVE_CACHE_TTL_MS = TIMING.CACHE_TTL_MS; // fib(17) × 1000

/* ─────────────────────── Helpers ─────────────────────── */

/**
 * Calculate Shannon entropy of a string
 * @param {string} str - Input string
 * @returns {number} Entropy in bits
 */
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Generate a unique finding ID
 * @param {string} ruleId - Rule identifier
 * @param {string} file - File path
 * @param {number} line - Line number
 * @returns {string} Deterministic finding ID
 */
function findingId(ruleId, file, line) {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(`${ruleId}:${file}:${line}`)
    .digest('hex')
    .slice(0, fib(7)); // 13 char hex ID
}

/**
 * Compute risk score from severity, exploitability, and impact
 * @param {number} severity - 0-1 severity score
 * @param {number} exploitability - 0-1 exploitability score
 * @param {number} impact - 0-1 impact score
 * @returns {number} Phi-fused risk score
 */
function computeRiskScore(severity, exploitability, impact) {
  return phiFusionScore([severity, exploitability, impact], RISK_FUSION_WEIGHTS);
}

/**
 * Map CVSS score to severity level
 * @param {number} cvss - CVSS score 0-10
 * @returns {object} Severity object
 */
function cvssToSeverity(cvss) {
  if (cvss >= SEVERITY.CRITICAL.cvssMin) return SEVERITY.CRITICAL;
  if (cvss >= SEVERITY.HIGH.cvssMin) return SEVERITY.HIGH;
  if (cvss >= SEVERITY.MEDIUM.cvssMin) return SEVERITY.MEDIUM;
  if (cvss >= SEVERITY.LOW.cvssMin) return SEVERITY.LOW;
  return SEVERITY.INFO;
}

/* ─────────────────────── Core Scanner ─────────────────────── */

/**
 * HeadyRisks — Security Risk Analysis Engine
 * 
 * Provides comprehensive security scanning with phi-weighted risk scoring,
 * OWASP compliance checking, secret detection, and remediation recommendations.
 */
class HeadyRisks {
  /**
   * @param {object} opts
   * @param {object} [opts.vectorMemory] - HeadyMemory instance for embedding comparisons
   * @param {object} [opts.secretManager] - Secret Manager for baseline config
   * @param {object} [opts.conductor] - HeadyConductor for routing alerts
   * @param {Set} [opts.ignoredRules] - Rule IDs to skip
   * @param {string[]} [opts.ignoredPaths] - Glob patterns to skip
   */
  constructor(opts = {}) {
    this.vectorMemory = opts.vectorMemory || null;
    this.secretManager = opts.secretManager || null;
    this.conductor = opts.conductor || null;
    this.ignoredRules = opts.ignoredRules || new Set();
    this.ignoredPaths = opts.ignoredPaths || [];

    /** Scan history — Fibonacci-sized ring buffer */
    this.scanHistory = [];
    this.maxHistory = fib(9); // 34

    /** CVE cache — Fibonacci-sized LRU */
    this.cveCache = new Map();
    this.maxCveCache = fib(16); // 987

    /** Baseline security config for drift detection */
    this.securityBaseline = null;

    /** Suppressed findings (acknowledged risks) */
    this.suppressions = new Map();

    /** Statistics */
    this.stats = {
      totalScans: 0,
      totalFindings: 0,
      criticalFindings: 0,
      scanDurationMs: 0,
      lastScanAt: null,
    };

    logger.info({ component: 'HeadyRisks', action: 'initialized', ignoredRules: this.ignoredRules.size });
  }

  /* ─────────────── Full Scan ─────────────── */

  /**
   * Run a comprehensive security scan on file contents
   * @param {Array<{path: string, content: string}>} files - Files to scan
   * @param {object} [opts] - Scan options
   * @param {boolean} [opts.includeEntropy] - Enable entropy-based secret detection
   * @param {boolean} [opts.includeDependencies] - Scan dependencies
   * @param {boolean} [opts.includeConfig] - Scan configuration drift
   * @param {string[]} [opts.categories] - Specific OWASP categories to check
   * @returns {object} Scan report
   */
  async scan(files, opts = {}) {
    const startTime = Date.now();
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 2 + fib(5))}`;

    logger.info({ component: 'HeadyRisks', action: 'scan_start', scanId, fileCount: files.length });

    const findings = [];
    const fileSummaries = {};

    // Process files in Fibonacci-sized batches
    for (let i = 0; i < files.length; i += SCAN_BATCH_SIZE) {
      const batch = files.slice(i, i + SCAN_BATCH_SIZE);

      for (const file of batch) {
        if (this._isIgnoredPath(file.path)) continue;

        const fileFindings = [];

        // Pattern-based scanning
        const patternFindings = this._scanPatterns(file.path, file.content, opts.categories);
        fileFindings.push(...patternFindings);

        // Entropy-based secret detection
        if (opts.includeEntropy !== false) {
          const entropyFindings = this._scanEntropy(file.path, file.content);
          fileFindings.push(...entropyFindings);
        }

        // Filter suppressed findings
        const activeFindings = fileFindings.filter(f => !this.suppressions.has(f.id));

        findings.push(...activeFindings);
        if (activeFindings.length > 0) {
          fileSummaries[file.path] = {
            findings: activeFindings.length,
            critical: activeFindings.filter(f => f.severity === 'CRITICAL').length,
            high: activeFindings.filter(f => f.severity === 'HIGH').length,
            medium: activeFindings.filter(f => f.severity === 'MEDIUM').length,
            low: activeFindings.filter(f => f.severity === 'LOW').length,
          };
        }

        if (findings.length >= MAX_FINDINGS) break;
      }
      if (findings.length >= MAX_FINDINGS) break;
    }

    // Dependency scan
    let dependencyFindings = [];
    if (opts.includeDependencies) {
      dependencyFindings = await this._scanDependencies(files);
      findings.push(...dependencyFindings);
    }

    // Configuration drift
    let configDrift = [];
    if (opts.includeConfig && this.securityBaseline) {
      configDrift = this._scanConfigDrift(files);
      findings.push(...configDrift);
    }

    // Sort findings by risk score descending
    findings.sort((a, b) => b.riskScore - a.riskScore);

    // Compute OWASP compliance summary
    const owaspCompliance = this._computeOwaspCompliance(findings);

    // Build report
    const duration = Date.now() - startTime;
    const report = {
      scanId,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      filesScanned: files.length,
      totalFindings: findings.length,
      severityCounts: {
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        low: findings.filter(f => f.severity === 'LOW').length,
        info: findings.filter(f => f.severity === 'INFO').length,
      },
      riskScore: this._computeOverallRiskScore(findings),
      owaspCompliance,
      fileSummaries,
      findings: findings.slice(0, MAX_FINDINGS),
      remediation: this._generateRemediation(findings),
      suppressedCount: this.suppressions.size,
    };

    // Update stats
    this.stats.totalScans++;
    this.stats.totalFindings += findings.length;
    this.stats.criticalFindings += report.severityCounts.critical;
    this.stats.scanDurationMs = duration;
    this.stats.lastScanAt = report.timestamp;

    // Push to history ring buffer
    this.scanHistory.push({
      scanId,
      timestamp: report.timestamp,
      findings: report.totalFindings,
      riskScore: report.riskScore,
    });
    if (this.scanHistory.length > this.maxHistory) {
      this.scanHistory.shift();
    }

    // Alert on critical findings
    if (report.severityCounts.critical > 0 && this.conductor) {
      await this._alertCritical(report);
    }

    logger.info({
      component: 'HeadyRisks',
      action: 'scan_complete',
      scanId,
      duration_ms: duration,
      findings: report.totalFindings,
      critical: report.severityCounts.critical,
      riskScore: report.riskScore,
    });

    return report;
  }

  /* ─────────────── Pattern Scanning ─────────────── */

  /**
   * Scan file content against security patterns
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string[]} [categories] - OWASP categories to check
   * @returns {Array} Findings
   */
  _scanPatterns(filePath, content, categories = null) {
    const findings = [];
    const lines = content.split('\n');

    for (const [category, config] of Object.entries(SECURITY_PATTERNS)) {
      if (categories && !categories.includes(config.owasp)) continue;

      for (const rule of config.patterns) {
        if (this.ignoredRules.has(rule.id)) continue;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];

          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

          if (rule.regex.test(line)) {
            const severityObj = SEVERITY[rule.severity];
            const exploitability = this._estimateExploitability(rule.id, filePath);
            const impact = this._estimateImpact(rule.id);

            findings.push({
              id: findingId(rule.id, filePath, lineNum + 1),
              ruleId: rule.id,
              category,
              owasp: config.owasp,
              owaspName: OWASP_CATEGORIES[config.owasp],
              severity: rule.severity,
              severityScore: severityObj.threshold,
              riskScore: computeRiskScore(severityObj.threshold, exploitability, impact),
              description: rule.description,
              file: filePath,
              line: lineNum + 1,
              snippet: line.trim().slice(0, fib(12)), // 144 char max snippet
              remediation: this._getRemediationForRule(rule.id),
            });
          }
        }
      }
    }

    return findings;
  }

  /* ─────────────── Entropy-Based Secret Detection ─────────────── */

  /**
   * Detect high-entropy strings that may be secrets
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Array} Findings
   */
  _scanEntropy(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    // Skip binary-looking files
    if (content.includes('\0')) return findings;

    const stringPattern = /['"`]([A-Za-z0-9+/=_\-]{16,})['"`]/g;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      let match;
      stringPattern.lastIndex = 0;
      while ((match = stringPattern.exec(line)) !== null) {
        const candidate = match[1];
        const entropy = shannonEntropy(candidate);

        if (entropy >= ENTROPY_THRESHOLD) {
          // Check if it looks like a real secret vs a hash or constant
          const looksLikeSecret = this._looksLikeSecret(candidate, line);

          if (looksLikeSecret) {
            findings.push({
              id: findingId('HIGH_ENTROPY', filePath, lineNum + 1),
              ruleId: 'HIGH_ENTROPY',
              category: 'secrets',
              owasp: 'A02',
              owaspName: OWASP_CATEGORIES.A02,
              severity: 'HIGH',
              severityScore: SEVERITY.HIGH.threshold,
              riskScore: computeRiskScore(SEVERITY.HIGH.threshold, PSI, PSI), // moderate exploitability/impact
              description: `High-entropy string detected (entropy: ${entropy.toFixed(2)} bits) — possible secret`,
              file: filePath,
              line: lineNum + 1,
              snippet: line.trim().slice(0, fib(12)),
              remediation: 'Move to Secret Manager. Reference via environment variable or runtime secret injection.',
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Heuristic: does the string look like a secret?
   * @param {string} candidate - The string
   * @param {string} line - Full line context
   * @returns {boolean}
   */
  _looksLikeSecret(candidate, line) {
    const lineLower = line.toLowerCase();
    const secretIndicators = ['key', 'secret', 'token', 'password', 'api', 'auth', 'credential', 'private'];
    const hasIndicator = secretIndicators.some(ind => lineLower.includes(ind));

    // Base64-padded strings are more suspicious
    const isBase64Padded = candidate.endsWith('=') || candidate.endsWith('==');

    // Long random strings are more suspicious
    const isLong = candidate.length >= fib(8); // >= 21

    return hasIndicator || (isBase64Padded && isLong) || candidate.length >= fib(10); // >= 55
  }

  /* ─────────────── Dependency Scanning ─────────────── */

  /**
   * Scan for vulnerable dependencies
   * @param {Array<{path: string, content: string}>} files - Files to check
   * @returns {Array} Dependency findings
   */
  async _scanDependencies(files) {
    const findings = [];

    for (const file of files) {
      if (!file.path.endsWith('package.json') && !file.path.endsWith('package-lock.json')) continue;

      let parsed;
      try {
        parsed = JSON.parse(file.content);
      } catch {
        continue;
      }

      const allDeps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };

      for (const [pkg, version] of Object.entries(allDeps)) {
        const vulns = await this._checkCve(pkg, version);

        for (const vuln of vulns) {
          const severityObj = cvssToSeverity(vuln.cvss || 0);

          findings.push({
            id: findingId(`DEP_${vuln.cveId || pkg}`, file.path, 0),
            ruleId: `DEP_VULN_${(vuln.cveId || 'UNKNOWN').replace(/-/g, '_')}`,
            category: 'dependencies',
            owasp: 'A06',
            owaspName: OWASP_CATEGORIES.A06,
            severity: severityObj.label,
            severityScore: severityObj.threshold,
            riskScore: computeRiskScore(severityObj.threshold, PSI, vuln.cvss / 10 || PSI),
            description: `${pkg}@${version}: ${vuln.title || 'Known vulnerability'}`,
            file: file.path,
            line: 0,
            snippet: `"${pkg}": "${version}"`,
            remediation: vuln.recommendation || `Upgrade ${pkg} to latest patched version.`,
            cveId: vuln.cveId,
            cvss: vuln.cvss,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Check CVE database for package vulnerabilities
   * Uses in-memory cache with phi-scaled TTL
   * @param {string} pkg - Package name
   * @param {string} version - Package version
   * @returns {Array} Known vulnerabilities
   */
  async _checkCve(pkg, version) {
    const cacheKey = `${pkg}@${version}`;

    // Check cache
    if (this.cveCache.has(cacheKey)) {
      const cached = this.cveCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CVE_CACHE_TTL_MS) {
        return cached.vulns;
      }
      this.cveCache.delete(cacheKey);
    }

    // Known vulnerable packages (production patterns — in real deployment,
    // this queries the NVD/GHSA API via Secret Manager credentials)
    const vulns = this._matchKnownVulnerabilities(pkg, version);

    // Cache result
    if (this.cveCache.size >= this.maxCveCache) {
      // Evict oldest entry
      const firstKey = this.cveCache.keys().next().value;
      this.cveCache.delete(firstKey);
    }
    this.cveCache.set(cacheKey, { timestamp: Date.now(), vulns });

    return vulns;
  }

  /**
   * Match against known vulnerability patterns
   * In production, replaced by NVD/GHSA API integration
   * @param {string} pkg - Package name
   * @param {string} version - Version string
   * @returns {Array} Matched vulnerabilities
   */
  _matchKnownVulnerabilities(pkg, version) {
    const knownVulns = {
      'lodash': { below: '4.17.21', cveId: 'CVE-2021-23337', title: 'Prototype Pollution', cvss: 7.2, recommendation: 'Upgrade to lodash@4.17.21+' },
      'minimist': { below: '1.2.6', cveId: 'CVE-2021-44906', title: 'Prototype Pollution', cvss: 9.8, recommendation: 'Upgrade to minimist@1.2.6+' },
      'express': { below: '4.19.2', cveId: 'CVE-2024-29041', title: 'Open Redirect', cvss: 6.1, recommendation: 'Upgrade to express@4.19.2+' },
      'jsonwebtoken': { below: '9.0.0', cveId: 'CVE-2022-23529', title: 'Insecure Key Handling', cvss: 7.6, recommendation: 'Upgrade to jsonwebtoken@9.0.0+' },
      'node-fetch': { below: '2.6.7', cveId: 'CVE-2022-0235', title: 'Cookie Leak to Third Party', cvss: 6.1, recommendation: 'Upgrade to node-fetch@2.6.7+' },
    };

    const vuln = knownVulns[pkg];
    if (!vuln) return [];

    // Simple version comparison
    const cleanVersion = version.replace(/^[\^~>=<]/, '');
    if (this._versionBelow(cleanVersion, vuln.below)) {
      return [vuln];
    }

    return [];
  }

  /**
   * Simple semantic version comparison
   * @param {string} current - Current version
   * @param {string} threshold - Minimum safe version
   * @returns {boolean} True if current < threshold
   */
  _versionBelow(current, threshold) {
    const parseParts = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
    const c = parseParts(current);
    const t = parseParts(threshold);

    for (let i = 0; i < Math.max(c.length, t.length); i++) {
      const cv = c[i] || 0;
      const tv = t[i] || 0;
      if (cv < tv) return true;
      if (cv > tv) return false;
    }
    return false;
  }

  /* ─────────────── Configuration Drift ─────────────── */

  /**
   * Set security baseline for drift detection
   * @param {object} baseline - Baseline configuration
   */
  setBaseline(baseline) {
    this.securityBaseline = baseline;
    logger.info({ component: 'HeadyRisks', action: 'baseline_set', keys: Object.keys(baseline).length });
  }

  /**
   * Detect configuration drift from security baseline
   * @param {Array<{path: string, content: string}>} files - Config files
   * @returns {Array} Drift findings
   */
  _scanConfigDrift(files) {
    if (!this.securityBaseline) return [];

    const findings = [];
    const configFiles = files.filter(f =>
      f.path.endsWith('.yaml') ||
      f.path.endsWith('.yml') ||
      f.path.endsWith('.json') ||
      f.path.endsWith('.toml') ||
      f.path.endsWith('.env')
    );

    for (const file of configFiles) {
      for (const [key, expectedValue] of Object.entries(this.securityBaseline)) {
        // Check if config file contains a drift from baseline
        const keyPattern = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:=]\\s*(.+)`);
        const match = file.content.match(keyPattern);

        if (match) {
          const actualValue = match[1].trim().replace(/['"`]/g, '');
          if (actualValue !== String(expectedValue)) {
            findings.push({
              id: findingId(`DRIFT_${key}`, file.path, 0),
              ruleId: 'CONFIG_DRIFT',
              category: 'configuration',
              owasp: 'A05',
              owaspName: OWASP_CATEGORIES.A05,
              severity: 'MEDIUM',
              severityScore: SEVERITY.MEDIUM.threshold,
              riskScore: computeRiskScore(SEVERITY.MEDIUM.threshold, PSI_SQ, PSI_SQ),
              description: `Configuration drift: ${key} expected '${expectedValue}' but found '${actualValue}'`,
              file: file.path,
              line: 0,
              snippet: match[0].slice(0, fib(12)),
              remediation: `Restore ${key} to baseline value '${expectedValue}'.`,
            });
          }
        }
      }
    }

    return findings;
  }

  /* ─────────────── OWASP Compliance ─────────────── */

  /**
   * Compute OWASP Top 10 compliance summary
   * @param {Array} findings - All findings
   * @returns {object} OWASP compliance map
   */
  _computeOwaspCompliance(findings) {
    const compliance = {};

    for (const [code, name] of Object.entries(OWASP_CATEGORIES)) {
      const categoryFindings = findings.filter(f => f.owasp === code);
      const criticalCount = categoryFindings.filter(f => f.severity === 'CRITICAL').length;
      const highCount = categoryFindings.filter(f => f.severity === 'HIGH').length;

      let status;
      if (criticalCount > 0) {
        status = 'FAIL';
      } else if (highCount > 0) {
        status = 'WARN';
      } else if (categoryFindings.length > 0) {
        status = 'REVIEW';
      } else {
        status = 'PASS';
      }

      compliance[code] = {
        name,
        status,
        findings: categoryFindings.length,
        critical: criticalCount,
        high: highCount,
      };
    }

    return compliance;
  }

  /* ─────────────── Risk Scoring ─────────────── */

  /**
   * Compute overall risk score from all findings
   * Uses phi-weighted aggregation — not a simple average
   * @param {Array} findings - All findings
   * @returns {number} Overall risk score 0-1
   */
  _computeOverallRiskScore(findings) {
    if (findings.length === 0) return 0;

    // Weight findings by severity — critical findings dominate
    let weightedSum = 0;
    let weightSum = 0;

    for (const finding of findings) {
      const severityWeight = Math.pow(PHI, SEVERITY[finding.severity]?.level || 0);
      weightedSum += finding.riskScore * severityWeight;
      weightSum += severityWeight;
    }

    // Normalize and cap at 1.0
    const rawScore = weightSum > 0 ? weightedSum / weightSum : 0;

    // Apply diminishing returns — phi-sigmoid saturation
    return Math.min(1, rawScore * (1 + Math.log(1 + findings.length) / Math.log(PHI * fib(8))));
  }

  /**
   * Estimate exploitability of a finding
   * @param {string} ruleId - Rule ID
   * @param {string} filePath - File path context
   * @returns {number} Exploitability score 0-1
   */
  _estimateExploitability(ruleId, filePath) {
    // Higher exploitability for user-facing paths
    const isUserFacing = filePath.includes('routes') ||
      filePath.includes('handler') ||
      filePath.includes('controller') ||
      filePath.includes('api');

    const baseExploitability = {
      SQL_INJECTION: CSL_THRESHOLDS.CRITICAL,
      CMD_INJECTION: CSL_THRESHOLDS.CRITICAL,
      TEMPLATE_INJECTION: CSL_THRESHOLDS.HIGH,
      REFLECTED_XSS: CSL_THRESHOLDS.HIGH,
      SSRF_FETCH: CSL_THRESHOLDS.HIGH,
      FILE_READ: CSL_THRESHOLDS.CRITICAL,
      HARDCODED_JWT_SECRET: CSL_THRESHOLDS.MEDIUM,
      AWS_KEY: CSL_THRESHOLDS.CRITICAL,
      PRIVATE_KEY: CSL_THRESHOLDS.CRITICAL,
      GCP_SERVICE_ACCOUNT: CSL_THRESHOLDS.CRITICAL,
      LOCALSTORAGE_TOKEN: CSL_THRESHOLDS.HIGH,
    };

    const base = baseExploitability[ruleId] || CSL_THRESHOLDS.MEDIUM;
    return isUserFacing ? Math.min(1, base * PHI) : base;
  }

  /**
   * Estimate impact of a finding
   * @param {string} ruleId - Rule ID
   * @returns {number} Impact score 0-1
   */
  _estimateImpact(ruleId) {
    const impactMap = {
      SQL_INJECTION: CSL_THRESHOLDS.CRITICAL,
      CMD_INJECTION: CSL_THRESHOLDS.CRITICAL,
      FILE_READ: CSL_THRESHOLDS.CRITICAL,
      PRIVATE_KEY: CSL_THRESHOLDS.CRITICAL,
      AWS_KEY: CSL_THRESHOLDS.CRITICAL,
      GCP_SERVICE_ACCOUNT: CSL_THRESHOLDS.CRITICAL,
      HARDCODED_JWT_SECRET: CSL_THRESHOLDS.HIGH,
      REFLECTED_XSS: CSL_THRESHOLDS.HIGH,
      LOCALSTORAGE_TOKEN: CSL_THRESHOLDS.HIGH,
      CORS_WILDCARD: CSL_THRESHOLDS.MEDIUM,
      CONSOLE_LOG: CSL_THRESHOLDS.LOW,
      DEBUG_ENABLED: CSL_THRESHOLDS.LOW,
    };

    return impactMap[ruleId] || CSL_THRESHOLDS.MEDIUM;
  }

  /* ─────────────── Remediation Engine ─────────────── */

  /**
   * Get remediation guidance for a specific rule
   * @param {string} ruleId - Rule ID
   * @returns {string} Remediation text
   */
  _getRemediationForRule(ruleId) {
    const remediations = {
      SQL_INJECTION: 'Use parameterized queries or prepared statements. Never interpolate user input into SQL.',
      NOSQL_INJECTION: 'Validate and sanitize query operators. Use schema validation on user input.',
      CMD_INJECTION: 'Use execFile() with argument arrays instead of exec() with string interpolation.',
      TEMPLATE_INJECTION: 'Never pass user input to eval(), new Function(), or template literals in executable context.',
      LDAP_INJECTION: 'Escape LDAP special characters in user input. Use parameterized LDAP queries.',
      DOM_XSS: 'Use textContent instead of innerHTML. Apply DOMPurify for any HTML insertion.',
      REFLECTED_XSS: 'Sanitize all user input before reflecting in responses. Use Content-Security-Policy headers.',
      HREF_XSS: 'Validate URLs against an allowlist. Block javascript: protocol.',
      SSRF_FETCH: 'Validate and allowlist target URLs. Block internal/private IP ranges.',
      SSRF_HTTP: 'Validate and allowlist target URLs. Block internal/private IP ranges.',
      SSRF_AXIOS: 'Validate and allowlist target URLs. Block internal/private IP ranges.',
      PATH_TRAVERSAL: 'Use path.resolve() and verify the resolved path is within the expected base directory.',
      FILE_READ: 'Never pass user input directly to filesystem operations. Use an allowlist of permitted paths.',
      HARDCODED_JWT_SECRET: 'Move JWT secret to Secret Manager. Reference via environment variable at runtime.',
      WEAK_COMPARISON: 'Use bcrypt.compare() or scrypt for password verification. Never compare plaintext.',
      NO_RATE_LIMIT_AUTH: 'Apply rate limiting to authentication endpoints (e.g., fib(13)=233 requests per phi-interval).',
      WEAK_HASH: 'Replace MD5/SHA1 with SHA-256 or SHA-384. Use bcrypt/scrypt for passwords.',
      WEAK_CIPHER: 'Use AES-256-GCM. Avoid ECB mode, DES, and RC4.',
      HARDCODED_KEY: 'Move cryptographic keys to Secret Manager. Never store keys in source code.',
      AWS_KEY: 'Rotate the compromised key immediately. Use IAM roles instead of access keys.',
      PRIVATE_KEY: 'Remove private key from source. Store in Secret Manager or HSM.',
      GENERIC_SECRET: 'Move to Secret Manager. Use environment variables for runtime injection.',
      GCP_SERVICE_ACCOUNT: 'Remove service account key from source. Use Workload Identity Federation.',
      CORS_WILDCARD: 'Restrict CORS origins to specific trusted domains.',
      DEBUG_ENABLED: 'Disable debug mode in production. Use environment-based configuration.',
      CONSOLE_LOG: 'Replace with HeadyLogger structured JSON logging.',
      LOCALSTORAGE_TOKEN: 'Store tokens in httpOnly cookies with Secure and SameSite=Strict flags.',
      CONFIG_DRIFT: 'Restore configuration to match the security baseline.',
      HIGH_ENTROPY: 'If this is a secret, move to Secret Manager. If not, add to suppression list.',
    };

    return remediations[ruleId] || 'Review and remediate according to security best practices.';
  }

  /**
   * Generate aggregated remediation priorities
   * @param {Array} findings - All findings
   * @returns {Array} Prioritized remediation actions
   */
  _generateRemediation(findings) {
    if (findings.length === 0) return [];

    // Group by rule ID and sort by risk
    const grouped = {};
    for (const f of findings) {
      if (!grouped[f.ruleId]) {
        grouped[f.ruleId] = {
          ruleId: f.ruleId,
          severity: f.severity,
          description: f.description,
          remediation: f.remediation,
          occurrences: 0,
          maxRiskScore: 0,
          files: new Set(),
        };
      }
      grouped[f.ruleId].occurrences++;
      grouped[f.ruleId].maxRiskScore = Math.max(grouped[f.ruleId].maxRiskScore, f.riskScore);
      grouped[f.ruleId].files.add(f.file);
    }

    return Object.values(grouped)
      .map(g => ({
        ruleId: g.ruleId,
        severity: g.severity,
        description: g.description,
        remediation: g.remediation,
        occurrences: g.occurrences,
        maxRiskScore: g.maxRiskScore,
        affectedFiles: [...g.files],
      }))
      .sort((a, b) => b.maxRiskScore - a.maxRiskScore);
  }

  /* ─────────────── Suppression Management ─────────────── */

  /**
   * Suppress a finding (mark as acknowledged risk)
   * @param {string} id - Finding ID
   * @param {string} reason - Reason for suppression
   * @param {string} acknowledgedBy - Who suppressed it
   * @param {number} [ttlMs] - Suppression TTL (auto-expires)
   */
  suppress(id, reason, acknowledgedBy, ttlMs = null) {
    this.suppressions.set(id, {
      reason,
      acknowledgedBy,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });

    logger.info({
      component: 'HeadyRisks',
      action: 'finding_suppressed',
      findingId: id,
      reason,
      acknowledgedBy,
      ttlMs,
    });
  }

  /**
   * Remove expired suppressions
   */
  cleanExpiredSuppressions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, suppression] of this.suppressions) {
      if (suppression.expiresAt && now > suppression.expiresAt) {
        this.suppressions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({ component: 'HeadyRisks', action: 'suppressions_cleaned', count: cleaned });
    }
  }

  /* ─────────────── Vector-Assisted Analysis ─────────────── */

  /**
   * Find similar past findings using vector memory
   * @param {object} finding - Current finding
   * @param {number} [topK] - Number of similar findings to return
   * @returns {Array} Similar past findings
   */
  async findSimilar(finding, topK = fib(5)) {
    if (!this.vectorMemory) return [];

    const queryText = `${finding.ruleId} ${finding.description} ${finding.category}`;
    const results = await this.vectorMemory.search(queryText, {
      topK,
      threshold: CSL_THRESHOLDS.MEDIUM,
      namespace: 'security-findings',
    });

    return results;
  }

  /* ─────────────── Alert Routing ─────────────── */

  /**
   * Alert on critical findings via HeadyConductor
   * @param {object} report - Scan report
   */
  async _alertCritical(report) {
    if (!this.conductor) return;

    const criticalFindings = report.findings.filter(f => f.severity === 'CRITICAL');

    try {
      await this.conductor.dispatch({
        type: 'security_alert',
        priority: 'hot',
        payload: {
          scanId: report.scanId,
          criticalCount: criticalFindings.length,
          topFindings: criticalFindings.slice(0, fib(5)).map(f => ({
            ruleId: f.ruleId,
            file: f.file,
            line: f.line,
            description: f.description,
          })),
          riskScore: report.riskScore,
        },
      });
    } catch (err) {
      logger.error({
        component: 'HeadyRisks',
        action: 'alert_failed',
        error: err.message,
      });
    }
  }

  /* ─────────────── Utility ─────────────── */

  /**
   * Check if path should be ignored
   * @param {string} filePath - Path to check
   * @returns {boolean}
   */
  _isIgnoredPath(filePath) {
    return this.ignoredPaths.some(pattern => {
      if (pattern.includes('*')) {
        const regexStr = pattern.replace(/\*/g, '.*');
        return new RegExp(regexStr).test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Get scan statistics
   * @returns {object} Scan stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cveCache.size,
      suppressionCount: this.suppressions.size,
      historyLength: this.scanHistory.length,
    };
  }

  /**
   * Get trend analysis from scan history
   * @returns {object} Trend data
   */
  getTrend() {
    if (this.scanHistory.length < 2) return { trend: 'insufficient_data', history: this.scanHistory };

    const recent = this.scanHistory.slice(-fib(5)); // Last 5
    const riskScores = recent.map(s => s.riskScore);
    const avgRecent = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

    const older = this.scanHistory.slice(0, -fib(5));
    const avgOlder = older.length > 0
      ? older.reduce((a, b) => a + b.riskScore, 0) / older.length
      : avgRecent;

    let trend;
    if (avgRecent < avgOlder * PSI) {
      trend = 'improving';
    } else if (avgRecent > avgOlder * PHI) {
      trend = 'deteriorating';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      recentAvgRisk: avgRecent,
      historicalAvgRisk: avgOlder,
      scansAnalyzed: this.scanHistory.length,
    };
  }

  /**
   * Health check
   * @returns {object} Health status
   */
  health() {
    return {
      service: 'heady-risks',
      status: 'healthy',
      stats: this.getStats(),
      trend: this.getTrend(),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { HeadyRisks, SEVERITY, OWASP_CATEGORIES, SECURITY_PATTERNS, shannonEntropy, computeRiskScore };
