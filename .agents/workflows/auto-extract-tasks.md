---
description: Auto-extract tasks from any new docs, reports, or analysis — always, regardless of significance
---

# Auto-Extract Tasks Workflow

// turbo-all

This workflow runs automatically whenever new documentation, reports, or analysis files are created or modified. It ensures every insight gets captured as a trackable task.

## When to Run
- After creating or editing any file in `docs/`
- After generating reports, analysis, or audit results
- After any pipeline scan, deep scan, or audit
- **Always** — no significance threshold. Every finding becomes a task.

## Steps

1. **Identify new/modified docs**
```bash
git diff --name-only HEAD~1 -- docs/ configs/ | grep -E '\.(md|json)$'
```

2. **Cross-reference against existing tasks**
```bash
# Extract all existing task IDs
cat configs/hcfullpipeline-tasks.json | jq -r '.tasks[].id' > /tmp/existing-task-ids.txt
echo "Current task count: $(wc -l < /tmp/existing-task-ids.txt)"
```

3. **Scan docs for actionable findings not already tracked**
For each new/modified doc, look for:
- Recommendations or "should" statements
- Gap analysis findings
- Items marked as missing, needed, or not yet implemented
- Verification steps that don't have corresponding test tasks
- Dependency chains that need explicit tracking tasks

4. **Generate new task entries**
For each finding, create a task entry with:
- **ID**: Next available in category sequence (e.g., SEC-024, INFRA-028)
- **Category**: SECURITY | INFRASTRUCTURE | ARCHITECTURE | QUALITY | DOCUMENTATION | SCALING | FEATURES | REMEDIATION
- **Title**: Clear, actionable (starts with verb)
- **Description**: Specific enough to execute without additional context
- **Status**: "pending"
- **csl_confidence**: 0.618 (default) or higher if critical
- **estimated_hours**: Conservative estimate
- **source**: "Report/Doc name — specific finding"

5. **Merge into hcfullpipeline-tasks.json**
- Append new entries to the `tasks` array
- Update `taskCount` in header
- Update category task counts
- Bump `version` patch number
- Update `lastFineTuned` timestamp

6. **Update extracted-report-tasks.md**
- Append new findings to the running log
- Update summary metrics

7. **Commit merged tasks**
```bash
git add configs/hcfullpipeline-tasks.json docs/extracted-report-tasks.md
git commit -m "feat: auto-extract N tasks from [source doc] — hcfullpipeline-tasks.json v[new version]"
```

8. **Push to all remotes**
```bash
git push headyai main
git push hc-main main
git push production main
git push hs-main main
```

## Rules
- **No significance threshold**: Even a single missing README, a cosmetic fix, or a minor doc update gets tracked
- **No duplicates**: Always cross-reference against existing task IDs before adding
- **Proper IDs**: Follow the existing numbering sequence per category
- **Source attribution**: Every task must reference the specific doc and finding that generated it
- **Version bump**: Every merge bumps the patch version of hcfullpipeline-tasks.json
