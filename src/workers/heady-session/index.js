// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/workers/heady-session/index.js
// LAYER: workers — Cloudflare Durable Objects
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ HEADY SESSION — DURABLE OBJECTS ∞                                      ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                      ║
 * ║     Per-session HeadyBee state with phi-weighted TTL and Alarm API           ║
 * ║     Replaces Redis for hot session storage — edge-local, zero race conds    ║
 * ║                                                                               ║
 * ║     Ref: Deep Research §2.2 / Master Playbook H-2                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import * as Sentry from '@sentry/cloudflare';

const PHI = 1.618033988749895;

// CSL Threshold Constants
const CSL = {
  CRITICAL: 0.927,
  HIGH: 0.882,
  MEDIUM: 0.809,  // coherence drift floor
  LOW: 0.691,
  MINIMUM: 0.618, // 1/φ
};

/**
 * HeadySession Durable Object
 * Each active HeadyBee instance maps to one DO — single-threaded,
 * single-location execution guarantees no race conditions.
 */
export class HeadySession {
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(req) {
    const url = new URL(req.url);

    try {
      switch (`${req.method} ${url.pathname}`) {
        case 'GET /get':
          return this._getSession();
        case 'POST /set':
          return this._setSession(await req.json());
        case 'POST /transition':
          return this._transitionLifecycle(await req.json());
        case 'GET /health':
          return this._health();
        case 'DELETE /retire':
          return this._retire();
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  async _getSession() {
    const session = await this.storage.get('session') ?? {};
    const coherence = await this.storage.get('coherence') ?? CSL.MEDIUM;
    const lifecycle = await this.storage.get('lifecycle') ?? 'spawned';
    return Response.json({ session, coherence, lifecycle });
  }

  async _setSession(body) {
    const { session, coherence, trustLevel } = body;

    // Phi-weighted TTL: base 1h × φ^trust_level
    const ttlSeconds = Math.round(3600 * Math.pow(PHI, trustLevel ?? 1));

    await this.storage.put('session', session ?? {}, { expirationTtl: ttlSeconds });
    await this.storage.put('coherence', coherence ?? CSL.MEDIUM);

    // Set Alarm for lifecycle timeout (auto-retire if idle)
    const alarmMs = ttlSeconds * 1000;
    await this.storage.setAlarm(Date.now() + alarmMs);

    return Response.json({ ok: true, ttlSeconds, expiresAt: new Date(Date.now() + alarmMs).toISOString() });
  }

  async _transitionLifecycle(body) {
    const { to } = body;
    const validStates = ['spawned', 'executing', 'reporting', 'retired'];
    if (!validStates.includes(to)) {
      return Response.json({ error: `Invalid lifecycle state: ${to}` }, { status: 400 });
    }

    const from = await this.storage.get('lifecycle') ?? 'spawned';
    await this.storage.put('lifecycle', to);
    await this.storage.put('lastTransition', new Date().toISOString());

    return Response.json({ ok: true, from, to, timestamp: new Date().toISOString() });
  }

  async _health() {
    const coherence = await this.storage.get('coherence') ?? 0;
    const lifecycle = await this.storage.get('lifecycle') ?? 'unknown';

    let level;
    if (coherence >= CSL.CRITICAL) level = 'CRITICAL_HEALTHY';
    else if (coherence >= CSL.HIGH) level = 'HIGH';
    else if (coherence >= CSL.MEDIUM) level = 'MEDIUM';
    else if (coherence >= CSL.LOW) level = 'LOW';
    else level = 'MINIMUM';

    return Response.json({
      healthy: coherence >= CSL.LOW,
      coherence,
      level,
      lifecycle,
      alert: coherence < CSL.MEDIUM,
      phi: PHI,
    });
  }

  async _retire() {
    await this.storage.put('lifecycle', 'retired');
    await this.storage.deleteAlarm();
    // Keep data for 34 seconds (φ-aligned) then expire
    const retainMs = 34000;
    await this.storage.setAlarm(Date.now() + retainMs);
    return Response.json({ ok: true, lifecycle: 'retired', retainMs });
  }

  // Alarm handler — auto-retire expired sessions
  async alarm() {
    const lifecycle = await this.storage.get('lifecycle') ?? 'unknown';
    if (lifecycle === 'retired') {
      await this.storage.deleteAll();
    } else {
      // Idle timeout — transition to retired
      await this.storage.put('lifecycle', 'retired');
    }
  }
}

/**
 * Worker entry point — routes requests to the correct DO by session ID
 */
export default {
  async fetch(req, env, ctx) {
    return Sentry.withSentry(
      () => ({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 }),
      async (request) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sid');

        if (!sessionId) {
          return Response.json({ error: 'Missing sid parameter' }, { status: 400 });
        }

        // Add x-session-affinity for prefix caching on Workers AI calls
        const id = env.HEADY_SESSION.idFromName(sessionId);
        const obj = env.HEADY_SESSION.get(id);

        const sessionReq = new Request(request.url, {
          method: request.method,
          headers: {
            ...Object.fromEntries(request.headers),
            'x-session-affinity': sessionId,
          },
          body: request.body,
        });

        return obj.fetch(sessionReq);
      }
    )(req, env, ctx);
  },
};
