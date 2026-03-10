'use strict';

const assert = require('assert');
const path = require('path');

/** @constant {number} PHI */
const PHI = 1.6180339887498948;

/** @constant {number} PSI */
const PSI = 1 / PHI;

/**
 * Compute phiThreshold at given level
 * @param {number} level - Threshold level (0-4)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number} Threshold value
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const fs = require('fs');

const WEBSITES_DIR = path.resolve(__dirname, '../../websites');
const EXPECTED_SITES = [
  'headyme.com', 'headysystems.com', 'headyconnection.org',
  'headybuddy.com', 'headymcp.com', 'heady.io',
  'headyconnection.com', 'headybot.com', 'headyapi.com'
];

module.exports = {
  'all 9 website directories exist': () => {
    const dirs = fs.readdirSync(WEBSITES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    assert.strictEqual(dirs.length, 9, `Expected 9 websites, found ${dirs.length}`);
  },

  'every website has an index.html': () => {
    const missing = EXPECTED_SITES.filter(site => {
      const htmlPath = path.join(WEBSITES_DIR, site, 'index.html');
      return !fs.existsSync(htmlPath);
    });
    assert.strictEqual(missing.length, 0,
      `Websites missing index.html: ${missing.join(', ')}`);
  },

  'every website contains Sacred Geometry canvas animation': () => {
    const noCanvas = [];
    for (const site of EXPECTED_SITES) {
      const html = fs.readFileSync(path.join(WEBSITES_DIR, site, 'index.html'), 'utf8');
      if (!html.includes('canvas') && !html.includes('Canvas')) {
        noCanvas.push(site);
      }
    }
    assert.strictEqual(noCanvas.length, 0,
      `Websites without canvas: ${noCanvas.join(', ')}`);
  },

  'every website has Sacred Geometry styling (gold + dark theme)': () => {
    const noTheme = [];
    for (const site of EXPECTED_SITES) {
      const html = fs.readFileSync(path.join(WEBSITES_DIR, site, 'index.html'), 'utf8');
      const hasDark = html.includes('#0a0a0a') || html.includes('0a0a0a') || html.includes('dark');
      const hasGold = html.includes('#d4af37') || html.includes('d4af37') || html.includes('gold');
      if (!hasDark && !hasGold) noTheme.push(site);
    }
    assert.strictEqual(noTheme.length, 0,
      `Websites without Sacred Geometry theme: ${noTheme.join(', ')}`);
  },

  'dashboard sites include fetch() API integration': () => {
    const dashboardSites = ['headyme.com', 'headysystems.com', 'headybuddy.com'];
    const noFetch = [];
    for (const site of dashboardSites) {
      const html = fs.readFileSync(path.join(WEBSITES_DIR, site, 'index.html'), 'utf8');
      if (!html.includes('fetch(') && !html.includes('fetch (')) {
        noFetch.push(site);
      }
    }
    assert.strictEqual(noFetch.length, 0,
      `Dashboard sites without fetch() API calls: ${noFetch.join(', ')}`);
  },

  'every website is responsive (uses viewport meta)': () => {
    const noViewport = [];
    for (const site of EXPECTED_SITES) {
      const html = fs.readFileSync(path.join(WEBSITES_DIR, site, 'index.html'), 'utf8');
      if (!html.includes('viewport')) {
        noViewport.push(site);
      }
    }
    assert.strictEqual(noViewport.length, 0,
      `Websites without viewport meta: ${noViewport.join(', ')}`);
  },

  'headyme.com has dashboard with swarm grid and HeadyBuddy chat': () => {
    const html = fs.readFileSync(path.join(WEBSITES_DIR, 'headyme.com', 'index.html'), 'utf8');
    const hasDashboard = /dashboard/i.test(html);
    const hasSwarm = /swarm/i.test(html);
    const hasBuddy = /buddy|chat/i.test(html);
    assert.ok(hasDashboard, 'headyme.com should have dashboard');
    assert.ok(hasSwarm, 'headyme.com should have swarm grid');
    assert.ok(hasBuddy, 'headyme.com should have HeadyBuddy chat');
  },

  'headysystems.com has CSL operations panel': () => {
    const html = fs.readFileSync(path.join(WEBSITES_DIR, 'headysystems.com', 'index.html'), 'utf8');
    const hasCSL = /csl|continuous.*semantic|cosine|vector/i.test(html);
    assert.ok(hasCSL, 'headysystems.com should have CSL operations panel');
  },

  'headyconnection.org has nonprofit mission content': () => {
    const html = fs.readFileSync(path.join(WEBSITES_DIR, 'headyconnection.org', 'index.html'), 'utf8');
    const hasMission = /mission|nonprofit|community|501.*c.*3/i.test(html);
    assert.ok(hasMission, 'headyconnection.org should have nonprofit mission content');
  },

  'no website references Eric Head (must be Eric Haywood)': () => {
    const violations = [];
    for (const site of EXPECTED_SITES) {
      const html = fs.readFileSync(path.join(WEBSITES_DIR, site, 'index.html'), 'utf8');
      if (/Eric\s+Head(?!y)/i.test(html)) {
        violations.push(site);
      }
    }
    assert.strictEqual(violations.length, 0,
      `Websites referencing "Eric Head" instead of "Eric Haywood": ${violations.join(', ')}`);
  }
};
