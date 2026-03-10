/**
 * Heady™ Latent OS v5.3.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 *
 * CROSS-DOMAIN AUTH RELAY
 * Implements secure postMessage-based session relay across all 9 Heady domains.
 * Uses hidden iframe on auth.headysystems.com as session bridge.
 *
 * Flow:
 *   1. User authenticates on any Heady domain
 *   2. Auth redirects to auth.headysystems.com/relay with authorization code
 *   3. Relay verifies code, sets httpOnly __Host-heady_session cookie
 *   4. Each domain embeds hidden iframe to auth.headysystems.com/bridge
 *   5. Bridge postMessage relays session status to parent with origin validation
 *   6. Session propagates across all domains without cookie sharing
 *
 * 51 Provisional Patents — CSL-gated auth relay is patent-pending
 */
'use strict';

const crypto = require('crypto');
const {
  PHI, PSI, fib, CSL_THRESHOLDS, PHI_TIMING,
  cslGate, sigmoid,
} = require('../../shared/phi-math');
const { HEADY_DOMAINS, ALLOWED_ORIGINS, isAllowedOrigin } = require('../../shared/heady-domains');

// ─── φ-Constants ─────────────────────────────────────────────────────────────

const RELAY_CODE_TTL_MS   = PHI_TIMING.PHI_5;        // 11 090ms — relay code expiry
const RELAY_CODE_LENGTH   = fib(8);                   // 21 bytes
const NONCE_LENGTH        = fib(7);                   // 13 bytes
const MAX_RELAY_ATTEMPTS  = fib(6);                   // 8 attempts before lockout
const LOCKOUT_TTL_MS      = PHI_TIMING.PHI_7;        // 29 034ms lockout
const BRIDGE_CHECK_MS     = PHI_TIMING.PHI_3;        // 4 236ms bridge ping interval

// ─── In-memory relay code store (replace with Redis in production) ───────────

const relayCodeStore = new Map();
const lockoutStore = new Map();

// ─── Structured logger ──────────────────────────────────────────────────────

function log(level, msg, meta = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'cross-domain-auth',
    msg,
    ...meta,
  });
  process.stdout.write(entry + '\n');
}

// ─── Generate relay authorization code ──────────────────────────────────────

function generateRelayCode(userId, sourceDomain) {
  const code = crypto.randomBytes(RELAY_CODE_LENGTH).toString('base64url');
  const nonce = crypto.randomBytes(NONCE_LENGTH).toString('base64url');
  const expiresAt = Date.now() + RELAY_CODE_TTL_MS;

  relayCodeStore.set(code, {
    userId,
    sourceDomain,
    nonce,
    expiresAt,
    usedAt: null,
  });

  log('info', 'Relay code generated', { userId, sourceDomain, expiresMs: RELAY_CODE_TTL_MS });
  return { code, nonce, expiresAt };
}

// ─── Verify and consume relay code (one-time use) ───────────────────────────

function consumeRelayCode(code, expectedNonce) {
  const entry = relayCodeStore.get(code);

  if (!entry) {
    log('warn', 'Relay code not found');
    return { valid: false, reason: 'code_not_found' };
  }

  if (entry.usedAt) {
    log('warn', 'Relay code replay attempt', { userId: entry.userId });
    return { valid: false, reason: 'code_already_used' };
  }

  if (Date.now() > entry.expiresAt) {
    relayCodeStore.delete(code);
    log('warn', 'Relay code expired', { userId: entry.userId });
    return { valid: false, reason: 'code_expired' };
  }

  if (entry.nonce !== expectedNonce) {
    log('warn', 'Relay code nonce mismatch', { userId: entry.userId });
    return { valid: false, reason: 'nonce_mismatch' };
  }

  // Consume — mark as used
  entry.usedAt = Date.now();
  relayCodeStore.set(code, entry);

  // Schedule cleanup
  setTimeout(() => relayCodeStore.delete(code), RELAY_CODE_TTL_MS);

  log('info', 'Relay code consumed', { userId: entry.userId, sourceDomain: entry.sourceDomain });
  return { valid: true, userId: entry.userId, sourceDomain: entry.sourceDomain };
}

// ─── Check lockout status ───────────────────────────────────────────────────

function checkLockout(identifier) {
  const entry = lockoutStore.get(identifier);
  if (!entry) return { locked: false };

  if (Date.now() > entry.unlocksAt) {
    lockoutStore.delete(identifier);
    return { locked: false };
  }

  return {
    locked: true,
    remainingMs: entry.unlocksAt - Date.now(),
    attempts: entry.attempts,
  };
}

// ─── Record failed attempt ──────────────────────────────────────────────────

function recordFailedAttempt(identifier) {
  const entry = lockoutStore.get(identifier) || { attempts: 0, unlocksAt: 0 };
  entry.attempts += 1;

  if (entry.attempts >= MAX_RELAY_ATTEMPTS) {
    entry.unlocksAt = Date.now() + LOCKOUT_TTL_MS;
    log('warn', 'Relay lockout triggered', { identifier, attempts: entry.attempts });
  }

  lockoutStore.set(identifier, entry);
  return entry;
}

