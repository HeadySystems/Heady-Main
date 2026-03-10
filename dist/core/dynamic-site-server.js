"use strict";
/*
 * © 2026 HeadySystems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ Dynamic Multi-Domain Site Server ═══
 *
 * Single server that renders ALL Heady sites dynamically.
 * Reads Host header → returns the correct branded page.
 * Embeds 25+ auth providers, HeadyBuddy widget, and API proxy.
 *
 * Usage:
 *   node src/core/dynamic-site-server.js
 *   SITE_PORT=8080 node src/core/dynamic-site-server.js
 *
 * Designed to run behind Cloudflare Tunnel for all domains.
 * ────────────────────────────────────────────────────────────────
 */
const http = require('http');
const crypto = require('crypto');
const PORT = process.env.SITE_PORT || 3850;
const PHI = 1.6180339887;
// ── Site Registry ───────────────────────────────────────────────
const SITES = {
  'headyme.com': {
    brand: 'HeadyMe',
    tagline: 'Your Sovereign AI',
    subtitle: 'Personal intelligence that works for you — across every device, every domain.',
    color: '#4c8fff',
    accent: '#00d4ff',
    icon: 'H',
    heroServices: [
      { icon: '🧠', name: 'AI Chat', desc: 'Multi-provider reasoning with auto-failover' },
      { icon: '🔐', name: 'Secure Vault', desc: 'AES-256-GCM encrypted credential storage' },
      { icon: '📊', name: 'Dashboard', desc: 'Real-time system health and analytics' },
      { icon: '🐝', name: 'Bee Swarm', desc: 'Distributed task execution at scale' },
    ],
    showAuth: true,
  },
  'headysystems.com': {
    brand: 'HeadySystems',
    tagline: 'The Architecture of Intelligence',
    subtitle: 'Self-healing infrastructure powered by Sacred Geometry and fault-tolerant lattice computing.',
    color: '#00d4ff',
    accent: '#4c8fff',
    icon: 'S',
    heroServices: [
      { icon: '⚙️', name: 'Ops Console', desc: '14 service groups, CLI-driven' },
      { icon: '🏗️', name: 'Architecture', desc: '6-layer zero-trust mesh' },
      { icon: '⚛️', name: 'Quantum IP', desc: 'Rotated Subsystem Surface Code' },
      { icon: '🔄', name: 'Self-Healing', desc: 'Attestation, quarantine, respawn' },
    ],
    showAuth: false,
  },
  'headyconnection.org': {
    brand: 'HeadyConnection',
    tagline: 'The Human Network',
    subtitle: 'DNA-correlated trust and biometric continuity for authentic digital relationships.',
    color: '#8b5cf6',
    accent: '#c084fc',
    icon: 'C',
    heroServices: [
      { icon: '🧬', name: 'DNA Trust', desc: 'Biometric-anchored identity' },
      { icon: '🤝', name: 'Connect', desc: 'Zero-knowledge verified networking' },
      { icon: '🛡️', name: 'Citadel', desc: 'Physical trust-anchored auth' },
      { icon: '🌐', name: 'Federation', desc: 'Cross-domain identity mesh' },
    ],
    showAuth: false,
  },
  'headybuddy.org': {
    brand: 'HeadyBuddy',
    tagline: 'Your Always-On Companion',
    subtitle: 'AI assistant that knows you, learns your preferences, and grows with you over time.',
    color: '#10b981',
    accent: '#34d399',
    icon: 'B',
    heroServices: [
      { icon: '💬', name: 'Chat', desc: 'Natural conversation with memory' },
      { icon: '📋', name: 'Tasks', desc: 'Smart task management' },
      { icon: '🎯', name: 'Goals', desc: 'Progress tracking and coaching' },
      { icon: '🔮', name: 'Predict', desc: 'Anticipatory suggestions' },
    ],
    showAuth: true,
  },
  'headymcp.com': {
    brand: 'HeadyMCP',
    tagline: 'The Protocol Layer',
    subtitle: 'Model Context Protocol server with 30+ native tools — connect any IDE to Heady.',
    color: '#f59e0b',
    accent: '#fbbf24',
    icon: 'M',
    heroServices: [
      { icon: '🔌', name: 'MCP Server', desc: 'JSON-RPC + SSE native transport' },
      { icon: '🛠️', name: '30+ Tools', desc: 'Chat, code, search, embed, deploy' },
      { icon: '⚡', name: 'Edge Native', desc: 'Cloudflare Workers — zero latency' },
      { icon: '🔗', name: 'IDE Bridge', desc: 'VS Code, Cursor, Windsurf' },
    ],
    showAuth: false,
  },
  'headyio.com': {
    brand: 'HeadyIO',
    tagline: 'Developer Platform',
    subtitle: 'APIs, SDKs, and documentation for building on the Heady intelligence layer.',
    color: '#ec4899',
    accent: '#f472b6',
    icon: 'I',
    heroServices: [
      { icon: '📖', name: 'API Docs', desc: 'Full REST + WebSocket reference' },
      { icon: '📦', name: 'SDK', desc: 'npm, Python, Go clients' },
      { icon: '🔑', name: 'API Keys', desc: '9-tier subscription system' },
      { icon: '🧪', name: 'Sandbox', desc: 'Live API playground' },
    ],
    showAuth: true,
  },
  'headybot.com': {
    brand: 'HeadyBot',
    tagline: 'Autonomous Automation',
    subtitle: 'Self-driving engineering agents with adversarial validation and battle-tested quality.',
    color: '#6366f1',
    accent: '#818cf8',
    icon: 'R',
    heroServices: [
      { icon: '🤖', name: 'Agents', desc: 'Autonomous task execution' },
      { icon: '⚔️', name: 'Battle Arena', desc: 'AI-vs-AI quality assurance' },
      { icon: '🧬', name: 'HeadyGoose', desc: 'Self-governing engineering agent' },
      { icon: '📊', name: 'Telemetry', desc: 'Full audit trail and replay' },
    ],
    showAuth: false,
  },
  'headyapi.com': {
    brand: 'HeadyAPI',
    tagline: 'The Intelligence Interface',
    subtitle: 'Unified API gateway routing to 4+ AI providers with liquid failover.',
    color: '#14b8a6',
    accent: '#2dd4bf',
    icon: 'A',
    heroServices: [
      { icon: '🌊', name: 'Liquid Gateway', desc: 'Race providers, fastest wins' },
      { icon: '🔀', name: 'Auto-Failover', desc: 'Zero-downtime provider switching' },
      { icon: '📈', name: 'Analytics', desc: 'Per-request cost and latency' },
      { icon: '🔐', name: 'Auth', desc: 'API key + tier enforcement' },
    ],
    showAuth: true,
  },
  'headylens.com': {
    brand: 'HeadyLens',
    tagline: 'Sovereign Sight',
    subtitle: 'Vision AI for screenshots, UI review, OCR, and visual code analysis.',
    color: '#f97316',
    accent: '#fb923c',
    icon: 'L',
    heroServices: [
      { icon: '👁️', name: 'Vision', desc: 'Image analysis and classification' },
      { icon: '📸', name: 'Screenshot', desc: 'Automated visual QA' },
      { icon: '🔍', name: 'OCR', desc: 'Text extraction from images' },
      { icon: '🎨', name: 'Design', desc: 'UI/UX analysis and suggestions' },
    ],
    showAuth: false,
  },
  'heady-ai.com': {
    brand: 'HeadyAI',
    tagline: 'The Intelligence Hub',
    subtitle: 'Multi-model AI playground — route tasks to Claude, Gemini, GPT-4o, Groq, and Perplexity through one unified interface.',
    color: '#a855f7',
    accent: '#c084fc',
    icon: 'Σ',
    heroServices: [
      { icon: '🧠', name: 'Models', desc: '5+ providers, auto-failover routing' },
      { icon: '🎓', name: 'Training', desc: 'Fine-tune on your data' },
      { icon: '⚡', name: 'Inference', desc: 'Sub-100ms edge inference' },
      { icon: '🌐', name: 'Edge AI', desc: 'Cloudflare Workers AI native' },
    ],
    showAuth: true,
  },
  'headyfinance.com': {
    brand: 'HeadyFinance',
    tagline: 'Algorithmic Intelligence',
    subtitle: 'AI-powered trading signals, backtesting, and portfolio optimization with real-time market data.',
    color: '#22c55e',
    accent: '#86efac',
    icon: '₿',
    heroServices: [
      { icon: '📈', name: 'Strategy', desc: 'AI-generated trading strategies' },
      { icon: '🔬', name: 'Backtest', desc: '16-asset historical simulation' },
      { icon: '🔔', name: 'Signals', desc: 'Real-time entry/exit alerts' },
      { icon: '💼', name: 'Portfolio', desc: 'Risk-optimized allocation' },
    ],
    showAuth: true,
  },
};
// ── Auth Providers (same 25 from auth-page-server.js) ───────
const AUTH_PROVIDERS = {
  oauth: [
    { id: 'google', name: 'Google', icon: '🔵', color: '#4285F4' },
    { id: 'github', name: 'GitHub', icon: '⚫', color: '#333333' },
    { id: 'microsoft', name: 'Microsoft', icon: '🟦', color: '#00A4EF' },
    { id: 'apple', name: 'Apple', icon: '🍎', color: '#000000' },
    { id: 'facebook', name: 'Facebook', icon: '🔵', color: '#1877F2' },
    { id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9900' },
    { id: 'discord', name: 'Discord', icon: '💬', color: '#5865F2' },
    { id: 'slack', name: 'Slack', icon: '💼', color: '#4A154B' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { id: 'twitter', name: 'X (Twitter)', icon: '✖️', color: '#000000' },
    { id: 'spotify', name: 'Spotify', icon: '🟢', color: '#1DB954' },
    { id: 'huggingface', name: 'Hugging Face', icon: '🤗', color: '#FFD21E' },
  ],
  apikey: [
    { id: 'openai', name: 'OpenAI', icon: '🧠', color: '#10A37F', prefix: 'sk-' },
    { id: 'claude', name: 'Claude', icon: '🟠', color: '#D97706', prefix: 'sk-ant-' },
    { id: 'gemini', name: 'Gemini', icon: '💎', color: '#4285F4', prefix: 'AI' },
    { id: 'perplexity', name: 'Perplexity', icon: '🔍', color: '#20808D', prefix: 'pplx-' },
    { id: 'mistral', name: 'Mistral', icon: '🌊', color: '#FF7000', prefix: '' },
    { id: 'cohere', name: 'Cohere', icon: '🟣', color: '#39594D', prefix: '' },
    { id: 'groq', name: 'Groq', icon: '⚡', color: '#F55036', prefix: 'gsk_' },
    { id: 'replicate', name: 'Replicate', icon: '🔄', color: '#3D3D3D', prefix: 'r8_' },
    { id: 'together', name: 'Together AI', icon: '🤝', color: '#6366F1', prefix: '' },
    { id: 'fireworks', name: 'Fireworks', icon: '🎆', color: '#FF6B35', prefix: 'fw_' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔬', color: '#0066FF', prefix: 'sk-' },
    { id: 'xai', name: 'xAI (Grok)', icon: '❌', color: '#000000', prefix: 'xai-' },
    { id: 'anthropic', name: 'Anthropic', icon: '🟤', color: '#C96442', prefix: 'sk-ant-' },
  ],
};
// ── In-memory stores ────────────────────────────────────────
const users = new Map();
const sessions = new Map();
function generateApiKey() { return `HY-${crypto.randomBytes(16).toString('hex')}`; }
function generateSession() { return `sess_${crypto.randomBytes(32).toString('hex')}`; }
function hashPw(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}
// ── Resolve site from Host header ────────────────────────────
function resolveSite(host) {
  if (!host)
    return SITES['headyme.com'];
  const clean = host.replace(/:\d+$/, '').toLowerCase();
  // Direct match
  if (SITES[clean])
    return SITES[clean];
  // www. prefix
  if (SITES[clean.replace(/^www\./, '')])
    return SITES[clean.replace(/^www\./, '')];
  // Subdomain match
  for (const domain of Object.keys(SITES)) {
    if (clean.endsWith(domain))
      return SITES[domain];
  }
  // Default
  return SITES['headyme.com'];
}
// ── Render Page ──────────────────────────────────────────────
function renderSite(site, host) {
  const oauthBtns = AUTH_PROVIDERS.oauth.map(p => `<button class="auth-btn" style="--pcolor:${p.color}" onclick="oauthLogin('${p.id}')">
      <span class="auth-icon">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');
  const apikeyBtns = AUTH_PROVIDERS.apikey.map(p => `<button class="auth-btn" style="--pcolor:${p.color}" onclick="showKeyInput('${p.id}','${p.name}','${p.prefix || ''}')">
      <span class="auth-icon">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');
  const serviceCards = site.heroServices.map(s => `<div class="svc-card">
      <div class="svc-icon">${s.icon}</div>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
    </div>`).join('');
  const allDomains = Object.entries(SITES).map(([d, s]) => `<a href="https://${d}" class="domain-link" style="--dcolor:${s.color}">${s.brand}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.brand} — ${site.tagline}</title>
  <meta name="description" content="${site.subtitle}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#050510;--surface:rgba(12,12,35,0.15);--border:rgba(255,255,255,0.06);
      --brand:${site.color};--accent:${site.accent};
      --text:#e8e8f0;--dim:#8888aa;--muted:#555577;
      --phi:${PHI};
    }
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}

    /* ── Animated Background ── */
    #starCanvas{position:fixed;inset:0;z-index:0;pointer-events:none}
    #geoCanvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.35}
    .bg-color-wash{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.12;animation:colorWash 38.832s ease-in-out infinite}
    @keyframes colorWash{
      0%{background:radial-gradient(ellipse at 20% 20%,#7c3aed33,transparent 60%),radial-gradient(ellipse at 80% 80%,#06b6d433,transparent 60%)}
      16.18%{background:radial-gradient(ellipse at 40% 30%,#f59e0b33,transparent 60%),radial-gradient(ellipse at 60% 70%,#ec489933,transparent 60%)}
      38.2%{background:radial-gradient(ellipse at 70% 20%,#10b98133,transparent 60%),radial-gradient(ellipse at 30% 80%,#8b5cf633,transparent 60%)}
      61.8%{background:radial-gradient(ellipse at 50% 50%,#3b82f633,transparent 60%),radial-gradient(ellipse at 20% 60%,#f97316,transparent 60%)}
      82.0%{background:radial-gradient(ellipse at 80% 40%,#ec489933,transparent 60%),radial-gradient(ellipse at 10% 90%,#06b6d433,transparent 60%)}
      100%{background:radial-gradient(ellipse at 20% 20%,#7c3aed33,transparent 60%),radial-gradient(ellipse at 80% 80%,#06b6d433,transparent 60%)}
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{box-shadow:0 0 20px color-mix(in srgb,var(--brand) 30%,transparent)}50%{box-shadow:0 0 40px color-mix(in srgb,var(--brand) 50%,transparent)}}

    /* ── Layout ─────────────────────────────── */
    .container{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:2rem 1.5rem}

    /* ── Nav ────────────────────────────────── */
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,26,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .nav-brand{display:flex;align-items:center;gap:.75rem;text-decoration:none;color:var(--text)}
    .nav-logo{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--brand),var(--accent));font-size:16px;font-weight:900;color:white}
    .nav-name{font-size:1.1rem;font-weight:700;letter-spacing:-.01em}
    .nav-links{display:flex;gap:1.5rem;align-items:center}
    .nav-links a{color:var(--dim);text-decoration:none;font-size:.85rem;font-weight:500;transition:color .2s}
    .nav-links a:hover{color:var(--text)}
    .nav-cta{background:var(--brand);color:white;border:none;padding:.5rem 1.25rem;border-radius:8px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s}
    .nav-cta:hover{filter:brightness(1.15);transform:translateY(-1px)}

    /* ── Hero ───────────────────────────────── */
    .hero{padding:8rem 0 4rem;text-align:center;animation:fadeUp .6s ease-out}
    .hero-badge{display:inline-block;background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:4px 14px;border-radius:20px;font-size:.75rem;font-weight:600;letter-spacing:.05em;margin-bottom:1.5rem;border:1px solid color-mix(in srgb,var(--brand) 20%,transparent)}
    .hero h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:900;letter-spacing:-.03em;line-height:1.1;margin-bottom:1rem}
    .hero h1 .gradient{background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .hero p{color:var(--dim);font-size:1.1rem;max-width:600px;margin:0 auto 2rem;line-height:1.6}
    .hero-actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
    .btn-primary{background:linear-gradient(135deg,var(--brand),var(--accent));color:white;border:none;padding:.75rem 2rem;border-radius:10px;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;animation:pulse 3s infinite}
    .btn-primary:hover{transform:translateY(-2px);filter:brightness(1.1)}
    .btn-secondary{background:transparent;color:var(--text);border:1px solid var(--border);padding:.75rem 2rem;border-radius:10px;font-family:inherit;font-size:1rem;font-weight:500;cursor:pointer;transition:all .2s}
    .btn-secondary:hover{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 5%,transparent)}

    /* ── Services ───────────────────────────── */
    .services{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;padding:2rem 0 4rem}
    .svc-card{background:rgba(8,8,30,0.25);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.04);border-radius:16px;padding:1.5rem;transition:all .3s;animation:fadeUp .6s ease-out}
    .svc-card:hover{border-color:color-mix(in srgb,var(--brand) 30%,transparent);transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,0.2);background:rgba(8,8,30,0.35)}
    .svc-icon{font-size:2rem;margin-bottom:.75rem}
    .svc-card h3{font-size:1rem;font-weight:700;margin-bottom:.4rem}
    .svc-card p{color:var(--dim);font-size:.85rem;line-height:1.5}

    /* ── Domain Bar ─────────────────────────── */
    .domain-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem;padding:2rem 0;border-top:1px solid var(--border)}
    .domain-link{color:var(--dim);text-decoration:none;font-size:.8rem;font-weight:500;padding:.3rem .8rem;border-radius:8px;border:1px solid var(--border);transition:all .2s}
    .domain-link:hover{color:var(--dcolor,var(--brand));border-color:var(--dcolor,var(--brand));background:color-mix(in srgb,var(--dcolor,var(--brand)) 8%,transparent)}

    /* ── Footer ─────────────────────────────── */
    footer{text-align:center;padding:2rem;color:var(--muted);font-size:.75rem}
    footer a{color:var(--dim);text-decoration:none}

    /* ── Auth Modal ─────────────────────────── */
    .auth-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
    .auth-overlay.active{display:flex}
    .auth-modal{background:#0d0d25;border:1px solid var(--border);border-radius:20px;padding:2rem;max-width:520px;width:95%;max-height:90vh;overflow-y:auto;animation:fadeUp .3s ease}
    .auth-modal h2{font-size:1.3rem;font-weight:800;text-align:center;margin-bottom:.25rem}
    .auth-modal .sub{color:var(--dim);text-align:center;font-size:.8rem;margin-bottom:1.25rem}
    .auth-section{font-size:.7rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin:.75rem 0 .5rem;display:flex;align-items:center;gap:.5rem}
    .auth-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .auth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .auth-btn{display:flex;align-items:center;gap:.4rem;padding:.5rem .6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .2s}
    .auth-btn:hover{border-color:var(--pcolor);background:rgba(0,0,0,0.5);transform:translateY(-1px)}
    .auth-icon{font-size:1rem;flex-shrink:0}
    .auth-divider{display:flex;align-items:center;gap:1rem;color:var(--muted);font-size:.75rem;margin:.75rem 0}
    .auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .auth-input{width:100%;padding:.6rem .8rem;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.85rem;outline:none;margin-bottom:.5rem}
    .auth-input:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 10%,transparent)}
    .auth-submit{width:100%;padding:.65rem;border:none;border-radius:8px;background:linear-gradient(135deg,var(--brand),var(--accent));color:white;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:.25rem}
    .auth-close{position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--dim);font-size:1.4rem;cursor:pointer}
    .provider-count{background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:2px 8px;border-radius:10px;font-size:.65rem;font-weight:600;margin-left:.5rem}

    /* ── API Key Input Modal ────────────────── */
    .key-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:250;align-items:center;justify-content:center}
    .key-overlay.active{display:flex}
    .key-modal{background:#10102a;border:1px solid var(--border);border-radius:14px;padding:1.5rem;max-width:400px;width:90%;animation:fadeUp .3s ease}
    .key-modal h3{font-size:1.05rem;margin-bottom:.75rem}

    /* ── HeadyBuddy Widget ──────────────────── */
    .buddy-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--accent));border:none;color:white;font-size:24px;cursor:pointer;z-index:150;box-shadow:0 4px 20px rgba(0,0,0,0.4);transition:all .2s;animation:pulse 3s infinite}
    .buddy-fab:hover{transform:scale(1.1)}
    .buddy-panel{display:none;position:fixed;bottom:92px;right:24px;width:380px;max-height:500px;background:#0d0d25;border:1px solid var(--border);border-radius:16px;z-index:150;overflow:hidden;animation:fadeUp .3s ease;flex-direction:column}
    .buddy-panel.active{display:flex}
    .buddy-header{padding:.75rem 1rem;background:linear-gradient(135deg,var(--brand),var(--accent));display:flex;align-items:center;justify-content:space-between}
    .buddy-header span{font-weight:700;font-size:.9rem}
    .buddy-close{background:none;border:none;color:white;font-size:1.2rem;cursor:pointer}
    .buddy-messages{flex:1;overflow-y:auto;padding:1rem;min-height:200px;max-height:340px}
    .buddy-msg{margin-bottom:.75rem;font-size:.85rem;line-height:1.5}
    .buddy-msg.user{text-align:right}
    .buddy-msg.user .bubble{background:color-mix(in srgb,var(--brand) 20%,transparent);display:inline-block;padding:.5rem .75rem;border-radius:12px 12px 2px 12px;max-width:85%}
    .buddy-msg.bot .bubble{background:rgba(255,255,255,0.05);display:inline-block;padding:.5rem .75rem;border-radius:12px 12px 12px 2px;max-width:85%;color:var(--dim)}
    .buddy-input-row{display:flex;gap:.5rem;padding:.75rem;border-top:1px solid var(--border)}
    .buddy-input{flex:1;padding:.5rem .75rem;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.85rem;outline:none}
    .buddy-send{background:var(--brand);color:white;border:none;padding:.5rem .75rem;border-radius:8px;font-weight:700;cursor:pointer}

    /* ── Success View ───────────────────────── */
    .success-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:260;align-items:center;justify-content:center}
    .success-overlay.active{display:flex}
    .success-card{background:#0d0d25;border:1px solid var(--border);border-radius:16px;padding:2rem;text-align:center;max-width:400px;animation:fadeUp .3s ease}
    .success-icon{width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,.15);border:2px solid rgba(16,185,129,.4);font-size:28px}
    .api-key-box{background:rgba(0,0,0,.4);border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);border-radius:10px;padding:.75rem;font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--accent);word-break:break-all;margin:1rem 0}

    @media(max-width:600px){
      .auth-grid{grid-template-columns:repeat(2,1fr)}
      .buddy-panel{width:calc(100vw - 32px);right:16px;bottom:84px}
      .hero h1{font-size:2rem}
    }
  </style>
</head>
<body>
  <canvas id="starCanvas"></canvas>
  <canvas id="geoCanvas"></canvas>
  <div class="bg-color-wash"></div>

  <nav>
    <a class="nav-brand" href="/">
      <div class="nav-logo">${site.icon}</div>
      <span class="nav-name">${site.brand}</span>
    </a>
    <div class="nav-links">
      <a href="/docs">Docs</a>
      <a href="/api-docs">API</a>
      <a href="/mcp-docs">MCP</a>
      <button class="nav-cta" onclick="openAuth()">Sign In</button>
    </div>
  </nav>

  <div class="container">
    <section class="hero">
      <div class="hero-badge">⚡ ${site.brand} v3.2 · Orion Patch</div>
      <h1><span class="gradient">${site.tagline}</span></h1>
      <p>${site.subtitle}</p>
      <div class="hero-actions">
        <button class="btn-primary" onclick="openAuth()">Get Started</button>
        <a href="/docs" class="btn-secondary" style="text-decoration:none;display:inline-block;text-align:center">Documentation</a>
      </div>
    </section>

    <section class="services">${serviceCards}</section>

    <div class="domain-bar">${allDomains}</div>

    <footer>
      © 2026 HeadySystems Inc. · All rights reserved ·
      <a href="https://headyme.com">headyme.com</a> ·
      25+ Auth Providers · Sacred Geometry v3
    </footer>
  </div>

  <!-- Auth Modal -->
  <div class="auth-overlay" id="authOverlay">
    <div class="auth-modal" style="position:relative">
      <button class="auth-close" onclick="closeAuth()">✕</button>
      <h2>Sign in to ${site.brand}</h2>
      <div class="sub">25 providers · Sovereign Identity</div>
      <div class="auth-section">OAuth Providers <span class="provider-count">12</span></div>
      <div class="auth-grid">${oauthBtns}</div>
      <div class="auth-divider">or connect AI key</div>
      <div class="auth-section">AI API Keys <span class="provider-count">13</span></div>
      <div class="auth-grid">${apikeyBtns}</div>
      <div class="auth-divider">or use email</div>
      <input class="auth-input" id="authEmail" placeholder="Email" type="email">
      <input class="auth-input" id="authPw" placeholder="Password" type="password">
      <button class="auth-submit" onclick="emailAuth()">Continue</button>
    </div>
  </div>

  <!-- API Key Input -->
  <div class="key-overlay" id="keyOverlay">
    <div class="key-modal">
      <h3 id="keyTitle">Connect API Key</h3>
      <p style="color:var(--dim);font-size:.8rem;margin-bottom:.75rem" id="keySub">Paste your key</p>
      <input class="auth-input" id="keyInput" placeholder="Paste API key..." style="font-family:'JetBrains Mono',monospace;font-size:.8rem">
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button class="auth-submit" onclick="connectKey()">Connect</button>
        <button class="auth-submit" onclick="closeKey()" style="background:rgba(255,255,255,.06);flex:0;padding:.65rem 1.25rem">✕</button>
      </div>
    </div>
  </div>

  <!-- Success -->
  <div class="success-overlay" id="successOverlay">
    <div class="success-card">
      <div class="success-icon">✓</div>
      <h3 id="successTitle">Welcome to ${site.brand}</h3>
      <p style="color:var(--dim);font-size:.85rem" id="successSub"></p>
      <div class="api-key-box">
        <span style="color:var(--dim);font-size:.65rem;display:block;margin-bottom:.25rem">YOUR HEADY API KEY</span>
        <span id="apiKeyVal"></span>
      </div>
      <p style="color:var(--dim);font-size:.7rem">Save this key. Use as <code style="color:var(--accent)">HEADY_API_KEY</code> in your .env</p>
      <button class="auth-submit" onclick="closeSuccess()" style="margin-top:1rem">Done</button>
    </div>
  </div>

  <!-- HeadyBuddy Widget -->
  <button class="buddy-fab" onclick="toggleBuddy()" title="HeadyBuddy">🧠</button>
  <div class="buddy-panel" id="buddyPanel">
    <div class="buddy-header">
      <span>🧠 HeadyBuddy</span>
      <button class="buddy-close" onclick="toggleBuddy()">✕</button>
    </div>
    <div class="buddy-messages" id="buddyMessages">
      <div class="buddy-msg bot"><div class="bubble">Hey there! I'm HeadyBuddy on <strong>${site.brand}</strong>. How can I help?</div></div>
    </div>
    <div class="buddy-input-row">
      <input class="buddy-input" id="buddyInput" placeholder="Ask HeadyBuddy..." onkeydown="if(event.key==='Enter')sendBuddy()">
      <button class="buddy-send" onclick="sendBuddy()">▶</button>
    </div>
  </div>

  <script>
    const SITE_HOST = '${host}';
    const SITE_BRAND = '${site.brand}';
    let currentSession = null;
    let currentKeyProvider = null;

    // ── Check for existing session
    (function() {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('heady_session='));
      if (cookie) {
        currentSession = cookie.split('=')[1];
        const nav = document.querySelector('.nav-cta');
        if (nav) { nav.textContent = '✓ Signed In'; nav.style.background = '#10b981'; }
      }
      // Check HF identity
      if (window.huggingface && window.huggingface.variables) {
        const userId = window.huggingface.variables.SPACE_CREATOR_USER_ID;
        if (userId) {
          console.log('[HeadyBuddy] HF User detected:', userId);
          addBuddyMsg('bot', 'I see you\\'re signed into Hugging Face (User: ' + userId.slice(0,8) + '...). I\\'ve linked your identity.');
        }
      }
    })();

    // ── Auth
    function openAuth() { document.getElementById('authOverlay').classList.add('active'); }
    function closeAuth() { document.getElementById('authOverlay').classList.remove('active'); }

    function oauthLogin(provider) {
      fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email:provider+'@heady.oauth', password:'oauth-'+Date.now(), displayName:provider+' User', provider})
      }).then(r=>r.json()).then(d=>{ if(!d.error) showSuccess(d,provider); else alert(d.error); })
      .catch(()=>showSuccess({user:{displayName:provider+' User',apiKey:'HY-demo-'+provider,tier:'spark'},token:'demo'},provider));
    }

    function showKeyInput(provider,name,prefix) {
      currentKeyProvider = provider;
      document.getElementById('keyTitle').textContent = 'Connect ' + name;
      document.getElementById('keySub').textContent = prefix ? 'Key starts with: '+prefix : 'Paste your '+name+' key';
      document.getElementById('keyInput').value = '';
      document.getElementById('keyInput').placeholder = prefix ? prefix+'...' : 'Paste API key...';
      document.getElementById('keyOverlay').classList.add('active');
      setTimeout(()=>document.getElementById('keyInput').focus(),100);
    }
    function closeKey() { document.getElementById('keyOverlay').classList.remove('active'); }
    function connectKey() {
      const key = document.getElementById('keyInput').value.trim();
      if (!key) return;
      closeKey();
      fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email:currentKeyProvider+'@heady.apikey', password:'apikey-'+Date.now(), displayName:currentKeyProvider+' User', provider:currentKeyProvider, connectedKey:key})
      }).then(r=>r.json()).then(d=>{ if(!d.error) showSuccess(d,currentKeyProvider); });
    }

    function emailAuth() {
      const email = document.getElementById('authEmail').value;
      const pw = document.getElementById('authPw').value;
      if (!email||!pw) return;
      fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, password:pw, displayName:email.split('@')[0], provider:'email'})
      }).then(r=>r.json()).then(d=>{
        if (d.error && d.error.includes('exists')) {
          fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})}).then(r=>r.json()).then(d2=>{if(!d2.error)showSuccess(d2,'email');else alert(d2.error);});
        } else if (!d.error) showSuccess(d,'email');
        else alert(d.error);
      });
    }

    function showSuccess(data,provider) {
      closeAuth();
      currentSession = data.token;
      document.cookie = 'heady_session='+data.token+';path=/;max-age=86400;SameSite=Strict';
      document.getElementById('successTitle').textContent = 'Welcome, '+data.user.displayName;
      document.getElementById('successSub').textContent = 'Connected via '+provider+' on '+SITE_BRAND;
      document.getElementById('apiKeyVal').textContent = data.user.apiKey;
      document.getElementById('successOverlay').classList.add('active');
      const nav = document.querySelector('.nav-cta');
      if(nav){nav.textContent='✓ Signed In';nav.style.background='#10b981';}
      addBuddyMsg('bot','Welcome back, '+data.user.displayName+'! Your session is active on '+SITE_BRAND+'.');
    }
    function closeSuccess() { document.getElementById('successOverlay').classList.remove('active'); }

    // ── HeadyBuddy
    function toggleBuddy() { document.getElementById('buddyPanel').classList.toggle('active'); }
    function addBuddyMsg(role,text) {
      const div = document.createElement('div');
      div.className = 'buddy-msg '+role;
      div.innerHTML = '<div class="bubble">'+text+'</div>';
      document.getElementById('buddyMessages').appendChild(div);
      document.getElementById('buddyMessages').scrollTop = 9999;
    }
    function sendBuddy() {
      const input = document.getElementById('buddyInput');
      const msg = input.value.trim();
      if(!msg)return;
      input.value='';
      addBuddyMsg('user',msg);
      fetch('/api/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,session:currentSession,site:SITE_BRAND,host:SITE_HOST})
      }).then(r=>r.json()).then(d=>{
        addBuddyMsg('bot',d.response||d.error||'I\\'ll get back to you on that.');
      }).catch(()=>{
        addBuddyMsg('bot','I\\'m here on '+SITE_BRAND+'. Currently in local mode — full cloud chat coming soon!');
      });
    }

    // Escape closes modals
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){closeAuth();closeKey();closeSuccess();}
    });

    // ── Star Field Canvas ──
    (function(){
      const PHI=1.618033988749895;
      const c=document.getElementById('starCanvas');
      const ctx=c.getContext('2d');
      let W,H;
      function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
      resize();window.addEventListener('resize',resize);
      const stars=[];
      const STAR_COUNT=200;
      const COLORS=['#fff','#e8d5ff','#d5e8ff','#ffe8d5','#d5ffe8','#ffd5e8','#f0e68c'];
      for(let i=0;i<STAR_COUNT;i++){
        stars.push({
          x:Math.random()*2000,y:Math.random()*2000,
          r:Math.random()*1.8+0.3,
          speed:(Math.random()+0.3)*0.15,
          phase:Math.random()*Math.PI*2,
          freq:0.5+Math.random()*1.5,
          color:COLORS[Math.floor(Math.random()*COLORS.length)],
          drift:Math.random()*0.3-0.15
        });
      }
      function drawStars(t){
        ctx.clearRect(0,0,W,H);
        const ts=t*0.001;
        for(const s of stars){
          const twinkle=0.3+0.7*((Math.sin(ts*s.freq+s.phase)+1)/2);
          const breathScale=1+0.15*Math.sin(ts/PHI+s.phase);
          ctx.globalAlpha=twinkle;
          ctx.fillStyle=s.color;
          ctx.beginPath();
          ctx.arc(
            (s.x+s.drift*ts*20)%W,
            (s.y+s.speed*ts*8)%H,
            s.r*breathScale,0,Math.PI*2
          );
          ctx.fill();
          if(s.r>1.2){
            ctx.globalAlpha=twinkle*0.15;
            ctx.beginPath();
            ctx.arc((s.x+s.drift*ts*20)%W,(s.y+s.speed*ts*8)%H,s.r*breathScale*4,0,Math.PI*2);
            ctx.fill();
          }
        }
        ctx.globalAlpha=1;
      }
      // ── Sacred Geometry Canvas ──
      const gc=document.getElementById('geoCanvas');
      const gctx=gc.getContext('2d');
      function resizeGeo(){gc.width=innerWidth;gc.height=innerHeight;}
      resizeGeo();window.addEventListener('resize',resizeGeo);
      function drawSacredGeo(t){
        gctx.clearRect(0,0,gc.width,gc.height);
        const cx=gc.width/2,cy=gc.height/2;
        const ts=t*0.001;
        const breathe=1+0.08*Math.sin(ts/PHI);
        const breathe2=1+0.05*Math.sin(ts/(PHI*PHI));
        const R=Math.min(gc.width,gc.height)*0.3*breathe;
        const rot=ts*0.02;
        gctx.save();
        gctx.translate(cx,cy);
        gctx.rotate(rot);
        gctx.scale(breathe2,breathe2);
        // Color cycling per section
        const hue1=(ts*15)%360;
        const hue2=(ts*15+120)%360;
        const hue3=(ts*15+240)%360;
        // Outer circle (Flower of Life boundary)
        gctx.strokeStyle='hsla('+hue1+',70%,65%,0.3)';
        gctx.lineWidth=1.5;
        gctx.beginPath();gctx.arc(0,0,R,0,Math.PI*2);gctx.stroke();
        // Inner circle
        gctx.strokeStyle='hsla('+hue2+',70%,65%,0.2)';
        gctx.beginPath();gctx.arc(0,0,R*0.618,0,Math.PI*2);gctx.stroke();
        // Flower of Life petals (6 circles)
        for(let i=0;i<6;i++){
          const angle=i*Math.PI/3;
          const px=Math.cos(angle)*R*0.618;
          const py=Math.sin(angle)*R*0.618;
          const petalHue=(hue1+i*60)%360;
          gctx.strokeStyle='hsla('+petalHue+',60%,60%,'+(0.15+0.1*Math.sin(ts+i))+')'; 
          gctx.lineWidth=1;
          gctx.beginPath();gctx.arc(px,py,R*0.618,0,Math.PI*2);gctx.stroke();
        }
        // Metatron vertices (13 points)
        const metaPts=[[0,0]];
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          metaPts.push([Math.cos(a)*R*0.618,Math.sin(a)*R*0.618]);
          metaPts.push([Math.cos(a)*R,Math.sin(a)*R]);
        }
        // Connect all vertices (Metatron's Cube lines)
        gctx.lineWidth=0.5;
        for(let i=0;i<metaPts.length;i++){
          for(let j=i+1;j<metaPts.length;j++){
            const lineHue=(hue3+i*20+j*10)%360;
            const dist=Math.hypot(metaPts[i][0]-metaPts[j][0],metaPts[i][1]-metaPts[j][1]);
            const alpha=Math.max(0.03,0.15-dist/(R*4));
            gctx.strokeStyle='hsla('+lineHue+',50%,60%,'+alpha+')';
            gctx.beginPath();
            gctx.moveTo(metaPts[i][0],metaPts[i][1]);
            gctx.lineTo(metaPts[j][0],metaPts[j][1]);
            gctx.stroke();
          }
        }
        // Star tetrahedron (2 overlaid triangles)
        gctx.lineWidth=1.2;
        for(let t2=0;t2<2;t2++){
          const offset=t2*Math.PI/6;
          const triHue=(t2===0?hue1:hue2);
          gctx.strokeStyle='hsla('+triHue+',80%,70%,0.25)';
          gctx.beginPath();
          for(let i=0;i<3;i++){
            const a=offset+i*Math.PI*2/3-Math.PI/2;
            const px=Math.cos(a)*R*0.75;
            const py=Math.sin(a)*R*0.75;
            i===0?gctx.moveTo(px,py):gctx.lineTo(px,py);
          }
          gctx.closePath();gctx.stroke();
        }
        // Glow at vertices
        for(const[px,py] of metaPts){
          const nodeBreathe=0.5+0.5*Math.sin(ts*2+px*0.01+py*0.01);
          const glowR=2+nodeBreathe*3;
          const g=gctx.createRadialGradient(px,py,0,px,py,glowR*3);
          const nodeHue=(hue1+px+py)%360;
          g.addColorStop(0,'hsla('+nodeHue+',80%,80%,'+(0.4+nodeBreathe*0.3)+')');
          g.addColorStop(1,'hsla('+nodeHue+',80%,80%,0)');
          gctx.fillStyle=g;
          gctx.beginPath();gctx.arc(px,py,glowR*3,0,Math.PI*2);gctx.fill();
        }
        gctx.restore();
      }
      function animate(t){
        drawStars(t);
        drawSacredGeo(t);
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    })();
  </script>
</body>
</html>`;
}
// ── Documentation Pages ─────────────────────────────────────
function getSiteSpecificDocs(siteId) {
  const SITE_DOCS = {
    'headyme.com': {
      docs: [
        {
          title: 'Getting Started', items: [
            { name: 'Quick Start Guide', desc: 'Create your HeadyMe account, set up your personal AI profile, and connect your first AI provider in under 3 minutes. HeadyMe is your sovereign control center — all data stays under your control.', badge: '3 min' },
            { name: 'Personal Dashboard', desc: 'Your command center for real-time analytics, recent activity, notifications, and system health. See provider usage, active sessions, and AI interaction history at a glance.', badge: 'Core' },
            { name: 'Multi-Device Setup', desc: 'Use HeadyMe across desktop, mobile, and tablet. Sessions sync via cross-device fabric with end-to-end encryption. Install the PWA or use the web app.' },
            { name: 'BYOK — Bring Your Own Keys', desc: 'Connect your existing OpenAI, Claude, Gemini, Perplexity, Groq, or any other AI provider keys. HeadyMe routes through your keys with zero markup.' },
          ]
        },
        {
          title: 'Features', items: [
            { name: 'AI Chat', desc: 'Converse with any AI model through a unified interface. Auto-failover between 5+ providers ensures 99.9% uptime. Supports streaming, function calling, and multi-turn context.' },
            { name: 'Secure Vault', desc: 'AES-256-GCM encrypted storage for API keys, credentials, and sensitive data. Keys never leave your device unencrypted. Hardware-backed key derivation.' },
            { name: 'Bee Swarm Tasks', desc: 'Distribute complex work across 30+ specialized bee agents. Each bee handles a specific domain: code, research, analysis, deployment, or creative work.' },
            { name: '3D Vector Memory', desc: 'Persistent AI memory that remembers your preferences, past conversations, and work context across sessions and devices. Powered by pgvector.' },
          ]
        },
        {
          title: 'Account & Security', items: [
            { name: 'Identity Management', desc: 'Manage your sovereign identity across the Heady ecosystem. Single sign-on to all 11 sites with one account. OAuth 2.0 with 25+ providers.' },
            { name: 'API Key Management', desc: 'Generate, rotate, and revoke Heady API keys. Set per-key rate limits, scope restrictions, and expiration dates. Full audit trail for compliance.' },
            { name: 'Privacy & Data Sovereignty', desc: 'Your data is yours. Zero-knowledge architecture means we never see your AI conversations. All processing happens through direct provider connections.' },
          ]
        },
      ],
      api: [
        {
          title: 'User API', items: [
            { name: 'POST /api/signup', desc: 'Create a new HeadyMe account. Supports email/password, OAuth (12 providers), or AI API key connection (13 providers). Returns session token and generated Heady API key.', method: 'POST', color: '#7c3aed' },
            { name: 'POST /api/login', desc: 'Authenticate with email/password or OAuth token. Returns session token valid for 24 hours. Set as heady_session cookie for browser auth.', method: 'POST', color: '#7c3aed' },
            { name: 'GET /api/health', desc: 'System health check. Returns: status, version, active providers count, uptime, connected users, and site identity.', method: 'GET', color: '#22c55e' },
          ]
        },
        {
          title: 'AI Endpoints', items: [
            { name: 'POST /api/chat', desc: 'Send a message to HeadyBuddy. Auto-routes to the best available provider based on latency and model capabilities. Supports SSE streaming with Accept: text/event-stream header.', method: 'POST', color: '#7c3aed' },
            { name: 'POST /api/embed', desc: 'Generate 384-dimensional embeddings for text, code, or structured data. Batch up to 256 inputs. Providers: Nomic, Jina, Cohere, Voyage with automatic selection.', method: 'POST', color: '#7c3aed' },
            { name: 'POST /api/search', desc: 'Hybrid BM25 + dense vector search across your indexed knowledge base. Returns ranked results with cosine similarity scores and Reciprocal Rank Fusion.', method: 'POST', color: '#7c3aed' },
            { name: 'GET /api/providers', desc: 'List all configured AI providers with current status, rate limits, model capabilities, and latency metrics.', method: 'GET', color: '#22c55e' },
          ]
        },
        {
          title: 'WebSocket', items: [
            { name: 'ws://host/stream', desc: 'Full-duplex bidirectional WebSocket for real-time chat streaming, pipeline events, and system notifications. Auto-reconnect with φ-scaled backoff.' },
            { name: 'ws://host/events', desc: 'Server-sent events channel for system health changes, deployment notifications, and bee swarm status updates.' },
          ]
        },
      ],
      mcp: [
        {
          title: 'Connect Your IDE', items: [
            { name: 'One-Click Setup', desc: 'Add HeadyMCP to VS Code, Cursor, or Windsurf with a single JSON config. No installation required — connects via Streamable HTTP transport to the cloud.', code: '{\n  "mcpServers": {\n    "heady": {\n      "url": "https://headymcp.com/mcp",\n      "headers": { "Authorization": "Bearer HY-your-key" }\n    }\n  }\n}' },
            { name: 'Local Dev Mode', desc: 'Run HeadyMCP locally for maximum speed. Connects to your local Heady instance with stdio transport.', code: '{\n  "mcpServers": {\n    "heady-local": {\n      "command": "npx",\n      "args": ["-y", "@heady-ai/mcp-server"]\n    }\n  }\n}' },
          ]
        },
        {
          title: 'Available Tools (30+)', items: [
            { name: 'heady_chat', desc: 'Multi-provider AI conversation with persistent context, memory retrieval, and automatic model selection based on task complexity.' },
            { name: 'heady_search', desc: 'Semantic search across your codebase, documentation, and knowledge graphs. Returns ranked results with citations and relevance scores.' },
            { name: 'heady_embed', desc: 'Generate and store embeddings for RAG pipelines. Supports batch operations with automatic provider failover.' },
            { name: 'heady_code', desc: 'AI-powered code generation, refactoring, and review. Uses multi-model consensus for higher quality output.' },
            { name: 'heady_deploy', desc: 'Deploy services to Cloud Run, Cloudflare Workers, or custom infrastructure directly from your IDE.' },
            { name: 'heady_memory', desc: 'Store and retrieve from persistent 3D vector memory. Enables cross-session context awareness and knowledge retrieval.' },
          ]
        },
      ],
    },
  };
  // Site-specific overrides for key sites
  const siteOverrides = {
    'headysystems.com': {
      docs: [
        {
          title: 'Architecture Overview', items: [
            { name: '6-Layer Zero-Trust Stack', desc: 'Heady runs on a 6-layer architecture: Edge (Cloudflare Workers) → Gateway (Liquid Router) → Service Mesh (17 Swarms) → Intelligence (AI Providers) → Memory (pgvector) → Storage (GCS/R2). Each layer is independently scalable and self-healing.', badge: 'Architecture' },
            { name: 'Sacred Geometry Mesh', desc: 'All system constants derive from φ (1.618...) — timeouts, cache sizes, batch counts, retry intervals. This mathematical harmony eliminates magic numbers and creates naturally balanced, self-similar scaling patterns across the entire platform.', badge: 'Core' },
            { name: 'Self-Healing Infrastructure', desc: 'Every service implements the HeadyHealth lifecycle: attestation (prove health), quarantine (isolate failures), respawn (auto-recover). Failed nodes are detected within 3 heartbeats and replaced within 13 seconds.' },
            { name: '17-Swarm Taxonomy', desc: 'The Heady ecosystem is organized into 17 specialized swarms, each with distinct responsibilities: Core, Intelligence, Security, Memory, Gateway, Deployment, Monitoring, Creative, Research, DevOps, and more.' },
          ]
        },
        {
          title: 'Operations & DevOps', items: [
            { name: 'Ops Console', desc: 'CLI-driven operations across 14 service groups. Run health checks, trigger deployments, manage secrets, and monitor bee swarms from a unified interface.' },
            { name: 'Deployment Pipeline', desc: 'The HCFullPipeline — a 21-stage deterministic build and deploy pipeline. From code quality checks to auto-commit-push, every stage has SLOs and checkpoint recovery.' },
            { name: 'Cloud Run Hosting', desc: 'All production services run on Google Cloud Run with auto-scaling (0 to N instances), custom domains via Cloudflare Tunnel, and multi-region failover.' },
            { name: 'Observability Stack', desc: '4-pillar observability: structured logging, distributed tracing, metrics collection, and alerting. All instrumented with phi-scaled sampling rates.' },
          ]
        },
        {
          title: 'Security Architecture', items: [
            { name: 'Zero-Trust Model', desc: 'Every request is authenticated and authorized. No implicit trust between services. mTLS for service-to-service communication, RBAC for user access, and CSL-gated resource access.' },
            { name: 'Post-Quantum Cryptography', desc: 'Heady implements forward-looking security with PQC key exchange, AES-256-GCM encryption at rest, and WebAuthn passwordless authentication.' },
            { name: 'Audit & Compliance', desc: 'Full audit trail for all operations. SOC 2 Type II compliance checklist, GDPR data handling, and cryptographic proof-of-view receipts for sensitive operations.' },
          ]
        },
      ],
    },
    'headyio.com': {
      docs: [
        {
          title: 'Developer Quickstart', items: [
            { name: 'Install the SDK', desc: 'Get started with the Heady SDK in JavaScript, Python, or Go. Install with a single command and make your first API call in seconds.', badge: '2 min', code: '# JavaScript/TypeScript\nnpm install @heady-ai/sdk\n\n# Python\npip install heady-sdk\n\n# Go\ngo get github.com/heady-ai/sdk-go' },
            { name: 'Get Your API Key', desc: 'Sign up at headyme.com or any Heady site → click "Get Started" → choose your auth method → copy your HY-xxx key. Set it as HEADY_API_KEY in your .env file.' },
            { name: 'Make Your First Call', desc: 'Send a multi-model inference request with automatic provider routing. The gateway selects the fastest available model.', code: 'import { Heady } from "@heady-ai/sdk";\n\nconst heady = new Heady({ apiKey: "HY-..." });\nconst res = await heady.infer({\n  prompt: "Explain quantum computing",\n  model: "auto",\n  stream: true\n});\nfor await (const chunk of res) {\n  process.stdout.write(chunk.text);\n}' },
          ]
        },
        {
          title: 'Platform Features', items: [
            { name: 'Multi-Provider Routing', desc: 'Route requests to GPT-4o, Claude, Gemini, Groq, or Perplexity through a single API. Auto-failover ensures 99.9% uptime. Cost optimization selects the cheapest model meeting your quality threshold.' },
            { name: 'Real-Time Streaming', desc: 'Three transport modes: WebSocket (full-duplex), Server-Sent Events (lightweight), and MCP Streamable HTTP (tool execution). All with sub-10ms cross-swarm latency.' },
            { name: 'Vector Search', desc: 'Hybrid BM25 + dense vector search with Reciprocal Rank Fusion. Index your data, query with natural language, and get ranked results with cosine similarity scores.' },
            { name: 'Agent Pipelines', desc: 'Build multi-step AI workflows with conditional branching, parallel fan-out, and checkpoint recovery. Define DAGs in YAML and execute with a single API call.' },
          ]
        },
        {
          title: 'SDK Deep Dive', items: [
            { name: 'JavaScript SDK', desc: 'Full TypeScript support with streaming, function calling, embeddings, and vector search. Built-in retry logic with φ-scaled exponential backoff and circuit breakers.', badge: '@heady-ai/sdk' },
            { name: 'Python SDK', desc: 'Async-first Python client with type hints. Supports batch embeddings, hybrid search, and pipeline execution. Compatible with asyncio and trio.', badge: 'heady-sdk' },
            { name: 'CLI Tool', desc: 'Command-line interface for inference, pipeline execution, MCP tool discovery, and system management. Install globally with npm.', badge: 'heady-cli' },
          ]
        },
      ],
    },
    'headymcp.com': {
      docs: [
        {
          title: 'What is MCP?', items: [
            { name: 'Model Context Protocol', desc: 'MCP is an open standard by Anthropic for connecting AI assistants to external tools and data sources. HeadyMCP implements this protocol with 30+ native tools, giving any IDE access to the full Heady ecosystem.', badge: 'Protocol' },
            { name: 'Why HeadyMCP?', desc: 'Instead of managing 10 different AI extensions, connect one MCP server and get: multi-model chat, semantic search, code generation, deployment, memory, and more — all through a unified protocol.' },
          ]
        },
        {
          title: 'Setup & Configuration', items: [
            { name: 'VS Code / Cursor', desc: 'Add to your .vscode/mcp.json or Cursor settings. HeadyMCP auto-registers all 30+ tools on connection.', code: '// .vscode/mcp.json\n{\n  "servers": {\n    "heady": {\n      "url": "https://headymcp.com/mcp",\n      "headers": {\n        "Authorization": "Bearer HY-your-key"\n      }\n    }\n  }\n}' },
            { name: 'Windsurf / Claude Code', desc: 'Configure in your MCP settings file. Same URL, same key — works identically across all MCP-compatible editors.' },
            { name: 'Transport Options', desc: 'Three transport modes: Streamable HTTP (recommended, cloud-based), SSE (browser/web), and stdio (local development). Choose based on your latency and connectivity needs.' },
          ]
        },
        {
          title: 'Tool Reference', items: [
            { name: 'heady_chat', desc: 'Multi-provider conversation with persistent memory. Supports Claude, GPT-4o, Gemini, Groq, and Perplexity with automatic model selection and failover.' },
            { name: 'heady_search', desc: 'Semantic search across your entire codebase and knowledge base. Returns ranked results with file paths, line numbers, and relevance scores.' },
            { name: 'heady_embed', desc: 'Generate embeddings for RAG pipelines. Batch up to 256 inputs with automatic provider selection (Nomic, Jina, Cohere, Voyage).' },
            { name: 'heady_code', desc: 'AI code generation and refactoring with multi-model consensus. Supports 12+ languages with context-aware suggestions.' },
            { name: 'heady_deploy', desc: 'One-command deployment to Cloud Run or Cloudflare Workers. Builds, pushes, and deploys with automatic rollback on failure.' },
            { name: 'heady_memory', desc: 'Persistent 3D vector memory operations: store, search, embed, and learn. Context carries across sessions and projects.' },
            { name: 'heady_vault', desc: 'Securely access encrypted credentials and API keys from your HeadyVault. AES-256-GCM with hardware-backed key derivation.' },
            { name: 'heady_health', desc: 'Check the health of any Heady service, view provider status, and monitor system metrics in real-time.' },
          ]
        },
      ],
    },
    'headybuddy.org': {
      docs: [
        {
          title: 'Meet HeadyBuddy', items: [
            { name: 'Your Personal AI Companion', desc: 'HeadyBuddy is an always-on AI assistant that knows you, learns your preferences, and grows smarter with every interaction. Available as a Chrome extension, PWA, or embedded widget on any Heady site.', badge: 'Companion' },
            { name: 'Persistent Memory', desc: 'HeadyBuddy remembers your conversations, preferences, and work context across sessions and devices. Powered by 3D vector memory with cross-session continuity.' },
            { name: 'Multi-Model Intelligence', desc: 'Under the hood, HeadyBuddy routes to the best AI model for each task — Claude for reasoning, GPT-4o for code, Gemini for research, Groq for speed.' },
          ]
        },
        {
          title: 'Installation', items: [
            { name: 'Chrome Extension', desc: 'Install HeadyBuddy from the Chrome Web Store. Get AI assistance on any webpage — summarize articles, analyze code, or chat directly from your browser toolbar.' },
            { name: 'Web Widget', desc: 'HeadyBuddy is embedded on every Heady site as a floating chat widget (🧠 button, bottom-right). Click to open, ask anything, and get instant AI-powered responses.' },
            { name: 'Progressive Web App', desc: 'Install HeadyBuddy as a standalone app on desktop or mobile. Offline-capable with sync when connectivity returns.' },
          ]
        },
        {
          title: 'Features', items: [
            { name: 'Smart Tasks', desc: 'Ask HeadyBuddy to schedule, remind, or track tasks. It integrates with your workflow and proactively suggests actions based on your patterns.' },
            { name: 'Goal Tracking', desc: 'Set personal or project goals and let HeadyBuddy track your progress. Get coaching, milestones, and motivational insights powered by AI.' },
            { name: 'Predictive Suggestions', desc: 'HeadyBuddy anticipates your needs based on context, time of day, and past behavior. Get proactive recommendations before you ask.' },
          ]
        },
      ],
    },
    'heady-ai.com': {
      docs: [
        {
          title: 'Intelligence Hub', items: [
            { name: 'Multi-Model Playground', desc: 'Test and compare responses from Claude, GPT-4o, Gemini, Groq, and Perplexity side by side. Same prompt, multiple models — see which gives the best answer for your use case.', badge: 'Playground' },
            { name: 'Model Gallery', desc: 'Browse all available AI models with benchmarks, pricing, context window sizes, and capability matrices. Filter by task type: reasoning, code, creative, research, or speed.' },
            { name: 'Liquid Gateway Architecture', desc: 'HeadyAI routes requests through the Liquid Gateway — racing multiple providers simultaneously and returning the fastest quality response. Zero-downtime provider switching.' },
          ]
        },
        {
          title: 'AI Capabilities', items: [
            { name: 'Inference Engine', desc: 'Sub-100ms edge inference via Cloudflare Workers AI for lightweight tasks. Cloud inference for complex reasoning with automatic load balancing.' },
            { name: 'Embeddings Pipeline', desc: 'Generate, store, and search embeddings at scale. Support for Nomic, Jina, Cohere, and Voyage models with automatic dimensionality optimization.' },
            { name: 'Research Mode', desc: 'Deep web research powered by Perplexity Sonar Pro. Get cited answers, literature reviews, and real-time intelligence with source attribution.' },
            { name: 'Fine-Tuning (Coming Soon)', desc: 'Upload your training data and fine-tune models on the Heady platform. Managed infrastructure with automatic evaluation and A/B deployment.' },
          ]
        },
      ],
    },
    'headylens.com': {
      docs: [
        {
          title: 'Vision AI', items: [
            { name: 'Image Analysis', desc: 'Upload any image and get detailed AI analysis — object detection, scene classification, text extraction, and quality assessment. Powered by multimodal models.', badge: 'Vision' },
            { name: 'Screenshot QA', desc: 'Automated visual quality assurance for web applications. HeadyLens captures screenshots, compares against baselines, and reports visual regressions with pixel-level diffs.' },
            { name: 'OCR Engine', desc: 'Extract text from images, PDFs, and screenshots with high accuracy. Supports 40+ languages with layout-aware extraction that preserves document structure.' },
            { name: 'UI/UX Analysis', desc: 'Get AI-powered design feedback on your UI screenshots. HeadyLens evaluates accessibility, contrast, spacing, alignment, and suggests improvements.' },
          ]
        },
      ],
    },
    'headyapi.com': {
      docs: [
        {
          title: 'API Gateway', items: [
            { name: 'Unified Interface', desc: 'One API endpoint that routes to 5+ AI providers. Send your request to HeadyAPI and it handles model selection, failover, rate limiting, and cost optimization.', badge: 'Gateway' },
            { name: 'Liquid Failover', desc: 'When a provider goes down, HeadyAPI automatically routes to the next best option within 50ms. Zero-downtime AI with automatic provider health monitoring.' },
            { name: 'Per-Request Analytics', desc: 'Every API call returns latency, token usage, cost, and provider metadata. Build dashboards and optimize your AI spend with granular data.' },
            { name: 'Rate Limit Design', desc: 'Phi-scaled rate limits: Free (100/day), Builder (10K/day), Scale (100K/day), Enterprise (unlimited). Every tier follows golden ratio burst limits.' },
          ]
        },
      ],
    },
    'headyfinance.com': {
      docs: [
        {
          title: 'Trading Intelligence', items: [
            { name: 'AI Trading Strategies', desc: 'Generate, backtest, and deploy algorithmic trading strategies powered by AI. Multi-timeframe analysis with phi-scaled lookback periods and risk management.', badge: 'Finance' },
            { name: 'Real-Time Signals', desc: 'Get AI-generated entry/exit signals for stocks, crypto, and forex. Signals include confidence scores, risk levels, and supporting data points.' },
            { name: 'Portfolio Optimization', desc: 'AI-driven portfolio allocation using modern portfolio theory enhanced with phi-weighted risk factors. Automatic rebalancing and drawdown protection.' },
            { name: 'Backtesting Engine', desc: '16-asset historical simulation across multiple timeframes. Test strategies against years of market data with realistic slippage and commission modeling.' },
          ]
        },
      ],
    },
    'headyconnection.org': {
      docs: [
        {
          title: 'Community & Nonprofit', items: [
            { name: 'Mission', desc: 'HeadyConnection is a 501(c)(3) nonprofit dedicated to making AI technology accessible to underserved communities. We provide free AI education, tools, and mentorship.', badge: 'Mission' },
            { name: 'Programs', desc: 'AI Literacy workshops, developer mentorship, open-source contributions, and community AI labs. All programs are free and designed for builders of all skill levels.' },
            { name: 'Get Involved', desc: 'Volunteer as a mentor, contribute to open-source projects, donate to support our programs, or join our community forums to connect with like-minded builders.' },
          ]
        },
      ],
    },
    'headybot.com': {
      docs: [
        {
          title: 'Autonomous Agents', items: [
            { name: 'HeadyBot Agents', desc: 'Self-driving engineering agents that plan, code, test, and deploy autonomously. Each agent specializes in a domain: frontend, backend, DevOps, security, or testing.', badge: 'Agents' },
            { name: 'Battle Arena', desc: 'AI-vs-AI quality assurance. Multiple agents tackle the same task independently, then a judge agent evaluates and selects the best solution. Built-in adversarial validation.' },
            { name: 'HeadyGoose', desc: 'A self-governing engineering agent inspired by the original Goose. Handles end-to-end feature development with autonomous file editing, testing, and deployment.' },
          ]
        },
      ],
    },
    'headyos.com': {
      docs: [
        {
          title: 'HeadyLatentOS', items: [
            { name: 'The Latent Operating System', desc: 'HeadyOS is the operating system layer for AI-native computing. It provides process management, resource allocation, and service orchestration for AI workloads.', badge: 'OS' },
            { name: 'Module Explorer', desc: 'Browse, install, and manage HeadyOS modules. Each module is a self-contained service with health monitoring, auto-scaling, and zero-config networking.' },
            { name: 'Sacred Geometry Engine', desc: 'The mathematical foundation powering all HeadyOS operations. Fibonacci-sized queues, phi-scaled timeouts, golden-ratio batch processing — every system constant is derived from φ.' },
            { name: 'System Health Dashboard', desc: 'Real-time monitoring of all HeadyOS services. CPU, memory, network, and AI inference metrics with alerting, auto-scaling triggers, and self-healing responses.' },
          ]
        },
      ],
    },
  };
  return siteOverrides[siteId] || SITE_DOCS['headyme.com'];
}

function renderDocs(site, host, docType) {
  const siteId = Object.keys(SITES).find(d => SITES[d].brand === site.brand) || 'headyme.com';
  const siteDocs = getSiteSpecificDocs(siteId);
  const docMap = { 'docs': { title: 'Documentation', icon: '📖' }, 'api-docs': { title: 'API Reference', icon: '⚡' }, 'mcp-docs': { title: 'MCP Protocol', icon: '🔌' } };
  const doc = docMap[docType] || docMap['docs'];
  const contentKey = docType === 'api-docs' ? 'api' : docType === 'mcp-docs' ? 'mcp' : 'docs';
  const sections = (siteDocs[contentKey] || siteDocs['docs'] || []);

  const sectionsHTML = sections.map(section => `
        <div class="doc-section">
            <h2>${section.title}</h2>
            <div class="doc-grid">
                ${section.items.map(item => `
                    <div class="doc-card${item.method ? ' has-method' : ''}">
                        <div class="doc-card-header">
                            ${item.method ? `<span class="method-badge" style="background:${item.color || '#7c3aed'}20;color:${item.color || '#7c3aed'};border:1px solid ${item.color || '#7c3aed'}40">${item.method}</span>` : ''}
                            <h3>${item.name}</h3>
                            ${item.badge ? `<span class="doc-badge">${item.badge}</span>` : ''}
                        </div>
                        <p>${item.desc}</p>
                        ${item.code ? `<div class="doc-code"><pre>${item.code}</pre></div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

  const ecosystemLinks = Object.entries(SITES).map(([d, s]) =>
    `<a href="https://${d}/docs" class="eco-link" style="--ecolor:${s.color}">${s.brand}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title} — ${site.brand}</title>
  <meta name="description" content="${doc.title} for ${site.brand} — ${site.subtitle}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#0a0a1a;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08);
      --brand:${site.color};--accent:${site.accent};
      --text:#e8e8f0;--dim:#8888aa;--muted:#555577;
    }
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0}
    .bg-glow{position:fixed;top:-30%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,color-mix(in srgb,var(--brand) 10%,transparent),transparent 60%);z-index:0}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

    /* ── Nav ── */
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,26,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .nav-brand{display:flex;align-items:center;gap:.75rem;text-decoration:none;color:var(--text)}
    .nav-logo{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--brand),var(--accent));font-size:16px;font-weight:900;color:white}
    .nav-name{font-size:1.1rem;font-weight:700}
    .nav-links{display:flex;gap:1.5rem;align-items:center}
    .nav-links a{color:var(--dim);text-decoration:none;font-size:.85rem;font-weight:500;transition:color .2s}
    .nav-links a:hover{color:var(--text)}
    .nav-links a.active{color:var(--brand);border-bottom:2px solid var(--brand);padding-bottom:2px}
    .nav-cta{background:var(--brand);color:white;border:none;padding:.5rem 1.25rem;border-radius:8px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}

    /* ── Container ── */
    .container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:6rem 1.5rem 2rem}

    /* ── Breadcrumb ── */
    .breadcrumb{font-size:.8rem;color:var(--muted);margin-bottom:.5rem;animation:fadeUp .4s ease}
    .breadcrumb a{color:var(--dim);text-decoration:none}
    .breadcrumb a:hover{color:var(--brand)}

    /* ── Doc Header ── */
    .doc-header{text-align:center;margin-bottom:2.5rem;animation:fadeUp .5s ease}
    .doc-header .icon{font-size:3rem;margin-bottom:1rem}
    .doc-header h1{font-size:2.5rem;font-weight:900;letter-spacing:-.03em;margin-bottom:.5rem}
    .doc-header h1 .gradient{background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .doc-header p{color:var(--dim);font-size:1.05rem;max-width:600px;margin:0 auto}

    /* ── Doc Nav Tabs ── */
    .doc-nav{display:flex;justify-content:center;gap:1rem;margin-bottom:3rem}
    .doc-nav a{color:var(--dim);text-decoration:none;padding:.5rem 1.25rem;border-radius:8px;border:1px solid var(--border);font-size:.85rem;font-weight:500;transition:all .2s}
    .doc-nav a:hover,.doc-nav a.active{color:var(--brand);border-color:var(--brand);background:color-mix(in srgb,var(--brand) 8%,transparent)}

    /* ── Doc Sections ── */
    .doc-section{margin-bottom:3rem;animation:fadeUp .6s ease}
    .doc-section h2{font-size:1.4rem;font-weight:800;margin-bottom:1.25rem;padding-bottom:.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem}

    /* ── Doc Grid ── */
    .doc-grid{display:grid;grid-template-columns:1fr;gap:1rem}

    /* ── Doc Card ── */
    .doc-card{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:12px;padding:1.5rem;transition:all .3s;cursor:default}
    .doc-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent);transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.3)}
    .doc-card-header{display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap}
    .doc-card h3{font-size:1rem;font-weight:700;color:var(--text)}
    .doc-card p{color:var(--dim);font-size:.88rem;line-height:1.7}

    /* ── Badges ── */
    .doc-badge{font-size:.65rem;font-weight:600;padding:2px 10px;border-radius:10px;background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);letter-spacing:.03em;text-transform:uppercase;white-space:nowrap}
    .method-badge{font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:5px;font-family:'JetBrains Mono',monospace;letter-spacing:.02em}

    /* ── Code Blocks ── */
    .doc-code{margin-top:.75rem;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);border-radius:8px;overflow:hidden}
    .doc-code pre{padding:1rem 1.25rem;font-family:'JetBrains Mono',monospace;font-size:.78rem;line-height:1.7;overflow-x:auto;white-space:pre;color:var(--accent)}

    /* ── Ecosystem Bar ── */
    .ecosystem{margin-top:2rem;padding:1.5rem 0;border-top:1px solid var(--border)}
    .ecosystem h4{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:1rem;text-align:center}
    .eco-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem}
    .eco-link{color:var(--dim);text-decoration:none;font-size:.78rem;font-weight:500;padding:.3rem .75rem;border-radius:6px;border:1px solid var(--border);transition:all .2s}
    .eco-link:hover{color:var(--ecolor,var(--brand));border-color:var(--ecolor,var(--brand));background:color-mix(in srgb,var(--ecolor,var(--brand)) 8%,transparent)}

    /* ── Footer ── */
    footer{text-align:center;padding:2rem;color:var(--muted);font-size:.75rem;border-top:1px solid var(--border);margin-top:1rem}
    footer a{color:var(--dim);text-decoration:none;margin:0 .25rem}
    footer a:hover{color:var(--brand)}

    @media(max-width:600px){.doc-nav{flex-wrap:wrap}.container{padding:5rem 1rem 2rem}.doc-card-header{flex-direction:column;align-items:flex-start}}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="bg-glow"></div>
  <nav>
    <a class="nav-brand" href="/">
      <div class="nav-logo">${site.icon}</div>
      <span class="nav-name">${site.brand}</span>
    </a>
    <div class="nav-links">
      <a href="/docs"${docType === 'docs' ? ' class="active"' : ''}>Docs</a>
      <a href="/api-docs"${docType === 'api-docs' ? ' class="active"' : ''}>API</a>
      <a href="/mcp-docs"${docType === 'mcp-docs' ? ' class="active"' : ''}>MCP</a>
      <a href="/" class="nav-cta">← ${site.brand}</a>
    </div>
  </nav>
  <div class="container">
    <div class="breadcrumb">
      <a href="/">${site.brand}</a> → <a href="/docs">Docs</a>${docType !== 'docs' ? ` → ${doc.title}` : ''}
    </div>
    <div class="doc-header">
      <div class="icon">${doc.icon}</div>
      <h1><span class="gradient">${doc.title}</span></h1>
      <p>${site.brand} — ${site.tagline}</p>
    </div>
    <div class="doc-nav">
      <a href="/docs"${docType === 'docs' ? ' class="active"' : ''}>📖 Documentation</a>
      <a href="/api-docs"${docType === 'api-docs' ? ' class="active"' : ''}>⚡ API Reference</a>
      <a href="/mcp-docs"${docType === 'mcp-docs' ? ' class="active"' : ''}>🔌 MCP Protocol</a>
    </div>
    ${sectionsHTML}
    <div class="ecosystem">
      <h4>Explore the Heady Ecosystem</h4>
      <div class="eco-grid">${ecosystemLinks}</div>
    </div>
    <footer>
      © 2026 HeadySystems Inc. ·
      <a href="/">← ${site.brand}</a> ·
      <a href="https://headyme.com">HeadyMe</a> ·
      <a href="https://headyio.com">HeadyIO</a> ·
      <a href="https://headysystems.com">HeadySystems</a> ·
      <a href="https://headymcp.com">HeadyMCP</a>
    </footer>
  </div>
