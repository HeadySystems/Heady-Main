// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/routes/auth-routes.js
// LAYER: backend/src/routes
// HEADY_BRAND:END

/**
 * Auth Routes :: Token-based authentication with HMAC signing
 * Login with API key → session token. Verify, revoke, and status endpoints.
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const sessions = new Map();

function getSigningKey() {
  return process.env.HEADY_AUTH_SECRET || process.env.HEADY_API_KEY || "heady-dev-secret-key-change-in-production";
}

function generateToken(identity) {
  const payload = JSON.stringify({ identity, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS });
  const hmac = crypto.createHmac("sha256", getSigningKey()).update(payload).digest("hex");
  const token = Buffer.from(payload).toString("base64url") + "." + hmac;
  sessions.set(token, { identity, createdAt: Date.now(), expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function verifyToken(token) {
  const session = sessions.get(token);
  if (!session) return { valid: false, reason: "unknown_token" };
  if (Date.now() > session.expiresAt) { sessions.delete(token); return { valid: false, reason: "expired" }; }
  // Verify HMAC integrity
  const [payloadB64, hmac] = token.split(".");
  if (!payloadB64 || !hmac) return { valid: false, reason: "malformed" };
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", getSigningKey()).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"))) return { valid: false, reason: "tampered" };
  return { valid: true, identity: session.identity, expiresAt: new Date(session.expiresAt).toISOString() };
}

// Middleware export for protecting routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Authorization header required" });
  const token = authHeader.slice(7);
  const result = verifyToken(token);
  if (!result.valid) return res.status(401).json({ error: "Invalid token", reason: result.reason });
  req.authIdentity = result.identity;
  next();
}

router.get("/status", (req, res) => {
  // Prune expired
  for (const [token, session] of sessions) { if (Date.now() > session.expiresAt) sessions.delete(token); }
  res.json({ ok: true, service: "heady-auth", activeSessions: sessions.size, tokenTTL: `${TOKEN_TTL_MS / 3600000}h`, ts: new Date().toISOString() });
});

router.post("/login", (req, res) => {
  const { apiKey, identity } = req.body;
  const expectedKey = process.env.HEADY_API_KEY;
  if (expectedKey) {
    // Use timing-safe comparison to prevent timing-based key enumeration
    const bufA = Buffer.from(String(apiKey || ""));
    const bufB = Buffer.from(expectedKey);
    const match = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    if (!match) return res.status(401).json({ error: "Invalid API key" });
  }
  const token = generateToken(identity || "default");
  res.json({ ok: true, token, expiresIn: `${TOKEN_TTL_MS / 3600000}h`, ts: new Date().toISOString() });
});

router.post("/verify", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  res.json({ ok: true, ...verifyToken(token), ts: new Date().toISOString() });
});

router.post("/revoke", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const existed = sessions.delete(token);
  res.json({ ok: true, revoked: existed, ts: new Date().toISOString() });
});

router.requireAuth = requireAuth;
module.exports = router;
