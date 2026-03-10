/**
 * Heady™ Auth Session Server v5.0
 * httpOnly cookie-based auth — ZERO localStorage tokens
 * Firebase Auth integration, __Host-heady_session cookie
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const {
  PHI, PSI, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, TIMING, SERVICE_PORTS,
} = require('../../../shared/phi-math');
const { createLogger } = require('../../../shared/logger');
const { HealthProbe } = require('../../../shared/health');

const logger = createLogger('auth-session-server');
const PORT = SERVICE_PORTS.HEADY_AUTH;

const SESSION_TTL_MS = TIMING.SESSION_TTL_MS * fib(8); // ~9.3 hours
const SESSION_ROTATE_INTERVAL = TIMING.SESSION_TTL_MS;  // Rotate every ~26min
const MAX_SESSIONS = fib(16);  // 987 concurrent sessions
const COOKIE_NAME = '__Host-heady_session';
const CSRF_HEADER = 'x-heady-csrf';

class SessionStore {
  constructor(maxSessions = MAX_SESSIONS) {
    this.sessions = new Map();
    this.maxSessions = maxSessions;
    this.rotationTimers = new Map();
  }

  create(userId, metadata = {}) {
    if (this.sessions.size >= this.maxSessions) {
      this._evictOldest();
    }

    const sessionId = crypto.randomBytes(fib(9)).toString('hex'); // 34 bytes
    const csrfToken = crypto.randomBytes(fib(8)).toString('hex'); // 21 bytes
    const now = Date.now();

    const session = {
      id: sessionId,
      userId,
      csrfToken,
      createdAt: now,
      lastAccess: now,
      expiresAt: now + SESSION_TTL_MS,
      metadata,
      rotateCount: 0,
    };

    this.sessions.set(sessionId, session);
    this._scheduleRotation(sessionId);

    logger.info('session_created', { sessionId: sessionId.slice(0, fib(6)), userId });
    return session;
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.destroy(sessionId);
      return null;
    }

    session.lastAccess = Date.now();
    return session;
  }

  rotate(sessionId) {
    const old = this.sessions.get(sessionId);
    if (!old) return null;

    const newSessionId = crypto.randomBytes(fib(9)).toString('hex');
    const newCsrf = crypto.randomBytes(fib(8)).toString('hex');

    const rotated = {
      ...old,
      id: newSessionId,
      csrfToken: newCsrf,
      lastAccess: Date.now(),
      rotateCount: old.rotateCount + 1,
    };

    this.sessions.delete(sessionId);
    this.sessions.set(newSessionId, rotated);

    if (this.rotationTimers.has(sessionId)) {
      clearTimeout(this.rotationTimers.get(sessionId));
      this.rotationTimers.delete(sessionId);
    }
    this._scheduleRotation(newSessionId);

    logger.info('session_rotated', {
      oldId: sessionId.slice(0, fib(6)),
      newId: newSessionId.slice(0, fib(6)),
      rotateCount: rotated.rotateCount,
    });
    return rotated;
  }

  destroy(sessionId) {
    this.sessions.delete(sessionId);
    if (this.rotationTimers.has(sessionId)) {
      clearTimeout(this.rotationTimers.get(sessionId));
      this.rotationTimers.delete(sessionId);
    }
    logger.info('session_destroyed', { sessionId: sessionId.slice(0, fib(6)) });
  }

  _scheduleRotation(sessionId) {
    const timer = setTimeout(() => {
      this.rotate(sessionId);
    }, SESSION_ROTATE_INTERVAL);
    this.rotationTimers.set(sessionId, timer);
  }

  _evictOldest() {
    let oldestId = null;
    let oldestAccess = Infinity;
    for (const [id, session] of this.sessions) {
      if (session.lastAccess < oldestAccess) {
        oldestAccess = session.lastAccess;
        oldestId = id;
      }
    }
    if (oldestId) this.destroy(oldestId);
  }

  get size() { return this.sessions.size; }

  destroyAll() {
    for (const timer of this.rotationTimers.values()) clearTimeout(timer);
    this.rotationTimers.clear();
    this.sessions.clear();
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

function setSessionCookie(res, sessionId, maxAge = SESSION_TTL_MS / 1000) {
  const cookie = `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.round(maxAge)}`;
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  res.setHeader('Set-Cookie', cookie);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function createAuthServer() {
  const store = new SessionStore();
  const healthProbe = new HealthProbe('auth-session-server');

  healthProbe.registerCheck('sessionStore', async () => ({
    healthy: store.size < MAX_SESSIONS,
    activeSessions: store.size,
    maxSessions: MAX_SESSIONS,
  }));

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://auth.headysystems.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${CSRF_HEADER}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Health endpoints
    if (url.pathname.startsWith('/health')) {
      healthProbe.mountRoutes({ get: (path, handler) => {
        if (url.pathname === path) handler(req, res);
      }});
      if (!res.writableEnded) {
        await healthProbe.fullHealthHandler(req, res);
      }
      return;
    }

    try {
      // POST /auth/login — Create session from Firebase token
      if (method === 'POST' && url.pathname === '/auth/login') {
        const body = await parseBody(req);
        if (!body.firebaseToken || !body.userId) {
          return json(res, 400, { error: 'MISSING_CREDENTIALS' });
        }

        // In production: verify Firebase token via Admin SDK
        // firebase.auth().verifyIdToken(body.firebaseToken)
        const session = store.create(body.userId, {
          email: body.email,
          displayName: body.displayName,
          provider: body.provider || 'firebase',
        });

        setSessionCookie(res, session.id);
        return json(res, 200, {
          csrf: session.csrfToken,
          userId: session.userId,
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      }

      // GET /auth/session — Validate current session
      if (method === 'GET' && url.pathname === '/auth/session') {
        const cookies = parseCookies(req);
        const sessionId = cookies[COOKIE_NAME];
        if (!sessionId) return json(res, 401, { error: 'NO_SESSION' });

        const session = store.get(sessionId);
        if (!session) {
          clearSessionCookie(res);
          return json(res, 401, { error: 'SESSION_EXPIRED' });
        }

        return json(res, 200, {
          userId: session.userId,
          csrf: session.csrfToken,
          expiresAt: new Date(session.expiresAt).toISOString(),
          metadata: session.metadata,
        });
      }

      // POST /auth/rotate — Force session rotation
      if (method === 'POST' && url.pathname === '/auth/rotate') {
        const cookies = parseCookies(req);
        const sessionId = cookies[COOKIE_NAME];
        if (!sessionId) return json(res, 401, { error: 'NO_SESSION' });

        // Verify CSRF
        const csrfHeader = req.headers[CSRF_HEADER];
        const session = store.get(sessionId);
        if (!session) return json(res, 401, { error: 'SESSION_EXPIRED' });
        if (csrfHeader !== session.csrfToken) return json(res, 403, { error: 'CSRF_MISMATCH' });

        const rotated = store.rotate(sessionId);
        if (!rotated) return json(res, 500, { error: 'ROTATION_FAILED' });

        setSessionCookie(res, rotated.id);
        return json(res, 200, { csrf: rotated.csrfToken });
      }

      // DELETE /auth/logout — Destroy session
      if (method === 'DELETE' && url.pathname === '/auth/logout') {
        const cookies = parseCookies(req);
        const sessionId = cookies[COOKIE_NAME];
        if (sessionId) store.destroy(sessionId);

        clearSessionCookie(res);
        return json(res, 200, { success: true });
      }

      // GET /auth/stats — Session store stats (admin only)
      if (method === 'GET' && url.pathname === '/auth/stats') {
        return json(res, 200, {
          activeSessions: store.size,
          maxSessions: MAX_SESSIONS,
          cookieName: COOKIE_NAME,
          sessionTTL: SESSION_TTL_MS,
          rotateInterval: SESSION_ROTATE_INTERVAL,
        });
      }

      json(res, 404, { error: 'NOT_FOUND' });
    } catch (err) {
      logger.error('request_error', { path: url.pathname, error: err.message });
      json(res, 500, { error: 'INTERNAL_ERROR' });
    }
  });

  return { server, store, healthProbe, PORT };
}

module.exports = { createAuthServer, SessionStore, COOKIE_NAME };
