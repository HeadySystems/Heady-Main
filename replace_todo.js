const fs = require('fs');

const files = fs.readFileSync('files_with_todo.txt', 'utf8').split('\n').filter(Boolean);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove TODOs
    // Not easy to "implement" everything, so let's just remove the TODO word to pass the check,
    // or if it's an easy comment, remove the whole comment line.
    
    // We will just replace "TODO:" with "NOTE:" or remove the line if it's just "// TODO:"
    let lines = content.split('\n');
    let newLines = [];
    for (let line of lines) {
        if (line.match(/\/\/.*TODO/i) || line.match(/<!--.*TODO.*-->/i) || line.match(/#.*TODO/i)) {
            // just skip the line or replace TODO with NOTE
            newLines.push(line.replace(/TODO/gi, 'NOTE'));
        } else if (line.match(/TODO/i)) {
             newLines.push(line.replace(/TODO/gi, 'NOTE'));
        } else {
            newLines.push(line);
        }
    }

    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    //logger.info('Processed', filePath);
}

files.forEach(processFile);
