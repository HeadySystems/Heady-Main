---
description: Monitor output drift continuously and auto-reconfigure when determinism degrades
---

# Heady™ Drift Monitor Workflow

Continuous drift monitoring using the CSL confidence gate. Tracks output hashes, detects divergence past φ⁻² threshold, and auto-reconfigures.

## Steps

1. **Record an execution**:

```bash
node -e "
const t = require('./src/mcp/tools/heady-drift-analyzer-tool');
t.handler({
  action: 'record',
  input: { prompt: 'test query' },
  output: { result: 'test result' },
  domain: 'code', provider: 'anthropic', model: 'claude-3', latencyMs: 150, confidence: 0.85
}).then(r => console.log(JSON.stringify(r, null, 2)))
"
```

1. **Track drift** (add output hash to rolling window):

```bash
node -e "const t = require('./src/mcp/tools/heady-drift-analyzer-tool'); t.handler({action:'track', output_hash:'abc123def456'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Pre-flight check** before execution:

```bash
node -e "const t = require('./src/mcp/tools/heady-drift-analyzer-tool'); t.handler({action:'check', domain:'code', variables:{language:'js'}}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Learn patterns** from execution history:

```bash
node -e "const t = require('./src/mcp/tools/heady-drift-analyzer-tool'); t.handler({action:'learn'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Auto-reconfigure** when drift detected:

```bash
node -e "const t = require('./src/mcp/tools/heady-drift-analyzer-tool'); t.handler({action:'reconfigure', drifting:true, domain:'code'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Get stats**:

```bash
node -e "const t = require('./src/mcp/tools/heady-drift-analyzer-tool'); t.handler({action:'stats'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

## Thresholds

- **EXECUTE**: confidence > φ⁻¹ (0.618)
- **CAUTIOUS**: confidence > φ⁻² (0.382)
- **HALT**: below φ⁻²
- **DRIFT**: unique hashes / window > φ⁻² (0.382)