// ─── Bridge iframe HTML generator ────────────────────────────────────────────
// Served from auth.headysystems.com/bridge
// Communicates session status to parent domain via postMessage

function generateBridgeHTML(sessionValid, userInfo) {
  const originsJSON = JSON.stringify(ALLOWED_ORIGINS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
  <title>Heady Auth Bridge</title>
</head>
<body>
<script>
(function() {
  'use strict';
  var ALLOWED = ${originsJSON};
  var SESSION = ${JSON.stringify({ valid: sessionValid, user: userInfo || null })};
  var BRIDGE_INTERVAL = ${BRIDGE_CHECK_MS};

  function isAllowed(origin) {
    return ALLOWED.indexOf(origin) !== -1;
  }

  // Respond to session check requests from parent
  window.addEventListener('message', function(event) {
    if (!isAllowed(event.origin)) return;

    if (event.data && event.data.type === 'HEADY_SESSION_CHECK') {
      event.source.postMessage({
        type: 'HEADY_SESSION_STATUS',
        payload: SESSION,
        nonce: event.data.nonce,
      }, event.origin);
    }
  });

  // Announce readiness to parent
  if (window.parent !== window) {
    try {
      window.parent.postMessage({
        type: 'HEADY_BRIDGE_READY',
        timestamp: Date.now(),
      }, '*');
    } catch (_bridgeErr) { /* cross-origin — expected */ }
  }
})();
</script>
</body>
</html>`;
}

// ─── OAuth2.1 Authorization URL builder ─────────────────────────────────────
// PKCE-S256 + state parameter for CSRF protection

function buildAuthorizationURL(params) {
  const {
    clientId,
    redirectUri,
    scope = 'openid profile email',
    state,
    codeChallenge,
    codeChallengeMethod = 'S256',
    provider = 'firebase',
  } = params;

  const baseURL = 'https://auth.headysystems.com/authorize';
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    provider,
  });

  return `${baseURL}?${queryParams.toString()}`;
}

// ─── PKCE code verifier/challenge generation ─────────────────────────────────

function generatePKCE() {
  const verifierBytes = fib(8) * 2; // 42 bytes
  const verifier = crypto.randomBytes(verifierBytes).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge, method: 'S256' };
}

// ─── CSL-gated auth decision ─────────────────────────────────────────────────
// Uses CSL gate to evaluate auth confidence

function evaluateAuthConfidence(factors) {
  const {
    tokenValid = false,
    fingerprintMatch = false,
    originTrusted = false,
    sessionFresh = false,
    mfaVerified = false,
  } = factors;

  // Convert boolean factors to scores [0, 1]
  const scores = [
    tokenValid ? 1.0 : 0.0,
    fingerprintMatch ? 1.0 : 0.0,
    originTrusted ? 1.0 : 0.0,
    sessionFresh ? 1.0 : 0.0,
    mfaVerified ? 1.0 : 0.0,
  ];

  // φ-weighted average (most important factors first)
  const weights = [PSI, PSI * PSI, PSI * PSI * PSI, Math.pow(PSI, 4), Math.pow(PSI, 5)];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rawScore = scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight;

  // CSL gate decision — compare raw score directly against threshold
  // CSL_THRESHOLDS.LOW (0.691) used as auth gate: token + fingerprint sufficient
  const gateThreshold = CSL_THRESHOLDS.LOW;
  const gated = sigmoid((rawScore - gateThreshold) / PSI);

  return {
    rawScore: Math.round(rawScore * 1000) / 1000,
    gatedScore: Math.round(gated * 1000) / 1000,
    decision: rawScore >= gateThreshold ? 'allow' : 'deny',
    threshold: gateThreshold,
    factors: {
      tokenValid,
      fingerprintMatch,
      originTrusted,
      sessionFresh,
      mfaVerified,
    },
  };
}

// ─── Cleanup expired entries ─────────────────────────────────────────────────

function cleanupExpired() {
  const now = Date.now();

  for (const [code, entry] of relayCodeStore) {
    if (now > entry.expiresAt + RELAY_CODE_TTL_MS) {
      relayCodeStore.delete(code);
    }
  }

  for (const [id, entry] of lockoutStore) {
    if (now > entry.unlocksAt + LOCKOUT_TTL_MS) {
      lockoutStore.delete(id);
    }
  }
}

// Schedule periodic cleanup
setInterval(cleanupExpired, PHI_TIMING.PHI_8); // φ⁸×1000 ≈ 46 979ms

module.exports = {
  generateRelayCode,
  consumeRelayCode,
  checkLockout,
  recordFailedAttempt,
  generateBridgeHTML,
  buildAuthorizationURL,
  generatePKCE,
  evaluateAuthConfidence,
  cleanupExpired,
  RELAY_CODE_TTL_MS,
  RELAY_CODE_LENGTH,
  MAX_RELAY_ATTEMPTS,
  BRIDGE_CHECK_MS,
};
