/* ╔══════════════════════════════════════════════════════════════════╗
   ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
   ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
   ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
   ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
   ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
   ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
   ║                                                                  ║
   ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
   ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
   ║  FILE: src/routes/auth-routes.js                                ║
   ║  LAYER: routing                                                 ║
   ║  PURPOSE: Authentication endpoints & session management          ║
   ╚══════════════════════════════════════════════════════════════════╝
   HEADY_BRAND:END */

const express = require('express');
const crypto = require('crypto');
const { createLogger } = require('../../packages/structured-logger');

const router = express.Router();
const log = createLogger('auth', 'authentication');

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING (bcrypt-like using PBKDF2)
// ═════════════════════════════════════════════════════════════════════════════

const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

// ═════════════════════════════════════════════════════════════════════════════
// SESSION CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSIONS_PER_USER = 5;
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// ═════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (demo only; replace with DB in production)
// ═════════════════════════════════════════════════════════════════════════════

// Map<token, { userId, email, name, createdAt, expiresAt }>
const sessions = new Map();

// Map<userId, { email, passwordHash, name, createdAt }>
const users = new Map();

// Rate limiting for login attempts
const loginAttempts = new Map(); // email -> { count, lastAttempt }
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Demo user seed — password hashed at startup
const DEMO_USER = {
  id: 'demo-user-1',
  email: 'eric@headyconnection.org',
  passwordHash: hashPassword('heady2026'),
  name: 'Eric Haywood',
};

// Register demo user on startup
users.set(DEMO_USER.id, DEMO_USER);

// Periodic session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt && now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, SESSION_CLEANUP_INTERVAL);

// ═════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Timing-safe comparison for API keys and sensitive strings.
 * Prevents timing attacks by always comparing full length.
 */
function timingSafeEqual(a, b) {
  if (!a || !b) return false;
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a secure session token.
 * In production, use a proper JWT or session library.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ═════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware: Validate Bearer token and attach user to req.user
 * Returns 401 if token is invalid or missing.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired session token',
    });
  }

  // Check session expiry
  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({
      error: 'session_expired',
      message: 'Session has expired. Please log in again.',
    });
  }

  const user = users.get(session.userId);
  if (!user) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'User not found',
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
  };
  req.token = token;

  next();
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /login
 * Authenticate user with email/password or apiKey.
 *
 * Request:
 *   - { email, password } — credential-based login
 *   - { apiKey } — API key login (validated against ADMIN_TOKEN)
 *
 * Response:
 *   - 200: { token, user: { id, email, name } }
 *   - 401: { error, message }
 *   - 400: { error, message }
 */
router.post('/login', (req, res) => {
  const { email, password, apiKey } = req.body;

  try {
    // API Key authentication
    if (apiKey) {
      const adminToken = process.env.ADMIN_TOKEN;

      if (!adminToken) {
        return res.status(500).json({
          error: 'server_error',
          message: 'ADMIN_TOKEN not configured',
        });
      }

      if (!timingSafeEqual(apiKey, adminToken)) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid API key',
        });
      }

      const token = generateToken();
      const adminUser = {
        id: 'admin-system',
        email: 'system@heady.internal',
        name: 'System Admin',
      };

      sessions.set(token, {
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        createdAt: new Date(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      return res.status(200).json({ token, user: adminUser });
    }

    // Email/password authentication
    if (!email || !password) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email and password are required',
      });
    }

    // Sanitize email
    const cleanEmail = String(email).toLowerCase().trim();

    // Check login rate limiting
    const attempts = loginAttempts.get(cleanEmail);
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeSince = Date.now() - attempts.lastAttempt;
      if (timeSince < LOGIN_LOCKOUT_MS) {
        return res.status(429).json({
          error: 'too_many_attempts',
          message: 'Too many login attempts. Try again later.',
          retryAfter: Math.ceil((LOGIN_LOCKOUT_MS - timeSince) / 1000),
        });
      }
      loginAttempts.delete(cleanEmail); // Reset after lockout
    }

    // Find user by email
    let user = null;
    for (const [, u] of users) {
      if (u.email === cleanEmail) {
        user = u;
        break;
      }
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      // Track failed attempt
      const current = loginAttempts.get(cleanEmail) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(cleanEmail, { count: current.count + 1, lastAttempt: Date.now() });

      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Clear failed attempts on success
    loginAttempts.delete(cleanEmail);

    // Enforce max sessions per user
    let userSessionCount = 0;
    let oldestToken = null;
    let oldestTime = Infinity;
    for (const [tok, sess] of sessions) {
      if (sess.userId === user.id) {
        userSessionCount++;
        if (sess.createdAt < oldestTime) {
          oldestTime = sess.createdAt;
          oldestToken = tok;
        }
      }
    }
    if (userSessionCount >= MAX_SESSIONS_PER_USER && oldestToken) {
      sessions.delete(oldestToken);
    }

    const token = generateToken();
    sessions.set(token, {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    log.error('Login error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * POST /register
 * Create a new user account and return a session token.
 *
 * Request:
 *   - { email, password, name }
 *
 * Response:
 *   - 201: { token, user: { id, email, name } }
 *   - 400: { error, message }
 *   - 409: { error, message } (email already exists)
 */
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Validate inputs
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email, password, and name are required',
      });
    }

    if (email.length > 255 || password.length < 6) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email too long or password too short (min 6 chars)',
      });
    }

    // Check for existing user
    for (const [, u] of users) {
      if (u.email === email) {
        return res.status(409).json({
          error: 'conflict',
          message: 'Email already registered',
        });
      }
    }

    // Create new user with hashed password
    const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
    const newUser = {
      id: userId,
      email: String(email).toLowerCase().trim(),
      passwordHash: hashPassword(password),
      name: String(name).trim().substring(0, 100),
      createdAt: new Date(),
    };

    users.set(userId, newUser);

    // Create session token
    const token = generateToken();
    sessions.set(token, {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    log.error('Registration error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * POST /logout
 * Invalidate the current session token.
 *
 * Request:
 *   - Authorization: Bearer <token>
 *
 * Response:
 *   - 200: { message }
 *   - 401: { error, message }
 */
router.post('/logout', requireAuth, (req, res) => {
  try {
    const token = req.token;
    sessions.delete(token);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    log.error('Logout error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * GET /me
 * Retrieve current user information from session token.
 *
 * Request:
 *   - Authorization: Bearer <token>
 *
 * Response:
 *   - 200: { user: { id, email, name } }
 *   - 401: { error, message }
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    log.error('GET /me error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * GET /validate
 * Check if a session token is valid.
 *
 * Request:
 *   - Authorization: Bearer <token> (optional; checks header token)
 *   - Query: ?token=<token> (alternative)
 *
 * Response:
 *   - 200: { valid: true, user: { id, email, name } }
 *   - 200: { valid: false }
 */
router.get('/validate', (req, res) => {
  try {
    let token = extractToken(req.headers.authorization);
    if (!token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(200).json({
        valid: false,
      });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(200).json({
        valid: false,
      });
    }

    const user = users.get(session.userId);
    if (!user) {
      return res.status(200).json({
        valid: false,
      });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    log.error('Validate error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /preferences — Save user onboarding preferences
// ═════════════════════════════════════════════════════════════════════════════

router.post('/preferences', requireAuth, (req, res) => {
  try {
    const { workspace, integrations } = req.body;
    const user = users.get(req.user.id);
    if (user) {
      user.preferences = { workspace, integrations, onboardedAt: new Date().toISOString() };
    }
    res.json({ status: 'saved', preferences: { workspace, integrations } });
  } catch (error) {
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  router,
  requireAuth,
};
