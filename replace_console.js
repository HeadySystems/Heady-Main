const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all JS/TS files
const cmd = 'find . -type f \\( -name "*.js" -o -name "*.ts" \\) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive/*" -not -path "*/Heady-pre-production-9f2f0642-main/*" -not -path "*/dist/*" -not -path "*/build/*"';
const files = execSync(cmd).toString().split('\n').filter(Boolean);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Only process if it has logger.info
    if (content.includes('logger.info') || content.includes('logger.error') || content.includes('logger.warn') || content.includes('logger.info')) {
        
        let newContent = content;

        // Add require('pino') at the top if it's commonjs
        if (!newContent.includes('const logger') && !newContent.includes('import logger')) {
            if (newContent.includes('require(')) {
                newContent = "const pino = require('pino');\nconst logger = pino();\n" + newContent;
            } else if (newContent.includes('import ')) {
                 newContent = "import pino from 'pino';\nconst logger = pino();\n" + newContent;
            } else {
                 newContent = "const pino = require('pino');\nconst logger = pino();\n" + newContent;
            }
        }
        
        newContent = newContent.replace(/console\.log/g, 'logger.info');
        newContent = newContent.replace(/console\.error/g, 'logger.error');
        newContent = newContent.replace(/console\.warn/g, 'logger.warn');
        newContent = newContent.replace(/console\.info/g, 'logger.info');
        
        fs.writeFileSync(filePath, newContent, 'utf8');
        logger.info('Processed console to pino for', filePath);
    }
}

files.forEach(processFile);
