// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: frontend/src/lib/heady-api.js
// LAYER: frontend/lib
// HeadyOS Dashboard — Centralized API Client
// HEADY_BRAND:END

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://heady-manager-bf4q4zywhq-uc.a.run.app';

class HeadyAPI {
  constructor() {
    this.token = null;
    this.apiKey = null;
  }

  setToken(jwt) { this.token = jwt; }
  setApiKey(key) { this.apiKey = key; }

  async request(path, opts = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(this.apiKey ? { 'x-heady-api-key': this.apiKey } : {}),
      ...opts.headers,
    };

    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const error = new Error(`API ${res.status}: ${body}`);
      error.status = res.status;
      error.body = body;
      throw error;
    }

    return res.json();
  }

  // ── Core Endpoints ────────────────────────────────────
  health()        { return this.request('/api/brain/health'); }
  systemStatus()  { return this.request('/api/system/status'); }
  pipelineState() { return this.request('/api/pipeline/state'); }
  registry()      { return this.request('/api/registry'); }
  nodes()         { return this.request('/api/nodes'); }
  readiness()     { return this.request('/api/readiness/evaluate'); }

  // ── Pipeline ──────────────────────────────────────────
  runPipeline(config) {
    return this.request('/api/pipeline/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // ── Brain / Memory ────────────────────────────────────
  brainQuery(query, limit = 21) {
    return this.request('/api/brain/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  // ── Battle ────────────────────────────────────────────
  runBattle(prompt, models) {
    return this.request('/api/battle/run', {
      method: 'POST',
      body: JSON.stringify({ prompt, models }),
    });
  }

  // ── AI Chat (Buddy) ───────────────────────────────────
  chat(message, context = null, history = []) {
    return this.request('/api/buddy/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, history }),
    });
  }

  // ── SSE stream for real-time updates ──────────────────
  eventStream() {
    const url = `${API_BASE}/api/events`;
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return new EventSource(url);
  }

  // ── Onboarding ────────────────────────────────────────
  getOnboardingState() {
    return this.request('/api/onboarding/state');
  }

  updateOnboardingStage(stage, data) {
    return this.request(`/api/onboarding/stage/${stage}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new HeadyAPI();
export default api;
