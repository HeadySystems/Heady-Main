// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: scripts/auto-merge.js
// LAYER: root
// HEADY_BRAND:END

/**
 * Auto Merge Script
 * Wraps validation and synchronization logic into a single automated flow.
 */

const { MergeValidator } = require('./validate-merge-readiness');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  console.log('🤖 Heady Auto-Merge Initiated...');
  console.log('═══════════════════════════════════════════════');

  // 1. Validate Merge Readiness
  console.log('Step 1: Validating System State...');
  const validator = new MergeValidator();
  await validator.validate();

  // Check validation results
  if (validator.errors.length > 0) {
    console.error('\n❌ Merge Aborted: Critical validation errors found.');
    console.error('Please resolve the errors listed above and try again.');
    process.exit(1);
  }

  if (validator.warnings.length > 0) {
    console.warn('\n⚠️  Warnings detected. Proceeding automatically...');
  } else {
    console.log('\n✅ Validation Clean.');
  }

  // 2. Execute Synchronization
  console.log('\nStep 2: Executing Heady Sync & Squash...');
  try {
    // Determine path to Heady-Sync.ps1
    const syncScript = path.join(__dirname, 'Heady-Sync.ps1');
    
    // Execute PowerShell script
    // Using inherit to show the output of the sync script directly
    execSync(`powershell -ExecutionPolicy Bypass -File "${syncScript}" -Force`, { 
      stdio: 'inherit' 
    });
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 Auto-Merge Sequence Complete');
    console.log('═══════════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ Sync Failed:', error.message);
    process.exit(1);
  }
}

// Handle execution
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = { main };
