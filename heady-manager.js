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
// eslint-disable-next-line no-unused-vars
const HEADY_ADMIN_SCRIPT = process.env.HEADY_ADMIN_SCRIPT || path.join(__dirname, "src", "heady_project", "heady_conductor.py");
// eslint-disable-next-line no-unused-vars
const HEADY_PYTHON_BIN = process.env.HEADY_PYTHON_BIN || "python";

const app = express();
app.use(shutdown.middleware());       // 503 during drain
app.use(logger.requestLogger());      // Structured JSON request logging
app.use(express.json({ limit: "50mb" }));
app.use(cors());

function readJsonFileSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    logger.warn("Failed to read JSON file", { filePath, error: err.message });
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

const CONDUCTOR_TIMEOUT_MS = 30000; // 30s subprocess timeout
const MAX_INPUT_LENGTH = 10000; // Max length for user-supplied string parameters

/**
 * Validate user-supplied string input for conductor arguments.
 * Rejects null bytes, control characters, and excessively long strings.
 */
function validateConductorInput(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > MAX_INPUT_LENGTH) {
    throw new Error(`${fieldName} exceeds maximum length of ${MAX_INPUT_LENGTH} characters`);
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0e-\x1f]/.test(value)) {
    throw new Error(`${fieldName} contains invalid control characters`);
  }
  return value;
}

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
    validateConductorInput(request, "request");

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
    validateConductorInput(q, "q");

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
    validateConductorInput(workflow, "workflow");

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
    validateConductorInput(node, "node");

    const result = await runPythonConductor(["--node", node]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to run Python HeadyConductor with timeout and safety limits
function runPythonConductor(args) {
  return new Promise((resolve, reject) => {
    const conductorPath = path.join(__dirname, "HeadyAcademy", "HeadyConductor.py");
    const pythonBin = process.env.HEADY_PYTHON_BIN || "python";
    const maxOutputBytes = 5 * 1024 * 1024; // 5MB output limit
    
    const proc = spawn(pythonBin, [conductorPath, ...args], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });
    let stdout = "";
    let stderr = "";
    let killed = false;

    // Enforce subprocess timeout
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch (_e) { /* already exited */ }
      }, 2000);
    }, CONDUCTOR_TIMEOUT_MS);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > maxOutputBytes) {
        killed = true;
        proc.kill("SIGTERM");
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.length > maxOutputBytes) {
        killed = true;
        proc.kill("SIGTERM");
      }
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new Error("HeadyConductor timed out or exceeded output limits"));
      } else if (code !== 0) {
        reject(new Error(`HeadyConductor exited with code ${code}: ${stderr}`));
      } else {
        try {
          // Extract the last top-level JSON object from stdout
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ output: stdout, stderr });
          }
        } catch (_e) {
          resolve({ output: stdout, stderr });
        }
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start HeadyConductor: ${err.message}`));
    });
  });
}

const server = app.listen(PORT, () => {
  logger.info(`∞ Heady System Active on Port ${PORT} ∞`, { port: PORT });
});
shutdown.attach(server);
