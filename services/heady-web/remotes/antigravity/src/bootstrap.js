const pino = require('pino');
const logger = pino();
/**
 * HeadyMe Antigravity — Webpack Remote Entry Bootstrap
 *
 * Async boundary for Module Federation shared chunk loading.
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 */

import('./mount').then(({ mount }) => {
  const container = document.getElementById('heady-root') || document.body;
  mount(container, {
    autoMount: true,
    domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    theme: 'dark',
  });
}).catch((err) => {
  logger.error('[Antigravity] Bootstrap failed:', err);
});
