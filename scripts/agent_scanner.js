const { execSync } = require('child_process');

/**
 * Agent Upstream Scanner
 * Phase 0 of the Zero-Defect Pre-Projection Gate
 * Scans local and remote git branches/commits for unmerged AI agent activity (Claude, Codex, Cascade, Windsurf).
 */

function runAgentUpstreamScan() {
  console.log("∞ JULES: Initiating Deep Upstream Agent Scan ∞...");
  try {
    // 1. Fetch to guarantee remote sync
    console.log("  [+] Fetching all remotes to detect shadow branches...");
    execSync('git fetch --all --quiet', { stdio: 'pipe' });

    // 2. Scan branch names for agent signatures
    const branches = execSync('git branch -a', { encoding: 'utf8' });
    const agentBranches = branches.split('\n')
      .map(b => b.trim())
      .filter(b => b.match(/(claude|codex|cascade|windsurf)/i));

    // 3. Scan recent commits on all branches for agent author signatures
    // Looking at the last 7 days of everything
    const logOut = execSync('git log --all --since="7 days ago" --oneline --author="claude\\|codex\\|cascade" -i', { encoding: 'utf8' }).trim();
    const agentCommits = logOut ? logOut.split('\n') : [];

    const findings = [];

    // Evaluate Branches
    if (agentBranches.length > 0) {
      findings.push(`[WARNING] Detected ${agentBranches.length} remote/local AI agent branches (Claude/Codex/Cascade).`);
      // We explicitly check if any of these are unmerged into our current HEAD
      for (const branch of agentBranches) {
        // Remove '*' if it's the current branch
        const cleanBranch = branch.replace('* ', '');
        try {
          // If git merge-base is the branch itself, it means it's fully merged, otherwise it's unmerged
          execSync(`git branch --merged HEAD | grep -q "${cleanBranch.split('/').pop()}"`, { stdio: 'pipe' });
        } catch (e) {
          // grep returns 1 if not found -> unmerged
          findings.push(`  -> Unmerged Agent Branch: ${cleanBranch}`);
        }
      }
    }

    if (agentCommits.length > 0) {
      findings.push(`[WARNING] Detected ${agentCommits.length} recent isolated AI agent commits.`);
    }

    // Determine strict failure
    // If we have unmerged agent branches, we must BLOCK
    const unmergedCount = findings.filter(f => f.includes('Unmerged Agent Branch')).length;
    if (unmergedCount > 0) {
      return {
        passed: false,
        findings: findings,
        blocker: `Found ${unmergedCount} unintegrated AI agent branches. Must integrate data via optimal bridge before projection.`
      };
    }

    return {
      passed: true,
      findings: findings.length > 0 ? findings : ["Clean. No rogue unmerged AI agents detected."],
    };

  } catch (error) {
    console.error("  [!] Upstream scan error:", error.message);
    // Fail closed
    return { passed: false, blocker: `Agent scanner failed to execute: ${error.message}` };
  }
}

module.exports = { runAgentUpstreamScan };
