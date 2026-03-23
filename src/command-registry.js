// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/command-registry.js
// LAYER: backend/src — command infrastructure
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ COMMAND REGISTRY ∞                                                     ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━                                                 ║
 * ║     Loads command-registry.yaml and resolves shortcut commands               ║
 * ║     Supports: CLI, API, MCP, HeadyBuddy, and Automation interfaces          ║
 * ║                                                                               ║
 * ║     Ref: Command Shortcut Reference v1.0.0 §11                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');  // or inline parser below

const PHI = 1.618033988749895;

class CommandRegistry {
  constructor(configPath) {
    this.configPath = configPath || path.resolve(__dirname, '..', 'configs', 'command-registry.yaml');
    this.commands = {};
    this.timeouts = {};
    this._loaded = false;
  }

  /**
   * Load the command registry from YAML.
   * Lazy-loads on first resolve() call if not already loaded.
   */
  load() {
    if (this._loaded) return this;

    const raw = fs.readFileSync(this.configPath, 'utf-8');

    // Simple YAML parsing — supports the command-registry.yaml format
    // Uses js-yaml if available, otherwise falls back to JSON-compatible subset
    let parsed;
    try {
      parsed = yaml.load(raw);
    } catch (_) {
      // Fallback: try requiring js-yaml from node_modules
      try {
        const jsYaml = require('js-yaml');
        parsed = jsYaml.load(raw);
      } catch (__) {
        throw new Error(
          'CommandRegistry requires js-yaml. Install with: npm install js-yaml'
        );
      }
    }

    this.commands = parsed.commands || {};
    this.timeouts = parsed.timeouts || {};
    this._loaded = true;
    return this;
  }

  /**
   * Resolve a command by category:action shortcut.
   * @param {string} category - e.g., 'sys'
   * @param {string} action - e.g., 'status'
   * @returns {Object} Command definition
   * @throws {Error} If command not found
   */
  resolve(category, action) {
    this.load();
    const key = `${category}:${action}`;
    const cmd = this.commands[key];
    if (!cmd) {
      throw new Error(
        `Unknown command: ${key}. ` +
        `Available: ${Object.keys(this.commands).filter(k => k.startsWith(category + ':')).join(', ') || 'none in category "' + category + '"'}`
      );
    }
    return { key, ...cmd };
  }

  /**
   * Resolve from a full shortcut string like "sys:status".
   * @param {string} shortcut
   * @returns {Object}
   */
  resolveShortcut(shortcut) {
    const parts = shortcut.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid shortcut format: "${shortcut}". Expected "category:action".`);
    }
    return this.resolve(parts[0], parts[1]);
  }

  /**
   * List all commands, optionally filtered by category.
   * @param {string} [category]
   * @returns {Object[]}
   */
  list(category) {
    this.load();
    const entries = Object.entries(this.commands);
    const filtered = category
      ? entries.filter(([key]) => key.startsWith(category + ':'))
      : entries;

    return filtered.map(([key, cmd]) => ({
      shortcut: key,
      name: cmd.name,
      category: cmd.category,
      description: cmd.description,
      timeout_ms: cmd.timeout_ms,
      csl_confidence: cmd.csl_confidence,
      tags: cmd.tags || [],
      priority: cmd.priority || 'normal',
    }));
  }

  /**
   * List all unique categories.
   * @returns {string[]}
   */
  categories() {
    this.load();
    const cats = new Set(Object.keys(this.commands).map(k => k.split(':')[0]));
    return [...cats].sort();
  }

  /**
   * Search commands by tag or keyword.
   * @param {string} query
   * @returns {Object[]}
   */
  search(query) {
    this.load();
    const q = query.toLowerCase();
    return Object.entries(this.commands)
      .filter(([key, cmd]) => {
        return key.includes(q) ||
          (cmd.name || '').toLowerCase().includes(q) ||
          (cmd.description || '').toLowerCase().includes(q) ||
          (cmd.tags || []).some(t => t.includes(q));
      })
      .map(([key, cmd]) => ({ shortcut: key, ...cmd }));
  }

  /**
   * Get the phi-scaled timeout tier for a category.
   * @param {string} category
   * @returns {number} Timeout in milliseconds
   */
  getTimeout(category) {
    this.load();
    return this.timeouts[category] || this.timeouts.system || 29034;
  }

  /**
   * Get summary statistics.
   * @returns {Object}
   */
  stats() {
    this.load();
    const commands = Object.keys(this.commands);
    const categories = this.categories();
    const sosCmds = commands.filter(k => k.startsWith('sos:'));

    return {
      totalCommands: commands.length,
      categories: categories.length,
      emergencyRunbooks: sosCmds.length,
      phiAligned: commands.length === 89 ? '✓ fib(11)' : `${commands.length} (target: 89)`,
      categoryBreakdown: categories.map(cat => ({
        category: cat,
        count: commands.filter(k => k.startsWith(cat + ':')).length,
      })),
    };
  }
}

module.exports = { CommandRegistry };
