#!/usr/bin/env node
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
let cookieParser;
try { cookieParser = require('cookie-parser'); } catch { cookieParser = null; }

const { logger } = require('./src/utils/logger');
const { validateEnv } = require('./src/utils/env-validator');
const { setupHealthRoutes } = require('./src/gateway/health');
const { setupGateway } = require('./src/gateway/ai-gateway');
const { setupMCPRoutes } = require('./src/mcp/mcp-server');
const { setupAgentRoutes } = require('./src/agents/agent-router');
const { setupMemoryRoutes } = require('./src/memory/memory-router');
const { AutoSuccessEngine } = require('./src/services/auto-success');
const { errorHandler } = require('./src/gateway/error-handler');
const { metricsMiddleware, metricsEndpoint } = require('./src/utils/metrics');

// Auth routes
let authRouter;
try {
  const authModule = require('./src/routes/auth-routes');
  authRouter = authModule.router;
} catch (err) {
  console.warn('[HeadyManager] Auth routes not loaded:', err.message);
}

// ── Validate environment ──
const envOk = validateEnv();
if (!envOk && process.env.NODE_ENV === 'production') {
  logger.error('Environment validation failed. Exiting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3301;

// ── Global middleware ──
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
if (cookieParser) app.use(cookieParser());
app.use(metricsMiddleware);

// ── Static files (public/) ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ──
setupHealthRoutes(app);
setupGateway(app);
setupMCPRoutes(app);
setupAgentRoutes(app);
setupMemoryRoutes(app);
app.get('/metrics', metricsEndpoint);

// ── Auth routes ──
if (authRouter) {
  app.use('/api/auth', authRouter);
  logger.info('[HeadyManager] ✅ Auth routes mounted at /api/auth');
}

// ── Error handling (must be last) ──
app.use(errorHandler);

// ── Start server ──
const server = app.listen(PORT, () => {
  logger.info(`[HeadyManager] ✅ Running on port ${PORT}`);
  logger.info(`[HeadyManager] ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[HeadyManager] ✅ Health: http://localhost:${PORT}/health`);
});

// ── Auto-Success Engine ──
const autoSuccess = new AutoSuccessEngine();
autoSuccess.start().then(() => {
  logger.info(`[HeadyManager] ✅ Auto-Success Engine started (${autoSuccess.taskCount} tasks)`);
}).catch(err => {
  logger.error(`[HeadyManager] ⚠️ Auto-Success Engine error: ${err.message}`);
});

// ── Graceful shutdown ──
const shutdown = async (signal) => {
  logger.info(`[HeadyManager] Received ${signal}. Shutting down gracefully...`);
  await autoSuccess.stop();
  server.close(() => {
    logger.info('[HeadyManager] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});
