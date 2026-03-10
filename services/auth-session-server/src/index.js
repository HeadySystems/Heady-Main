import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { initializeFirebase, verifyIdToken } from './firebase-admin.js';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3395;
const NODE_ENV = process.env.NODE_ENV || 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});

const app = express();

const HEADY_DOMAINS = [
  'headysystems.com',
  'headyme.com',
  'heady-ai.com',
  'headyos.com',
  'headyfinance.com',
  'headychat.com',
  'headyvault.com',
  'headyconnect.com',
  'headyflow.com',
  'auth.headysystems.com',
  'admin.headysystems.com',
];

const CORS_WHITELIST = HEADY_DOMAINS.flatMap((domain) => [
  `https://${domain}`,
  `https://*.${domain}`,
  NODE_ENV === 'development' ? `http://localhost:3000` : null,
]).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowed = CORS_WHITELIST.some((whitelistOrigin) => {
      if (whitelistOrigin.includes('*')) {
        const pattern = whitelistOrigin.replace(/\*/g, '[a-z0-9-]*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return whitelistOrigin === origin;
    });

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ limit: '16kb', extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

const sessions = new Map();
const sessionCleanupInterval = Math.floor(PHI * 1000 * 60);
const sessionMaxAge = Math.floor(PSI * Math.pow(10, 8));

async function initializeServer() {
  try {
    initializeFirebase();
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    process.exit(1);
  }
}

app.get('/_heady/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessions: sessions.size,
  });
});

app.post('/session/create', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'idToken is required',
      });
    }

    const tokenData = await verifyIdToken(idToken);

    if (!tokenData.uid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Firebase token',
      });
    }

    const sessionId = `${tokenData.uid}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + sessionMaxAge;

    sessions.set(sessionId, {
      uid: tokenData.uid,
      email: tokenData.email,
      createdAt: Date.now(),
      expiresAt,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const PHI_8_MILLIS = 46979;

    res.cookie('__Host-heady_session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: PHI_8_MILLIS,
      domain: '.headysystems.com',
    });

    logger.info('Session created', {
      userId: tokenData.uid,
      sessionId,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    res.status(201).json({
      sessionId,
      userId: tokenData.uid,
      email: tokenData.email,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error('Session creation failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create session',
    });
  }
});

app.post('/session/verify', (req, res) => {
  try {
    const sessionId = req.cookies['__Host-heady_session'];

    if (!sessionId) {
      return res.status(401).json({
        valid: false,
        error: 'No session found',
      });
    }

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(401).json({
        valid: false,
        error: 'Session not found',
      });
    }

    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      res.clearCookie('__Host-heady_session', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        domain: '.headysystems.com',
      });
      return res.status(401).json({
        valid: false,
        error: 'Session expired',
        expired: true,
      });
    }

    if (session.ip !== req.ip || session.userAgent !== req.get('user-agent')) {
      sessions.delete(sessionId);
      res.clearCookie('__Host-heady_session', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        domain: '.headysystems.com',
      });
      return res.status(401).json({
        valid: false,
        error: 'Session fingerprint mismatch',
      });
    }

    logger.info('Session verified', {
      userId: session.uid,
      sessionId,
    });

    res.json({
      valid: true,
      userId: session.uid,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error('Session verification failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify session',
    });
  }
});

app.post('/session/revoke', (req, res) => {
  try {
    const sessionId = req.cookies['__Host-heady_session'];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'No session to revoke',
      });
    }

    const revoked = sessions.delete(sessionId);

    if (!revoked) {
      return res.status(400).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.clearCookie('__Host-heady_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      domain: '.headysystems.com',
    });

    logger.info('Session revoked', { sessionId });

    res.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    logger.error('Session revocation failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke session',
    });
  }
});

app.get('/session/relay', (req, res) => {
  try {
    const origin = req.get('origin');

    if (origin) {
      const isValidOrigin = CORS_WHITELIST.some((whitelistOrigin) => {
        if (whitelistOrigin.includes('*')) {
          const pattern = whitelistOrigin.replace(/\*/g, '[a-z0-9-]*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return whitelistOrigin === origin;
      });

      if (!isValidOrigin) {
        logger.warn('Invalid origin for relay', { origin });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid origin',
        });
      }
    }

    const relayPath = join(__dirname, 'relay.html');
    const relayHtml = readFileSync(relayPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    logger.info('Relay iframe served', { origin });

    res.send(relayHtml);
  } catch (error) {
    logger.error('Failed to serve relay iframe:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load relay iframe',
    });
  }
});

app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

const cleanupInterval = setInterval(() => {
  let expired = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      expired++;
    }
  }
  if (expired > 0) {
    logger.info('Expired sessions cleaned up', { count: expired });
  }
}, sessionCleanupInterval);

async function startServer() {
  try {
    await initializeServer();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('Auth session server started', {
        port: PORT,
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        sessionMaxAge,
      });
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');

      clearInterval(cleanupInterval);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Force shutting down');
        process.exit(1);
      }, 30000);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');

      clearInterval(cleanupInterval);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Force shutting down');
        process.exit(1);
      }, 30000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
