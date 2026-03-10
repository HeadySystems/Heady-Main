/**
 * HEADY_BRAND:BEGIN
 * ============================================================
 *  Heady Budget Tracker
 *  Liquid Dynamic Latent OS | HeadySystems Inc.
 *  Cost tracking with phi-scaled budgets and Fibonacci tiers
 *  Per-model, per-service spend monitoring with CSL alerts
 * ============================================================
 * HEADY_BRAND:END
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// ─── Sacred Geometry Constants ───────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1.0 / PHI; // 0.618033988749895
const PHI_SQUARED = PHI * PHI; // 2.618033988749895
const PHI_CUBED = PHI * PHI * PHI; // 4.23606797749979

// Fibonacci budget tiers (in dollars)
const FIBONACCI_BUDGET_TIERS = [
  { tier: 'micro', limit: 1 },
  { tier: 'nano', limit: 2 },
  { tier: 'small', limit: 3 },
  { tier: 'medium', limit: 5 },
  { tier: 'standard', limit: 8 },
  { tier: 'large', limit: 13 },
  { tier: 'xl', limit: 21 },
  { tier: 'xxl', limit: 34 },
  { tier: 'enterprise', limit: 55 },
  { tier: 'scale', limit: 89 },
  { tier: 'mega', limit: 144 },
  { tier: 'ultra', limit: 233 },
  { tier: 'max', limit: 377 }
];

// CSL alert thresholds (continuous, not boolean)
const CSL_BUDGET_SAFE = 1.0;
const CSL_BUDGET_WARNING = PSI; // 0.618 - phi-scaled warning
const CSL_BUDGET_DANGER = PSI * PSI; // 0.382
const CSL_BUDGET_CRITICAL = PSI * PSI * PSI; // 0.236
const CSL_BUDGET_EXCEEDED = 0.0;

// Phi-scaled time windows (ms)
const WINDOW_MINUTE = 60000;
const WINDOW_HOUR = WINDOW_MINUTE * 60;
const WINDOW_DAY = WINDOW_HOUR * 24;
const WINDOW_PHI_HOUR = Math.round(WINDOW_HOUR * PSI); // ~37.08 minutes

// ─── Structured Logger ──────────────────────────────────────
class HeadyLogger {
  constructor(context) {
    this.context = context;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context,
      message,
      ...meta
    };
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }

  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }
  debug(message, meta) { this._log('debug', message, meta); }
}

const logger = new HeadyLogger('budget-tracker');

// ─── HeadyAutoContext Middleware ─────────────────────────────
function headyAutoContext(req, _res, next) {
  req.headyContext = {
    service: 'budget-tracker',
    requestId: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    cslGate: 1.0
  };
  next();
}

// ─── Cost Entry Store ───────────────────────────────────────
class CostStore {
  constructor() {
    this.entries = [];
    this.maxEntries = 987; // Fibonacci number
    this.byModel = new Map();
    this.byService = new Map();
    this.totalSpend = 0;
  }

  record(entry) {
    const record = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      model: entry.model,
      service: entry.service,
      cost: entry.cost,
      tokens: entry.tokens || 0,
      inputTokens: entry.inputTokens || 0,
      outputTokens: entry.outputTokens || 0,
      operation: entry.operation || 'inference',
      timestamp: Date.now(),
      metadata: entry.metadata || {}
    };

    this.entries.push(record);
    this.totalSpend += record.cost;

    // Update per-model aggregation
    if (!this.byModel.has(record.model)) {
      this.byModel.set(record.model, { totalCost: 0, totalTokens: 0, requestCount: 0 });
    }
    const modelAgg = this.byModel.get(record.model);
    modelAgg.totalCost += record.cost;
    modelAgg.totalTokens += record.tokens;
    modelAgg.requestCount += 1;

    // Update per-service aggregation
    if (!this.byService.has(record.service)) {
      this.byService.set(record.service, { totalCost: 0, totalTokens: 0, requestCount: 0 });
    }
    const svcAgg = this.byService.get(record.service);
    svcAgg.totalCost += record.cost;
    svcAgg.totalTokens += record.tokens;
    svcAgg.requestCount += 1;

    // Trim to Fibonacci max
    if (this.entries.length > this.maxEntries) {
      const trimTo = 610; // Previous Fibonacci number
      this.entries = this.entries.slice(-trimTo);
    }

    return record;
  }

  getSpendInWindow(windowMs) {
    const cutoff = Date.now() - windowMs;
    let spend = 0;
    let count = 0;

    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].timestamp < cutoff) break;
      spend += this.entries[i].cost;
      count += 1;
    }

    return { spend: Number(spend.toFixed(6)), count, windowMs };
  }

  getModelBreakdown() {
    const result = {};
    for (const [model, agg] of this.byModel) {
      result[model] = {
        totalCost: Number(agg.totalCost.toFixed(6)),
        totalTokens: agg.totalTokens,
        requestCount: agg.requestCount,
        avgCostPerRequest: agg.requestCount > 0 ? Number((agg.totalCost / agg.requestCount).toFixed(6)) : 0
      };
    }
    return result;
  }

  getServiceBreakdown() {
    const result = {};
    for (const [service, agg] of this.byService) {
      result[service] = {
        totalCost: Number(agg.totalCost.toFixed(6)),
        totalTokens: agg.totalTokens,
        requestCount: agg.requestCount,
        avgCostPerRequest: agg.requestCount > 0 ? Number((agg.totalCost / agg.requestCount).toFixed(6)) : 0
      };
    }
    return result;
  }

  getRecentEntries(limit = 21) { // Fibonacci default
    return this.entries.slice(-limit).reverse();
  }
}

// ─── Budget Manager ─────────────────────────────────────────
class BudgetManager {
  constructor(costStore) {
    this.costStore = costStore;
    this.budgets = new Map();
    this.alerts = [];
    this.maxAlerts = 89; // Fibonacci
  }

  setBudget(key, config) {
    const tier = this._findTier(config.limit);
    this.budgets.set(key, {
      key,
      limit: config.limit,
      tier: tier.tier,
      windowMs: config.windowMs || WINDOW_DAY,
      scope: config.scope || 'global', // global, model, service
      scopeValue: config.scopeValue || null,
      createdAt: Date.now()
    });
    logger.info(`Budget set: ${key}`, { limit: config.limit, tier: tier.tier });
  }

  _findTier(amount) {
    for (let i = FIBONACCI_BUDGET_TIERS.length - 1; i >= 0; i--) {
      if (amount >= FIBONACCI_BUDGET_TIERS[i].limit) {
        return FIBONACCI_BUDGET_TIERS[i];
      }
    }
    return FIBONACCI_BUDGET_TIERS[0];
  }

  checkBudget(key) {
    const budget = this.budgets.get(key);
    if (!budget) {
      return { key, status: 'no_budget', cslHealth: CSL_BUDGET_SAFE };
    }

    const window = this.costStore.getSpendInWindow(budget.windowMs);
    const spent = window.spend;
    const remaining = budget.limit - spent;
    const ratio = budget.limit > 0 ? spent / budget.limit : 0;

    // CSL health: continuous scale from 1.0 (safe) to 0.0 (exceeded)
    let cslHealth;
    if (ratio <= PSI * PSI) { // < 38.2%
      cslHealth = CSL_BUDGET_SAFE;
    } else if (ratio <= PSI) { // < 61.8%
      cslHealth = CSL_BUDGET_WARNING + (CSL_BUDGET_SAFE - CSL_BUDGET_WARNING) * (1 - (ratio - PSI * PSI) / (PSI - PSI * PSI));
    } else if (ratio <= 1.0) {
      cslHealth = CSL_BUDGET_DANGER + (CSL_BUDGET_WARNING - CSL_BUDGET_DANGER) * (1 - (ratio - PSI) / (1.0 - PSI));
    } else {
      cslHealth = Math.max(0, CSL_BUDGET_CRITICAL * (1 - (ratio - 1.0)));
    }

    let status = 'safe';
    if (cslHealth <= CSL_BUDGET_EXCEEDED) status = 'exceeded';
    else if (cslHealth <= CSL_BUDGET_CRITICAL) status = 'critical';
    else if (cslHealth <= CSL_BUDGET_DANGER) status = 'danger';
    else if (cslHealth <= CSL_BUDGET_WARNING) status = 'warning';

    // Generate alert if not safe
    if (status !== 'safe') {
      this._alert(key, status, cslHealth, spent, budget.limit);
    }

    return {
      key,
      status,
      cslHealth: Number(cslHealth.toFixed(6)),
      spent: Number(spent.toFixed(6)),
      limit: budget.limit,
      remaining: Number(remaining.toFixed(6)),
      ratio: Number(ratio.toFixed(6)),
      tier: budget.tier,
      windowMs: budget.windowMs,
      requestsInWindow: window.count
    };
  }

  _alert(key, status, cslHealth, spent, limit) {
    const alert = {
      key,
      status,
      cslHealth: Number(cslHealth.toFixed(6)),
      spent: Number(spent.toFixed(6)),
      limit,
      timestamp: new Date().toISOString()
    };
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-55); // Fibonacci trim
    }
    logger.warn(`Budget alert: ${key}`, alert);
  }

  checkAllBudgets() {
    const results = {};
    for (const key of this.budgets.keys()) {
      results[key] = this.checkBudget(key);
    }
    return results;
  }

  getAlerts() {
    return this.alerts;
  }
}

// ─── Initialize ─────────────────────────────────────────────
const costStore = new CostStore();
const budgetManager = new BudgetManager(costStore);

// Set default budgets using Fibonacci tiers
budgetManager.setBudget('daily-global', { limit: 55, windowMs: WINDOW_DAY, scope: 'global' });
budgetManager.setBudget('hourly-global', { limit: 8, windowMs: WINDOW_HOUR, scope: 'global' });
budgetManager.setBudget('phi-hour-global', { limit: 5, windowMs: WINDOW_PHI_HOUR, scope: 'global' });

// ─── Express App ────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(headyAutoContext);

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    service: 'budget-tracker',
    status: 'healthy',
    totalSpend: Number(costStore.totalSpend.toFixed(6)),
    entryCount: costStore.entries.length,
    budgetCount: budgetManager.budgets.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Record a cost entry
app.post('/record', (req, res) => {
  const { model, service, cost, tokens, inputTokens, outputTokens, operation, metadata } = req.body;

  if (!model || !service || typeof cost !== 'number') {
    res.status(400).json({ error: { code: 'INVALID_ENTRY', message: 'model, service, and cost (number) are required' } });
    return;
  }

  if (cost < 0) {
    res.status(400).json({ error: { code: 'NEGATIVE_COST', message: 'cost must be non-negative' } });
    return;
  }

  const record = costStore.record({ model, service, cost, tokens, inputTokens, outputTokens, operation, metadata });

  // Check budgets after recording
  const budgetStatus = budgetManager.checkAllBudgets();

  res.status(201).json({
    recorded: record,
    budgets: budgetStatus
  });
});

// Get spend summary
app.get('/summary', (_req, res) => {
  const windowMs = Number(req.query.window) || WINDOW_DAY;
  res.json({
    total: Number(costStore.totalSpend.toFixed(6)),
    window: costStore.getSpendInWindow(windowMs),
    byModel: costStore.getModelBreakdown(),
    byService: costStore.getServiceBreakdown(),
    budgets: budgetManager.checkAllBudgets(),
    constants: {
      PHI,
      PSI,
      FIBONACCI_BUDGET_TIERS,
      CSL_BUDGET_WARNING,
      CSL_BUDGET_DANGER,
      CSL_BUDGET_CRITICAL
    }
  });
});

// Get model breakdown
app.get('/models', (_req, res) => {
  res.json({ models: costStore.getModelBreakdown() });
});

// Get service breakdown
app.get('/services', (_req, res) => {
  res.json({ services: costStore.getServiceBreakdown() });
});

// Get recent entries
app.get('/recent', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 21, 89); // Fibonacci bounds
  res.json({ entries: costStore.getRecentEntries(limit) });
});

// Set/update a budget
app.post('/budget', (req, res) => {
  const { key, limit, windowMs, scope, scopeValue } = req.body;

  if (!key || typeof limit !== 'number') {
    res.status(400).json({ error: { code: 'INVALID_BUDGET', message: 'key and limit (number) are required' } });
    return;
  }

  budgetManager.setBudget(key, { limit, windowMs, scope, scopeValue });
  res.status(201).json({ budget: key, limit, timestamp: new Date().toISOString() });
});

// Check budget status
app.get('/budget/:key', (req, res) => {
  const result = budgetManager.checkBudget(req.params.key);
  res.json(result);
});

// Check all budgets
app.get('/budgets', (_req, res) => {
  res.json({ budgets: budgetManager.checkAllBudgets() });
});

// Get alerts
app.get('/alerts', (_req, res) => {
  res.json({ alerts: budgetManager.getAlerts() });
});

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled request error', { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

// ─── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3392;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Budget Tracker listening on port ${PORT}`, {
    defaultBudgets: budgetManager.budgets.size,
    fibonacciTiers: FIBONACCI_BUDGET_TIERS.length
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = { app, costStore, budgetManager, CostStore, BudgetManager };
