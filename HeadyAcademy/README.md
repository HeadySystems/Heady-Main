# HeadyAcademy

> AI Nodes, Learning Tracks, and Training for the Heady Ecosystem

## Overview

HeadyAcademy houses the five core AI nodes and provides structured learning paths for working with the Heady platform.

## AI Nodes

| Node | Role | Skills |
|------|------|--------|
| **JULES** | Builder | code-generation, code-analysis, refactoring, architecture, debugging |
| **OBSERVER** | Monitor | health-check, anomaly-detection, metrics, alerting, log-analysis |
| **BUILDER** | Constructor | build, deploy, package, ci-cd, infrastructure |
| **ATLAS** | Navigator | search, indexing, knowledge-graph, discovery, mapping |
| **PYTHIA** | Oracle | prediction, analysis, recommendation, planning, simulation |

## How Node Routing Works

The Supervisor pattern routes tasks to nodes based on keyword matching:

```
"deploy the frontend" → BUILDER (matches "deploy")
"find the auth module" → ATLAS (matches "find")
"analyze performance" → PYTHIA (matches "analyze")
"fix the login bug"   → JULES (matches "fix")
"check system health" → OBSERVER (matches "check")
```

## Learning Tracks

### 1. Getting Started with Heady
- Introduction to Heady Systems (15min)
- Architecture Overview (30min)
- Your First Pipeline Run (20min)
- Meet HeadyBuddy (15min)

### 2. HCFullPipeline Mastery
- Pipeline Stages Explained (25min)
- YAML Configuration Deep Dive (30min)
- Checkpoint Protocol (20min)
- Error Recovery Patterns (25min)

### 3. Working with AI Nodes
- The Supervisor Pattern (20min)
- Task Routing & Fan-Out (25min)
- Creating Custom Agents (35min)
- Multi-Agent Orchestration (30min)

## Usage

```javascript
const academy = require('./HeadyAcademy');

// Get all AI nodes
const nodes = academy.getAllNodes();

// Route a task to the right node
const node = academy.routeTask("deploy the frontend to production");
// Returns: BUILDER node

// Get learning tracks
const tracks = academy.getTracks();
```

## Related

- [Service Integration](docs/guides/SERVICE_INTEGRATION.md)
- [HeadyBuddy Guide](HEADYBUDDY_GUIDE.md)
- [Checkpoint Protocol](docs/CHECKPOINT_PROTOCOL.md)
