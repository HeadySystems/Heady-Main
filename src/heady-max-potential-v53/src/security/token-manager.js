/**
 * Heady™ Latent OS v5.3.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 *
 * TOKEN MANAGER
 * Centralized token lifecycle: generation, verification, refresh, revocation.
 * httpOnly cookies only — no localStorage contamination.
 */
'use strict';

const crypto = require('crypto');
const {
  PHI, PSI, fib, PHI_TIMING, CSL_THRESHOLDS,
} = require('../../shared/phi-math');

// ─── φ-Constants ─────────────────────────────────────────────────────────────

const TOKEN_ALG             = 'HS256';
const TOKEN_TYP             = 'JWT';
const SHORT_SESSION_MS      = PHI_TIMING.PHI_7;              // 29 034ms (short-lived)
const LONG_SESSION_MS       = fib(11) * fib(12) * fib(6) * 1000; // 89 × 144 × 8 × 1000ms
const REFRESH_WINDOW_MS     = PHI_TIMING.PHI_6;              // 17 944ms before expiry
const TOKEN_ID_BYTES        = fib(8);                         // 21 bytes
const REVOCATION_SET_SIZE   = fib(16);                        // 987 max revoked tokens in memory

// ─── Revocation set ─────────────────────────────────────────────────────────

const revokedTokens = new Set();

// ─── Base64URL encode ───────────────────────────────────────────────────────

function base64url(data) {
  return Buffer.from(data).toString('base64url');
}

// ─── Generate token (HMAC-SHA256 JWT-compatible) ─────────────────────────────

function generateToken(payload, secret, options = {}) {
  const {
    ttlMs = SHORT_SESSION_MS,
    rememberMe = false,
  } = options;

  const effectiveTTL = rememberMe ? LONG_SESSION_MS : ttlMs;
  const now = Date.now();

  const header = base64url(JSON.stringify({ alg: TOKEN_ALG, typ: TOKEN_TYP }));
  const body = base64url(JSON.stringify({
    ...payload,
    jti: crypto.randomBytes(TOKEN_ID_BYTES).toString('hex'),
    iat: now,
    exp: now + effectiveTTL,
  }));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

// ─── Verify token ───────────────────────────────────────────────────────────

function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'invalid_structure' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Check revocation
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch (parseErr) {
    return { valid: false, reason: 'invalid_payload' };
  }
  if (payload.jti && revokedTokens.has(payload.jti)) {
    return { valid: false, reason: 'token_revoked' };
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signatureB64, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  // Check expiry
  if (payload.exp && Date.now() > payload.exp) {
    return { valid: false, reason: 'token_expired' };
  }

  // Check if eligible for refresh
  const needsRefresh = payload.exp && (payload.exp - Date.now()) < REFRESH_WINDOW_MS;

  return { valid: true, payload, needsRefresh };
}

// ─── Revoke token ───────────────────────────────────────────────────────────

function revokeToken(jti) {
  revokedTokens.add(jti);

  // Cap revocation set size
  if (revokedTokens.size > REVOCATION_SET_SIZE) {
    const iterator = revokedTokens.values();
    revokedTokens.delete(iterator.next().value);
  }
}

// ─── Refresh token ──────────────────────────────────────────────────────────

function refreshToken(oldToken, secret) {
  const verification = verifyToken(oldToken, secret);
  if (!verification.valid) {
    return { success: false, reason: verification.reason };
  }

  // Revoke old
  if (verification.payload.jti) {
    revokeToken(verification.payload.jti);
  }

  // Generate new with same payload (sans jti/iat/exp)
  const { jti, iat, exp, ...userPayload } = verification.payload;
  const newToken = generateToken(userPayload, secret, {
    ttlMs: exp - iat, // preserve original TTL
  });

  return { success: true, token: newToken };
}

// ─── Cookie options builder ─────────────────────────────────────────────────

function buildCookieOptions(options = {}) {
  const { rememberMe = false, domain } = options;
  const maxAgeMs = rememberMe ? LONG_SESSION_MS : SHORT_SESSION_MS;

  return {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.round(maxAgeMs / 1000),
    ...(domain ? { domain } : {}),
  };
}

module.exports = {
  generateToken,
  verifyToken,
  revokeToken,
  refreshToken,
  buildCookieOptions,
  SHORT_SESSION_MS,
  LONG_SESSION_MS,
  REFRESH_WINDOW_MS,
};