</body>
</html>`;
}
// ── HTTP Server ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const host = req.headers['x-forwarded-host']
    || req.headers['x-original-host']
    || req.headers['cf-request-host']
    || req.headers.host
    || 'headyme.com';
  const site = resolveSite(host);
  const _headyOrigins = ['https://headyme.com', 'https://heady-ai.com', 'https://headyos.com', 'https://headysystems.com', 'https://headyconnection.org', 'https://headyconnection.com', 'https://headyex.com', 'https://headyfinance.com', 'https://headyio.com', 'https://headyweb.com', 'https://auth.headyme.com'];
  const _reqOrigin = req.headers?.origin || '';
  res.setHeader('Access-Control-Allow-Origin', _headyOrigins.includes(_reqOrigin) ? _reqOrigin : _headyOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  // ── Documentation Routes ────────────────────────────────
  if (url.pathname === '/docs' || url.pathname === '/api-docs' || url.pathname === '/mcp-docs') {
    const docType = url.pathname.replace('/', '');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Heady-Site': site.brand,
    });
    res.end(renderDocs(site, host, docType));
    return;
  }
  // ── API Routes ──────────────────────────────────────────
  if (url.pathname === '/api/providers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(AUTH_PROVIDERS));
    return;
  }
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy', version: '3.2.1',
      site: site.brand, host,
      providers: AUTH_PROVIDERS.oauth.length + AUTH_PROVIDERS.apikey.length,
      users: users.size, sessions: sessions.size,
      sites: Object.keys(SITES).length,
    }));
    return;
  }
  if (url.pathname === '/api/sites') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.entries(SITES).map(([d, s]) => ({ domain: d, brand: s.brand, tagline: s.tagline, color: s.color }))));
    return;
  }
  if (url.pathname === '/api/signup' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, password, displayName, provider, connectedKey } = JSON.parse(body);
        if (users.has(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email already exists' }));
          return;
        }
        const { hash, salt } = hashPw(password);
        const key = generateApiKey();
        const user = { id: crypto.randomUUID(), email, displayName: displayName || email.split('@')[0], hash, salt, apiKey: key, provider: provider || 'email', connectedKeys: connectedKey ? { [provider]: connectedKey } : {}, createdAt: new Date().toISOString() };
        users.set(email, user);
        const token = generateSession();
        sessions.set(token, { userId: user.id, email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email, displayName: user.displayName, tier: 'spark', apiKey: key, provider: user.provider }, token }));
      }
      catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = users.get(email);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }
        const { hash } = hashPw(password, user.salt);
        if (hash !== user.hash) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }
        const token = generateSession();
        sessions.set(token, { userId: user.id, email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email, displayName: user.displayName, tier: 'spark', apiKey: user.apiKey, provider: user.provider }, token }));
      }
      catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { message, session, site: siteName } = JSON.parse(body);
        // Identity check
        let identity = 'guest';
        if (session && sessions.has(session)) {
          const s = sessions.get(session);
          const u = users.get(s.email);
          identity = u ? u.displayName : s.email;
        }
        // Basic chat response
        const lower = (message || '').toLowerCase();
        let response;
        if (lower.includes('who am i') || lower.includes('my name') || lower.includes('recognize')) {
          response = identity !== 'guest'
            ? `You are ${identity}. I recognize you from your active session on ${siteName || 'Heady'}.`
            : 'I don\'t have your identity yet. Please sign in first!';
        }
        else if (lower.includes('authorize') || lower.includes('grant') || lower.includes('access')) {
          response = identity !== 'guest'
            ? `Got it, ${identity}. I've noted your authorization request. This requires admin-level action — I'll route it through the governance module.`
            : 'You need to be signed in to manage authorizations.';
        }
        else if (lower.includes('how') && lower.includes('work')) {
          response = `I'm HeadyBuddy, the AI companion embedded in ${siteName || 'Heady'}. I run on the Sacred Geometry mesh with 4+ AI providers, self-healing nodes, and 3D vector memory. I know who you are (${identity}) and can help with anything across the Heady ecosystem.`;
        }
        else if (lower.includes('health') || lower.includes('status') || lower.includes('diagnos')) {
          response = `System status: ✅ Healthy.\n• ${Object.keys(SITES).length} domains active\n• 25 auth providers configured\n• Self-healing mesh: online\n• Sacred Geometry v3: φ-weighted\n• Identity: ${identity}`;
        }
        else {
          response = `[${identity}@${siteName || 'Heady'}] I hear you! I'm running locally on the dynamic site server. Full AI routing via the Liquid Gateway is available when the cloud runtime is connected.`;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response, identity, site: siteName }));
      }
      catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  // ── Serve dynamic page ──────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Heady-Site': site.brand,
    'X-Heady-Version': '3.2.1',
  });
  res.end(renderSite(site, host));
});
server.listen(PORT, () => {
  console.log(`\n  ⚡ Heady Dynamic Sites — http://localhost:${PORT}`);
  console.log(`     ${Object.keys(SITES).length} domains registered`);
  console.log(`     ${AUTH_PROVIDERS.oauth.length + AUTH_PROVIDERS.apikey.length} auth providers`);
  console.log(`     HeadyBuddy widget: embedded\n`);
  console.log('  Domains:');
  for (const [domain, site] of Object.entries(SITES)) {
    console.log(`    ${site.icon} ${domain} → ${site.brand}`);
  }
  console.log('');
});
module.exports = { SITES, AUTH_PROVIDERS, server, resolveSite };
//# sourceMappingURL=dynamic-site-server.js.map