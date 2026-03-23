/* ═══════════════════════════════════════════════════════════════
   ABLETON BRIDGE — WebSocket Client for Max for Live Device
   ∞ Heady × Ableton Live 12 ∞
   ═══════════════════════════════════════════════════════════════ */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class AbletonBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || 'localhost';
    this.port = options.port || 9876;
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 20;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.state = {
      tempo: 120,
      playing: false,
      recording: false,
      tracks: [],
      selectedTrack: 0,
      selectedScene: 0,
    };
  }

  /* ── Connection ─────────────────────────────────────────── */

  connect() {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.host}:${this.port}`;
      console.log(`[HeadyMusic] Connecting to Ableton at ${url}...`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[HeadyMusic] ✓ Connected to Ableton Live');
        this.emit('connected');
        this._startHeartbeat();
        this._requestFullState();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);
        } catch (e) {
          console.error('[HeadyMusic] Invalid message:', e.message);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        this._stopHeartbeat();
        console.log('[HeadyMusic] Disconnected from Ableton');
        this.emit('disconnected');
        this._reconnect();
      });

      this.ws.on('error', (err) => {
        if (!this.connected) {
          reject(err);
        }
        this.emit('error', err);
      });
    });
  }

  disconnect() {
    this.maxReconnectAttempts = 0; // prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this._stopHeartbeat();
  }

  _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[HeadyMusic] Max reconnect attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff capped at 30s
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.618, this.reconnectAttempts - 1), // φ-based backoff!
      30000
    );

    console.log(`[HeadyMusic] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      this.connect().catch(() => {}); // reconnect silently
    }, delay);
  }

  /* ── Heartbeat ──────────────────────────────────────────── */

  _startHeartbeat() {
    this._heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this._send({ type: 'ping' });
      }
    }, 5000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  /* ── Message Protocol ───────────────────────────────────── */

  _send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected to Ableton'));
    }
    this.ws.send(JSON.stringify(msg));
    return Promise.resolve();
  }

  _request(type, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const msg = { type, id, ...params };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${type} timed out`));
      }, 10000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this._send(msg).catch(reject);
    });
  }

  _handleMessage(msg) {
    // Response to a request
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, timeout } = this.pendingRequests.get(msg.id);
      clearTimeout(timeout);
      this.pendingRequests.delete(msg.id);
      resolve(msg);
      return;
    }

    // State update broadcast
    switch (msg.type) {
      case 'state_update':
        Object.assign(this.state, msg.state);
        this.emit('state', this.state);
        break;
      case 'tempo_changed':
        this.state.tempo = msg.tempo;
        this.emit('tempo', msg.tempo);
        break;
      case 'playing_changed':
        this.state.playing = msg.playing;
        this.emit('playing', msg.playing);
        break;
      case 'clip_triggered':
        this.emit('clip_triggered', msg);
        break;
      case 'pong':
        // heartbeat response
        break;
      default:
        this.emit('message', msg);
    }
  }

  _requestFullState() {
    this._send({ type: 'get_state' });
  }

  /* ── Transport Controls ─────────────────────────────────── */

  play() {
    return this._send({ type: 'transport', action: 'play' });
  }

  stop() {
    return this._send({ type: 'transport', action: 'stop' });
  }

  record() {
    return this._send({ type: 'transport', action: 'record' });
  }

  setTempo(bpm) {
    return this._send({ type: 'set_tempo', bpm: Math.max(20, Math.min(999, bpm)) });
  }

  /* ── Clip / Scene Control ───────────────────────────────── */

  triggerClip(trackIndex, clipIndex) {
    return this._send({ type: 'trigger_clip', track: trackIndex, clip: clipIndex });
  }

  stopClip(trackIndex, clipIndex) {
    return this._send({ type: 'stop_clip', track: trackIndex, clip: clipIndex });
  }

  fireScene(sceneIndex) {
    return this._send({ type: 'fire_scene', scene: sceneIndex });
  }

  /* ── Track / Device Parameters ──────────────────────────── */

  setTrackVolume(trackIndex, volume) {
    return this._send({ type: 'set_param', path: `tracks.${trackIndex}.volume`, value: volume });
  }

  setTrackPan(trackIndex, pan) {
    return this._send({ type: 'set_param', path: `tracks.${trackIndex}.pan`, value: pan });
  }

  setTrackMute(trackIndex, muted) {
    return this._send({ type: 'set_param', path: `tracks.${trackIndex}.mute`, value: muted });
  }

  setTrackSolo(trackIndex, soloed) {
    return this._send({ type: 'set_param', path: `tracks.${trackIndex}.solo`, value: soloed });
  }

  setDeviceParam(trackIndex, deviceIndex, paramIndex, value) {
    return this._send({
      type: 'set_device_param',
      track: trackIndex,
      device: deviceIndex,
      param: paramIndex,
      value,
    });
  }

  /* ── Query ──────────────────────────────────────────────── */

  getState() {
    return this._request('get_state');
  }

  getTracks() {
    return this._request('get_tracks');
  }

  getClips(trackIndex) {
    return this._request('get_clips', { track: trackIndex });
  }

  /* ── Status ─────────────────────────────────────────────── */

  getStatus() {
    return {
      connected: this.connected,
      host: this.host,
      port: this.port,
      reconnectAttempts: this.reconnectAttempts,
      state: { ...this.state },
    };
  }
}

module.exports = AbletonBridge;
