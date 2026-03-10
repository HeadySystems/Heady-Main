
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

// Try known candidate paths for the auto-context bridge
const candidates = [
  resolve(repoRoot, 'packages/auto-context/auto-context-bridge.js'),
  '/tmp/heady-in-extract/system-build/heady-system-build/packages/auto-context/auto-context-bridge.js',
];
const bridgePath = candidates.find(p => existsSync(p));

test('auto-context bridge source file exists', () => {
  assert.ok(bridgePath, 'No auto-context-bridge source file found at any known path');
});

if (bridgePath) {
  const text = readFileSync(bridgePath, 'utf8');

  test('auto-context bridge avoids browser storage references', () => {
    assert.equal(text.includes('sessionStorage'), false, 'bridge should not use sessionStorage');
    assert.equal(text.includes('localStorage'), false, 'bridge should not use localStorage');
  });
}
