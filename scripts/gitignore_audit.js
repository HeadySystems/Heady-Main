#!/usr/bin/env node
// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: scripts/gitignore_audit.js
// LAYER: scripts — security
// HEADY_BRAND:END

/**
 * .gitignore Audit Script
 * Scans the repository for files that SHOULD be gitignored but aren't.
 * Catches credential files, large binaries, and build artifacts before commit.
 *
 * Usage: node scripts/gitignore_audit.js
 * Ref: Deep Research Quick Wins — .gitignore audit
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// Patterns that should NEVER be committed
const DANGEROUS_PATTERNS = [
  { pattern: /\.env$/, reason: 'Environment file with secrets' },
  { pattern: /\.env\.local$/, reason: 'Local environment secrets' },
  { pattern: /\.env\.production$/, reason: 'Production secrets' },
  { pattern: /\.pem$/, reason: 'Private key file' },
  { pattern: /\.key$/, reason: 'Private key file' },
  { pattern: /\.p12$/, reason: 'Certificate/key bundle' },
  { pattern: /id_rsa/, reason: 'SSH private key' },
  { pattern: /id_ed25519/, reason: 'SSH private key' },
  { pattern: /\.heady_secrets$/, reason: 'Heady secrets file' },
];

// Large binary extensions that should use GitHub Releases
const BINARY_EXTENSIONS = ['.zip', '.tar.gz', '.exe', '.msi', '.dmg', '.iso', '.war', '.jar'];
const BINARY_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

function walk(dir, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'venv') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walk(fullPath, maxDepth, depth + 1));
      } else {
        results.push(fullPath);
      }
    }
  } catch (_e) { /* skip inaccessible */ }
  return results;
}

function audit() {
  const files = walk(REPO_ROOT);
  const issues = [];

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const basename = path.basename(file);

    // Check dangerous patterns
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(basename)) {
        issues.push({ severity: 'CRITICAL', file: rel, reason });
      }
    }

    // Check large binaries
    const ext = path.extname(file).toLowerCase();
    if (BINARY_EXTENSIONS.includes(ext)) {
      try {
        const stat = fs.statSync(file);
        if (stat.size > BINARY_SIZE_LIMIT) {
          issues.push({
            severity: 'WARNING',
            file: rel,
            reason: `Large binary (${(stat.size / 1024 / 1024).toFixed(1)}MB) — use GitHub Releases`
          });
        }
      } catch (_e) { /* skip inaccessible */ }
    }
  }

  // Report
  if (issues.length === 0) {
    console.log('✅ .gitignore audit passed — no issues found.');
    process.exit(0);
  }

  console.log(`\n🔍 .gitignore Audit — ${issues.length} issue(s) found:\n`);

  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const warnings = issues.filter(i => i.severity === 'WARNING');

  if (critical.length > 0) {
    console.log('🔴 CRITICAL (must be gitignored):');
    for (const i of critical) {
      console.log(`   ${i.file} — ${i.reason}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n🟡 WARNING (should be gitignored or moved to Releases):');
    for (const i of warnings) {
      console.log(`   ${i.file} — ${i.reason}`);
    }
  }

  process.exit(critical.length > 0 ? 1 : 0);
}

audit();
