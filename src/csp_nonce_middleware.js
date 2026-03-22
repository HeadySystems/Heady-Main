// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/csp_nonce_middleware.js
// LAYER: backend/src — security
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ CSP NONCE MIDDLEWARE ∞                                                  ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━                                                  ║
 * ║     Generates per-request CSP nonces to prevent inline script injection      ║
 * ║     Hardens existing 7-header security posture from Wave 5                   ║
 * ║                                                                               ║
 * ║     Ref: Master Playbook H-4 — Security Headers Audit                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');

/**
 * Express middleware that generates a CSP nonce per request and sets
 * Content-Security-Policy headers.
 *
 * Usage:
 *   const { cspNonceMiddleware } = require('./csp_nonce_middleware');
 *   app.use(cspNonceMiddleware());
 *
 * In templates, use res.locals.cspNonce for inline scripts:
 *   <script nonce="<%= cspNonce %>">...</script>
 */
function cspNonceMiddleware(options = {}) {
  const defaults = {
    scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://js.stripe.com'],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://api.fontshare.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.stripe.com', 'https://sentry.io', 'https://*.headyme.com'],
    frameSrc: ['https://js.stripe.com'],
    upgradeInsecureRequests: true,
    ...options,
  };

  return (req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;

    const directives = [
      `default-src 'self'`,
      `script-src ${[...defaults.scriptSrc, `'nonce-${nonce}'`].join(' ')}`,
      `style-src ${[...defaults.styleSrc, `'nonce-${nonce}'`].join(' ')}`,
      `font-src ${defaults.fontSrc.join(' ')}`,
      `img-src ${defaults.imgSrc.join(' ')}`,
      `connect-src ${defaults.connectSrc.join(' ')}`,
      `frame-src ${defaults.frameSrc.join(' ')}`,
    ];

    if (defaults.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }

    res.setHeader('Content-Security-Policy', directives.join('; '));
    next();
  };
}

module.exports = { cspNonceMiddleware };
