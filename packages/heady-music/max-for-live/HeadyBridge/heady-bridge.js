/* ═══════════════════════════════════════════════════════════════
   HEADY BRIDGE — Node for Max Script (runs inside Ableton Live)
   ∞ Heady × Ableton Live 12 :: Sacred Geometry Music ∞
   ═══════════════════════════════════════════════════════════════

   This script runs inside Max for Live via the node.script object.
   It creates a WebSocket server that HeadyMusic connects to,
   and communicates with the Max patcher which accesses the
   Live Object Model (LOM).

   Usage in Max patcher:
     [node.script heady-bridge.js]
   ═══════════════════════════════════════════════════════════════ */

const maxApi = require('max-api');
const { WebSocketServer } = require('ws');

// ── Configuration ────────────────────────────────────────────
const PORT = 9876;
let wss = null;
let clients = new Set();

// ── Current Ableton State (updated by Max patcher) ──────────
let abletonState = {
  tempo: 120,
  playing: false,
  recording: false,
  tracks: [],
  selectedTrack: 0,
  selectedScene: 0,
  songTime: 0,
};

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════

function startServer() {
  wss = new WebSocketServer({ port: PORT });

  wss.on('listening', () => {
    maxApi.post(`[HeadyBridge] ✓ WebSocket server on port ${PORT}`);
    maxApi.outlet('status', 'connected');
    maxApi.outlet('port', PORT);
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    maxApi.post(`[HeadyBridge] Client connected (${clients.size} total)`);
    maxApi.outlet('clients', clients.size);

    // Send current state immediately
    ws.send(JSON.stringify({ type: 'state_update', state: abletonState }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch (e) {
        maxApi.post(`[HeadyBridge] Invalid message: ${e.message}`);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      maxApi.post(`[HeadyBridge] Client disconnected (${clients.size} total)`);
      maxApi.outlet('clients', clients.size);
    });

    ws.on('error', (err) => {
      maxApi.post(`[HeadyBridge] Client error: ${err.message}`);
    });
  });

  wss.on('error', (err) => {
    maxApi.post(`[HeadyBridge] Server error: ${err.message}`);
    maxApi.outlet('status', 'error');
  });
}

function stopServer() {
  if (wss) {
    clients.forEach(ws => ws.close());
    clients.clear();
    wss.close();
    wss = null;
    maxApi.post('[HeadyBridge] Server stopped');
    maxApi.outlet('status', 'disconnected');
    maxApi.outlet('clients', 0);
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLING (from HeadyMusic clients)
// ═══════════════════════════════════════════════════════════════

function handleClientMessage(ws, msg) {
  switch (msg.type) {
    // ── Transport ──────────────────────────────────────────
    case 'transport':
      maxApi.outlet('transport', msg.action);
      respond(ws, msg.id, { ok: true, action: msg.action });
      break;

    case 'set_tempo':
      maxApi.outlet('set_tempo', msg.bpm);
      abletonState.tempo = msg.bpm;
      broadcastState();
      respond(ws, msg.id, { ok: true, bpm: msg.bpm });
      break;

    // ── Clip / Scene ───────────────────────────────────────
    case 'trigger_clip':
      maxApi.outlet('trigger_clip', msg.track, msg.clip);
      respond(ws, msg.id, { ok: true });
      break;

    case 'stop_clip':
      maxApi.outlet('stop_clip', msg.track, msg.clip);
      respond(ws, msg.id, { ok: true });
      break;

    case 'fire_scene':
      maxApi.outlet('fire_scene', msg.scene);
      respond(ws, msg.id, { ok: true });
      break;

    // ── Parameters ─────────────────────────────────────────
    case 'set_param':
      maxApi.outlet('set_param', msg.path, msg.value);
      respond(ws, msg.id, { ok: true });
      break;

    case 'set_device_param':
      maxApi.outlet('set_device_param', msg.track, msg.device, msg.param, msg.value);
      respond(ws, msg.id, { ok: true });
      break;

    // ── State Query ────────────────────────────────────────
    case 'get_state':
      respond(ws, msg.id, { type: 'state_update', state: abletonState });
      break;

    case 'get_tracks':
      maxApi.outlet('get_tracks');
      respond(ws, msg.id, { tracks: abletonState.tracks });
      break;

    case 'get_clips':
      maxApi.outlet('get_clips', msg.track);
      respond(ws, msg.id, { ok: true });
      break;

    // ── Heartbeat ──────────────────────────────────────────
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    default:
      maxApi.post(`[HeadyBridge] Unknown message type: ${msg.type}`);
      respond(ws, msg.id, { error: `Unknown type: ${msg.type}` });
  }
}

function respond(ws, id, data) {
  if (id) {
    ws.send(JSON.stringify({ ...data, id }));
  }
}

function broadcastState() {
  const msg = JSON.stringify({ type: 'state_update', state: abletonState });
  clients.forEach(ws => {
    if (ws.readyState === 1) { // OPEN
      ws.send(msg);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// MAX API HANDLERS (incoming from Max patcher / Live API)
// ═══════════════════════════════════════════════════════════════

// Called by Max patcher when tempo changes (via live.observer)
maxApi.addHandler('tempo_update', (bpm) => {
  abletonState.tempo = bpm;
  const msg = JSON.stringify({ type: 'tempo_changed', tempo: bpm });
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
});

// Called by Max patcher when playing state changes
maxApi.addHandler('playing_update', (playing) => {
  abletonState.playing = !!playing;
  const msg = JSON.stringify({ type: 'playing_changed', playing: abletonState.playing });
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
});

// Called by Max patcher when recording state changes
maxApi.addHandler('recording_update', (recording) => {
  abletonState.recording = !!recording;
  broadcastState();
});

// Called by Max patcher with track info
maxApi.addHandler('tracks_update', (...args) => {
  try {
    // args may be a single JSON string or individual values
    if (typeof args[0] === 'string') {
      abletonState.tracks = JSON.parse(args[0]);
    }
  } catch (e) {
    maxApi.post(`[HeadyBridge] Track parse error: ${e.message}`);
  }
  broadcastState();
});

// Called by Max patcher with song time
maxApi.addHandler('time_update', (time) => {
  abletonState.songTime = time;
});

// Called when a clip is triggered in Ableton
maxApi.addHandler('clip_triggered', (track, clip) => {
  const msg = JSON.stringify({ type: 'clip_triggered', track, clip });
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
});

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════

maxApi.addHandler('start', () => {
  startServer();
});

maxApi.addHandler('stop', () => {
  stopServer();
});

// Auto-start when loaded
startServer();

// Cleanup on script termination
process.on('exit', () => {
  stopServer();
});

maxApi.post('');
maxApi.post('  ∞ ═══════════════════════════════════ ∞');
maxApi.post('  ║    HEADY BRIDGE :: Node for Max    ║');
maxApi.post('  ║  Sacred Geometry Music Connection  ║');
maxApi.post('  ∞ ═══════════════════════════════════ ∞');
maxApi.post('');
