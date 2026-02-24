/**
 * ─── Heady Liquid Dynamic Agent Orchestrator ──────────────────────
 *
 * NOW ACTUALLY USED:
 *   - ALL /brain/* requests route through orchestrator.submit()
 *   - Local dispatch mode: calls handler functions in-process, no self-HTTP
 *   - Agents spawn on demand per service group
 *   - Tasks get tracked, scaled, and reclaimed
 *
 * Service Groups (each can have N duplicate nodes):
 *   reasoning  → brain.chat, brain.analyze, brain.complete
 *   embedding  → brain.embed, vector store/query
 *   search     → brain.search, knowledge retrieval
 *   creative   → creative.generate, remix
 *   battle     → battle.validate, arena
 *   ops        → health, monitoring, deploy
 * ──────────────────────────────────────────────────────────────────
 */

const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");

const AUDIT_PATH = path.join(__dirname, "..", "data", "agent-orchestrator-audit.jsonl");
const PHI = 1.6180339887;
const MAX_CONCURRENT = 50;
const IDLE_RECLAIM_MS = Math.round(PHI ** 6 * 1000); // φ⁶ ≈ 17,944ms
const SCALE_THRESHOLD = 3;
const SCALE_CHECK_MS = Math.round(PHI ** 4 * 1000);  // φ⁴ ≈ 6,854ms

class HeadyAgent {
    constructor(id, serviceGroup) {
        this.id = id;
        this.serviceGroup = serviceGroup;
        this.busy = false;
        this.taskCount = 0;
        this.errors = 0;
        this.totalLatency = 0;
        this.lastActive = Date.now();
        this.created = Date.now();
    }

    get avgLatency() {
        return this.taskCount > 0 ? Math.round(this.totalLatency / this.taskCount) : 0;
    }

    get stats() {
        return {
            id: this.id,
            serviceGroup: this.serviceGroup,
            busy: this.busy,
            taskCount: this.taskCount,
            errors: this.errors,
            avgLatency: this.avgLatency,
            uptime: Date.now() - this.created,
            lastActive: this.lastActive,
            idleSince: this.busy ? null : Date.now() - this.lastActive,
        };
    }
}

class DynamicRouter {
    constructor() {
        this.routingTable = {
            embed: "embedding",
            store: "embedding",
            search: "search",
            query: "search",
            analyze: "reasoning",
            refactor: "reasoning",
            complete: "reasoning",
            chat: "reasoning",
            validate: "battle",
            arena: "battle",
            generate: "creative",
            remix: "creative",
            health: "ops",
            deploy: "ops",
            status: "ops",
        };
    }

    route(task) {
        return this.routingTable[task.action] || "reasoning";
    }
}

