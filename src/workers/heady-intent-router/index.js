// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/workers/heady-intent-router/index.js
// LAYER: workers — Cloudflare edge routing
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ HEADY DOMAIN ROUTER — v2.0 ∞                                           ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                           ║
 * ║     11 active domains serve unique branded content.                          ║
 * ║     Remaining domains redirect to headyme.com with intent params.           ║
 * ║     Patent: HS-058 Intent-Encoded Domain Architecture                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════
// §1 — SHARED DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════

const SHARED_CSS = `
:root {
  --bg-deep: #07080f; --bg-surface: #0d1017; --bg-card: rgba(16,20,32,0.85);
  --gold: #d4a853; --gold-glow: rgba(212,168,83,0.2);
  --purple: #8b5cf6; --purple-glow: rgba(139,92,246,0.15);
  --green: #22c55e; --red: #ef4444; --cyan: #22d3ee; --amber: #f59e0b;
  --text: #eef1f8; --text-sec: #8b92a8; --text-muted: #5a6178;
  --border: rgba(139,92,246,0.15); --radius: 13px;
  --ease: cubic-bezier(0.16,1,0.3,1);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-deep); color: var(--text); min-height: 100vh; }
.hero { text-align: center; padding: 80px 20px 40px; }
.logo { font-size: 48px; font-weight: 800; letter-spacing: -1px; }
.logo span { background: linear-gradient(135deg, var(--gold), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.sub { color: var(--text-sec); font-size: 17px; margin: 12px auto 0; max-width: 560px; line-height: 1.6; }
.grid { max-width: 900px; margin: 40px auto; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
.card { background: var(--bg-card); backdrop-filter: blur(16px); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; position: relative; overflow: hidden; transition: all 0.3s var(--ease); }
.card:hover { border-color: var(--gold); transform: translateY(-2px); }
.card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), var(--purple), transparent); opacity: 0.5; }
.card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.card p { font-size: 13px; color: var(--text-sec); line-height: 1.5; }
.card .icon { font-size: 28px; margin-bottom: 12px; }
.nav { display: flex; justify-content: center; gap: 8px; padding: 16px; flex-wrap: wrap; }
.nav a { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-decoration: none; border: 1px solid var(--border); transition: all 0.2s; }
.nav a:hover, .nav a.active { color: var(--gold); border-color: var(--gold); }
.cta { display: inline-block; padding: 10px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 28px; transition: all 0.2s var(--ease); }
.cta-gold { background: linear-gradient(135deg, var(--gold), #c49038); color: var(--bg-deep); }
.cta-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 20px var(--gold-glow); }
.footer { text-align: center; padding: 40px 20px; font-size: 11px; color: var(--text-muted); }
.footer a { color: var(--gold); text-decoration: none; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.badge.green { color: var(--green); border: 1px solid rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
.badge.purple { color: var(--purple); border: 1px solid rgba(139,92,246,0.3); background: rgba(139,92,246,0.08); }
.section { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
.section h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
.section p { color: var(--text-sec); line-height: 1.7; }
`;

const NAV_HTML = `
<nav class="nav">
  <a href="https://headysystems.com">HS</a>
  <a href="https://headyme.com">HM</a>
  <a href="https://headybuddy.com">HB</a>
  <a href="https://headymcp.com">MC</a>
  <a href="https://headyio.com">IO</a>
  <a href="https://headybot.com">BT</a>
  <a href="https://headyapi.com">AP</a>
  <a href="https://headylens.com">HL</a>
  <a href="https://headyai.com">AI</a>
  <a href="https://headyfinance.com">HF</a>
  <a href="https://headyconnection.org">HC</a>
</nav>`;

const FOOTER_HTML = `
<div class="footer">
  © 2026 <a href="https://headysystems.com">HeadySystems Inc.</a> · ∞ Sacred Geometry ∞ · φ = 1.618 · 60+ Patents Pending
</div>`;

