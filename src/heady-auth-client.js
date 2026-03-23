/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: Auth Client Library v2.0.0                        ║
 * ║  HeadySystems Inc. — Eric Haywood, Founder                      ║
 * ║  Drop-in for all 11 Heady domains                               ║
 * ║  Patent Lock: HS-2026-051                                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Handles:
 *   1. Relay iframe bootstrap + auth state sync
 *   2. Lead capture (anonymous → identified funnel)
 *   3. Cross-domain SSO transfers
 *   4. Personal 3-tier storage client (T0/T1/T2)
 *   5. HeadyAutoContext integration
 *
 * Usage:
 *   <script src="https://cdn.headysystems.com/auth/heady-auth-client.js" defer></script>
 *
 * Or ESM:
 *   import { HeadyAuth } from './heady-auth-client.js';
 *   const auth = await HeadyAuth.init();
 */

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

const AUTH_ORIGIN = 'https://auth.headysystems.com';
const AUTH_API = AUTH_ORIGIN;
const RELAY_URL = `${AUTH_ORIGIN}/relay.html`;
const HEARTBEAT_MS = Math.round(Math.pow(PHI, 7) * 1000); // 29,034ms

// ═══════════════════════════════════════════════════════════════════
// §1 — HEADY AUTH CLIENT
// ═══════════════════════════════════════════════════════════════════

class HeadyAuth {
  #user = null;
  #leadId = null;
  #relay = null;
  #listeners = new Map();
  #ready = false;
  #readyPromise = null;
  #readyResolve = null;
  #site = null;
  #heartbeatTimer = null;
  #storage = null;

  constructor() {
    this.#readyPromise = new Promise(resolve => { this.#readyResolve = resolve; });
    this.#site = window.location.hostname.replace(/^www\./, '');
  }

  // ─── INITIALIZATION ──────────────────────────────────────────

  static async init(options = {}) {
    const auth = new HeadyAuth();
    await auth.#boot(options);
    return auth;
  }

  async #boot(options) {
    // 1. Inject relay iframe (if not already present)
    this.#injectRelay();

    // 2. Listen for relay messages
    window.addEventListener('message', (e) => this.#onMessage(e));

    // 3. Capture lead (anonymous tracking)
    await this.#captureLead();

    // 4. Request auth state from relay
    this.#requestAuthState();

    // 5. Wait for first auth response (FIB[4] * 1000 = 3000ms timeout)
    await Promise.race([
      this.#readyPromise,
      new Promise(r => setTimeout(r, FIB[4] * 1000)),
    ]);

    // 6. Start heartbeat
    this.#heartbeatTimer = setInterval(() => this.#heartbeat(), HEARTBEAT_MS);

    // 7. Sync with HeadyAutoContext
    this.#syncAutoContext();

    // 8. Initialize storage client
    this.#storage = new HeadyStorage(this);
  }

  // ─── RELAY IFRAME ────────────────────────────────────────────

  #injectRelay() {
    if (document.getElementById('heady-auth-relay')) {
      this.#relay = document.getElementById('heady-auth-relay');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'heady-auth-relay';
    iframe.src = RELAY_URL;
    iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    document.body.appendChild(iframe);
    this.#relay = iframe;
  }

