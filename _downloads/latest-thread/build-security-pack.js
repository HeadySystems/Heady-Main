#!/usr/bin/env node
'use strict';

/**
 * build-security-pack.js
 * 
 * Extracts all code files from 08-security-resilience-hardening.md,
 * bundles docs, generates manifest, and creates heady-security-task-pack.zip
 * 
 * Usage: node build-security-pack.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SPEC_FILE = '08-security-resilience-hardening.md';
const OUTPUT_DIR = 'heady-security-pack';
const ZIP_NAME = 'heady-security-task-pack.zip';

// Files to copy from thread
const DOCS_TO_COPY = [
  '08-security-resilience-hardening.md',
  'Heady_Service_Reference.docx',
  'Heady_System_Architecture_Overview.docx',
  'Heady_Development_Deployment_Guide.docx'
];

console.log('🔧 Heady Security Task Pack Builder\n');

// Clean and create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  console.log(`Cleaning ${OUTPUT_DIR}/...`);
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Create directory structure
const dirs = [
  '00-specs',
  'src/resilience',
  'src/security',
  'src/bees',
  'src/utils',
  'src/web3',
  'tests',
  'config'
];

dirs.forEach(dir => {
  const fullPath = path.join(OUTPUT_DIR, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`✓ Created ${dir}/`);
});

// Copy documentation files
console.log('\n📄 Copying documentation...');
DOCS_TO_COPY.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join(OUTPUT_DIR, '00-specs', file);
    fs.copyFileSync(file, dest);
    console.log(`✓ ${file}`);
  } else {
    console.warn(`⚠️  ${file} not found, skipping`);
  }
});

// Extract code blocks from markdown
console.log('\n🔍 Extracting code from specification...');

if (!fs.existsSync(SPEC_FILE)) {
  console.error(`❌ ${SPEC_FILE} not found. Place it in the current directory.`);
  process.exit(1);
}

const markdown = fs.readFileSync(SPEC_FILE, 'utf8');

// Regex to find code blocks with file paths
// Pattern: ### `path/to/file.ext`\n\n```language\ncode\n```
const codeBlockPattern = /###\s+`([^`]+)`\s*\n\s*\n```(\w+)\n([\s\S]*?)```/g;

let match;
let extractedCount = 0;

while ((match = codeBlockPattern.exec(markdown)) !== null) {
  const [, filePath, language, code] = match;
  const outputPath = path.join(OUTPUT_DIR, filePath);
  
  // Create parent directories if needed
  const parentDir = path.dirname(outputPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  
  // Write the code file
  fs.writeFileSync(outputPath, code.trimEnd() + '\n', 'utf8');
  console.log(`✓ Extracted: ${filePath}`);
  extractedCount++;
}

console.log(`\n✅ Extracted ${extractedCount} code files`);

// Generate minimal dependency stubs
console.log('\n🔌 Generating dependency stubs...');

const stubs = {
  'src/utils/logger.js': `'use strict';
// STUB: Replace with actual logger from Heady™ repo
module.exports = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args),
};`,

  'src/utils/phi.js': `'use strict';
// STUB: Phi constant and utilities
const PHI = 1.6180339887;
module.exports = { PHI };`,

  'src/resilience/circuit-breaker-base.js': `'use strict';
// STUB: Base circuit breaker (replace with actual implementation)
class CircuitBreakerBase {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
  }
  async execute(fn) {
    return fn();
  }
}
module.exports = CircuitBreakerBase;`,

  'src/security/auth-context.js': `'use strict';
// STUB: Authentication context utilities
module.exports = {
  getUserFromToken: (token) => ({ id: 'stub-user', roles: [] }),
  validateSession: (sessionId) => true,
};`,

  'config/security-config.json': `{
  "csl": {
    "allowThreshold": 0.809,
    "challengeThreshold": 0.618,
    "denyThreshold": 0.382
  },
  "circuitBreaker": {
    "failureThreshold": 5,
    "resetTimeout": 30000
  },
  "web3": {
    "enabled": false,
    "ledgerUrl": "http://localhost:8545"
  }
}`
};

Object.entries(stubs).forEach(([filePath, content]) => {
  const fullPath = path.join(OUTPUT_DIR, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Stub: ${filePath}`);
});

// Generate task manifest
console.log('\n📋 Generating task manifest...');

const manifest = `# Heady Security Hardening Task Pack

**Generated:** ${new Date().toISOString()}

## Package Contents

### 1. Specifications (00-specs/)
- 08-security-resilience-hardening.md - Main specification
- Heady_Service_Reference.docx - Service catalog
- Heady_System_Architecture_Overview.docx - Architecture docs
- Heady_Development_Deployment_Guide.docx - Deployment guide

### 2. Source Code (src/)
All code files extracted from specification:
- \`src/resilience/security-hardening.js\` - OWASP Top 10 middleware
- \`src/security/csl-security-gate.js\` - CSL confidence scoring
- \`src/resilience/circuit-breaker.js\` - Phi-scaled circuit breakers
- \`src/web3/security-ledger.js\` - Immutable event logging
- \`src/bees/security-bee.js\` - Continuous monitoring agent
- Additional utilities and configurations

### 3. Tests (tests/)
Test suites for all deliverables

### 4. Dependency Stubs (marked as STUB)
Minimal implementations for missing internal modules:
- logger.js, phi.js, auth-context.js, etc.
- **Replace these with actual Heady repo files before production use**

## Deliverables

### ✅ 1. CSL Security Gates
- Continuous risk scoring
- ALLOW/CHALLENGE/DENY at phi thresholds
- **File:** \`src/security/csl-security-gate.js\`

### ✅ 2. Security Headers
- Consolidated headers (CSP, HSTS, etc.)
- Dynamic CSL-adjusted strictness
- **File:** \`src/resilience/security-hardening.js\`

### ✅ 3. Circuit Breakers
- Phi-scaled thresholds
- CLOSED/HALF_OPEN/OPEN states
- **File:** \`src/resilience/circuit-breaker.js\`

### ✅ 4. Web3 Ledger Anchoring
- Immutable security event logging
- Phi-scaled severity
- **File:** \`src/web3/security-ledger.js\`

### ✅ 5. Security Bee
- Continuous monitoring
- CSL escalation
- Automated response
- **File:** \`src/bees/security-bee.js\`

### ✅ 6. Test Suite
- Scoring, headers, circuit states, auth, threat detection
- **Directory:** \`tests/\`

## Implementation Checklist

- [ ] Review all extracted source files
- [ ] Replace dependency stubs with actual Heady modules
- [ ] Configure \`config/security-config.json\` for your environment
- [ ] Run test suite: \`npm test\`
- [ ] Integrate security middleware into main app
- [ ] Deploy circuit breakers to critical services
- [ ] Enable Web3 ledger anchoring (if applicable)
- [ ] Activate Security Bee for continuous monitoring

## Dependencies

Install required packages:
\`\`\`bash
npm install express helmet
\`\`\`

## Running Tests

\`\`\`bash
cd heady-security-pack
npm install
npm test
\`\`\`

## Integration Example

\`\`\`javascript
const express = require('express');
const { securityHeaders, requestSanitizer, promptInjectionGuard } = require('./src/resilience/security-hardening');
const { cslSecurityGate } = require('./src/security/csl-security-gate');

const app = express();

// Apply security layers
app.use(securityHeaders());
app.use(requestSanitizer());
app.use(cslSecurityGate({ mode: 'enforce' }));

// AI routes
app.post('/api/prompt', promptInjectionGuard(), (req, res) => {
  // Handle AI prompt
});

app.listen(3000);
\`\`\`

## Notes

- All code uses φ = 1.6180339887
- OWASP Top 10 compliant
- Zero-trust architecture
- Node.js crypto only (no external crypto libs)

## Support

For questions or issues, refer to:
- Original spec: 00-specs/08-security-resilience-hardening.md
- Heady architecture: 00-specs/Heady_System_Architecture_Overview.docx
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), manifest, 'utf8');
console.log('✓ README.md');

// Generate package.json
const packageJson = {
  name: 'heady-security-hardening',
  version: '1.0.0',
  description: 'Heady™ Security Hardening Implementation - CSL Gates, Circuit Breakers, Web3 Ledger',
  main: 'src/resilience/security-hardening.js',
  scripts: {
    test: 'node tests/run-all-tests.js'
  },
  dependencies: {
    express: '^4.18.0'
  },
  devDependencies: {},
  author: 'HeadySystems',
  license: 'PROPRIETARY'
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'package.json'),
  JSON.stringify(packageJson, null, 2),
  'utf8'
);
console.log('✓ package.json');

// Generate test runner
const testRunner = `#!/usr/bin/env node
'use strict';

/**
 * run-all-tests.js
 * Executes all security hardening tests
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Heady Security Test Suite\\n');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js') && f !== 'run-all-tests.js');

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
  console.log(\`\\n📝 Running \${file}...\`);
  try {
    require(path.join(testDir, file));
    console.log(\`✅ \${file} passed\`);
    passed++;
  } catch (err) {
    console.error(\`❌ \${file} failed:\`, err.message);
    failed++;
  }
});

console.log(\`\\n${'='.repeat(50)}\`);
console.log(\`✅ Passed: \${passed}\`);
console.log(\`❌ Failed: \${failed}\`);
console.log(\`Total: \${passed + failed}\`);

process.exit(failed > 0 ? 1 : 0);
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'tests', 'run-all-tests.js'),
  testRunner,
  'utf8'
);
fs.chmodSync(path.join(OUTPUT_DIR, 'tests', 'run-all-tests.js'), '755');
console.log('✓ tests/run-all-tests.js');

// Create the zip file
console.log(`\n📦 Creating ${ZIP_NAME}...`);

try {
  // Use system zip command (cross-platform)
  if (process.platform === 'win32') {
    // Windows: Use PowerShell Compress-Archive
    execSync(
      `powershell Compress-Archive -Path ${OUTPUT_DIR}\\* -DestinationPath ${ZIP_NAME} -Force`,
      { stdio: 'inherit' }
    );
  } else {
    // Unix: Use zip command
    execSync(
      `cd ${OUTPUT_DIR} && zip -r ../${ZIP_NAME} . && cd ..`,
      { stdio: 'inherit' }
    );
  }
  
  const stats = fs.statSync(ZIP_NAME);
  console.log(`\n✅ Successfully created ${ZIP_NAME}`);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📂 Location: ${path.resolve(ZIP_NAME)}`);
  
} catch (error) {
  console.error('❌ Failed to create zip:', error.message);
  console.log('\n💡 Manual zip creation:');
  console.log(`   cd ${OUTPUT_DIR}`);
  console.log(`   zip -r ../${ZIP_NAME} .`);
  process.exit(1);
}

console.log('\n🎉 Done! Extract the zip and run:');
console.log(`   unzip ${ZIP_NAME}`);
console.log(`   cd ${OUTPUT_DIR}`);
console.log('   npm install');
console.log('   npm test');