function page(title, ogDesc, bodyHtml, activeNav = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${ogDesc}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${ogDesc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${SHARED_CSS}</style>
</head>
<body>
  ${NAV_HTML.replace(`href="https://${activeNav}"`, `class="active" href="https://${activeNav}"`)}
  ${bodyHtml}
  ${FOOTER_HTML}
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// §2 — UNIQUE SITE CONTENT PER DOMAIN
// ═══════════════════════════════════════════════════════════════════

const SITE_PAGES = {
  // ── headybot.com — AI Agent & Bot Registry ──
  'headybot.com': () => page(
    'HeadyBot — AI Agent & Bot Registry',
    'Deploy, manage, and monitor 32+ autonomous AI agents powered by Sacred Geometry.',
    `<div class="hero">
      <div class="logo">Heady<span>Bot</span></div>
      <div class="sub">AI Agent & Bot Registry — 32+ autonomous bee types, spawn-execute-report-retire lifecycle, φ-backoff retry, parallel swarm execution.</div>
      <div style="margin-top:16px"><span class="badge green">● 32+ Agent Types</span>&nbsp;<span class="badge purple">Sacred Geometry Swarm</span></div>
      <a href="https://headymcp.com" class="cta cta-gold">Get API Key →</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">🐝</div><h3>Bee Swarm Factory</h3><p>Spawn specialized agents: brain-bee, security-bee, creative-bee, deployment-bee, and 28 more. Each follows the BaseHeadyBee lifecycle.</p></div>
      <div class="card"><div class="icon">🎯</div><h3>Task Decomposition</h3><p>LLM-powered DAG splitting with topological sort. Complex tasks auto-decompose into parallel sub-tasks (max 8 concurrent).</p></div>
      <div class="card"><div class="icon">⚡</div><h3>φ-Backoff Retry</h3><p>Golden ratio exponential backoff: 1s → 1.618s → 2.618s → 4.236s. Self-healing with automatic task reassignment on failure.</p></div>
      <div class="card"><div class="icon">🧠</div><h3>8 Sacred Geometry Agents</h3><p>Bridge Builder, Alpha, Risk, Execution, Sentinel, Compliance, Data, and View — the core intelligence orchestration layer.</p></div>
      <div class="card"><div class="icon">🔗</div><h3>Redis Streams Backbone</h3><p>XREADGROUP with consumer groups, XAUTOCLAIM for dead nodes. Real-time inter-agent communication at swarm scale.</p></div>
      <div class="card"><div class="icon">📊</div><h3>Live Telemetry</h3><p>Per-agent metrics: spawn time, execution duration, success rate, memory usage. Prometheus + Grafana dashboards.</p></div>
    </div>`, 'headybot.com'),

  // ── headyapi.com — Public API Gateway ──
  'headyapi.com': () => page(
    'HeadyAPI — Production-Grade API Gateway',
    'REST API for the Heady ecosystem. Keys, rate limiting, SDKs, and live documentation.',
    `<div class="hero">
      <div class="logo">Heady<span>API</span></div>
      <div class="sub">Production-grade REST API for the entire Heady ecosystem. Fibonacci-tiered rate limits, per-thought billing, and comprehensive SDKs.</div>
      <div style="margin-top:16px"><span class="badge green">● v4.0 Live</span>&nbsp;<span class="badge purple">JSON-RPC 2.0</span></div>
      <a href="https://headymcp.com" class="cta cta-gold">Get API Key →</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">🔑</div><h3>API Key Management</h3><p>Prefixed keys: <code>hdy_int_</code>, <code>hdy_plt_</code>, <code>hdy_pub_</code>, <code>hdy_trl_</code>. Generate, rotate, and scope per-project.</p></div>
      <div class="card"><div class="icon">⚡</div><h3>Fibonacci Rate Limits</h3><p>Trial: 8 RPM. Pilot: 21 RPM. Public: 34 RPM. Internal: 89 RPM. Burst allowances at next Fibonacci number.</p></div>
      <div class="card"><div class="icon">💰</div><h3>Per-Thought Billing</h3><p>9 thought types, φ-scaled pricing from $0.0001 (embed) to $0.001794 (design generation). Metered usage with real-time dashboards.</p></div>
      <div class="card"><div class="icon">📚</div><h3>42+ Endpoints</h3><p>Brain search, pipeline execution, bee spawning, battle arena, creative generation, CSL gating, and deployment triggers.</p></div>
      <div class="card"><div class="icon">🛠</div><h3>SDKs</h3><p>Node.js, Python, and Go client libraries. <code>npm install @heady-ai/sdk</code> — type-safe, auto-retry, streaming support.</p></div>
      <div class="card"><div class="icon">🔒</div><h3>Zero-Trust Auth</h3><p>API key + session cookie dual auth. Per-tool authorization scopes. Full audit logging in PostgreSQL.</p></div>
    </div>`, 'headyapi.com'),

  // ── headyio.com — Service Integrations ──
  'headyio.com': () => page(
    'HeadyIO — Connect Your Stack to Heady Intelligence',
    'Integration connectors, webhooks, workflow automation, and data pipelines for the Heady ecosystem.',
    `<div class="hero">
      <div class="logo">Heady<span>IO</span></div>
      <div class="sub">Connect Your Stack to Heady Intelligence — integration connectors, webhooks, workflow automation, and real-time data pipelines.</div>
      <div style="margin-top:16px"><span class="badge green">● 20+ Connectors</span>&nbsp;<span class="badge purple">Webhook Events</span></div>
      <a href="https://headymcp.com" class="cta cta-gold">View Integrations →</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">🔌</div><h3>Pre-Built Connectors</h3><p>Slack, GitHub, Discord, Notion, Linear, Jira, Stripe, HubSpot, Salesforce, and more. One-click OAuth integration.</p></div>
      <div class="card"><div class="icon">🪝</div><h3>Webhooks</h3><p>Real-time event notifications: task completion, agent spawned, pipeline stage, memory write, CSL gate trigger.</p></div>
      <div class="card"><div class="icon">🔄</div><h3>Data Pipelines</h3><p>ETL workflows with φ-timed scheduling. Transform, enrich, and route data between any connected service.</p></div>
      <div class="card"><div class="icon">🧩</div><h3>Custom Connectors</h3><p>Build your own connectors with the Connector Forge SDK. Publish to the Heady marketplace for others to use.</p></div>
      <div class="card"><div class="icon">📡</div><h3>Event Bus</h3><p>Redis Streams backbone with consumer groups. Subscribe to any event across the entire Heady ecosystem.</p></div>
      <div class="card"><div class="icon">🔐</div><h3>OAuth 2.0 + API Keys</h3><p>Secure integration with scoped access tokens. HeadyVault encrypted credential storage per connector.</p></div>
    </div>`, 'headyio.com'),

  // ── headybuddy.com — AI Companion ──
  'headybuddy.com': () => page(
    'HeadyBuddy — Your AI Companion',
    'Personal AI companion that learns, remembers, and grows with you across every device.',
    `<div class="hero">
      <div class="logo">Heady<span>Buddy</span></div>
      <div class="sub">Your AI Companion — learns, remembers, and grows with you. Cross-device sync, voice control, and persistent memory that never forgets.</div>
      <div style="margin-top:16px"><span class="badge green">● Always Learning</span>&nbsp;<span class="badge purple">Cross-Device</span></div>
      <a href="https://headyme.com" class="cta cta-gold">Meet Your Buddy →</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">🧠</div><h3>Permanent Memory</h3><p>384D vector memory with CSL gating. Your buddy remembers every conversation, preference, and pattern — forever.</p></div>
      <div class="card"><div class="icon">📱</div><h3>Cross-Device Sync</h3><p>Seamless handoff between phone, tablet, laptop, and desktop. WebRTC peer-to-peer with Cloudflare tunnels.</p></div>
      <div class="card"><div class="icon">🎤</div><h3>Voice Control</h3><p>Natural voice interaction with real-time transcription. "Hey Buddy" wake word with always-on listening mode.</p></div>
      <div class="card"><div class="icon">🎨</div><h3>Personality Engine</h3><p>Your buddy develops a unique personality based on your interactions. Humor, tone, and knowledge tailored to you.</p></div>
      <div class="card"><div class="icon">🛡</div><h3>Sovereign AI</h3><p>Your data, your rules. Zero-trust architecture with on-device processing option. No training on your data — ever.</p></div>
      <div class="card"><div class="icon">🎵</div><h3>Heady Music</h3><p>Sacred Geometry music generation. Your buddy can play live through Ableton, generate patterns, and jam with you.</p></div>
    </div>`, 'headybuddy.com'),

  // ── headyconnection.org — Nonprofit ──
  'headyconnection.org': () => page(
    'HeadyConnection — AI for Everyone',
    'HeadyConnection Inc. 501(c)(3) — Community-first AI education, digital literacy, and equitable access to intelligence.',
    `<div class="hero">
      <div class="logo">Heady<span>Connection</span></div>
      <div class="sub">501(c)(3) Nonprofit — community-first AI education, digital literacy, and equitable access to sovereign intelligence for all.</div>
      <div style="margin-top:16px"><span class="badge green">● 501(c)(3)</span>&nbsp;<span class="badge purple">Colorado Nonprofit</span></div>
      <a href="https://headyconnection.org/donate" class="cta cta-gold">Support Our Mission →</a>
    </div>
    <div class="section">
      <h2>Our Mission</h2>
      <p>HeadyConnection Inc. exists to ensure that sovereign AI technology is accessible to everyone — regardless of economic status, technical background, or geography. We believe intelligence should be a right, not a privilege.</p>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">📚</div><h3>AI Education</h3><p>Free workshops and curriculum for underserved communities. Teaching AI literacy, prompt engineering, and digital skills.</p></div>
      <div class="card"><div class="icon">🌍</div><h3>Digital Equity</h3><p>Providing compute access, learning resources, and mentorship to bridge the AI divide in rural and urban communities.</p></div>
      <div class="card"><div class="icon">🤝</div><h3>Community Outreach</h3><p>Partnerships with schools, libraries, and community centers. Hands-on AI workshops with real Heady tools.</p></div>
      <div class="card"><div class="icon">💡</div><h3>Open Research</h3><p>Publishing Sacred Geometry AI research openly. Contributing to the commons while advancing the field.</p></div>
      <div class="card"><div class="icon">🎓</div><h3>Scholarship Fund</h3><p>Funding promising students in AI, computer science, and related fields. Named after the founding principles of Sacred Geometry.</p></div>
      <div class="card"><div class="icon">📊</div><h3>Impact Reports</h3><p>Transparent reporting on community impact, funds deployed, students reached, and programs delivered. Annual 990 filing public.</p></div>
    </div>`, 'headyconnection.org'),

  // ── heady-ai.com — AI Research & Intelligence ──
  'heady-ai.com': () => page(
    'HeadyAI — Deterministic Intelligence Research',
    'AI research powered by Sacred Geometry, Continuous Semantic Logic, and the Golden Ratio.',
    `<div class="hero">
      <div class="logo">Heady<span>AI</span></div>
      <div class="sub">Deterministic Intelligence Research — replacing probabilistic guessing with geometric certainty. CSL gates, φ-mathematics, and multi-model orchestration.</div>
      <div style="margin-top:16px"><span class="badge green">● 60+ Papers</span>&nbsp;<span class="badge purple">51 Patents Filed</span></div>
      <a href="https://headysystems.com" class="cta cta-gold">Read Research →</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">📐</div><h3>Continuous Semantic Logic</h3><p>CSL replaces binary true/false with continuous confidence scoring: CORE (0.718), INCLUDE (0.618), RECALL (0.382). Every decision is measured.</p></div>
      <div class="card"><div class="icon">🔢</div><h3>φ-Mathematics Foundation</h3><p>All constants derived from the Golden Ratio (1.618033988749895). Fibonacci sequences for rate limits, timeouts, retry backoff, and scheduling.</p></div>
      <div class="card"><div class="icon">⚔️</div><h3>Battle Arena</h3><p>Multi-model competition: Claude vs GPT vs Gemini vs Llama. Ranked responses with CSL scoring for quality assurance.</p></div>
      <div class="card"><div class="icon">🧬</div><h3>Hyperdimensional Computing</h3><p>VSA (Vector Symbolic Architecture) for state encoding. Similarity-based orchestration decisions using 10,000D hypervectors.</p></div>
      <div class="card"><div class="icon">🔬</div><h3>RAG Optimization</h3><p>Signal-to-noise tuning with context precision/recall measurement. Perplexity-guided retrieval with graph-enhanced memory.</p></div>
      <div class="card"><div class="icon">🛡</div><h3>Post-Quantum Security</h3><p>Preparing for quantum computing with lattice-based cryptography. Kyber key exchange and Dilithium signatures in development.</p></div>
    </div>`, 'heady-ai.com'),
};

// ═══════════════════════════════════════════════════════════════════
// §3 — DOMAIN ROUTING
// ═══════════════════════════════════════════════════════════════════

/** All domains that now serve unique content */
const ACTIVE_DOMAINS = new Set([
  'headysystems.com', 'headymcp.com', 'headyconnection.org',
  'heady-ai.com', 'headyme.com',
  // Newly activated ─
  'headybot.com', 'headyapi.com', 'headyio.com',
  'headybuddy.com',
]);

/** Redirect-only domains with intent params */
const DOMAIN_INTENTS = {
  'headybuddy.org':     { intent: 'buddy', audience: 'consumer' },
  'headylens.com':      { intent: 'lens', audience: 'developer' },
  'headyos.com':        { intent: 'os', audience: 'enterprise' },
  'headyex.com':        { intent: 'exchange', audience: 'enterprise' },
  'headyfinance.com':   { intent: 'finance', audience: 'enterprise' },
  'headyconnection.com': { intent: 'connection', audience: 'community' },
  'headyai.com':        { intent: 'ai', audience: 'developer' },
};

function intentRedirect(hostname, pathname) {
  const mapping = DOMAIN_INTENTS[hostname];
  const intent = mapping ? mapping.intent : hostname.replace(/\.com|\.org|\.io/g, '').replace('heady', '');
  const audience = mapping ? mapping.audience : 'general';
  const target = new URL('https://headyme.com');
  target.pathname = pathname === '/' ? '/' : pathname;
  target.searchParams.set('intent', intent);
  target.searchParams.set('from', hostname);
  if (audience !== 'general') target.searchParams.set('audience', audience);
  return new Response(null, {
    status: 301,
    headers: {
      'Location': target.toString(),
      'X-Heady-Intent': intent,
      'X-Heady-Source': hostname,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function healthResponse(hostname) {
  return Response.json({
    status: 'healthy',
    domain: hostname,
    isActive: ACTIVE_DOMAINS.has(hostname),
    hasSitePage: !!SITE_PAGES[hostname],
    activeDomains: [...ACTIVE_DOMAINS],
    redirectDomains: Object.keys(DOMAIN_INTENTS).length,
    phi: 1.618033988749895,
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════
// §4 — WORKER FETCH HANDLER
// ═══════════════════════════════════════════════════════════════════

export default {
  async fetch(request, _env, _ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.replace(/^www\./, '');

    // Health check
    if (url.pathname === '/.heady/health' || url.pathname === '/health') {
      return healthResponse(hostname);
    }

    // Serve unique site page if we have one
    if (SITE_PAGES[hostname] && url.pathname === '/') {
      return new Response(SITE_PAGES[hostname](), {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Heady-Active': 'true',
          'X-Heady-Domain': hostname,
        },
      });
    }

    // Active domains: pass through to origin (Pages/KV/Cloud Run)
    if (ACTIVE_DOMAINS.has(hostname)) {
      return fetch(request);
    }

    // Known redirect domains
    if (DOMAIN_INTENTS[hostname]) {
      return intentRedirect(hostname, url.pathname);
    }

    // Unknown Heady domains: generic redirect
    if (hostname.includes('heady')) {
      return intentRedirect(hostname, url.pathname);
    }

    return new Response('Not Found', { status: 404 });
  },
};
