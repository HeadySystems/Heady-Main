const pino = require('pino');
const logger = pino();
const fs = require('fs');

const files = fs.readFileSync('files_with_localstorage.txt', 'utf8').split('\n').filter(Boolean);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const cookieUtil = `
function getCookie(name) {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
}
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; secure; samesite=strict";
}
function removeCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999; path=/; secure; samesite=strict';
}
`;

    if (!content.includes('function getCookie')) {
        content = content.replace(/localStorage\.getItem\((.*?)\)/g, 'getCookie($1)');
        content = content.replace(/localStorage\.setItem\((.*?),\s*(.*?)\)/g, 'setCookie($1, $2, 7)');
        content = content.replace(/localStorage\.removeItem\((.*?)\)/g, 'removeCookie($1)');
        content = content.replace(/localStorage\.clear\(\)/g, '');
        
        if (filePath.endsWith('.html')) {
            content = content.replace('<script>', '<script>\n' + cookieUtil);
        } else {
            content = cookieUtil + '\n' + content;
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        logger.info('Processed', filePath);
    }
}

files.forEach(processFile);
