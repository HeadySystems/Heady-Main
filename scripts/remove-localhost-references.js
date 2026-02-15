// Heady Systems - Remove Localhost References Script
// Replaces internal.headyio.com, internal.headyio.com, and headysystems.com with proper Heady domains

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

console.log('🔧 Removing localhost and headysystems.com references...');

function findFiles(dir, extensions, excludePatterns) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip excluded directories
                if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
                    continue;
                }
                traverse(fullPath);
            } else if (stat.isFile()) {
                // Check file extension
                const ext = path.extname(item).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }
    
    traverse(dir);
    return files;
}

function processFiles() {
    const extensions = ['.js', '.jsx', '.json', '.yml', '.yaml', '.md'];
    const excludePatterns = ['node_modules', '.venv', '.git', 'offline-packages'];
    
    const files = findFiles(ROOT, extensions, excludePatterns);
    let changesMade = 0;
    
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const originalContent = content;
            
            // Replace internal.headyio.com references
            let newContent = content
                .replace(/internal.headyio.com([^/]*)/g, 'internal.headyio.com$1')
                .replace(/127\.0\.0\.1/g, 'internal.headyio.com')
                .replace(/\.onrender\.com/g, 'headysystems.com');
            
            if (newContent !== originalContent) {
                fs.writeFileSync(file, newContent, 'utf8');
                console.log(`  ✓ Updated: ${path.relative(ROOT, file)}`);
                changesMade++;
            }
        } catch (error) {
            console.error(`  ✗ Error processing ${file}: ${error.message}`);
        }
    }
    
    console.log(`🎯 Complete! Updated ${changesMade} files`);
    if (changesMade === 0) {
        console.log('  No internal.headyio.com or headysystems.com references found');
    }
}

processFiles();
