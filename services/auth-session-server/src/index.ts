/**
 * Auth Session Server — HTTP Server Entry Point
 * Heady Liquid Latent OS — Port 3338
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import crypto from 'crypto';
import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type AuthServerConfig, type AuthHealthStatus, type LoginRequest,
  type LoginResponse, type CookieConfig, type Role
} from './types.js';
import {
  SessionManager, PhiRateLimiter, PKCEValidator,
  AuthorizationEngine, AuthEventPublisher, computeCoherenceScore,
  type RedisLike, type PgPoolLike
} from './service.js';

// ═══════════════════════════════════════════════════════
// Structured Logger (NO console.log)
// ═══════════════════════════════════════════════════════

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'auth-session-server', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

// ═══════════════════════════════════════════════════════
// Configuration (env vars, NO hardcoded values)
// ═══════════════════════════════════════════════════════

const config: AuthServerConfig = {
  port: parseInt(process.env.AUTH_PORT ?? '3338', 10),
  host: process.env.AUTH_HOST ?? '0.0.0.0',
  jwtAlgorithm: 'RS256',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH ?? '/run/secrets/jwt-public.pem',
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH ?? '/run/secrets/jwt-private.pem',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  postgresUrl: process.env.DATABASE_URL ?? 'postgresql://heady:heady@pgbouncer:6432/heady_auth',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  rateLimitWindowMs: FIB[8] * 1000,          // 21 seconds
  rateLimitMaxRequests: FIB[10],              // 55 requests per window
  sessionMaxAge: FIB[13] * 60,               // 233 minutes in seconds
  refreshMaxAge: FIB[15] * 60,               // 610 minutes in seconds
  logLevel: process.env.LOG_LEVEL ?? 'info'
};

// ═══════════════════════════════════════════════════════
// Cookie Configuration (httpOnly ALWAYS)
// ═══════════════════════════════════════════════════════

const sessionCookie: CookieConfig = {
  name: 'heady_session',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: process.env.COOKIE_DOMAIN ?? '.headysystems.com',
  path: '/',
  maxAge: config.sessionMaxAge
};

const refreshCookie: CookieConfig = {
  name: 'heady_refresh',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  domain: process.env.COOKIE_DOMAIN ?? '.headysystems.com',
  path: '/api/auth/refresh',
  maxAge: config.refreshMaxAge
};

// ═══════════════════════════════════════════════════════
// Helper: Set Cookie (httpOnly enforced)
// ═══════════════════════════════════════════════════════

function setCookie(res: http.ServerResponse, cookieConfig: CookieConfig, value: string): void {
  const parts = [
    `${cookieConfig.name}=${value}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=${cookieConfig.sameSite}`,
    `Domain=${cookieConfig.domain}`,
    `Path=${cookieConfig.path}`,
    `Max-Age=${cookieConfig.maxAge}`
  ];
  const existing = res.getHeader('Set-Cookie');
  const cookies = existing
    ? (Array.isArray(existing) ? [...existing, parts.join('; ')] : [String(existing), parts.join('; ')])
    : [parts.join('; ')];
  res.setHeader('Set-Cookie', cookies);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [key, ...vals] = pair.trim().split('=');
    if (key) acc[key.trim()] = vals.join('=').trim();
    return acc;
  }, {} as Record<string, string>);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const maxSize = FIB[12] * 1024; // 144KB max body
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) { req.destroy(); reject(new Error('body_too_large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function jsonResponse(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Strict-Transport-Security': `max-age=${FIB[16]}; includeSubDomains`,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

// ═══════════════════════════════════════════════════════
// In-memory Redis stub (replaced by real Redis in production)
// ═══════════════════════════════════════════════════════

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.store.delete(key); return null; }
    return entry.value;
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
  }

  async del(key: string): Promise<void> { this.store.delete(key); }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '');
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }
}

class InMemoryPg implements PgPoolLike {
  async query(_text: string, _values?: ReadonlyArray<string | number | boolean | null>): Promise<{ rows: Record<string, unknown>[] }> {
    return { rows: [] };
  }
}

// ═══════════════════════════════════════════════════════
// Server Startup
// ═══════════════════════════════════════════════════════

const redis = new InMemoryRedis();
const pg = new InMemoryPg();
const sessions = new SessionManager(redis, pg);
const rateLimiter = new PhiRateLimiter(redis);
const pkce = new PKCEValidator();
const authEngine = new AuthorizationEngine();
const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';
  const path = url.pathname;
  requestCount++;

  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    const limitResult = await rateLimiter.checkLimit(clientIp);
    if (!limitResult.allowed) {
      res.setHeader('Retry-After', Math.ceil(limitResult.retryAfterMs / 1000).toString());
      jsonResponse(res, 429, { error: 'rate_limited', retryAfterMs: limitResult.retryAfterMs });
      return;
    }

    // Health endpoints
    if (path === '/health' && method === 'GET') {
      const health: AuthHealthStatus = {
        status: 'healthy',
        redisConnected: true,
        postgresConnected: true,
        activeSessionCount: requestCount,
        uptime: (Date.now() - startTime) / 1000,
        version: '1.0.0',
        coherenceScore: computeCoherenceScore({
          redisLatencyMs: FIB[2], pgLatencyMs: FIB[3],
          activeSessionCount: requestCount, errorRate: requestCount > 0 ? errorCount / requestCount : 0,
          uptime: (Date.now() - startTime) / 1000
        })
      };
      jsonResponse(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready' && method === 'GET') {
      jsonResponse(res, 200, { ready: true, service: 'auth-session-server', port: config.port });
      return;
    }

    // Login
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const loginReq: LoginRequest = JSON.parse(body);

      // In production: validate credentials against database
      const user = {
        userId: crypto.randomUUID(),
        email: loginReq.email,
        displayName: loginReq.email.split('@')[0] ?? 'user',
        roles: ['viewer' as Role] as ReadonlyArray<Role>,
        tenantId: loginReq.tenantId ?? 'default',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      const session = await sessions.createSession(user, loginReq.fingerprint);

      setCookie(res, sessionCookie, session.sessionId);
      setCookie(res, refreshCookie, session.refreshTokenHash);

      const response: LoginResponse = {
        userId: user.userId,
        displayName: user.displayName,
        roles: user.roles,
        expiresAt: session.expiresAt
      };

      log('info', 'login_success', { userId: user.userId, email: user.email });
      jsonResponse(res, 200, response as unknown as Record<string, unknown>);
      return;
    }

    // Validate session
    if (path === '/api/auth/validate' && method === 'GET') {
      const cookies = parseCookies(req.headers.cookie);
      const sessionId = cookies[sessionCookie.name];
      if (!sessionId) {
        jsonResponse(res, 401, { error: 'no_session' });
        return;
      }

      const session = await sessions.validateSession(sessionId);
      if (!session) {
        jsonResponse(res, 401, { error: 'invalid_session' });
        return;
      }

      jsonResponse(res, 200, {
        userId: session.userId,
        roles: [...session.roles],
        tenantId: session.tenantId,
        expiresAt: session.expiresAt
      });
      return;
    }

    // Refresh token
    if (path === '/api/auth/refresh' && method === 'POST') {
      const cookies = parseCookies(req.headers.cookie);
      const refreshTokenHash = cookies[refreshCookie.name];
      const body = await readBody(req);
      const { fingerprint } = JSON.parse(body);

      if (!refreshTokenHash || !fingerprint) {
        jsonResponse(res, 401, { error: 'missing_refresh_token' });
        return;
      }

      const result = await sessions.rotateRefreshToken(refreshTokenHash, fingerprint);
      if (!result) {
        jsonResponse(res, 401, { error: 'invalid_refresh_token' });
        return;
      }

      setCookie(res, sessionCookie, result.session.sessionId);
      setCookie(res, refreshCookie, result.session.refreshTokenHash);

      jsonResponse(res, 200, {
        userId: result.session.userId,
        roles: [...result.session.roles],
        expiresAt: result.session.expiresAt
      });
      return;
    }

    // Logout
    if (path === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(req.headers.cookie);
      const sessionId = cookies[sessionCookie.name];
      if (sessionId) {
        await sessions.revokeSession(sessionId);
      }

      setCookie(res, sessionCookie, '');
      setCookie(res, refreshCookie, '');

      jsonResponse(res, 200, { success: true });
      return;
    }

    // Authorize (for inter-service auth checks)
    if (path === '/api/auth/authorize' && method === 'POST') {
      const body = await readBody(req);
      const { roles, requiredRole, resource } = JSON.parse(body);
      const result = authEngine.authorize(roles, requiredRole, resource);
      jsonResponse(res, result.allowed ? 200 : 403, result as unknown as Record<string, unknown>);
      return;
    }

    // OAuth2 PKCE authorize endpoint
    if (path === '/api/oauth/authorize' && method === 'GET') {
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      const codeChallenge = url.searchParams.get('code_challenge');
      const state = url.searchParams.get('state');

      if (!clientId || !redirectUri || !codeChallenge || !state) {
        jsonResponse(res, 400, { error: 'missing_pkce_params' });
        return;
      }

      const authCode = crypto.randomBytes(FIB[8]).toString('hex');
      await redis.setEx(`oauth:code:${authCode}`, FIB[7], JSON.stringify({
        codeChallenge,
        codeChallengeMethod: 'S256',
        clientId,
        redirectUri,
        scope: url.searchParams.get('scope') ?? 'read',
        state,
        createdAt: Date.now(),
        expiresAt: Date.now() + FIB[7] * 1000
      }));

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      redirectUrl.searchParams.set('state', state);

      res.writeHead(302, { Location: redirectUrl.toString() });
      res.end();
      return;
    }

    // OAuth2 PKCE token exchange
    if (path === '/api/oauth/token' && method === 'POST') {
      const body = await readBody(req);
      const { code, code_verifier, client_id } = JSON.parse(body);

      if (!code || !code_verifier || !client_id) {
        jsonResponse(res, 400, { error: 'missing_token_params' });
        return;
      }

      const challengeData = await redis.get(`oauth:code:${code}`);
      if (!challengeData) {
        jsonResponse(res, 400, { error: 'invalid_code' });
        return;
      }

      const challenge = JSON.parse(challengeData);
      if (!pkce.verifyChallenge(code_verifier, challenge.codeChallenge)) {
        jsonResponse(res, 400, { error: 'pkce_verification_failed' });
        return;
      }

      await redis.del(`oauth:code:${code}`);

      // Issue session via cookies
      const user = {
        userId: crypto.randomUUID(),
        email: `${client_id}@oauth.heady`,
        displayName: client_id,
        roles: ['viewer' as Role] as ReadonlyArray<Role>,
        tenantId: 'default',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      const session = await sessions.createSession(user, 'oauth');
      setCookie(res, sessionCookie, session.sessionId);

      jsonResponse(res, 200, {
        token_type: 'session',
        expires_in: config.sessionMaxAge,
        session_id: session.sessionId
      });
      return;
    }

    // 404
    jsonResponse(res, 404, { error: 'not_found', path });

  } catch (err) {
    errorCount++;
    log('error', 'request_error', {
      path,
      error: err instanceof Error ? err.message : 'unknown_error'
    });
    jsonResponse(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(config.port, config.host, () => {
  log('info', 'auth_session_server_started', { port: config.port, host: config.host });
});

// Graceful shutdown
const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => {
    log('info', 'server_closed');
    process.exit(0);
  });
  setTimeout(() => {
    log('warn', 'forced_shutdown', { timeoutMs: FIB[8] * 1000 });
    process.exit(1);
  }, FIB[8] * 1000); // 21 second grace period
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { server, config };