class AgentOrchestrator extends EventEmitter {
    constructor(options = {}) {
        super();
        this.maxConcurrent = options.maxConcurrent || MAX_CONCURRENT;
        this.agents = new Map();
        this.taskQueue = [];
        this.completedTasks = 0;
        this.failedTasks = 0;
        this.router = new DynamicRouter();
        this.started = Date.now();
        this.scaleEvents = [];
        this.taskHistory = []; // Keep last 100 completed tasks

        // LOCAL DISPATCH: registered handler functions for in-process calls
        this.handlers = new Map();

        // Per-group node counts for liquid scaling
        this.groupCounts = {};
        this.groupLimits = {
            reasoning: 10, embedding: 8, search: 6,
            creative: 5, battle: 4, ops: 3,
        };

        // Ensure data dir
        const dir = path.dirname(AUDIT_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Start auto-scaling loop
        this._scaleInterval = setInterval(() => this._autoScale(), SCALE_CHECK_MS);
    }

    /**
     * Register a local handler function for an action.
     * This is how brain routes wire into the orchestrator WITHOUT self-HTTP.
     *
     * @param {string} action - e.g., "chat", "analyze", "embed", "search"
     * @param {Function} handler - async (payload) => result
     */
    registerHandler(action, handler) {
        this.handlers.set(action, handler);
        console.log(`  ∞ Orchestrator: handler registered for '${action}'`);
    }

    _getOrCreateAgent(serviceGroup) {
        // Find idle agent for this service group
        for (const [id, agent] of this.agents) {
            if (agent.serviceGroup === serviceGroup && !agent.busy) return agent;
        }
        // Liquid: check per-group limit, then global limit
        const groupCount = this.groupCounts[serviceGroup] || 0;
        const groupLimit = this.groupLimits[serviceGroup] || 5;
        if (groupCount < groupLimit && this.agents.size < this.maxConcurrent) {
            const nodeNum = groupCount + 1;
            const id = `${serviceGroup}-node-${nodeNum}-${Date.now().toString(36)}`;
            const agent = new HeadyAgent(id, serviceGroup);
            this.agents.set(id, agent);
            this.groupCounts[serviceGroup] = nodeNum;
            this.emit("agent:spawned", { id, serviceGroup, nodeNum, groupTotal: nodeNum });
            this._audit({ type: "liquid:spawn", serviceGroup, nodeNum, totalAgents: this.agents.size });
            return agent;
        }
        return null;
    }

    /** Scale up a service group by N nodes */
    scaleUp(serviceGroup, count = 1) {
        const spawned = [];
        for (let i = 0; i < count; i++) {
            const agent = this._getOrCreateAgent(serviceGroup);
            if (agent) spawned.push(agent.id);
        }
        this.scaleEvents.push({ type: "scale_up", serviceGroup, count: spawned.length, ts: Date.now() });
        return spawned;
    }

    /** Scale down idle agents in a service group */
    scaleDown(serviceGroup) {
        let removed = 0;
        for (const [id, agent] of this.agents) {
            if (agent.serviceGroup === serviceGroup && !agent.busy) {
                this.agents.delete(id);
                this.groupCounts[serviceGroup] = Math.max(0, (this.groupCounts[serviceGroup] || 1) - 1);
                removed++;
                this._audit({ type: "liquid:reclaim", agent: id, serviceGroup });
            }
        }
        this.scaleEvents.push({ type: "scale_down", serviceGroup, removed, ts: Date.now() });
        return removed;
    }

    /** Auto-scale based on queue pressure + idle reclamation */
    _autoScale() {
        // Scale UP under pressure
        if (this.taskQueue.length >= SCALE_THRESHOLD) {
            const groupPressure = {};
            this.taskQueue.forEach(({ serviceGroup }) => {
                groupPressure[serviceGroup] = (groupPressure[serviceGroup] || 0) + 1;
            });
            for (const [group, pressure] of Object.entries(groupPressure)) {
                if (pressure >= 2) this.scaleUp(group, Math.min(pressure, 3));
            }
        }
        // Scale DOWN idle agents
        const now = Date.now();
        for (const [id, agent] of this.agents) {
            if (!agent.busy && agent.taskCount > 0 && (now - agent.lastActive) > IDLE_RECLAIM_MS) {
                const groupAgents = [...this.agents.values()].filter(a => a.serviceGroup === agent.serviceGroup);
                if (groupAgents.length > 1) {
                    this.agents.delete(id);
                    this.groupCounts[agent.serviceGroup] = Math.max(0, (this.groupCounts[agent.serviceGroup] || 1) - 1);
                    this._audit({ type: "liquid:idle_reclaim", agent: id, idle_ms: now - agent.lastActive });
                }
            }
        }
    }

    _audit(entry) {
        const line = JSON.stringify({ ...entry, ts: new Date().toISOString() });
        try { fs.appendFileSync(AUDIT_PATH, line + "\n"); } catch { }
        this.emit("audit", entry);
    }

    /**
     * Submit a task — the primary entry point.
     * If a local handler is registered, dispatch in-process.
     * Otherwise queue for agent execution.
     */
    async submit(task) {
        const serviceGroup = this.router.route(task);
        const agent = this._getOrCreateAgent(serviceGroup);

        if (!agent) {
            // Queue it
            return new Promise((resolve, reject) => {
                this.taskQueue.push({ task, serviceGroup, resolve, reject });
                this.emit("task:queued", { action: task.action, queueSize: this.taskQueue.length });
            });
        }

        const start = Date.now();
        agent.busy = true;
        this._audit({ type: "task:start", action: task.action, agent: agent.id, serviceGroup });

        try {
            let result;
            const handler = this.handlers.get(task.action);
            if (handler) {
                // LOCAL DISPATCH: call the registered handler function directly
                result = await handler(task.payload || {});
            } else {
                // No handler registered — return an error
                throw new Error(`No handler registered for action '${task.action}'`);
            }

            agent.taskCount++;
            agent.totalLatency += Date.now() - start;
            agent.lastActive = Date.now();
            agent.busy = false;
            this.completedTasks++;

            const taskRecord = {
                ok: true,
                action: task.action,
                result,
                latency: Date.now() - start,
                agent: agent.id,
                serviceGroup,
            };

            this._audit({ type: "task:complete", action: task.action, agent: agent.id, latency: taskRecord.latency });
            this.taskHistory.push({ ...taskRecord, ts: Date.now() });
            if (this.taskHistory.length > 100) this.taskHistory = this.taskHistory.slice(-100);
            this.emit("task:complete", taskRecord);

            this._processQueue();
            return taskRecord;
        } catch (err) {
            agent.errors++;
            agent.busy = false;
            agent.lastActive = Date.now();
            this.failedTasks++;
            this._audit({ type: "task:error", action: task.action, agent: agent.id, error: err.message });
            this._processQueue();
            return { ok: false, error: err.message, latency: Date.now() - start, agent: agent.id };
        }
    }

    /** Submit multiple tasks in parallel */
    async submitBatch(tasks) {
        return Promise.allSettled(tasks.map(t => this.submit(t)));
    }

    /** Deterministic parallel execution with results */
    async parallel(tasks) {
        const results = await this.submitBatch(tasks);
        return results.map((r, i) => ({
            task: tasks[i].action,
            ...(r.status === "fulfilled" ? r.value : { ok: false, error: r.reason?.message }),
        }));
    }

    _processQueue() {
        while (this.taskQueue.length > 0) {
            const { task, serviceGroup, resolve, reject } = this.taskQueue[0];
            const agent = this._getOrCreateAgent(serviceGroup);
            if (!agent) break;
            this.taskQueue.shift();
            this.submit(task).then(resolve).catch(reject);
        }
    }

    /** Orchestrator stats — liquid architecture view */
    getStats() {
        const agents = [];
        this.agents.forEach(a => agents.push(a.stats));

        const groups = {};
        this.agents.forEach(a => {
            if (!groups[a.serviceGroup]) groups[a.serviceGroup] = { nodes: 0, busy: 0, tasks: 0, errors: 0, limit: this.groupLimits[a.serviceGroup] || 5 };
            groups[a.serviceGroup].nodes++;
            if (a.busy) groups[a.serviceGroup].busy++;
            groups[a.serviceGroup].tasks += a.taskCount;
            groups[a.serviceGroup].errors += a.errors;
        });

        return {
            architecture: "liquid-dynamic",
            totalAgents: this.agents.size,
            maxConcurrent: this.maxConcurrent,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            queuedTasks: this.taskQueue.length,
            handlersRegistered: [...this.handlers.keys()],
            uptime: Date.now() - this.started,
            groups,
            agents,
            recentScaleEvents: this.scaleEvents.slice(-20),
            recentTasks: this.taskHistory.slice(-10).map(t => ({
                action: t.action, ok: t.ok, latency: t.latency, agent: t.agent, serviceGroup: t.serviceGroup,
            })),
        };
    }

    shutdown() {
        clearInterval(this._scaleInterval);
        this.agents.clear();
        this.taskQueue = [];
        this._audit({ type: "shutdown", completedTasks: this.completedTasks });
        this.emit("shutdown");
    }

    /** Express routes */
    registerRoutes(app) {
        app.get("/api/orchestrator/agents", (req, res) => {
            res.json({ ok: true, ...this.getStats() });
        });

        app.post("/api/orchestrator/submit", async (req, res) => {
            try {
                const { action, payload } = req.body;
                if (!action) return res.status(400).json({ error: "action required" });
                const result = await this.submit({ action, payload: payload || {} });
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.post("/api/orchestrator/batch", async (req, res) => {
            try {
                const { tasks } = req.body;
                if (!Array.isArray(tasks)) return res.status(400).json({ error: "tasks array required" });
                const results = await this.parallel(tasks);
                res.json({ ok: true, results, total: results.length });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.get("/api/orchestrator/nodes", (req, res) => {
            const nodes = [];
            this.agents.forEach(a => nodes.push({
                ...a.stats,
                age: Date.now() - a.created,
            }));
            res.json({ ok: true, nodes, groups: this.getStats().groups });
        });

        app.post("/api/orchestrator/scale", (req, res) => {
            const { serviceGroup, action, count } = req.body;
            if (!serviceGroup || !action) return res.status(400).json({ error: "serviceGroup + action required" });
            if (action === "up") {
                const spawned = this.scaleUp(serviceGroup, count || 1);
                res.json({ ok: true, action: "scale_up", spawned, totalAgents: this.agents.size });
            } else if (action === "down") {
                const removed = this.scaleDown(serviceGroup);
                res.json({ ok: true, action: "scale_down", removed, totalAgents: this.agents.size });
            } else {
                res.status(400).json({ error: "action must be 'up' or 'down'" });
            }
        });

        app.get("/api/orchestrator/audit", (req, res) => {
            try {
                const lines = fs.readFileSync(AUDIT_PATH, "utf-8").trim().split("\n").slice(-100);
                const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
                res.json({ ok: true, entries, total: entries.length });
            } catch {
                res.json({ ok: true, entries: [], total: 0 });
            }
        });
    }
}

// Singleton
let instance = null;
function getOrchestrator(options) {
    if (!instance) instance = new AgentOrchestrator(options);
    return instance;
}

module.exports = { AgentOrchestrator, getOrchestrator };
