// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/app.js
// LAYER: backend
// Express app factory — separates app creation from server listening
// for testability and Cloud Run compatibility
// HEADY_BRAND:END

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import the main backend (index.js already sets up all routes)
const createApp = () => {
  const app = express();

  // ── Security Headers ──
  app.use(helmet({
    contentSecurityPolicy: false, // CSP managed per-route
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  // ── CORS — Explicit Origin Whitelist (NO wildcards) ──
  const ALLOWED_ORIGINS = [
    'https://headysystems.com', 'https://www.headysystems.com',
    'https://headyme.com', 'https://www.headyme.com',
    'https://headymcp.com', 'https://www.headymcp.com',
    'https://headyconnection.org', 'https://www.headyconnection.org',
    'https://headyfinance.com', 'https://www.headyfinance.com',
    'https://headybuddy.com', 'https://www.headybuddy.com',
    'https://headybot.com', 'https://www.headybot.com',
    'https://headyapi.com', 'https://www.headyapi.com',
    'https://headyio.com', 'https://www.headyio.com',
    'https://headylens.com', 'https://www.headylens.com',
    'https://headyai.com', 'https://www.headyai.com',
    'https://heady-ai.com', 'https://www.heady-ai.com',
    'https://auth.headysystems.com',
  ];

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== 'production' && origin?.startsWith('http://localhost')) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Heady-Api-Key', 'X-Request-Id'],
    maxAge: 86400,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.set('trust proxy', true);

  // Security response headers
  app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Heady-Service', 'heady-backend');
    next();
  });

  // ── Health Check ──
  app.get('/health', (req, res) => {
    res.json({
      service: 'heady-backend',
      status: 'healthy',
      version: process.env.npm_package_version || '4.0.0',
      uptime: process.uptime(),
      node: process.version,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/healthz', (req, res) => res.status(200).send('ok'));

  return app;
};

module.exports = { createApp };
