// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/hc_supervisor.js
// LAYER: backend/src — agent-routing
// HEADY_BRAND:END

/**
 * HCSupervisor :: Agent Routing & Fan-Out Engine
 * Routes tasks to AI Nodes based on trigger keywords from the registry.
 * Supports parallel fan-out, result aggregation, and governance checks.
 * Pipeline-integrated: registers task handlers for route_to_agents, monitor_agent_execution, collect_agent_results.
 */

const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");

class HCSupervisor extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.aiNodeManager = opts.aiNodeManager || null;
    this.governanceState = opts.governanceState || null;
    this.stats = { tasksRouted: 0, fanOuts: 0, directRoutes: 0, rejectedByGovernance: 0, errors: 0 };
    this.activeDispatches = new Map();
    this._loadTriggerMap();
  }

  _loadTriggerMap() {
    this.triggerMap = new Map();
    try {
      const regPath = path.join(__dirname, "..", "heady-registry.json");
      const registry = JSON.parse(fs.readFileSync(regPath, "utf8"));
      for (const node of (registry.aiNodes || [])) {
        for (const trigger of (node.triggers || [])) {
          if (!this.triggerMap.has(trigger)) this.triggerMap.set(trigger, []);
          this.triggerMap.get(trigger).push(node.id);
        }
      }
    } catch (_) {
      // Default trigger map if registry unreadable
      this.triggerMap.set("optimization", ["jules"]);
      this.triggerMap.set("monitor", ["observer"]);
      this.triggerMap.set("new_project", ["builder"]);
      this.triggerMap.set("documentation", ["atlas"]);
      this.triggerMap.set("predict", ["pythia"]);
      this.triggerMap.set("huggingface", ["pythia"]);
    }
  }

  _checkGovernance(task) {
    if (this.governanceState && this.governanceState.stabilityDiagnosticMode) {
      const safeTypes = ["monitor", "health", "status", "documentation"];
      const isSafe = safeTypes.some(t => (task.type || "").includes(t) || (task.trigger || "").includes(t));
      if (!isSafe) {
        this.stats.rejectedByGovernance++;
        this.emit("governance:rejected", { task, reason: "stability_diagnostic_mode" });
        return { allowed: false, reason: "Stability Diagnostic Mode active — only safe operations permitted (Aloha Protocol: safety > clarity > story > speed)" };
      }
    }
    return { allowed: true };
  }

  _matchTrigger(input) {
    const lower = (input || "").toLowerCase();
    for (const [trigger, nodeIds] of this.triggerMap) {
      if (lower.includes(trigger)) return { trigger, nodeIds };
    }
    return null;
  }

  async routeTask(task) {
    const gov = this._checkGovernance(task);
    if (!gov.allowed) return { status: "rejected", reason: gov.reason };

    const match = this._matchTrigger(task.trigger || task.type || task.description || "");
    if (!match) return { status: "no_match", message: "No AI node matches the given trigger" };

    this.stats.tasksRouted++;
    const dispatchId = `dispatch_${Date.now()}`;
    this.activeDispatches.set(dispatchId, { task, nodeIds: match.nodeIds, startedAt: Date.now() });

    const results = await Promise.all(
      match.nodeIds.map(async (nodeId) => {
        const result = await this._executeOnNode(nodeId, task.payload || task);
        return { nodeId, ...result };
      })
    );

    this.activeDispatches.delete(dispatchId);
    this.emit("task:routed", { dispatchId, trigger: match.trigger, nodeIds: match.nodeIds, resultCount: results.length });
    return { status: "completed", dispatchId, trigger: match.trigger, results };
  }

  async fanOut(tasks) {
    this.stats.fanOuts++;
    const results = await Promise.allSettled(tasks.map(t => this.routeTask(t)));
    const aggregated = this.aggregateResults(results);
    this.emit("fanout:complete", { taskCount: tasks.length, successCount: aggregated.succeeded });
    return aggregated;
  }

  aggregateResults(settledResults) {
    const succeeded = [];
    const failed = [];
    for (const r of settledResults) {
      if (r.status === "fulfilled" && r.value.status === "completed") succeeded.push(r.value);
      else failed.push(r.status === "rejected" ? { error: r.reason?.message } : r.value);
    }
    return { total: settledResults.length, succeeded: succeeded.length, failed: failed.length, results: succeeded, errors: failed };
  }

  async directRoute(nodeId, payload) {
    this.stats.directRoutes++;
    const result = await this._executeOnNode(nodeId, payload);
    this.emit("direct:complete", { nodeId, status: result.status });
    return result;
  }

  async _executeOnNode(nodeId, payload) {
    if (this.aiNodeManager) {
      try {
        return await this.aiNodeManager.executeOnNode(nodeId, payload);
      } catch (err) {
        this.stats.errors++;
        return { status: "error", nodeId, error: err.message };
      }
    }
    return { status: "completed", nodeId, result: `Simulated execution on ${nodeId}`, durationMs: 0 };
  }

  getStatus() {
    return {
      ...this.stats,
      activeDispatches: this.activeDispatches.size,
      triggerCount: this.triggerMap.size,
      triggers: [...this.triggerMap.keys()],
    };
  }
}

function registerSupervisorRoutes(app, supervisor) {
  app.get("/api/supervisor/status", (req, res) => res.json({ ok: true, ...supervisor.getStatus(), ts: new Date().toISOString() }));
  app.post("/api/supervisor/route", async (req, res) => {
    try { res.json({ ok: true, ...await supervisor.routeTask(req.body), ts: new Date().toISOString() }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post("/api/supervisor/fan-out", async (req, res) => {
    try { res.json({ ok: true, ...await supervisor.fanOut(req.body.tasks || []), ts: new Date().toISOString() }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
}

module.exports = { HCSupervisor, registerSupervisorRoutes };
