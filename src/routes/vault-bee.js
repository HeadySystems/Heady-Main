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
    console.error("[VaultBee] Failed to load vault:", err.message);
  }
  return {};
}

function saveVault(vault) {
  try {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), "utf8");
  } catch (err) {
    console.error("[VaultBee] Failed to save vault:", err.message);
  }
}

router.get("/status", (req, res) => {
  const vault = loadVault();
  res.json({ ok: true, service: "vault-bee", keyCount: Object.keys(vault).length, encrypted: true, algorithm: ALGO, ts: new Date().toISOString() });
});

function requireVaultAuth(req, res, next) {
  const vaultKey = process.env.HEADY_VAULT_API_KEY;
  if (!vaultKey) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: "Vault authentication not configured — HEADY_VAULT_API_KEY is required" });
    }
    return next(); // Development: allow unauthenticated access
  }
  const provided = req.headers['x-vault-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!provided || provided !== vaultKey) {
    return res.status(401).json({ error: "Vault authentication required" });
  }
  next();
}

router.get("/keys", requireVaultAuth, (req, res) => {
  const vault = loadVault();
  res.json({ ok: true, keys: Object.keys(vault), ts: new Date().toISOString() });
});

router.post("/store", requireVaultAuth, (req, res) => {
  const { id, value } = req.body;
  if (!id || !value) return res.status(400).json({ error: "id and value required" });
  const vault = loadVault();
  vault[id] = { ...encrypt(typeof value === "string" ? value : JSON.stringify(value)), storedAt: new Date().toISOString() };
  saveVault(vault);
  res.json({ ok: true, id, stored: true, ts: new Date().toISOString() });
});

router.get("/retrieve/:id", requireVaultAuth, (req, res) => {
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
  const vault = loadVault();
  if (!vault[req.params.id]) return res.status(404).json({ error: `Key '${req.params.id}' not found` });
  delete vault[req.params.id];
  saveVault(vault);
  res.json({ ok: true, id: req.params.id, revoked: true, ts: new Date().toISOString() });
});

module.exports = router;
