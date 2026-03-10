/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { PHI, PSI, fib, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');

/**
 * Heady™ Durable Agent State — Persistent agent lifecycle management.
 * Compatible with Cloudflare Durable Objects pattern.
 *
 * State Machine:
 *   init → active → thinking → responding → idle → hibernating → expired
 *
 * Storage: SQLite (via Durable Object storage API) for state persistence.
 * WebSocket: Hibernatable — zero cost when idle.
 */

/** Agent lifecycle states */
const AGENT_STATES = Object.freeze({
  INIT:         'init',
  ACTIVE:       'active',
  THINKING:     'thinking',
  RESPONDING:   'responding',
  IDLE:         'idle',
  HIBERNATING:  'hibernating',
  EXPIRED:      'expired',
});

/** Valid state transitions */
const TRANSITIONS = Object.freeze({
  [AGENT_STATES.INIT]:        [AGENT_STATES.ACTIVE],
  [AGENT_STATES.ACTIVE]:      [AGENT_STATES.THINKING, AGENT_STATES.IDLE],
  [AGENT_STATES.THINKING]:    [AGENT_STATES.RESPONDING, AGENT_STATES.ACTIVE],
  [AGENT_STATES.RESPONDING]:  [AGENT_STATES.ACTIVE, AGENT_STATES.IDLE],
  [AGENT_STATES.IDLE]:        [AGENT_STATES.ACTIVE, AGENT_STATES.HIBERNATING, AGENT_STATES.EXPIRED],
  [AGENT_STATES.HIBERNATING]: [AGENT_STATES.ACTIVE, AGENT_STATES.EXPIRED],
  [AGENT_STATES.EXPIRED]:     [],  // terminal state
});

/** Idle timeout before hibernation: φ⁵ ms ≈ 11s */
const IDLE_TIMEOUT_MS = PHI_TIMING.PHI_5;

/** Hibernation timeout before expiry: φ⁹ ms ≈ 75s */
const HIBERNATE_TIMEOUT_MS = PHI_TIMING.PHI_9;

/** Max conversation history before compression: fib(8) = 21 messages */
const MAX_HISTORY_BEFORE_COMPRESS = fib(8);

/**
 * Durable Agent State Manager.
 * Manages agent lifecycle, state transitions, and conversation persistence.
 */
class DurableAgentState {
  constructor(agentId) {
    this.agentId = agentId;
    this.state = AGENT_STATES.INIT;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.conversationHistory = [];
    this.metadata = {};
    this._idleTimer = null;
    this._hibernateTimer = null;
  }

  /**
   * Transition to a new state. Validates the transition is allowed.
   * @param {string} newState — Target state from AGENT_STATES
   * @returns {boolean} Whether transition succeeded
   */
  transition(newState) {
    const allowed = TRANSITIONS[this.state] || [];
    if (!allowed.includes(newState)) {
      return false;
    }

    const previousState = this.state;
    this.state = newState;
    this.lastActivityAt = Date.now();

    // Manage timers based on new state
    this._clearTimers();

    if (newState === AGENT_STATES.IDLE) {
      this._idleTimer = setTimeout(() => {
        this.transition(AGENT_STATES.HIBERNATING);
      }, IDLE_TIMEOUT_MS);
    }

    if (newState === AGENT_STATES.HIBERNATING) {
      this._hibernateTimer = setTimeout(() => {
        this.transition(AGENT_STATES.EXPIRED);
      }, HIBERNATE_TIMEOUT_MS);
    }

    return true;
  }

  /**
   * Record a message in conversation history.
   * Triggers compression at Fibonacci thresholds.
   * @param {Object} message — { role: string, content: string }
   */
  addMessage(message) {
    this.conversationHistory.push({
      ...message,
      timestamp: Date.now(),
    });
    this.lastActivityAt = Date.now();

    // Check if compression needed
    if (this.conversationHistory.length >= MAX_HISTORY_BEFORE_COMPRESS) {
      this._compressHistory();
    }
  }

  /**
   * Compress older messages into a summary.
   * Keeps the most recent fib(6)=8 messages intact.
   */
  _compressHistory() {
    const keepRecent = fib(6);  // 8 messages
    if (this.conversationHistory.length <= keepRecent) return;

    const toCompress = this.conversationHistory.slice(0, -keepRecent);
    const recent = this.conversationHistory.slice(-keepRecent);

    // Create summary entry
    const summary = {
      role: 'system',
      content: `[Compressed ${toCompress.length} earlier messages]`,
      compressed: true,
      originalCount: toCompress.length,
      timestamp: Date.now(),
    };

    this.conversationHistory = [summary, ...recent];
  }

  /** Serialize agent state for persistence */
  serialize() {
    return {
      agentId: this.agentId,
      state: this.state,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      conversationHistory: this.conversationHistory,
      metadata: this.metadata,
    };
  }

  /** Restore agent state from persisted data */
  static deserialize(data) {
    const agent = new DurableAgentState(data.agentId);
    agent.state = data.state;
    agent.createdAt = data.createdAt;
    agent.lastActivityAt = data.lastActivityAt;
    agent.conversationHistory = data.conversationHistory || [];
    agent.metadata = data.metadata || {};
    return agent;
  }

  _clearTimers() {
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null; }
    if (this._hibernateTimer) { clearTimeout(this._hibernateTimer); this._hibernateTimer = null; }
  }

  destroy() {
    this._clearTimers();
    this.transition(AGENT_STATES.EXPIRED);
  }
}

module.exports = {
  AGENT_STATES,
  TRANSITIONS,
  IDLE_TIMEOUT_MS,
  HIBERNATE_TIMEOUT_MS,
  MAX_HISTORY_BEFORE_COMPRESS,
  DurableAgentState,
};