  #requestAuthState() {
    if (this.#relay?.contentWindow) {
      this.#relay.contentWindow.postMessage(
        { type: 'heady:context:request' },
        AUTH_ORIGIN
      );
    }
  }

  // ─── MESSAGE HANDLER ─────────────────────────────────────────

  #onMessage(event) {
    if (event.origin !== AUTH_ORIGIN) return;
    const msg = event.data;
    if (!msg?.type) return;

    switch (msg.type) {
      case 'heady:auth:sync':
        this.#user = msg.user || null;
        this.#emit('auth:change', { user: this.#user, authenticated: !!this.#user });
        this.#emit('auth:login', { user: this.#user });
        if (!this.#ready) {
          this.#ready = true;
          this.#readyResolve?.();
        }
        break;

      case 'heady:auth:signout':
        const wasUser = this.#user;
        this.#user = null;
        this.#emit('auth:change', { user: null, authenticated: false });
        if (wasUser) this.#emit('auth:logout', { previousUser: wasUser });
        if (!this.#ready) {
          this.#ready = true;
          this.#readyResolve?.();
        }
        break;

      case 'heady:auth:error':
        this.#emit('auth:error', { error: msg.error });
        if (!this.#ready) {
          this.#ready = true;
          this.#readyResolve?.();
        }
        break;

      case 'heady:auth:transfer:token':
        this.#emit('auth:transfer', {
          transferToken: msg.transferToken,
          targetOrigin: msg.targetOrigin,
        });
        break;
    }
  }

  // ─── LEAD CAPTURE ────────────────────────────────────────────

  async #captureLead() {
    // Check if already has a lead cookie
    this.#leadId = this.#getCookie('heady_lead');
    if (this.#leadId) return;

    try {
      const res = await fetch(`${AUTH_API}/lead/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          site: this.#site,
          pageUrl: window.location.href,
          referrer: document.referrer || null,
          utm: this.#extractUTM(),
        }),
      });

      const data = await res.json();
      this.#leadId = data.leadId;
    } catch {
      // Non-critical — lead capture failure doesn't block auth
    }
  }

  #extractUTM() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const val = params.get(key);
      if (val) utm[key] = val;
    }
    return Object.keys(utm).length > 0 ? utm : null;
  }

  // ─── PUBLIC API ──────────────────────────────────────────────

  /** Current authenticated user (or null) */
  get user() { return this.#user; }

  /** Whether a user is authenticated */
  get isAuthenticated() { return !!this.#user; }

  /** The lead ID for anonymous tracking */
  get leadId() { return this.#leadId; }

  /** Current site hostname */
  get site() { return this.#site; }

  /** Personal storage client */
  get storage() { return this.#storage; }

  /** Promise that resolves when auth state is first determined */
  get ready() { return this.#readyPromise; }

  /** Open the auth page (redirect or popup) */
  login(options = {}) {
    const returnUrl = options.returnUrl || window.location.href;
    const mode = options.mode || 'redirect';

    if (mode === 'popup') {
      const w = 480, h = 640;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      window.open(
        `${AUTH_ORIGIN}/?return=${encodeURIComponent(returnUrl)}&leadId=${this.#leadId || ''}`,
        'heady-auth',
        `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no`
      );
    } else {
      window.location.href = `${AUTH_ORIGIN}/?return=${encodeURIComponent(returnUrl)}&leadId=${this.#leadId || ''}`;
    }
  }

  /** Sign out everywhere */
  logout() {
    // Tell relay to sign out Firebase
    if (this.#relay?.contentWindow) {
      this.#relay.contentWindow.postMessage(
        { type: 'heady:auth:signout:request' },
        AUTH_ORIGIN
      );
    }

    // Also call the server logout endpoint to clear cookies
    fetch(`${AUTH_API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }

  /** Request cross-domain SSO transfer token */
  requestTransfer(targetOrigin) {
    return new Promise((resolve, reject) => {
      // FIB[7] * 1000 = 13000ms timeout
      const timeout = setTimeout(() => reject(new Error('Transfer timeout')), FIB[7] * 1000);

      this.once('auth:transfer', (data) => {
        clearTimeout(timeout);
        resolve(data.transferToken);
      });

      if (this.#relay?.contentWindow) {
        this.#relay.contentWindow.postMessage(
          { type: 'heady:auth:transfer:request', targetOrigin },
          AUTH_ORIGIN
        );
      }
    });
  }

  /** Track a lead engagement event */
  async trackEvent(event, data = {}) {
    if (!this.#leadId && !this.#user) return;

    try {
      await fetch(`${AUTH_API}/lead/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadId: this.#leadId,
          event,
          data,
          site: this.#site,
        }),
      });
    } catch { /* Non-critical */ }
  }

  // ─── EVENT SYSTEM ────────────────────────────────────────────

  on(event, callback) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  off(event, callback) {
    this.#listeners.get(event)?.delete(callback);
  }

  #emit(event, data) {
    this.#listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (err) { console.error(`[heady-auth] Event handler error:`, err); }
    });
  }

  // ─── AUTOCONTEXT SYNC ────────────────────────────────────────

  #syncAutoContext() {
    if (!window.HeadyAutoContext) return;

    HeadyAutoContext.set('auth:ready', this.#ready);
    HeadyAutoContext.set('auth:user', this.#user);
    HeadyAutoContext.set('auth:leadId', this.#leadId);

    this.on('auth:change', ({ user }) => {
      HeadyAutoContext.set('auth:user', user);
      HeadyAutoContext.set('auth:authenticated', !!user);
    });
  }

  // ─── HEARTBEAT ───────────────────────────────────────────────

  #heartbeat() {
    // Re-request auth state to detect session changes
    this.#requestAuthState();
  }

  // ─── UTILITY ─────────────────────────────────────────────────

  #getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  destroy() {
    if (this.#heartbeatTimer) clearInterval(this.#heartbeatTimer);
    this.#listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════
// §2 — PERSONAL STORAGE CLIENT (T0/T1/T2 transparent)
// ═══════════════════════════════════════════════════════════════════

class HeadyStorage {
  #auth;

  constructor(auth) {
    this.#auth = auth;
  }

  #requireAuth() {
    if (!this.#auth.isAuthenticated) {
      throw new Error('Authentication required for personal storage');
    }
  }

  async #fetch(path, options = {}) {
    this.#requireAuth();

    const res = await fetch(`${AUTH_API}/storage${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Heady-Site': this.#auth.site,
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `Storage request failed: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Write a value to personal storage.
   * Writes to T0 (hot) + T1 (persistent) simultaneously.
   *
   * @param {string} key - Hierarchical key (e.g., "preferences/theme")
   * @param {*} value - Any JSON-serializable value
   * @param {Object} options - { category, persist, metadata, ttlHours }
   */
  async set(key, value, options = {}) {
    return this.#fetch(`/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, ...options }),
    });
  }

  /**
   * Read a value. Checks T0 → T1 → T2 automatically.
   * Promotes to T0 on access for hot caching.
   *
   * @param {string} key
   * @returns {{ value, tier, key, cslScore?, category? }}
   */
  async get(key) {
    return this.#fetch(`/${encodeURIComponent(key)}`);
  }

  /**
   * Delete a value from all tiers.
   * @param {string} key
   */
  async delete(key) {
    return this.#fetch(`/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }

  /**
   * List keys in personal storage.
   * @param {string} prefix - Optional key prefix filter
   * @param {number} limit - Max results (default: 13)
   */
  async list(prefix = '', limit = FIB[7]) {
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    params.set('limit', String(limit));
    return this.#fetch(`/?${params}`);
  }

  /**
   * Semantic search across personal storage.
   * Uses pg_trgm fuzzy matching (upgrades to pgvector when embeddings exist).
   *
   * @param {string} query - Search text
   * @param {number} limit
   */
  async search(query, limit = FIB[7]) {
    return this.#fetch('/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  /**
   * Get storage usage statistics.
   */
  async stats() {
    return this.#fetch('/~stats');
  }

  // ─── CONVENIENCE: Typed Getters/Setters ─────────────────────

  /** Save a user preference */
  async setPreference(key, value) {
    return this.set(`preferences/${key}`, value, { category: 'preferences', persist: true });
  }

  /** Read a user preference */
  async getPreference(key) {
    try {
      const result = await this.get(`preferences/${key}`);
      return result?.value ?? null;
    } catch { return null; }
  }

  /** Save a Buddy conversation snapshot */
  async saveBuddyHistory(sessionId, messages) {
    const dateKey = new Date().toISOString().split('T')[0];
    return this.set(`buddy/history/${dateKey}/${sessionId}`, messages, {
      category: 'buddy_history',
      persist: true,
    });
  }

  /** Save a bookmark */
  async bookmark(url, title, tags = []) {
    const key = `bookmarks/${crypto.randomUUID?.() || Date.now()}`;
    return this.set(key, { url, title, tags, savedAt: new Date().toISOString() }, {
      category: 'bookmarks',
      persist: true,
      metadata: { tags: tags.join(',') },
    });
  }

  /** Save a note */
  async saveNote(title, content) {
    const key = `notes/${Date.now()}`;
    return this.set(key, { title, content, createdAt: new Date().toISOString() }, {
      category: 'notes',
      persist: true,
    });
  }

  /** Save HeadyFinance data */
  async saveFinanceData(key, data) {
    return this.set(`finance/${key}`, data, { category: 'finance', persist: true });
  }
}

// ═══════════════════════════════════════════════════════════════════
// §3 — AUTH UI COMPONENTS (minimal, framework-agnostic)
// ═══════════════════════════════════════════════════════════════════

class HeadyAuthUI {
  static #auth = null;

  static bind(auth) {
    HeadyAuthUI.#auth = auth;
    HeadyAuthUI.#updateAll();

    auth.on('auth:change', () => HeadyAuthUI.#updateAll());
  }

  static #updateAll() {
    const auth = HeadyAuthUI.#auth;
    if (!auth) return;

    // Update all [data-heady-auth] elements
    document.querySelectorAll('[data-heady-auth]').forEach(el => {
      const action = el.getAttribute('data-heady-auth');

      switch (action) {
        case 'show-authenticated':
          el.hidden = !auth.isAuthenticated;
          break;
        case 'show-anonymous':
          el.hidden = auth.isAuthenticated;
          break;
        case 'user-name':
          el.textContent = auth.user?.displayName || '';
          break;
        case 'user-email':
          el.textContent = auth.user?.email || '';
          break;
        case 'user-avatar':
          if (auth.user?.avatarUrl) {
            el.src = auth.user.avatarUrl;
            el.hidden = false;
          } else {
            el.hidden = true;
          }
          break;
        case 'login-button':
          el.addEventListener('click', () => auth.login(), { once: true });
          el.hidden = auth.isAuthenticated;
          break;
        case 'logout-button':
          el.addEventListener('click', () => auth.logout(), { once: true });
          el.hidden = !auth.isAuthenticated;
          break;
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// §4 — AUTO-INIT
// ═══════════════════════════════════════════════════════════════════

let authInstance = null;

async function autoInit() {
  authInstance = await HeadyAuth.init();
  window.HeadyAuth = authInstance;

  // Bind UI components
  HeadyAuthUI.bind(authInstance);

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('heady:auth:ready', { detail: { auth: authInstance } }));
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export { HeadyAuth, HeadyStorage, HeadyAuthUI };
