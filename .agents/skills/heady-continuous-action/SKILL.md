---
name: heady-continuous-action
description: Use when implementing continuous action recording, output drift detection, pattern learning from execution history, and auto-reconfiguration when determinism degrades.
---

# Heady™ Continuous Action Skill

## Overview

Record every task execution, detect drift using rolling hash windows, learn optimal parameters per domain, and auto-reconfigure when determinism degrades past φ⁻² threshold.

## Key Concepts

### Drift Detection

- Track output hashes in a rolling window (size: 21, Fibonacci-8)
- **Drift score** = unique hashes / window size
- If drift score > φ⁻² (0.382), determinism is degrading
- System auto-reconfigures: clears window, adjusts MC iterations, lowers temperature

### Pattern Learning

- Accumulates execution history per domain
- Identifies best-performing model per domain
- Computes optimal phi-scaled timeout: φ³ × 1000 ≈ 4236ms
- Tracks average confidence and latency

### Pre-flight Checks

- Before execution, compute confidence from: variable completeness, domain recognition, historical performance
- Gate decisions: EXECUTE > CAUTIOUS > HALT

## Usage via MCP

```bash
# Record an execution
node -e "require('./src/mcp/tools/heady-drift-analyzer-tool').handler({action:'record', domain:'code', confidence:0.85}).then(console.log)"

# Check drift status
node -e "require('./src/mcp/tools/heady-drift-analyzer-tool').handler({action:'stats'}).then(console.log)"

# Learn patterns
node -e "require('./src/mcp/tools/heady-drift-analyzer-tool').handler({action:'learn'}).then(console.log)"
```
