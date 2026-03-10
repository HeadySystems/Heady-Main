---
description: Bootstrap a new service from cold start using regenerative meta-prompts
---

# Heady™ Service Bootstrap Workflow

Bootstrap a new Heady service from cold start using the RegenerativePrompt system. Creates self-contained prompt documents that carry everything a HeadyNode needs.

## Steps

1. **Generate a regenerative prompt**:

```bash
node -e "
const t = require('./src/mcp/tools/heady-regenerative-bootstrap-tool');
t.handler({
  action: 'generate',
  config: {
    name: 'my-service',
    version: '1.0.0',
    description: 'New Heady™ service',
    targetNode: 'worker-1',
    tools: ['heady_memory_ops', 'heady_csl_engine'],
    prerequisites: ['shared/phi-math', 'shared/csl-engine']
  }
}).then(r => console.log(JSON.stringify(r, null, 2)))
"
```

1. **Validate the prompt**:

```bash
node -e "const t = require('./src/mcp/tools/heady-regenerative-bootstrap-tool'); t.handler({action:'validate', prompt_id:'PROMPT_ID'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Bootstrap the service**:

```bash
node -e "const t = require('./src/mcp/tools/heady-regenerative-bootstrap-tool'); t.handler({action:'bootstrap', prompt_id:'PROMPT_ID'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```

1. **Serialize for portability**:

```bash
node -e "const t = require('./src/mcp/tools/heady-regenerative-bootstrap-tool'); t.handler({action:'serialize', prompt_id:'PROMPT_ID'}).then(r => console.log(JSON.stringify(r, null, 2)))"
```
