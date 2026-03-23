/* ═══════════════════════════════════════════════════════════════
   HEADY LIVE API — Max for Live JavaScript (Live Object Model)
   ∞ Heady × Ableton Live 12 ∞
   ═══════════════════════════════════════════════════════════════

   This js script runs inside Max (not Node for Max) and has
   direct access to the Live API / Live Object Model (LOM).
   It handles transport and parameter control commands from
   the Node for Max bridge.

   Usage in Max patcher:
     [js heady-live-api.js]
   ═══════════════════════════════════════════════════════════════ */

autowatch = 1;
inlets = 1;
outlets = 1;

// ── Transport Control ────────────────────────────────────────

function transport(action) {
  var song = new LiveAPI('live_set');

  switch (action) {
    case 'play':
      if (song.get('is_playing').toString() === '0') {
        song.call('start_playing');
      }
      break;

    case 'stop':
      song.call('stop_playing');
      break;

    case 'record':
      var recordMode = song.get('record_mode');
      song.set('record_mode', recordMode.toString() === '0' ? 1 : 0);
      break;

    case 'continue':
      song.call('continue_playing');
      break;

    default:
      post('[HeadyLiveAPI] Unknown transport action: ' + action + '\n');
  }
}

// ── Tempo Control ────────────────────────────────────────────

function set_tempo(bpm) {
  var song = new LiveAPI('live_set');
  bpm = Math.max(20, Math.min(999, parseFloat(bpm)));
  song.set('tempo', bpm);
}

// ── Clip Control ─────────────────────────────────────────────

function trigger_clip(trackIndex, clipIndex) {
  try {
    var path = 'live_set tracks ' + trackIndex + ' clip_slots ' + clipIndex + ' clip';
    var clip = new LiveAPI(path);
    if (clip.id !== '0') {
      clip.call('fire');
    } else {
      post('[HeadyLiveAPI] No clip at track ' + trackIndex + ' slot ' + clipIndex + '\n');
    }
  } catch (e) {
    post('[HeadyLiveAPI] Clip trigger error: ' + e.message + '\n');
  }
}

function stop_clip(trackIndex, clipIndex) {
  try {
    var path = 'live_set tracks ' + trackIndex + ' clip_slots ' + clipIndex;
    var slot = new LiveAPI(path);
    slot.call('stop');
  } catch (e) {
    post('[HeadyLiveAPI] Clip stop error: ' + e.message + '\n');
  }
}

function fire_scene(sceneIndex) {
  try {
    var path = 'live_set scenes ' + sceneIndex;
    var scene = new LiveAPI(path);
    scene.call('fire');
  } catch (e) {
    post('[HeadyLiveAPI] Scene fire error: ' + e.message + '\n');
  }
}

// ── Track Parameters ─────────────────────────────────────────

function set_param(paramPath, value) {
  try {
    var parts = paramPath.split('.');

    if (parts[0] === 'tracks') {
      var trackIndex = parseInt(parts[1]);
      var param = parts[2];
      var track = new LiveAPI('live_set tracks ' + trackIndex);

      switch (param) {
        case 'volume':
          var mixer = new LiveAPI('live_set tracks ' + trackIndex + ' mixer_device volume');
          mixer.set('value', parseFloat(value));
          break;
        case 'pan':
          var panDev = new LiveAPI('live_set tracks ' + trackIndex + ' mixer_device panning');
          panDev.set('value', parseFloat(value));
          break;
        case 'mute':
          track.set('mute', value ? 1 : 0);
          break;
        case 'solo':
          track.set('solo', value ? 1 : 0);
          break;
        default:
          post('[HeadyLiveAPI] Unknown track param: ' + param + '\n');
      }
    }
  } catch (e) {
    post('[HeadyLiveAPI] Set param error: ' + e.message + '\n');
  }
}

function set_device_param(trackIndex, deviceIndex, paramIndex, value) {
  try {
    var path = 'live_set tracks ' + trackIndex + ' devices ' + deviceIndex + ' parameters ' + paramIndex;
    var param = new LiveAPI(path);
    param.set('value', parseFloat(value));
  } catch (e) {
    post('[HeadyLiveAPI] Device param error: ' + e.message + '\n');
  }
}

// ── Track Info Gathering ─────────────────────────────────────

function get_tracks() {
  try {
    var song = new LiveAPI('live_set');
    var count = parseInt(song.get('tracks').length / 2); // LOM returns [id, id, ...]
    var tracks = [];

    for (var i = 0; i < count; i++) {
      var track = new LiveAPI('live_set tracks ' + i);
      tracks.push({
        index: i,
        name: track.get('name').toString(),
        mute: track.get('mute').toString() === '1',
        solo: track.get('solo').toString() === '1',
        color: parseInt(track.get('color')),
      });
    }

    outlet(0, 'tracks_update', JSON.stringify(tracks));
  } catch (e) {
    post('[HeadyLiveAPI] Get tracks error: ' + e.message + '\n');
  }
}

// ── Initialization ───────────────────────────────────────────

function bang() {
  post('[HeadyLiveAPI] ∞ Sacred Geometry Music Bridge Active ∞\n');
}
