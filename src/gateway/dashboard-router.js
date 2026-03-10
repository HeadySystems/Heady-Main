'use strict';

const os = require('os');
const { AgentManager } = require('../agents/agent-manager');
const { MemoryStore } = require('../memory/memory-store');

const agentManager = new AgentManager();
const memoryStore = new MemoryStore();
const startTime = Date.now();

function setupDashboardRoutes(app) {
  // Dashboard status — aggregates health, agents, memory, and system info
  app.get('/api/dashboard/status', (req, res) => {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const agents = agentManager.getStatusAll();
    const memory = memoryStore.getStatus();

    res.json({
      system: {
        status: 'ok',
        uptime: uptimeSec,
        version: require('../../package.json').version,
        environment: process.env.NODE_ENV || 'development',
        node: process.version,
      },
      agents: {
        total: agents.length,
        idle: agents.filter(a => a.status === 'idle').length,
        working: agents.filter(a => a.status === 'working').length,
        categories: [...new Set(agents.map(a => a.category))],
      },
      memory: {
        entries: memory.memories,
        storePath: memory.storePath,
      },
      resources: {
        cpus: os.cpus().length,
        totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
        loadAvg: os.loadavg(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Services status — lists all configured services/providers
  app.get('/api/services/status', (req, res) => {
    let providers = [];
    try {
      const config = require('../../config/providers.json');
      providers = config.providers.map(p => ({
        id: p.id,
        name: p.name,
        models: p.models,
        priority: p.priority,
        strengths: p.strengths,
        hasKey: !!process.env[p.envKey],
        rateLimit: p.rateLimit,
      }));
    } catch (e) {
      // config may not exist in test environments
    }

    const internalServices = [
      { id: 'heady-manager', status: 'running', port: process.env.PORT || 3301 },
      { id: 'memory-store', status: 'running', entries: memoryStore.getStatus().memories },
      { id: 'mcp-gateway', status: 'running' },
      { id: 'auto-success', status: 'running' },
    ];

    res.json({
      providers,
      internal: internalServices,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = { setupDashboardRoutes };
