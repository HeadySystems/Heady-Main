// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/hc_brain.js
// LAYER: backend/src — meta-controller
// HEADY_BRAND:END

/**
 * HCBrain :: Node.js Meta-Controller & Bridge to Python HeadyBrain
 * Pre-response processing: gathers system state, patterns, concepts, execution plan.
 * Falls back to JS-native pipeline when Python service is unreachable.
 */

const EventEmitter = require("events");
const http = require("http");

class HCBrain extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.resourceManager = opts.resourceManager || null;
    this.patternEngine = opts.patternEngine || null;
    this.supervisor = opts.supervisor || null;
    this.selfCritique = opts.selfCritique || null;
    this.pythonPort = opts.pythonPort || 8000;
    this.stats = { requestsProcessed: 0, pythonCalls: 0, jsFallbacks: 0 };
  }

  async processRequest(request) {
    this.stats.requestsProcessed++;
    const ts = new Date().toISOString();

    // Try Python HeadyBrain first
    try {
      const pyResult = await this._callPython(request);
      this.stats.pythonCalls++;
      this.emit("process:complete", { source: "python", request });
      return { ok: true, source: "python", ...pyResult, ts };
    } catch (_) {
      // Fall back to JS-native pipeline
    }

    this.stats.jsFallbacks++;
    const context = {};

    // Stage 1: System state from ResourceManager
    if (this.resourceManager) {
      try { context.systemState = this.resourceManager.getSnapshot(); } catch (_) { context.systemState = {}; }
    }

    // Stage 2: Recent patterns
    if (this.patternEngine) {
      try { context.recentPatterns = this.patternEngine.getSummary ? this.patternEngine.getSummary() : {}; } catch (_) { context.recentPatterns = {}; }
    }

    // Stage 3: Concept identification (keyword extraction)
    const keywords = this._extractKeywords(request);
    context.concepts = keywords;

    // Stage 4: Execution plan via Supervisor
    if (this.supervisor) {
      try {
        const match = this.supervisor._matchTrigger(request);
        context.executionPlan = match ? { trigger: match.trigger, targetNodes: match.nodeIds } : { trigger: null, targetNodes: [] };
      } catch (_) { context.executionPlan = {}; }
    }

    // Stage 5: Self-critique snapshot
    if (this.selfCritique) {
      try { context.systemHealth = this.selfCritique.getStatus ? this.selfCritique.getStatus() : {}; } catch (_) { context.systemHealth = {}; }
    }

    this.emit("process:complete", { source: "js-native", request });
    return { ok: true, source: "js-native", request, context, ts };
  }

  _extractKeywords(text) {
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "has", "have", "had", "do", "does", "did", "will", "would", "can", "could", "should", "may", "might", "shall", "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "our", "their", "not", "no"]);
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  }

  _callPython(request) {
    return new Promise((resolve, reject) => {
      const pythonHost = process.env.PYTHON_BRAIN_HOST || "localhost";
      const data = JSON.stringify({ request, action: "process" });
      const req = http.request({ hostname: pythonHost, port: this.pythonPort, path: "/api/brain/process", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": data.length }, timeout: 3000 }, (res) => {
        let body = "";
        res.on("data", c => body += c);
        res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(new Error("Invalid JSON from Python")); } });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Python HeadyBrain timeout")); });
      req.write(data);
      req.end();
    });
  }

  getSystemAwareness() {
    const awareness = { ts: new Date().toISOString(), stats: this.stats, components: {} };
    awareness.components.resourceManager = !!this.resourceManager;
    awareness.components.patternEngine = !!this.patternEngine;
    awareness.components.supervisor = !!this.supervisor;
    awareness.components.selfCritique = !!this.selfCritique;
    if (this.resourceManager) try { awareness.resourceSnapshot = this.resourceManager.getSnapshot(); } catch (e) { awareness.resourceSnapshot = null; }
    return awareness;
  }

  getStatus() {
    return { ok: true, service: "hc-brain", ...this.stats, components: { resourceManager: !!this.resourceManager, patternEngine: !!this.patternEngine, supervisor: !!this.supervisor, selfCritique: !!this.selfCritique } };
  }
}

function registerBrainRoutes(app, brain) {
  app.get("/api/brain/status", (req, res) => res.json({ ...brain.getStatus(), ts: new Date().toISOString() }));
  app.get("/api/brain/awareness", (req, res) => res.json(brain.getSystemAwareness()));
  app.post("/api/brain/process", async (req, res) => {
    try {
      const result = await brain.processRequest(req.body?.request || req.body?.text || "");
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}

module.exports = { HCBrain, registerBrainRoutes };
