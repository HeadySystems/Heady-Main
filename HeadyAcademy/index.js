// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: HeadyAcademy/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyAcademy — AI Nodes & Learning Platform
 *
 * Houses the five core AI nodes (JULES, OBSERVER, BUILDER, ATLAS, PYTHIA)
 * and provides a training/learning framework for the Heady ecosystem.
 */

const AI_NODES = {
  JULES: {
    id: 'jules',
    name: 'JULES',
    role: 'Builder',
    description: 'Code generation, refactoring, and architecture agent',
    skills: ['code-generation', 'code-analysis', 'refactoring', 'architecture', 'debugging'],
    triggerPatterns: ['build', 'code', 'implement', 'refactor', 'fix'],
    status: 'active',
  },
  OBSERVER: {
    id: 'observer',
    name: 'OBSERVER',
    role: 'Monitor',
    description: 'Health monitoring, anomaly detection, and metrics collection',
    skills: ['health-check', 'anomaly-detection', 'metrics', 'alerting', 'log-analysis'],
    triggerPatterns: ['monitor', 'health', 'check', 'alert', 'diagnose'],
    status: 'active',
  },
  BUILDER: {
    id: 'builder',
    name: 'BUILDER',
    role: 'Constructor',
    description: 'Build pipeline, deployment, and packaging agent',
    skills: ['build', 'deploy', 'package', 'ci-cd', 'infrastructure'],
    triggerPatterns: ['deploy', 'build', 'package', 'release', 'ship'],
    status: 'active',
  },
  ATLAS: {
    id: 'atlas',
    name: 'ATLAS',
    role: 'Navigator',
    description: 'Search, indexing, knowledge graph, and discovery agent',
    skills: ['search', 'indexing', 'knowledge-graph', 'discovery', 'mapping'],
    triggerPatterns: ['find', 'search', 'discover', 'map', 'index'],
    status: 'active',
  },
  PYTHIA: {
    id: 'pythia',
    name: 'PYTHIA',
    role: 'Oracle',
    description: 'Prediction, analysis, recommendation, and planning agent',
    skills: ['prediction', 'analysis', 'recommendation', 'planning', 'simulation'],
    triggerPatterns: ['predict', 'analyze', 'recommend', 'plan', 'simulate'],
    status: 'active',
  },
};

const LEARNING_TRACKS = [
  {
    id: 'getting-started',
    title: 'Getting Started with Heady',
    description: 'Learn the fundamentals of the Heady ecosystem',
    modules: [
      { id: 'intro', title: 'Introduction to Heady Systems', duration: '15min' },
      { id: 'architecture', title: 'Architecture Overview', duration: '30min' },
      { id: 'first-pipeline', title: 'Your First Pipeline Run', duration: '20min' },
      { id: 'headybuddy', title: 'Meet HeadyBuddy', duration: '15min' },
    ],
  },
  {
    id: 'pipeline-mastery',
    title: 'HCFullPipeline Mastery',
    description: 'Deep dive into the pipeline engine and orchestration',
    modules: [
      { id: 'stages', title: 'Pipeline Stages Explained', duration: '25min' },
      { id: 'configs', title: 'YAML Configuration Deep Dive', duration: '30min' },
      { id: 'checkpoints', title: 'Checkpoint Protocol', duration: '20min' },
      { id: 'recovery', title: 'Error Recovery Patterns', duration: '25min' },
    ],
  },
  {
    id: 'ai-nodes',
    title: 'Working with AI Nodes',
    description: 'Understand and leverage JULES, OBSERVER, BUILDER, ATLAS, and PYTHIA',
    modules: [
      { id: 'supervisor', title: 'The Supervisor Pattern', duration: '20min' },
      { id: 'routing', title: 'Task Routing & Fan-Out', duration: '25min' },
      { id: 'custom-agents', title: 'Creating Custom Agents', duration: '35min' },
      { id: 'orchestration', title: 'Multi-Agent Orchestration', duration: '30min' },
    ],
  },
];

class HeadyAcademy {
  constructor() {
    this.nodes = AI_NODES;
    this.tracks = LEARNING_TRACKS;
  }

  getNode(nodeId) {
    const key = nodeId.toUpperCase();
    return this.nodes[key] || null;
  }

  getAllNodes() {
    return Object.values(this.nodes);
  }

  getActiveNodes() {
    return Object.values(this.nodes).filter(n => n.status === 'active');
  }

  routeTask(taskDescription) {
    const desc = taskDescription.toLowerCase();
    for (const node of Object.values(this.nodes)) {
      if (node.triggerPatterns.some(p => desc.includes(p))) {
        return node;
      }
    }
    return this.nodes.JULES; // default to JULES
  }

  getTracks() {
    return this.tracks;
  }

  getTrack(trackId) {
    return this.tracks.find(t => t.id === trackId) || null;
  }

  getNodeSummary() {
    return Object.values(this.nodes).map(n => ({
      id: n.id,
      name: n.name,
      role: n.role,
      skills: n.skills.length,
      status: n.status,
    }));
  }
}

module.exports = new HeadyAcademy();
module.exports.AI_NODES = AI_NODES;
module.exports.LEARNING_TRACKS = LEARNING_TRACKS;
