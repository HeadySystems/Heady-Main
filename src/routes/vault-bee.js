// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/routes/vault-bee.js
// LAYER: backend/src/routes
// HEADY_BRAND:END

/**
 * VaultBee :: Secure Key-Value Vault with AES-256-GCM encryption
 * Stores secrets encrypted at rest. Requires API key for retrieval.
 */

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const VAULT_DIR = path.join(__dirname, "..", "..", ".heady-memory", "vault");
const VAULT_FILE = path.join(VAULT_DIR, "vault.enc.json");
const ALGO = "aes-256-gcm";

function getVaultKey() {
  const envKey = process.env.HEADY_VAULT_KEY;
  if (envKey && envKey.length >= 32) return Buffer.from(envKey.slice(0, 32), "utf8");
  // Derive from stable machine identifier
  const machineId = `heady-vault-${require("os").hostname()}-${require("os").userInfo().username}`;
  return crypto.createHash("sha256").update(machineId).digest();
}

function encrypt(text) {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { iv: iv.toString("hex"), encrypted, tag };
}

function decrypt(data) {
  const key = getVaultKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(data.iv, "hex"));
  decipher.setAuthTag(Buffer.from(data.tag, "hex"));
  let decrypted = decipher.update(data.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function loadVault() {
  try {
    if (fs.existsSync(VAULT_FILE)) return JSON.parse(fs.readFileSync(VAULT_FILE, "utf8"));
  } catch (err) {
    process.stderr.write(JSON.stringify({ severity: 'WARNING', message: `vault load error: ${err.message}` }) + '\n');
  }
  return {};
}

function saveVault(vault) {
  try {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), "utf8");
  } catch (err) {
    process.stderr.write(JSON.stringify({ severity: 'ERROR', message: `vault save error: ${err.message}` }) + '\n');
  }
}

// Vault key ID validation — alphanumeric, hyphens, and underscores only
function validateVaultId(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error("Invalid vault key ID: must be 1-128 alphanumeric/hyphen/underscore characters");
  }
}

// Validate vault ID and send 400 if invalid (reusable helper)
function checkVaultId(id, res) {
  try { validateVaultId(id); return true; } catch (err) { res.status(400).json({ error: err.message }); return false; }
}

// Require admin token for all vault operations
function requireVaultAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN || process.env.HEADY_VAULT_ADMIN_TOKEN;
  const provided = req.headers["x-admin-token"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!adminToken) {
    return res.status(503).json({ error: "Vault authentication not configured" });
  }
  if (!provided) {
    return res.status(401).json({ error: "Authentication required (x-admin-token header)" });
  }
  // Use fixed-length HMAC comparison to avoid leaking token length via timing
  const expected = crypto.createHmac("sha256", "vault-auth").update(adminToken).digest();
  const actual   = crypto.createHmac("sha256", "vault-auth").update(provided).digest();
  if (!crypto.timingSafeEqual(expected, actual)) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
  next();
}

router.get("/status", requireVaultAuth, (req, res) => {
  const vault = loadVault();
  res.json({ ok: true, service: "vault-bee", keyCount: Object.keys(vault).length, encrypted: true, algorithm: ALGO, ts: new Date().toISOString() });
});

router.get("/keys", requireVaultAuth, (req, res) => {
  const vault = loadVault();
  res.json({ ok: true, keys: Object.keys(vault), ts: new Date().toISOString() });
});

router.post("/store", requireVaultAuth, (req, res) => {
  const { id, value } = req.body;
  if (!id || !value) return res.status(400).json({ error: "id and value required" });
  if (!checkVaultId(id, res)) return;
  const vault = loadVault();
  vault[id] = { ...encrypt(typeof value === "string" ? value : JSON.stringify(value)), storedAt: new Date().toISOString() };
  saveVault(vault);
  res.json({ ok: true, id, stored: true, ts: new Date().toISOString() });
});

router.get("/retrieve/:id", requireVaultAuth, (req, res) => {
  if (!checkVaultId(req.params.id, res)) return;
  const vault = loadVault();
  const entry = vault[req.params.id];
  if (!entry) return res.status(404).json({ error: `Key '${req.params.id}' not found` });
  try {
    const value = decrypt(entry);
    res.json({ ok: true, id: req.params.id, value, retrievedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Decryption failed", message: err.message });
  }
});

router.delete("/revoke/:id", requireVaultAuth, (req, res) => {
  if (!checkVaultId(req.params.id, res)) return;
  const vault = loadVault();
  if (!vault[req.params.id]) return res.status(404).json({ error: `Key '${req.params.id}' not found` });
  delete vault[req.params.id];
  saveVault(vault);
  res.json({ ok: true, id: req.params.id, revoked: true, ts: new Date().toISOString() });
});

module.exports = router;
