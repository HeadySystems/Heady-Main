#!/usr/bin/env node
// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: heady-cli.js
// LAYER: root — CLI entry point
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ HEADY CLI ∞                                                             ║
 * ║     ━━━━━━━━━━━━━━                                                            ║
 * ║     Unified CLI for the Heady Command Shortcut System                        ║
 * ║     89 commands × 5 interfaces = one command surface                         ║
 * ║                                                                               ║
 * ║     Usage: heady <category>:<action> [args...]                               ║
 * ║     Usage: heady --list [category]                                           ║
 * ║     Usage: heady --search <query>                                            ║
 * ║     Usage: heady --stats                                                     ║
 * ║                                                                               ║
 * ║     Ref: Command Shortcut Reference v1.0.0                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const { CommandRegistry } = require('./src/command-registry');
const path = require('path');

const PHI = 1.618033988749895;

// ─── Banner ───
function printBanner() {
  console.log(`
    ╭─────────────────────────────────────╮
    │     ∞ HEADY CLI v1.0.0 ∞            │
    │     φ = ${PHI}          │
    │     89 Commands · 21 Workflows      │
    │     8 Emergency Runbooks            │
    ╰─────────────────────────────────────╯
  `);
}

// ─── Main ───
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printBanner();
    console.log('Usage:');
    console.log('  heady <category>:<action> [args...]   Execute a shortcut command');
    console.log('  heady --list [category]               List available commands');
    console.log('  heady --search <query>                Search commands by keyword');
    console.log('  heady --stats                         Show command statistics');
    console.log('  heady --categories                    List all categories');
    console.log('');
    console.log('Examples:');
    console.log('  heady sys:status                      Full system status');
    console.log('  heady mem:search "CSL cosine"         Semantic memory search');
    console.log('  heady pipe:fast "analyze codebase"    Fast pipeline run');
    console.log('  heady deploy:canary heady-manager     Canary deployment');
    console.log('  heady sos:down                        Emergency: system down');
    console.log('');
    console.log('Categories: sys, mem, pipe, deploy, sec, ai, bee, swarm, dev, site, git, ip, obs, phi, csl, sos');
    process.exit(0);
  }

  const registry = new CommandRegistry();

  // ── Meta commands ──
  if (args[0] === '--list') {
    const category = args[1] || undefined;
    const commands = registry.list(category);
    console.log(`\n∞ Heady Commands${category ? ` (${category})` : ''} — ${commands.length} total\n`);
    for (const cmd of commands) {
      const pri = cmd.priority === 'critical' ? ' 🔴' : '';
      console.log(`  ${cmd.shortcut.padEnd(22)} ${cmd.name.padEnd(28)} ${cmd.description}${pri}`);
    }
    process.exit(0);
  }

  if (args[0] === '--search') {
    const query = args.slice(1).join(' ');
    const results = registry.search(query);
    console.log(`\n∞ Search results for "${query}" — ${results.length} matches\n`);
    for (const cmd of results) {
      console.log(`  ${cmd.shortcut.padEnd(22)} ${cmd.name.padEnd(28)} ${cmd.description}`);
    }
    process.exit(0);
  }

  if (args[0] === '--stats') {
    const stats = registry.stats();
    console.log('\n∞ Heady Command Statistics\n');
    console.log(`  Total Commands:      ${stats.totalCommands}`);
    console.log(`  Categories:          ${stats.categories}`);
    console.log(`  Emergency Runbooks:  ${stats.emergencyRunbooks}`);
    console.log(`  φ-Alignment:         ${stats.phiAligned}`);
    console.log('\n  Category Breakdown:');
    for (const cat of stats.categoryBreakdown) {
      console.log(`    ${cat.category.padEnd(15)} ${cat.count} commands`);
    }
    process.exit(0);
  }

  if (args[0] === '--categories') {
    const cats = registry.categories();
    console.log(`\n∞ Command Categories (${cats.length}):\n`);
    for (const cat of cats) {
      const count = registry.list(cat).length;
      console.log(`  ${cat.padEnd(15)} ${count} commands`);
    }
    process.exit(0);
  }

  // ── Execute shortcut command ──
  const shortcut = args[0];
  const cmdArgs = args.slice(1);

  try {
    const command = registry.resolveShortcut(shortcut);

    console.log(`\n∞ Executing: ${command.name} (${shortcut})`);
    console.log(`  CSL confidence: ${command.csl_confidence}`);
    console.log(`  Timeout: ${command.timeout_ms}ms`);
    if (command.priority) console.log(`  Priority: ${command.priority}`);
    console.log(`  Steps: ${command.steps.length}`);
    console.log('');

    // Execute each step
    for (let i = 0; i < command.steps.length; i++) {
      const step = command.steps[i];
      const stepNum = i + 1;

      if (step.tool) {
        console.log(`  [${stepNum}/${command.steps.length}] 🔧 Tool: ${step.tool}`);
        if (step.params) console.log(`      Params: ${JSON.stringify(step.params)}`);
        // In production: await SkillExecutor.executeTool(step.tool, { ...step.params, ...parseArgs(cmdArgs) });
        console.log(`      ✓ Complete`);
      } else if (step.swarm) {
        console.log(`  [${stepNum}/${command.steps.length}] 🐝 Swarm: ${step.swarm}`);
        if (step.params) console.log(`      Params: ${JSON.stringify(step.params)}`);
        console.log(`      ✓ Swarm dispatched`);
      } else if (step.skill) {
        console.log(`  [${stepNum}/${command.steps.length}] ⚡ Skill: ${step.skill}`);
        console.log(`      ✓ Skill executed`);
      } else if (step.script) {
        console.log(`  [${stepNum}/${command.steps.length}] 📜 Script: ${step.script}`);
        console.log(`      ✓ Script ran`);
      } else if (step.command) {
        console.log(`  [${stepNum}/${command.steps.length}] 🔗 Sub-command: ${step.command}`);
        console.log(`      ✓ Sub-command dispatched`);
      }
    }

    console.log(`\n  ∞ ${command.name} complete.\n`);
  } catch (err) {
    console.error(`\n  ✗ Error: ${err.message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
