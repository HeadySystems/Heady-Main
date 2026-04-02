// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: heady-manager.js
// LAYER: root
// 
//         _   _  _____    _    ____   __   __
//        | | | || ____|  / \  |  _ \ \ \ / /
//        | |_| ||  _|   / _ \ | | | | \ V / 
//        |  _  || |___ / ___ \| |_| |  | |  
//        |_| |_||_____/_/   \_\____/   |_|  
// 
//    Sacred Geometry :: Organic Systems :: Breathing Interfaces
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                                ║
 * ║     ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                                ║
 * ║     ███████║█████╗  ███████║██║  ██║ ╚████╔╝                                 ║
 * ║     ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                                  ║
 * ║     ██║  ██║███████╗██║  ██║██████╔╝   ██║                                   ║
 * ║     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                                   ║
 * ║                                                                               ║
 * ║     ∞ SACRED GEOMETRY ARCHITECTURE ∞                                          ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                         ║
 * ║     HEADY MANAGER - Node.js MCP Server & Admin API                            ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const NexusProtocol = require(path.join(__dirname, "src", "nexus_protocol"));
const nexus = new NexusProtocol();

const { HEADY_MAID_CONFIG } = require(path.join(__dirname, "src", "heady_maid"));

const { GracefulShutdownManager } = require(path.join(__dirname, "src", "graceful_shutdown"));
const { logger } = require(path.join(__dirname, "src", "structured_logger"));

const shutdown = new GracefulShutdownManager({ timeout: 34000 });

const PORT = Number(process.env.PORT || 3300);
const HEADY_ADMIN_SCRIPT = process.env.HEADY_ADMIN_SCRIPT || path.join(__dirname, "src", "heady_project", "heady_conductor.py");
const HEADY_PYTHON_BIN = process.env.HEADY_PYTHON_BIN || "python";

const CORS_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.HEADY_CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const app = express();
app.use(shutdown.middleware());       // 503 during drain
app.use(logger.requestLogger());      // Structured JSON request logging
app.use(express.json({ limit: "50mb" }));
app.use(cors(CORS_ORIGINS.length > 0 ? { origin: CORS_ORIGINS, credentials: true } : undefined));

function readJsonFileSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Serve Frontend Build (React)
const frontendBuildPath = path.join(__dirname, "frontend", "build");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "heady-manager", ts: new Date().toISOString() });
});

app.get("/api/registry", (req, res) => {
  const registryPath = path.join(__dirname, "heady-registry.json");
  const registry = readJsonFileSafe(registryPath);
  if (!registry) {
    return res.status(404).json({ error: "Registry not found or invalid" });
  }
  res.json(registry);
});

app.get("/api/maid/config", (req, res) => {
  res.json(HEADY_MAID_CONFIG);
});

app.get("/api/maid/inventory", (req, res) => {
  const inventoryPath = path.join(__dirname, ".heady-memory", "inventory", "inventory.json");
  const inventory = readJsonFileSafe(inventoryPath);
  if (!inventory) {
    return res.status(404).json({ error: "Inventory not found or invalid" });
  }
  res.json(inventory);
});

// HeadyConductor API Endpoints
app.post("/api/nexus/route", async (req, res) => {
  try {
    const result = await nexus.routeInput(req.body);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

app.post("/api/conductor/orchestrate", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res.status(400).json({ error: "Request parameter required" });
    }

    const result = await runPythonConductor(["--request", request]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conductor/summary", async (req, res) => {
  try {
    const result = await runPythonConductor(["--summary"]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conductor/health", async (req, res) => {
  try {
    const result = await runPythonConductor(["--health"]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conductor/query", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' required" });
    }

    const result = await runPythonConductor(["--query", q]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/conductor/workflow", async (req, res) => {
  try {
    const { workflow } = req.body;
    if (!workflow) {
      return res.status(400).json({ error: "Workflow parameter required" });
    }

    const result = await runPythonConductor(["--workflow", workflow]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/conductor/node", async (req, res) => {
  try {
    const { node } = req.body;
    if (!node) {
      return res.status(400).json({ error: "Node parameter required" });
    }

    const result = await runPythonConductor(["--node", node]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to run Python HeadyConductor
function runPythonConductor(args) {
  return new Promise((resolve, reject) => {
    const conductorPath = HEADY_ADMIN_SCRIPT;
    const pythonBin = HEADY_PYTHON_BIN;
    
    const proc = spawn(pythonBin, [conductorPath, ...args], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`HeadyConductor exited with code ${code}: ${stderr}`));
      } else {
        try {
          // Extract JSON from output (last JSON object)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ output: stdout, stderr });
          }
        } catch (e) {
          resolve({ output: stdout, stderr });
        }
      }
    });
  });
}

const server = app.listen(PORT, () => {
  logger.info(`∞ Heady System Active on Port ${PORT} ∞`, { port: PORT });
});
shutdown.attach(server);
