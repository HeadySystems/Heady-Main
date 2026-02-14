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
// ║  FILE: scripts/validate-branding.js                                                    ║
// ║  LAYER: automation                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const axios = require('axios');
const config = require('../configs/branding/branding-standards.yaml');
const fs = require('fs');
const path = require('path');

module.exports = { validateBranding, getAllProjectFiles };

async function validateBranding() {
  const testResults = [];
  
  // Check file headers in the project
  const projectFiles = getAllProjectFiles();
  for (const file of projectFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('HEADY_BRAND:BEGIN')) {
      testResults.push({ 
        file, 
        check: 'branding-header', 
        passed: false,
        message: 'Missing branding header'
      });
    }
    
    if (!content.includes('HEADY_BRAND:END')) {
      testResults.push({ 
        file, 
        check: 'branding-footer', 
        passed: false,
        message: 'Missing branding footer'
      });
    }
  }
  
  // Return violations (caller decides whether to exit)
  const failures = testResults.filter(r => !r.passed);
  if (failures.length > 0) {
    return failures;
  }
  
  return [];
}

function getAllProjectFiles() {
  const ignoreDirs = ['node_modules', 'dist', 'build', '.git', '.husky', '.venv', 'venv', 'AndroidSDK', 'gradle', 'nginx', 'ventoy', '.wrangler', 'lfs', '__pycache__', 'cmake', 'nasm', 'tools', 'platform-tools'];
  const files = [];
  
  function walk(dir) {
    fs.readdirSync(dir).forEach(f => {
      const fullPath = path.join(dir, f);
      if (ignoreDirs.some(d => fullPath.includes(d))) return;
      
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (/\.([jt]sx?|py|ya?ml|json|xml|ps1|conf|txt|md)$/i.test(fullPath)) {
        files.push(fullPath);
      }
    });
  }
  
  walk(process.cwd());
  return files;
}

